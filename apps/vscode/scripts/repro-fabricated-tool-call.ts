#!/usr/bin/env bun
import * as os from "node:os"
import * as path from "node:path"
/**
 * Repro harness for the dev.6-fix.24 stall: "the model wrote its tool call as
 * text, and the task never ran".
 *
 * Run:  bun run repro:tool-call-text      (from apps/vscode)
 *
 * Why a script and not a unit test: the vitest config aliases `@cline/core` to a
 * stub, so the unit tests cannot see the tool names the shipped runtime actually
 * registers. This script builds the real tool set with `createBuiltinTools` and
 * drives the real `Agent` loop, which is the code the packaged VSIX executes.
 *
 * The smoke transcript this comes from (GLM 5.3 Flash, fix.24 round 1) answered
 * three turns in a row with, in the text channel:
 *
 *   <tool_call>
 *   <invoke name="list_files">
 *   <parameter name="path">d:\.opencode\Test-models</parameter>
 *   <parameter name="recursive">false</parameter>
 *   </invoke>
 *   </tool_call>
 *
 * No `tool-call` part existed, so the run was reported as completed, nothing
 * executed, and the raw markup was what the user read. What this harness pins:
 *   - the markup never survives into the assistant message or the display text;
 *   - the call is executed, so an unknown name comes back as a tool result that
 *     names the tools that DO exist (the model's only way to self-correct);
 *   - the loop then continues and real work happens.
 */
import { Agent, createBuiltinTools } from "@cline/core"
import type { AgentModel, AgentModelEvent, AgentModelRequest, AgentTool } from "@cline/shared"

const GLM_TURN = `แผนของผม:
1. สำรวจ workspace ก่อนว่ามีโฟลเดอร์/ไฟล์อะไรอยู่แล้ว
2. เลือกคอนเซปต์ที่ unique

ขอสำรวจ workspace ก่อนนะครับ

<tool_call>
<invoke name="list_files">
<parameter name="path">.opencode/Test-models</parameter>
<parameter name="recursive">false</parameter>
</invoke>
</tool_call>`

/**
 * The dev.6-fix.25 round's own turn, byte-for-byte from its transcript
 * (`~/.cline/data/sessions/1789940859679_34wsx`): the tool NAME, then its arguments as
 * bare JSON, and NO closing tag — the dialect that round's parser could not see at all.
 * Its tool name is a real one, so a recovered call must actually RUN, which is the part
 * the invoke-shaped fixture above cannot prove (it only ever reaches the unknown-name
 * branch).
 */
const GLM_FIX25_TURN =
	"ผมจะสำรวจ workspace ก่อนครับ แล้วสร้างงานให้ทันที — เริ่มจากเช็คว่ามีโฟลเดอร์/ไฟล์อะไรอยู่แล้วบ้าง" +
	'<tool_call>run_commands{"commands": ["echo iCline-dialect-four-ok"]}'

interface Check {
	name: string
	ok: boolean
	detail?: string
}

class ScriptedModel implements AgentModel {
	readonly requests: AgentModelRequest[] = []

	constructor(private readonly steps: Array<(req: AgentModelRequest) => Iterable<AgentModelEvent>>) {}

	async stream(request: AgentModelRequest): Promise<AsyncIterable<AgentModelEvent>> {
		this.requests.push(request)
		const step = this.steps.shift()
		if (!step) {
			throw new Error("scripted model ran out of steps")
		}
		return (async function* () {
			for await (const event of step(request)) {
				yield event
			}
		})()
	}
}

function textOf(message: { content: unknown }): string {
	const content = message.content
	if (typeof content === "string") {
		return content
	}
	if (!Array.isArray(content)) {
		return ""
	}
	return content
		.filter((part): part is { type: "text"; text: string } => part?.type === "text")
		.map((part) => part.text)
		.join("\n")
}

