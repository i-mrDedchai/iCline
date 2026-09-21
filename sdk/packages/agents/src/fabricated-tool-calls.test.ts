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

// Byte-for-byte the tail of the assistant turn that stalled the dev.6-fix.25
// smoke round (`~/.cline/data/sessions/1789940859679_34wsx`): same model, same
// free cline route, but the call comes as the tool NAME followed by bare JSON
// and NO closing tag — the shape dialect 3's regex could not see, which is why
// nothing ran and the model repeated the identical block on the next turn.
const GLM_FIX25_TURN =
	"ผมจะสำรวจ workspace ก่อนครับ แล้วสร้างงานให้ทันที — เริ่มจากเช็คว่ามีโฟลเดอร์/ไฟล์อะไรอยู่แล้วบ้าง เพื่อเลือกธีมที่ไม่ซ้ำและตั้งลำดับโฟลเดอร์ให้ถูกต้องครับ" +
	'<tool_call>run_commands{"commands": ["dir /b \\"d:\\\\.opencode\\\\Test-models\\"", "dir /b /ad \\"d:\\\\.opencode\\\\Test-models\\""]}';

describe("parseFabricatedToolCalls", () => {
	it("recovers the unclosed `name{json}` wrapper the fix.25 smoke round produced", () => {
		expect(parseFabricatedToolCalls(GLM_FIX25_TURN)).toEqual([
			{
				name: "run_commands",
				input: {
					commands: [
						'dir /b "d:\\.opencode\\Test-models"',
						'dir /b /ad "d:\\.opencode\\Test-models"',
					],
				},
			},
		]);
	});

	it("recovers the same shape when the model does write a closing tag", () => {
		expect(
			parseFabricatedToolCalls(
				'<tool_call>read_files{"path": "/tmp/a"}</tool_call>',
			),
		).toEqual([{ name: "read_files", input: { path: "/tmp/a" } }]);
	});

	it("recovers a bare wrapper whose body is a JSON call object", () => {
		expect(
			parseFabricatedToolCalls(
				'<tool_calls>{"name": "editor", "arguments": {"path": "/a"}}',
			),
		).toEqual([{ name: "editor", input: { path: "/a" } }]);
	});

	it("reads a brace inside a quoted argument without ending the value early", () => {
		expect(
			parseFabricatedToolCalls(
				'<tool_call>run_commands{"commands": ["echo }"]}',
			),
		).toEqual([{ name: "run_commands", input: { commands: ["echo }"] } }]);
	});

	it("refuses a call whose JSON never closes — a cut-off turn must not run", () => {
		expect(
			parseFabricatedToolCalls('<tool_call>run_commands{"commands": ["dir /b'),
		).toEqual([]);
		expect(parseFabricatedToolCalls("<tool_call>run_commands")).toEqual([]);
	});

	it("does not report a closed JSON wrapper twice", () => {
		const calls = parseFabricatedToolCalls(
			'<tool_call>{"name": "read_files", "arguments": {"path": "/a"}}</tool_call>',
		);
		expect(calls).toEqual([{ name: "read_files", input: { path: "/a" } }]);
	});

	it("leaves a wrapper holding an invoke block to the invoke scanner", () => {
		const calls = parseFabricatedToolCalls(
			'<tool_call><invoke name="read_files"><parameter name="path">/a</parameter></invoke></tool_call>',
		);
		expect(calls).toEqual([{ name: "read_files", input: { path: "/a" } }]);
	});

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

	it("drops the unclosed `name{json}` block and keeps the prose before it", () => {
		const stripped = stripFabricatedToolCallMarkup(GLM_FIX25_TURN);
		expect(stripped).toBe(
			"ผมจะสำรวจ workspace ก่อนครับ แล้วสร้างงานให้ทันที — เริ่มจากเช็คว่ามีโฟลเดอร์/ไฟล์อะไรอยู่แล้วบ้าง เพื่อเลือกธีมที่ไม่ซ้ำและตั้งลำดับโฟลเดอร์ให้ถูกต้องครับ",
		);
	});

	it("drops the block whether or not the model closed the wrapper", () => {
		expect(
			stripFabricatedToolCallMarkup(
				'work\n<tool_call>read_files{"path": "/a"}',
			),
		).toBe("work");
		expect(
			stripFabricatedToolCallMarkup(
				'work\n<tool_call>read_files{"path": "/a"}</tool_call>',
			),
		).toBe("work");
	});

	it("keeps text that merely describes the markup", () => {
		const text =
			"A call looks like `<tool_call>read_files{...}` in the text channel.";
		expect(stripFabricatedToolCallMarkup(text)).toBe(text);
	});
});
