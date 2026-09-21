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
 *      `{"name": "x", "arguments": {…}}`;
 *   4. the same wrapper in the form that same model actually wrote in the
 *      `dev.6-fix.25` smoke round — **the tool name, then its arguments as a bare
 *      JSON object, and NO closing tag at all**:
 *
 *        …ตั้งลำดับโฟลเดอร์ให้ถูกต้องครับ<tool_call>run_commands{"commands": ["dir /b …"]}
 *
 *      Dialect 3's regex needs `</tool_call>` to exist, so an unclosed block parsed
 *      as no call at all: the raw markup stayed in the transcript, nothing ran, and
 *      the model — told nothing — wrote the identical block again on the next turn.
 *      That is why dialect 4 is scanned by hand (`scanWrapperCalls`) with a
 *      brace-matching reader instead of a closing-tag regex.
 *
 * And the dialect the `dev.6-fix.26` smoke round wrote — **element form**, no wrapper and
 * no `<parameter>` children: the tag is the tool name and the CHILD element names are its
 * arguments:
 *
 *   …เพื่อเลือกธีมที่ไม่ซ้ำ ✨<run_commands>
 *   <cmd>dir /b "d:\.opencode\Test-models"</cmd>
 *   </run_commands></run_commands>
 *
 *   …ก่อน:<read_files>
 *   <paths><path>d:\.opencode\Test-models</path></paths>
 *   </read_files></read_files>
 *
 * Dialects 1–4 all need call SYNTAX (`<invoke>`, `<parameter>`, a wrapper tag, a JSON
 * body); this one has none of it, so every earlier scanner walked straight past it: the
 * markup stayed in the chat and the turn was reported as a finished answer. It is read
 * by {@link scanElementCalls}, and it is the one dialect that must be *conservative*,
 * because prose about HTML looks exactly like it — see the recognition rule there.
 *
 * A block left *unfinished* by the model is never recovered: the JSON reader refuses
 * a value that does not close, so a turn cut off by the output limit cannot be turned
 * into a call with half its arguments. The runtime additionally skips recovery
 * entirely on a `max-tokens`/`error` finish reason.
 *
 * Nothing here decides whether a call is *allowed*: the runtime resolves every
 * recovered call against its tool registry — and the policies and approval
 * callbacks hanging off it — exactly as it does a native one, so an unknown name
 * becomes an ordinary "unknown tool" result instead of a silently finished run.
 *
 * The recovered ARGUMENT SHAPES are intentionally left as the model wrote them
 * (`{cmd: "dir /b …"}`, `{paths: ["…"]}`). The shipped tools already accept these
 * spellings — `RunCommandsInputUnionSchema` carries `cmd`, `ReadFilesInputUnionSchema`
 * carries `paths` as a string or a list — so no per-tool alias table is needed here,
 * and a name the runtime does not know is answered with the ordinary "unknown tool"
 * result rather than being silently rewritten.
 */

export interface FabricatedToolCall {
	name: string;
	input: Record<string, unknown>;
}

/**
 * What the caller knows about the run.
 *
 * `knownToolNames` is the tool registry the recovered call will be resolved against.
 * Element-form recognition needs it for its guard against prose (below); every other
 * dialect works without it, so a caller that passes nothing still recovers those.
 */