async function main(): Promise<void> {
	const fs = await import("node:fs/promises")
	const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "icline-fabricated-call-"))
	const target = path.join(cwd, "index.html")
	await fs.writeFile(target, "<!doctype html><title>hello</title>")

	const tools: AgentTool[] = createBuiltinTools({
		cwd,
		enableReadFiles: true,
		enableBash: true,
		enableSearch: true,
		enableEditor: true,
		enableWebFetch: false,
		enableApplyPatch: false,
		enableSkills: false,
	})
	const toolNames = tools.map((tool) => tool.name)

	const model = new ScriptedModel([
		// Turn 1: the failure from the transcript — a call, but only as text.
		() => [
			{ type: "text-delta", text: GLM_TURN },
			{ type: "finish", reason: "stop" },
		],
		// Turn 2: what the model does once the runtime answers it — a real,
		// natively-declared call this time.
		() => [
			{
				type: "tool-call-delta",
				toolCallId: "real_1",
				toolName: "read_files",
				inputText: JSON.stringify({ path: target }),
			},
			{ type: "finish", reason: "tool-calls" },
		],
		() => [
			{ type: "text-delta", text: "สำรวจแล้วครับ" },
			{ type: "finish", reason: "stop" },
		],
	])

	const agent = new Agent({
		providerId: "anthropic",
		modelId: "claude-fable-5",
		apiKey: "unused-scripted-model",
		model,
		tools,
	})

	const result = await agent.run("สร้าง template HTML สวยๆ ในโฟลเดอร์ของตัวเอง")
	const messages = result.messages
	const assistantTurns = messages.filter((message) => message.role === "assistant")
	const allText = assistantTurns.map((message) => textOf(message)).join("\n")
	const toolResultParts = messages
		.flatMap((message) => message.content)
		.filter((part): part is { type: "tool-result"; output: unknown } => part?.type === "tool-result")
	const errors = toolResultParts
		.flatMap((part) => (Array.isArray(part.output) ? part.output : [part.output]))
		.map((entry) => (entry as { error?: unknown })?.error)
		.filter((error): error is string => typeof error === "string")
	const unknownToolError = errors.find((error) => error.startsWith("Unknown tool"))

	const firstTurn = assistantTurns[0]
	const firstTurnHasCall = firstTurn?.content.some((part) => part.type === "tool-call" && part.toolName === "list_files")
	// The real call is the second one: it must reach the executor, not the
	// unknown-name branch (a successful read carries no `error` at all).
	const realCallRan = toolResultParts.length >= 2 && (await fs.stat(target)).size > 0

	const checks: Check[] = [
		{
			name: "the raw markup never reaches the transcript or the chat text",
			ok: !allText.includes("invoke") && !allText.includes("tool_call") && !allText.includes("recursive"),
			detail: `assistant text: ${JSON.stringify(allText.slice(0, 60))}…`,
		},
		{
			name: "the prose around the call survives",
			ok: allText.includes("ขอสำรวจ workspace ก่อนนะครับ"),
		},
		{
			name: "the fabricated call becomes a real tool-call part on the turn itself",
			ok: firstTurnHasCall === true,
		},
		{
			name: "an unknown name is answered with the tools that exist",
			ok: unknownToolError !== undefined && toolNames.every((name) => unknownToolError.includes(name)),
			detail: unknownToolError,
		},
		{
			name: "the loop continues and a real tool call runs afterwards",
			ok: model.requests.length === 3 && realCallRan,
			detail: `requests=${model.requests.length} tool results=${toolResultParts.length}`,
		},
		{
			name: "the run completes instead of stranding the task",
			ok: result.status === "completed",
			detail: `status=${result.status}`,
		},
	]

	// ---------------------------------------------------------------------------------
	// Scenario 2: the dialect the NEXT smoke round hit — an unclosed `name{json}` block
	// naming a tool that really exists. Recovery must execute it, not just describe it.
	// ---------------------------------------------------------------------------------
	const dialectModel = new ScriptedModel([
		() => [
			{ type: "text-delta", text: GLM_FIX25_TURN },
			{ type: "finish", reason: "stop" },
		],
		() => [
			{ type: "text-delta", text: "สำรวจเสร็จแล้วครับ" },
			{ type: "finish", reason: "stop" },
		],
	])
	const dialectAgent = new Agent({
		providerId: "anthropic",
		modelId: "claude-fable-5",
		apiKey: "unused-scripted-model",
		model: dialectModel,
		tools,
	})
	const dialectResult = await dialectAgent.run("สร้าง template HTML สวยๆ ในโฟลเดอร์ของตัวเอง")
	const dialectAssistantTurns = dialectResult.messages.filter((message) => message.role === "assistant")
	const dialectText = dialectAssistantTurns.map((message) => textOf(message)).join("\n")
	const dialectToolResults = dialectResult.messages
		.flatMap((message) => message.content)
		.filter((part): part is { type: "tool-result"; output: unknown } => part?.type === "tool-result")
	const dialectRecoveredTurn = dialectAssistantTurns[0]
	const dialectHasRunCommands = dialectRecoveredTurn?.content.some(
		(part) => part.type === "tool-call" && part.toolName === "run_commands",
	)
	// The command's own output is the proof it executed rather than being reported.
	const dialectRan = JSON.stringify(dialectToolResults.map((part) => part.output)).includes("iCline-dialect-four-ok")
	checks.push(
		{
			name: "[dialect 4] the unclosed `name{json}` block is stripped from the text",
			ok: !dialectText.includes("tool_call") && !dialectText.includes("commands"),
			detail: `assistant text: ${JSON.stringify(dialectText.slice(0, 60))}…`,
		},
		{
			name: "[dialect 4] the prose before the block survives",
			ok: dialectText.includes("เริ่มจากเช็คว่ามีโฟลเดอร์"),
		},
		{
			name: "[dialect 4] the recovered call becomes a real run_commands part on the turn itself",
			ok: dialectHasRunCommands === true,
		},
		{
			name: "[dialect 4] the recovered call really ran (its output came back)",
			ok: dialectRan,
			detail: `tool results=${dialectToolResults.length} requests=${dialectModel.requests.length}`,
		},
		{
			name: "[dialect 4] the run completes and the model gets the result to act on",
			ok: dialectResult.status === "completed" && dialectModel.requests.length === 2,
			detail: `status=${dialectResult.status}`,
		},
	)

	// ---------------------------------------------------------------------------------
	let failed = 0
	for (const check of checks) {
		if (!check.ok) {
			failed += 1
		}
		const mark = check.ok ? "PASS" : "FAIL"
		const detail = check.detail ? `\n      ${check.detail}` : ""
		console.log(`${mark}  ${check.name}${detail}`)
	}
	console.log(`\nregistered tools: ${toolNames.join(", ")}`)
	console.log(
		`unknown-tool result reaches the model: ${
			model.requests[1]?.messages.some((message) =>
				JSON.stringify(message.content ?? "").includes("Unknown tool: list_files"),
			) === true
		}`,
	)
	process.exitCode = failed === 0 ? 0 : 1
}

await main()
