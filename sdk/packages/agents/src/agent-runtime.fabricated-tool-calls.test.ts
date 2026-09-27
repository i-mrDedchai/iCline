import type {
	AgentMessage,
	AgentModel,
	AgentModelEvent,
	AgentModelRequest,
	AgentRuntimeEvent,
	AgentTool,
} from "@cline/shared";
import { describe, expect, it } from "vitest";
import { AgentRuntime } from "./agent-runtime";

class ScriptedModel implements AgentModel {
	public readonly requests: AgentModelRequest[] = [];

	constructor(
		private readonly steps: Array<
			(
				request: AgentModelRequest,
			) => Iterable<AgentModelEvent> | AsyncIterable<AgentModelEvent>
		>,
	) {}

	async stream(
		request: AgentModelRequest,
	): Promise<AsyncIterable<AgentModelEvent>> {
		this.requests.push(request);
		const step = this.steps.shift();
		if (!step) {
			throw new Error("No scripted model step available");
		}
		return toAsyncIterable(step(request));
	}
}

async function* toAsyncIterable(
	events: Iterable<AgentModelEvent> | AsyncIterable<AgentModelEvent>,
): AsyncIterable<AgentModelEvent> {
	for await (const event of events) {
		yield event;
	}
}

const createEchoTool = (): AgentTool<{ text: string }, { echoed: string }> => ({
	name: "echo",
	description: "Echo input text",
	inputSchema: { type: "object" },
	async execute(input) {
		return { echoed: input.text };
	},
});

function toolResults(messages: readonly AgentMessage[]): unknown[] {
	return messages
		.flatMap((message) => message.content)
		.filter((part) => part.type === "tool-result")
		.map((part) => (part.type === "tool-result" ? part.output : undefined));
}

// The turn that stranded a real smoke-test chat: prose, then a call block naming
// a tool this runtime does not ship, written entirely in the text channel.
const TEXT_CALL_MARKUP = [
	"แผนของผม: สำรวจ workspace ก่อน",
	"",
	"<tool_call>",
	'<invoke name="list_files">',
	'<parameter name="path">d:\\.opencode\\Test-models</parameter>',
	'<parameter name="recursive">false</parameter>',
	"</invoke>",
	"</tool_call>",
].join("\n");

