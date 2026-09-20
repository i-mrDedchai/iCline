/**
 * Recovery for tool calls a model writes as *text* instead of through the
 * provider's structured tool-call channel.
 *
 * Observed in the field on `z-ai/glm-5.3-flash` (free cline route, VS Code
 * `dev.6-fix.24` smoke round 1): the model answered a tool-enabled turn with
 *
 *   แผนของผม: …
 *   <tool_call>
 *   <invoke name="list_files">
 *   <parameter name="path">d:\.opencode\Test-models</parameter>
 *   <parameter name="recursive">false</parameter>
 *   </invoke>
 *   </tool_call>
 *
 * in the text channel. `AgentRuntime` only looked for `tool-call` parts, found
 * none, and reported the turn as a completed final answer: the task never
 * progressed, the user read raw markup in the chat, and — because the model got
 * no feedback at all — the next turn produced the same markup again. That
 * model's own history is a second source of mismatched names: `list_files` is
 * the classic Cline tool, not one this runtime ships.
 *
 * The parsers below recognize the dialects models actually emit:
 *   1. `<invoke name="x"><parameter name="y">v</parameter></invoke>` (also
 *      `<param name="y">`), optionally wrapped in `<tool_call(s)>` /
 *      `<function_call(s)>`;
 *   2. the older Cline form `<x><parameter name="y">v</parameter></x>`, where
 *      the element name is the tool name;
 *   3. a JSON body inside a `<tool_call(s)>` wrapper, as some vendors document:
 *      `{"name": "x", "arguments": {…}}`.
 *
 * Nothing here decides whether a call is *allowed*: the runtime resolves every
 * recovered call against its tool registry — and the policies and approval
 * callbacks hanging off it — exactly as it does a native one, so an unknown name
 * becomes an ordinary "unknown tool" result instead of a silently finished run.
 */

export interface FabricatedToolCall {
	name: string;
	input: Record<string, unknown>;
}

/**
 * Upper bound on calls recovered from one assistant message. A model that
 * spews markup must not be able to fan out an unbounded number of tool
 * executions from a single turn.
 */
export const MAX_FABRICATED_TOOL_CALLS = 16;

/**
 * Tag names that are call *syntax* rather than tool names. They are never read
 * as a tool's name and are removed from the text when left behind by a stripped
 * call block.
 */
const RESERVED_TAGS = new Set([
	"tool_call",
	"tool_calls",
	"function_call",
	"function_calls",
	"invoke",
	"parameter",
	"param",
	"arguments",
	"antml_invoke",
	"antml_parameter",
]);

// Fresh instances per call: these are global-flagged, and a shared instance
// would carry `lastIndex` between calls (`matchAll` starts from it, `test`
// advances it).
const invokeBlockPattern = () =>
	/<\s*invoke\b([^>]*)>([\s\S]*?)<\s*\/\s*invoke\s*>/gi;
const genericBlockPattern = () =>
	/<\s*([a-z][a-z0-9_]*)\b([^>]*)>([\s\S]*?)<\s*\/\s*\1\s*>/gi;
const jsonWrapperPattern = () =>
	/<\s*(?:tool_calls?|function_calls?)\b[^>]*>([\s\S]*?)<\s*\/\s*(?:tool_calls?|function_calls?)\s*>/gi;
const parameterPattern = () =>
	/<\s*(?:parameter|param)\b([^>]*)>([\s\S]*?)<\s*\/\s*(?:parameter|param)\s*>/gi;
const wrapperTagPattern = () =>
	/<\s*\/?\s*(?:tool_calls?|function_calls?|invoke)\b[^>]*>/gi;
const HAS_PARAMETER_TAG = /<\s*(?:parameter|param)\b/i;
const NAME_ATTRIBUTE = /\bname\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

/**
 * Cheap probe for the streaming path: does this chunk contain the start of a
 * call block? Used to decide whether the (more expensive) strip is worth
 * running on the accumulated text.
 */
export const FABRICATED_TOOL_CALL_HINT =
	/<\s*\/?(?:tool_calls?|function_calls?|invoke)\b/i;

function readName(attributes: string): string | undefined {
	const match = NAME_ATTRIBUTE.exec(attributes);
	if (!match) {
		return undefined;
	}
	return (match[1] ?? match[2] ?? "").trim() || undefined;
}

