import { describe, expect, it } from "vitest";
import {
	MAX_FABRICATED_TOOL_CALLS,
	parseFabricatedToolCalls,
	stripFabricatedToolCallMarkup,
} from "./fabricated-tool-calls";

// The exact shape a text-mode model produced in the dev.6-fix.24 smoke round
// (prose, then an Anthropic-shaped call block naming a tool that does not exist
// in this runtime).
const GLM_TURN = `แผนของผม:
1. สำรวจ workspace ก่อนว่ามีโฟลเดอร์/ไฟล์อะไรอยู่แล้ว
2. เลือกคอนเซปต์ที่ unique
3. สร้างโฟลเดอร์ของตัวเอง

ขอสำรวจ workspace ก่อนนะครับ

<tool_call>
<invoke name="list_files">
<parameter name="path">d:\\.opencode\\Test-models</parameter>
<parameter name="recursive">false</parameter>
</invoke>
</tool_call>`;

describe("parseFabricatedToolCalls", () => {
	it("recovers an invoke block wrapped in tool_call markup", () => {
		expect(parseFabricatedToolCalls(GLM_TURN)).toEqual([
			{
				name: "list_files",
				input: { path: "d:\\.opencode\\Test-models", recursive: "false" },
			},
		]);
	});

	it("recovers an unwrapped invoke block", () => {
		const calls = parseFabricatedToolCalls(
			'<invoke name="read_files"><parameter name="path">/tmp/a.ts</parameter></invoke>',
		);
		expect(calls).toEqual([
			{ name: "read_files", input: { path: "/tmp/a.ts" } },
		]);
	});

	it("recovers multiple calls in order, including the classic Cline form", () => {
		const calls = parseFabricatedToolCalls(
			[
				'<invoke name="run_commands"><parameter name="commands">[{"command":"ls"}]</parameter></invoke>',
				"<editor>",
				'<parameter name="path">/tmp/b.ts</parameter>',
				'<parameter name="new_text">hello</parameter>',
				"</editor>",
			].join("\n"),
		);
		expect(calls).toEqual([
			{ name: "run_commands", input: { commands: [{ command: "ls" }] } },
			{ name: "editor", input: { path: "/tmp/b.ts", new_text: "hello" } },
		]);
	});

	it("recovers a JSON body inside a wrapper, in both documented shapes", () => {
		expect(
			parseFabricatedToolCalls(
				'<tool_call>{"name": "read_files", "arguments": {"path": "/tmp/a"}}</tool_call>',
			),
		).toEqual([{ name: "read_files", input: { path: "/tmp/a" } }]);

		expect(
			parseFabricatedToolCalls(
				'<tool_calls>[{"name":"editor","arguments":"{\\"path\\":\\"/tmp/c\\"}"}]</tool_calls>',
			),
		).toEqual([{ name: "editor", input: { path: "/tmp/c" } }]);
	});

	it("accepts single-quoted attributes and <param> children", () => {
		expect(
			parseFabricatedToolCalls(
				"<invoke name='search_codebase'><param name='query'>foo</param></invoke>",
			),
		).toEqual([{ name: "search_codebase", input: { query: "foo" } }]);
	});

	it("returns nothing for ordinary prose, even prose containing XML", () => {
		expect(parseFabricatedToolCalls("สวัสดีครับ ผมคือ iCline")).toEqual([]);
		expect(parseFabricatedToolCalls("")).toEqual([]);
		expect(
			parseFabricatedToolCalls('<div class="x"><p>a paragraph</p></div>'),
		).toEqual([]);
		expect(
			parseFabricatedToolCalls("The `editor` tool takes a path and new_text."),
		).toEqual([]);
	});

	it("does not read the same call twice when a wrapper holds an invoke block", () => {
		const calls = parseFabricatedToolCalls(
			'<function_calls><invoke name="read_files"><parameter name="path">/a</parameter></invoke></function_calls>',
		);
		expect(calls).toEqual([{ name: "read_files", input: { path: "/a" } }]);
	});

	it("caps how many calls one message may recover", () => {
		const many = Array.from(
			{ length: MAX_FABRICATED_TOOL_CALLS + 5 },
			(_value, index) =>
				`<invoke name="tool_${index}"><parameter name="path">/p${index}</parameter></invoke>`,
		).join("\n");
		expect(parseFabricatedToolCalls(many)).toHaveLength(
			MAX_FABRICATED_TOOL_CALLS,
		);
	});
});

describe("stripFabricatedToolCallMarkup", () => {
	it("keeps the prose and drops the call block", () => {
		const stripped = stripFabricatedToolCallMarkup(GLM_TURN);
		expect(stripped).toContain("ขอสำรวจ workspace ก่อนนะครับ");
		expect(stripped).not.toContain("invoke");
		expect(stripped).not.toContain("list_files");
		expect(stripped).not.toContain("tool_call");
		expect(stripped).not.toContain("Test-models");
	});

	it("leaves text without a call block byte-identical", () => {
		const text = "ล้วนเป็นข้อความธรรมดา";
		expect(stripFabricatedToolCallMarkup(text)).toBe(text);
		// Even XML-looking prose is untouched when no call block was removed.
		const xml =
			"Use `<tool_call>` to wrap a call and `<invoke name=...>` inside it.";
		expect(stripFabricatedToolCallMarkup(xml)).toBe(xml);
	});

	it("keeps a half-streamed block until its closing tag arrives", () => {
		const partial =
			'<tool_call>\n<invoke name="read_files">\n<parameter name="path">/a';
		expect(stripFabricatedToolCallMarkup(partial)).toBe(partial);
	});

	it("removes every form it can parse", () => {
		expect(
			stripFabricatedToolCallMarkup(
				'work\n<invoke name="read_files"><parameter name="path">/a</parameter></invoke>',
			),
		).toBe("work");
		expect(
			stripFabricatedToolCallMarkup(
				'work\n<tool_call>{"name":"read_files","arguments":{"path":"/a"}}</tool_call>',
			),
		).toBe("work");
		expect(
			stripFabricatedToolCallMarkup(
				'work\n<read_files><parameter name="path">/a</parameter></read_files>',
			),
		).toBe("work");
	});

	it("keeps a wrapper whose body is not a call", () => {
		const text = '<tool_call>{"unrelated": true}</tool_call>';
		expect(stripFabricatedToolCallMarkup(text)).toBe(text);
	});
});