describe("AgentRuntime fabricated tool-call recovery", () => {
	it("executes a call the model wrote as text, and strips the markup from the turn", async () => {
		const model = new ScriptedModel([
			() => [
				{
					type: "text-delta",
					text: 'ตรงนี้ครับ\n<invoke name="echo">\n<parameter name="text">hi</parameter>\n</invoke>',
				},
				{ type: "finish", reason: "stop" },
			],
			() => [
				{ type: "text-delta", text: "done" },
				{ type: "finish", reason: "stop" },
			],
		]);
		const runtime = new AgentRuntime({ model, tools: [createEchoTool()] });

		const result = await runtime.run("echo hi");

		expect(result.status).toBe("completed");
		// The recovered call really ran, and the loop asked the model again.
		expect(toolResults(result.messages)).toEqual([{ echoed: "hi" }]);
		expect(model.requests).toHaveLength(2);
		const firstAssistant = result.messages.find(
			(message) =>
				message.role === "assistant" &&
				message.content.some((part) => part.type === "tool-call"),
		);
		expect(firstAssistant?.content).toMatchObject([
			{ type: "text", text: "ตรงนี้ครับ" },
			{ type: "tool-call", toolName: "echo", input: { text: "hi" } },
		]);
	});

	it("executes the unclosed `name{json}` block the fix.25 smoke round produced", async () => {
		// The shape that stalled that round: the tool name, then bare JSON, and no
		// closing tag at all — so the turn looked like a finished answer, nothing
		// ran, and the model wrote the identical block again on the next turn.
		const model = new ScriptedModel([
			() => [
				{
					type: "text-delta",
					text: 'จะสำรวจก่อนครับ<tool_call>echo{"text": "hi"}',
				},
				{ type: "finish", reason: "stop" },
			],
			() => [
				{ type: "text-delta", text: "done" },
				{ type: "finish", reason: "stop" },
			],
		]);
		const runtime = new AgentRuntime({ model, tools: [createEchoTool()] });

		const result = await runtime.run("สำรวจ workspace");

		expect(result.status).toBe("completed");
		expect(toolResults(result.messages)).toEqual([{ echoed: "hi" }]);
		expect(model.requests).toHaveLength(2);
		const recoveredTurn = result.messages.find(
			(message) =>
				message.role === "assistant" &&
				message.content.some((part) => part.type === "tool-call"),
		);
		expect(recoveredTurn?.content).toMatchObject([
			{ type: "text", text: "จะสำรวจก่อนครับ" },
			{ type: "tool-call", toolName: "echo", input: { text: "hi" } },
		]);
		// The next request carries the recovered call AND its result: that feedback
		// is the only thing that stops the model repeating the markup.
		const secondRequest = JSON.stringify(model.requests[1]);
		expect(secondRequest).toContain("echoed");
	});

	it("executes the element-form turn the fix.26 smoke round produced", async () => {
		// The shape that stalled that round: the tool name as the tag, its arguments as
		// child elements (`<cmd>…`), the closing tag written twice, and no call syntax
		// anywhere — so every earlier dialect walked past it.
		const model = new ScriptedModel([
			() => [
				{
					type: "text-delta",
					text: 'จะเริ่มเลยครับ ✨<echo>\n<text>hi</text>\n</echo></echo>',
				},
				{ type: "finish", reason: "stop" },
			],
			() => [
				{ type: "text-delta", text: "done" },
				{ type: "finish", reason: "stop" },
			],
		]);
		const runtime = new AgentRuntime({ model, tools: [createEchoTool()] });

		const result = await runtime.run("hi");

		expect(result.status).toBe("completed");
		expect(toolResults(result.messages)).toEqual([{ echoed: "hi" }]);
		expect(model.requests).toHaveLength(2);
		const recoveredTurn = result.messages.find(
			(message) =>
				message.role === "assistant" &&
				message.content.some((part) => part.type === "tool-call"),
		);
		// Prose kept, block gone, call adopted — and no orphan `</echo>` behind it.
		expect(recoveredTurn?.content).toMatchObject([
			{ type: "text", text: "จะเริ่มเลยครับ ✨" },
			{ type: "tool-call", toolName: "echo", input: { text: "hi" } },
		]);
	});

	it("leaves real HTML in a turn that also made a call", async () => {
		// The same smoke round asked for an HTML page, so markup the model is *writing*
		// shares the text channel with the markup it is *calling* with. Only the call
		// goes: an element whose name is not a tool stays exactly as written.
		const model = new ScriptedModel([
			() => [
				{
					type: "text-delta",
					text: '<section class="hero"><h1>Theme</h1></section>\n<echo>\n<text>hi</text>\n</echo>',
				},
				{ type: "finish", reason: "stop" },
			],
			() => [
				{ type: "text-delta", text: "done" },
				{ type: "finish", reason: "stop" },
			],
		]);
		const runtime = new AgentRuntime({ model, tools: [createEchoTool()] });

		const result = await runtime.run("hi");

		expect(toolResults(result.messages)).toEqual([{ echoed: "hi" }]);
		const assistantText = result.messages
			.flatMap((message) => message.content)
			.filter((part) => part.type === "text")
			.map((part) => (part.type === "text" ? part.text : ""))
			.join("\n");
		expect(assistantText).toContain('<section class="hero"><h1>Theme</h1></section>');
		expect(assistantText).not.toContain("<echo>");
	});

	it("announces the recovery in the transcript instead of doing it silently", async () => {
		const model = new ScriptedModel([
			() => [
				{ type: "text-delta", text: 'ครับ<tool_call>echo{"text": "hi"}' },
				{ type: "finish", reason: "stop" },
			],
			() => [
				{ type: "text-delta", text: "done" },
				{ type: "finish", reason: "stop" },
			],
		]);
		const runtime = new AgentRuntime({ model, tools: [createEchoTool()] });
		const notices: Array<{
			message: string;
			metadata?: Record<string, unknown>;
		}> = [];
		runtime.subscribe((event: AgentRuntimeEvent) => {
			if (event.type === "status-notice") {
				notices.push({ message: event.message, metadata: event.metadata });
			}
		});

		await runtime.run("hi");

		const recovered = notices.filter(
			(notice) => notice.metadata?.kind === "fabricated_tool_calls_recovered",
		);
		expect(recovered).toHaveLength(1);
		expect(recovered[0]?.message).toContain("echo");
		expect(recovered[0]?.message).toContain("as text");
	});

	it("strips stray markup from a turn that already made a real call", async () => {
		// A native call and leftover markup in the same turn: the call runs once,
		// and the user still never reads wire format.
		const model = new ScriptedModel([
			() => [
				{ type: "text-delta", text: "ทำเลยครับ" },
				{
					type: "tool-call-delta",
					toolCallId: "call_1",
					toolName: "echo",
					input: { text: "native" },
				},
				{ type: "text-delta", text: '<tool_call>echo{"text": "duplicated"}' },
				{ type: "finish", reason: "stop" },
			],
			() => [
				{ type: "text-delta", text: "done" },
				{ type: "finish", reason: "stop" },
			],
		]);
		const runtime = new AgentRuntime({ model, tools: [createEchoTool()] });

		const result = await runtime.run("hi");

		expect(toolResults(result.messages)).toEqual([{ echoed: "native" }]);
		const assistantText = result.messages
			.flatMap((message) => message.content)
			.filter((part) => part.type === "text")
			.map((part) => (part.type === "text" ? part.text : ""))
			.join("\n");
		expect(assistantText).not.toContain("tool_call");
	});

	it("answers a recovered call with an unknown name by listing the real tools", async () => {
		const model = new ScriptedModel([
			() => [
				{ type: "text-delta", text: TEXT_CALL_MARKUP },
				{ type: "finish", reason: "stop" },
			],
			() => [
				{ type: "text-delta", text: "ใช้ read_files แทน" },
				{ type: "finish", reason: "stop" },
			],
		]);
		const runtime = new AgentRuntime({ model, tools: [createEchoTool()] });

		const result = await runtime.run("สำรวจ workspace");

		expect(result.status).toBe("completed");
		// The invented name is not executed, but it is not swallowed either: the
		// model is told the name is unknown and what to use instead.
		expect(toolResults(result.messages)).toEqual([
			{ error: "Unknown tool: list_files. Available tools: echo" },
		]);
		expect(model.requests).toHaveLength(2);
		// The markup never reaches the transcript or the display text.
		const firstAssistantText = result.messages
			.flatMap((message) => message.content)
			.filter((part) => part.type === "text")
			.map((part) => (part.type === "text" ? part.text : ""))
			.join("\n");
		expect(firstAssistantText).not.toContain("invoke");
		expect(firstAssistantText).not.toContain("list_files");
		expect(firstAssistantText).toContain("แผนของผม: สำรวจ workspace ก่อน");
	});

	it("strips the markup from the streamed text as it arrives", async () => {
		const model = new ScriptedModel([
			() => [
				{ type: "text-delta", text: "explaining\n" },
				{
					type: "text-delta",
					text: '<tool_call><invoke name="echo"><parameter name="text">x</parameter></invoke></tool_call>',
				},
				{ type: "finish", reason: "stop" },
			],
			() => [
				{ type: "text-delta", text: "ok" },
				{ type: "finish", reason: "stop" },
			],
		]);
		const runtime = new AgentRuntime({ model, tools: [createEchoTool()] });
		const streamed: string[] = [];
		runtime.subscribe((event: AgentRuntimeEvent) => {
			if (event.type === "assistant-text-delta") {
				streamed.push(event.accumulatedText);
			}
		});

		await runtime.run("echo x");

		// The accumulated text is re-rendered on every delta: the call block is gone
		// as soon as it closes, and the next turn's buffer starts empty again.
		expect(streamed[0]).toBe("explaining\n");
		expect(streamed[1]).toBe("explaining");
		expect(streamed.at(-1)).toBe("ok");
	});

	it("leaves a turn with no fabricated markup alone", async () => {
		const model = new ScriptedModel([
			() => [
				{ type: "text-delta", text: "nothing to recover here" },
				{ type: "finish", reason: "stop" },
			],
		]);
		const runtime = new AgentRuntime({ model, tools: [createEchoTool()] });

		const result = await runtime.run("hi");

		expect(model.requests).toHaveLength(1);
		expect(result.outputText).toBe("nothing to recover here");
		expect(toolResults(result.messages)).toEqual([]);
	});

	it("does not recover a truncated turn", async () => {
		// A block cut off by the output limit may be missing arguments: running it
		// would execute a guess. The truncated call is never recovered — the run
		// continues with a nudge instead, and the guessed call still does not run.
		const model = new ScriptedModel([
			() => [
				{ type: "text-delta", text: TEXT_CALL_MARKUP },
				{ type: "finish", reason: "max-tokens" },
			],
			() => [
				{ type: "text-delta", text: "continued" },
				{ type: "finish", reason: "stop" },
			],
		]);
		const runtime = new AgentRuntime({ model, tools: [createEchoTool()] });

		const result = await runtime.run("hi");

		expect(result.status).toBe("completed");
		expect(toolResults(result.messages)).toEqual([]);
		expect(model.requests).toHaveLength(2);
	});

	it("never recovers more calls than the cap allows", async () => {
		const markup = Array.from(
			{ length: 30 },
			(_value, index) =>
				`<invoke name="echo"><parameter name="text">t${index}</parameter></invoke>`,
		).join("\n");
		const model = new ScriptedModel([
			() => [
				{ type: "text-delta", text: markup },
				{ type: "finish", reason: "stop" },
			],
			() => [
				{ type: "text-delta", text: "ok" },
				{ type: "finish", reason: "stop" },
			],
		]);
		const runtime = new AgentRuntime({ model, tools: [createEchoTool()] });

		const result = await runtime.run("many");

		expect(toolResults(result.messages)).toHaveLength(16);
	});
});