function readJson(value: string): unknown {
	const trimmed = value.trim();
	const first = trimmed[0];
	if (first !== "{" && first !== "[") {
		return undefined;
	}
	try {
		return JSON.parse(trimmed);
	} catch {
		return undefined;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads the `<parameter name="y">v</parameter>` children of a call body. */
function readParameters(body: string): Record<string, unknown> {
	const input: Record<string, unknown> = {};
	for (const match of body.matchAll(parameterPattern())) {
		const name = readName(match[1] ?? "");
		if (!name) {
			continue;
		}
		const raw = (match[2] ?? "").trim();
		// Structured values arrive as JSON inside the tag; everything else stays
		// verbatim, because the runtime normalizes strings against the tool's own
		// schema once it has resolved the tool.
		input[name] = readJson(raw) ?? raw;
	}
	return input;
}

function readJsonCall(value: unknown): FabricatedToolCall | undefined {
	if (!isRecord(value)) {
		return undefined;
	}
	const name = typeof value.name === "string" ? value.name.trim() : "";
	if (!name) {
		return undefined;
	}
	const raw = value.arguments ?? value.parameters ?? value.input ?? value.args;
	const parsed = typeof raw === "string" ? readJson(raw) : raw;
	return { name, input: isRecord(parsed) ? parsed : {} };
}

function readJsonCalls(body: string): FabricatedToolCall[] {
	const parsed = readJson(body);
	if (parsed === undefined) {
		return [];
	}
	const candidates = Array.isArray(parsed)
		? parsed
		: isRecord(parsed) && Array.isArray(parsed.tool_calls)
			? parsed.tool_calls
			: [parsed];
	const calls: FabricatedToolCall[] = [];
	for (const candidate of candidates) {
		const call = readJsonCall(candidate);
		if (call) {
			calls.push(call);
		}
	}
	return calls;
}

/**
 * Tool calls found in `text`, in the order they appear. Returns `[]` for
 * ordinary prose, which is the overwhelming majority of assistant text.
 */
export function parseFabricatedToolCalls(text: string): FabricatedToolCall[] {
	if (!text || !text.includes("<")) {
		return [];
	}
	const calls: FabricatedToolCall[] = [];

	for (const match of text.matchAll(invokeBlockPattern())) {
		const name = readName(match[1] ?? "");
		if (name) {
			calls.push({ name, input: readParameters(match[2] ?? "") });
		}
	}

	// JSON bodies: only for wrapper bodies that are not themselves invoke blocks,
	// so the common `<tool_call><invoke …>` form is not read twice.
	for (const match of text.matchAll(jsonWrapperPattern())) {
		const body = (match[1] ?? "").trim();
		if (body === "" || /<\s*invoke\b/i.test(body)) {
			continue;
		}
		calls.push(...readJsonCalls(body));
	}

	// Classic form: the element name is the tool name, and `<parameter name="…">`
	// children are what mark the element as a call rather than arbitrary markup.
	for (const match of text.matchAll(genericBlockPattern())) {
		const tag = match[1] ?? "";
		if (RESERVED_TAGS.has(tag.toLowerCase())) {
			continue;
		}
		const body = match[3] ?? "";
		if (!HAS_PARAMETER_TAG.test(body)) {
			continue;
		}
		if (calls.some((call) => call.name === tag)) {
			// Already recovered through its `<invoke name="…">` wrapper.
			continue;
		}
		calls.push({ name: tag, input: readParameters(body) });
	}

	return calls.slice(0, MAX_FABRICATED_TOOL_CALLS);
}

/**
 * `text` without its fabricated call blocks. Prose around a call is preserved —
 * the model usually explains the call it is about to make, and that explanation
 * is worth keeping.
 *
 * Only well-formed blocks are removed, so a half-streamed block survives until
 * its closing tag arrives (the runtime streams the accumulated text, so the next
 * delta re-renders it without the markup). Wrapper tags left over by a removed
 * block go too, but a bare mention — "`<tool_call>` is the wire format" — is left
 * alone unless a real block was removed from the same text.
 */
export function stripFabricatedToolCallMarkup(text: string): string {
	if (!text || !text.includes("<")) {
		return text;
	}
	let removedBlock = false;

	// 1. `<invoke …>…</invoke>`, with or without a wrapper around it.
	let stripped = text.replace(invokeBlockPattern(), () => {
		removedBlock = true;
		return "";
	});

	// 2. Wrapper bodies carrying JSON, kept only when the body really is a call.
	stripped = stripped.replace(jsonWrapperPattern(), (match, body: string) => {
		if (readJsonCalls(String(body ?? "")).length === 0) {
			return match;
		}
		removedBlock = true;
		return "";
	});

	// 3. Classic `<tool><parameter name="…">…</parameter></tool>`.
	stripped = stripped.replace(
		genericBlockPattern(),
		(match, tag: string, _attributes: string, body: string) => {
			if (RESERVED_TAGS.has(String(tag).toLowerCase())) {
				return match;
			}
			if (!HAS_PARAMETER_TAG.test(String(body))) {
				return match;
			}
			removedBlock = true;
			return "";
		},
	);

	if (removedBlock) {
		stripped = stripped.replace(wrapperTagPattern(), "");
	}

	if (stripped === text) {
		return text;
	}
	// Removing a block leaves the blank lines that framed it behind.
	return stripped.replace(/\n{3,}/g, "\n\n").trim();
}