export interface FabricatedToolCallOptions {
	knownToolNames?: Iterable<string>;
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
/** Opening tag of a wrapper whose body is read by hand — see `scanWrapperCalls`. */
const wrapperOpenPattern = () =>
	/<\s*(?:tool_calls?|function_calls?)\b[^>]*>/gi;
/** A wrapper closing tag immediately after a body, when the model did write one. */
const TRAILING_WRAPPER_CLOSE =
	/^\s*<\s*\/\s*(?:tool_calls?|function_calls?)\s*>/;
/** The tool name that begins a dialect-4 body: `run_commands{…}`. */
const BARE_CALL_NAME = /^[A-Za-z_][A-Za-z0-9_.:-]*/;
const HAS_PARAMETER_TAG = /<\s*(?:parameter|param)\b/i;
const NAME_ATTRIBUTE = /\bname\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

/**
 * Cheap probe for the streaming path: does this chunk contain the start of a
 * call block? Used to decide whether the (more expensive) strip is worth
 * running on the accumulated text.
 *
 * The second alternative is element form: an opening or closing tag whose name is
 * snake_case. Every tool this runtime ships and every tool a model seems to invent for
 * it (`read_files`, `run_commands`, `list_files`, `execute_command`, `search_codebase`)
 * is written that way, and no HTML element is, so the probe can fire on the shape
 * without knowing the registry. A false positive only costs the strip below, which
 * returns its input untouched when nothing matches.
 */
export const FABRICATED_TOOL_CALL_HINT =
	/<\s*\/?(?:tool_calls?|function_calls?|invoke)\b|<\s*\/?[a-z][a-z0-9]*_[a-z0-9_]*(?:\s|>)/i;

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

/**
 * End offset (exclusive) of the JSON value starting at `start`, or `undefined` when it
 * never closes. Strings and escapes are tracked, so a `}` inside a quoted command line
 * cannot end the value early — and an unfinished value (the stream was cut, or the block
 * was never JSON) is refused rather than guessed at.
 */
function endOfJsonValue(text: string, start: number): number | undefined {
	if (text[start] !== "{" && text[start] !== "[") {
		return undefined;
	}
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let i = start; i < text.length; i += 1) {
		const char = text[i];
		if (inString) {
			if (escaped) {
				escaped = false;
			} else if (char === "\\") {
				escaped = true;
			} else if (char === '"') {
				inString = false;
			}
			continue;
		}
		if (char === '"') {
			inString = true;
		} else if (char === "{" || char === "[") {
			depth += 1;
		} else if (char === "}" || char === "]") {
			depth -= 1;
			if (depth === 0) {
				return i + 1;
			}
		}
	}
	return undefined;
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
 * A call read out of a wrapper body, with the span of text it occupies. The span is what
 * display text has to lose, and it is measured on the ORIGINAL string: the strip removes
 * every span at once, so no offset can go stale halfway through.
 */
interface WrapperCall extends FabricatedToolCall {
	start: number;
	end: number;
}

/**
 * Reads `<tool_call(s)>` / `<function_call(s)>` bodies, with or WITHOUT a closing tag.
 *
 * Two body shapes, both seen in the wild:
 *   - `<tool_call>run_commands{"commands": […]}` — the tool NAME, then its arguments as
 *     a bare JSON value (this is the `dev.6-fix.25` smoke round's shape);
 *   - `<tool_call>{"name": "x", "arguments": {…}}` — a JSON call object, which vendors
 *     document and some models emit unclosed.
 *
 * A body whose first non-space character is neither a name nor JSON (`<tool_call><invoke …>`
 * being the common one) is left alone: other scanners own those shapes, and reading them
 * here would report the same call twice.
 */
function scanWrapperCalls(text: string): WrapperCall[] {
	const calls: WrapperCall[] = [];
	for (const match of text.matchAll(wrapperOpenPattern())) {
		const start = match.index ?? 0;
		let cursor = start + match[0].length;
		while (cursor < text.length && /\s/.test(text[cursor] as string)) {
			cursor += 1;
		}

		const name = BARE_CALL_NAME.exec(text.slice(cursor));
		if (name) {
			let argumentsStart = cursor + name[0].length;
			while (
				argumentsStart < text.length &&
				/\s/.test(text[argumentsStart] as string)
			) {
				argumentsStart += 1;
			}
			const argumentsEnd = endOfJsonValue(text, argumentsStart);
			if (argumentsEnd === undefined) {
				continue;
			}
			// Objects only. Prose that *describes* the markup — "a call looks like
			// `<tool_call>read_files{...}`" — has a brace body that is not JSON, and a
			// tool call is not a thing to infer from something that does not parse.
			const parsed = readJson(text.slice(argumentsStart, argumentsEnd));
			if (!isRecord(parsed)) {
				continue;
			}
			calls.push({
				name: name[0],
				input: parsed,
				start,
				end: endAfterWrapperClose(text, argumentsEnd),
			});
			continue;
		}

		const argumentsEnd = endOfJsonValue(text, cursor);
		if (argumentsEnd === undefined) {
			continue;
		}
		const jsonCalls = readJsonCalls(text.slice(cursor, argumentsEnd));
		if (jsonCalls.length === 0) {
			continue;
		}
		const end = endAfterWrapperClose(text, argumentsEnd);
		for (const call of jsonCalls) {
			calls.push({ ...call, start, end });
		}
	}
	return calls;
}

/** Swallows the closing tag too, so no orphan `</tool_call>` is left in the prose. */
function endAfterWrapperClose(text: string, end: number): number {
	const close = TRAILING_WRAPPER_CLOSE.exec(text.slice(end));
	return close ? end + close[0].length : end;
}

/*
 * ---------------------------------------------------------------------------
 * Element form: `<run_commands><cmd>dir</cmd></run_commands>`
 * ---------------------------------------------------------------------------
 */

/** Any opening tag — element form reads the tag itself as the tool name. */
const elementOpenPattern = () => /<\s*([a-z][a-z0-9_]*)\b([^<>]*)>/gi;
/** A tag whose name can only be a tool name, not an HTML element. */
const TOOLISH_TAG = /_/;

/**
 * Is this tag a call rather than markup the model is writing *about*?
 *
 * The registry is the first answer: a name the runtime actually ships is a call. The
 * second is the shape of the name — **every** tool this runtime and the models that
 * target it write is snake_case (`read_files`, `run_commands`, `list_files`,
 * `execute_command`), and no HTML element name contains an underscore. That matters
 * because a session whose task is "build me an HTML page" puts real markup in the same
 * text channel: only the NAMES are different, so `<section><h1>Title</h1></section>`
 * must stay prose while `<editor><command>write</command></editor>` is read as a call.
 */
function looksLikeElementCall(tag: string, knownToolNames?: ReadonlySet<string>): boolean {
	const lower = tag.toLowerCase();
	if (RESERVED_TAGS.has(lower)) {
		return false;
	}
	return knownToolNames?.has(tag) === true || TOOLISH_TAG.test(tag);
}

/**
 * Reads the child elements of an element-form call body.
 *
 * A child's value is its inner text — JSON-decoded when it is JSON — or, when the child
 * itself holds elements, those children's values as a LIST. That second rule is what
 * turns the forms models actually write into the shape the tools already accept:
 * `<paths><path>a</path><path>b</path></paths>` reads as `paths: ["a", "b"]`, and
 * `<commands><cmd>a</cmd></commands>` as `commands: ["a"]`.
 */
function readElementChildren(body: string, depth = 0): Record<string, unknown> | undefined {
	const input: Record<string, unknown> = {};
	let found = 0;
	// Offset of the end of the last element already read: a nested tag inside a
	// container child (`<paths>` swallowing its `<path>`s) must not be read a second
	// time as a sibling argument.
	let cursor = 0;
	for (const match of body.matchAll(elementOpenPattern())) {
		const start = match.index ?? 0;
		if (start < cursor) {
			continue;
		}
		const tag = match[1] as string;
		if (RESERVED_TAGS.has(tag.toLowerCase())) {
			// `<parameter>`/`<param>` bodies belong to the other dialects, which read
			// them with their `name` attribute; reading them here would report the
			// same call twice.
			continue;
		}
		const innerStart = start + match[0].length;
		const closeIndex = indexOfCloseTag(body, tag, innerStart);
		if (closeIndex === undefined) {
			continue;
		}
		const inner = body.slice(innerStart, closeIndex);
		const nested = depth < 4 ? readElementChildren(inner, depth + 1) : undefined;
		const hasNested = !!nested && Object.keys(nested).length > 0;
		// A child is a CONTAINER only when nothing but its elements is inside it
		// (`<paths><path>a</path><path>b</path></paths>` is a list of paths). A shell
		// command that happens to contain markup (`echo "<b>hi</b>"`) keeps its own
		// text, verbatim: reading that `<b>` as an argument would invent an argument
		// the model never wrote, and would lose the command it did write.
		const isContainer = hasNested && contentOutsideChildren(inner) === "";
		const value = isContainer ? Object.values(nested as Record<string, unknown>).flat() : readScalar(inner);
		const existing = input[tag];
		if (existing === undefined) {
			input[tag] = value;
		} else if (Array.isArray(existing)) {
			existing.push(...(Array.isArray(value) ? value : [value]));
		} else {
			input[tag] = [existing, ...(Array.isArray(value) ? value : [value])];
		}
		found += 1;
		cursor = closeIndex + (`</${tag}>`.length as number);
	}
	return found > 0 ? input : undefined;
}

/**
 * What is left of `inner` once its child ELEMENTS (tags and their content) are gone.
 * Whitespace means the children are the whole body — the only case that reads as a
 * container rather than as text that happens to contain markup.
 */
function contentOutsideChildren(inner: string): string {
	let leftover = "";
	let cursor = 0;
	for (const match of inner.matchAll(elementOpenPattern())) {
		const start = match.index ?? 0;
		if (start < cursor) {
			continue;
		}
		const tag = match[1] as string;
		const innerStart = start + match[0].length;
		const closeIndex = indexOfCloseTag(inner, tag, innerStart);
		if (closeIndex === undefined) {
			continue;
		}
		leftover += inner.slice(cursor, start);
		cursor = closeIndex + (`</${tag}>`.length as number);
	}
	leftover += inner.slice(cursor);
	return stripTags(leftover).trim();
}

/** `inner` without its tags — used only to ask whether a child holds elements or text. */
function stripTags(inner: string): string {
	return inner.replace(/<\s*\/?\s*[a-z][a-z0-9_]*\b[^<>]*>/gi, "");
}

/** A child's text: JSON when it is JSON, otherwise the trimmed text as written. */
function readScalar(inner: string): unknown {
	const trimmed = inner.trim();
	if (trimmed === "") {
		return "";
	}
	return readJson(trimmed) ?? trimmed;
}

/** Offset of `</tag>` at or after `from`, or `undefined` when it never closes. */
function indexOfCloseTag(text: string, tag: string, from: number): number | undefined {
	const closePattern = new RegExp(`<\\s*\\/\\s*${tag}\\s*>`, "i");
	const match = closePattern.exec(text.slice(from));
	return match ? from + (match.index ?? 0) : undefined;
}

/**
 * End of the block, swallowing closing tags the model wrote twice
 * (`</run_commands></run_commands>` — the fix.26 transcript's habit, and one that would
 * otherwise leave an orphan tag behind in the prose).
 */
function endAfterElementClose(text: string, tag: string, closeIndex: number): number {
	const closePattern = new RegExp(`^\\s*<\\s*\\/\\s*${tag}\\s*>`, "i");
	let end = closeIndex + (`</${tag}>`.length as number);
	for (;;) {
		const next = closePattern.exec(text.slice(end));
		if (!next) {
			return end;
		}
		end += next[0].length;
	}
}

/**
 * Element-form calls in `text` — the tag is the tool name, its children its arguments.
 *
 * Only a body made of child elements (or of a JSON object) is read: `<b>note</b>` is
 * prose, `<editor><command>write</command></editor>` is a call.
 */
function scanElementCalls(
	text: string,
	knownToolNames?: ReadonlySet<string>,
): WrapperCall[] {
	const calls: WrapperCall[] = [];
	for (const match of text.matchAll(elementOpenPattern())) {
		const tag = match[1] as string;
		if (!looksLikeElementCall(tag, knownToolNames)) {
			continue;
		}
		const start = match.index ?? 0;
		const bodyStart = start + match[0].length;
		const closeIndex = indexOfCloseTag(text, tag, bodyStart);
		if (closeIndex === undefined) {
			continue;
		}
		const body = text.slice(bodyStart, closeIndex);
		const jsonEnd = endOfJsonValue(body.trimStart(), 0);
		const jsonInput = jsonEnd === undefined ? undefined : readJson(body.trimStart().slice(0, jsonEnd));
		const input = isRecord(jsonInput) ? jsonInput : readElementChildren(body);
		if (!input || Object.keys(input).length === 0) {
			continue;
		}
		calls.push({ name: tag, input, start, end: endAfterElementClose(text, tag, closeIndex) });
	}
	return calls;
}

/**
 * Tool calls found in `text`, in the order they appear. Returns `[]` for
 * ordinary prose, which is the overwhelming majority of assistant text.
 */
export function parseFabricatedToolCalls(
	text: string,
	options: FabricatedToolCallOptions = {},
): FabricatedToolCall[] {
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

	// Wrapper bodies, closed or not. A closed JSON wrapper is one of the shapes above
	// too, so identical calls are reported once: executing a recovered call twice is
	// the one outcome worse than not recovering it at all.
	const seen = new Set(calls.map(callSignature));
	for (const scanned of [
		...scanWrapperCalls(text),
		...scanElementCalls(text, toNameSet(options.knownToolNames)),
	]) {
		const signature = callSignature(scanned);
		if (seen.has(signature)) {
			continue;
		}
		seen.add(signature);
		calls.push({ name: scanned.name, input: scanned.input });
	}

	return calls.slice(0, MAX_FABRICATED_TOOL_CALLS);
}

function toNameSet(names?: Iterable<string>): Set<string> | undefined {
	if (!names) {
		return undefined;
	}
	return names instanceof Set ? names : new Set(names);
}

/** Identity of a call, for the duplicate check above. */
function callSignature(call: FabricatedToolCall): string {
	try {
		return `${call.name}:${JSON.stringify(call.input)}`;
	} catch {
		return `${call.name}:?`;
	}
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
export function stripFabricatedToolCallMarkup(
	text: string,
	options: FabricatedToolCallOptions = {},
): string {
	if (!text || !text.includes("<")) {
		return text;
	}

	// Every span is measured against `text` itself, then removed in one descending pass:
	// removing a block changes every later offset, and the previous chained-`replace`
	// version could only ever handle one dialect at a time.
	const spans: Array<{ start: number; end: number }> = [];
	for (const match of text.matchAll(invokeBlockPattern())) {
		spans.push({
			start: match.index ?? 0,
			end: (match.index ?? 0) + match[0].length,
		});
	}
	for (const match of text.matchAll(genericBlockPattern())) {
		const tag = match[1] ?? "";
		if (
			RESERVED_TAGS.has(tag.toLowerCase()) ||
			!HAS_PARAMETER_TAG.test(match[3] ?? "")
		) {
			continue;
		}
		spans.push({
			start: match.index ?? 0,
			end: (match.index ?? 0) + match[0].length,
		});
	}
	// Wrapper blocks whose body is a JSON call — with or without a closing tag.
	for (const call of scanWrapperCalls(text)) {
		spans.push({ start: call.start, end: call.end });
	}
	// Element-form blocks: the tag names the tool. Same recognition rule as the
	// parser, so a block this strip removes is always a block the parser would have
	// recovered from (and a block the parser refuses is never removed).
	for (const call of scanElementCalls(text, toNameSet(options.knownToolNames))) {
		spans.push({ start: call.start, end: call.end });
	}
	// A closed wrapper carrying JSON is covered by both the JSON regex and the scanner;
	// overlapping spans are merged below, so the shared text is only removed once.
	if (spans.length === 0) {
		return text;
	}

	let stripped = "";
	let cursor = 0;
	for (const span of spans.sort((a, b) => a.start - b.start)) {
		if (span.start < cursor) {
			cursor = Math.max(cursor, span.end);
			continue;
		}
		stripped += text.slice(cursor, span.start);
		cursor = span.end;
	}
	stripped += text.slice(cursor);

	// Wrapper tags around a removed block (`<tool_call>` left without its body) go too.
	stripped = stripped.replace(wrapperTagPattern(), "");

	if (stripped === text) {
		return text;
	}
	// Removing a block leaves the blank lines that framed it behind.
	return stripped.replace(/\n{3,}/g, "\n\n").trim();
}
