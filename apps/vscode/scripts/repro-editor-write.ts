#!/usr/bin/env bun
import { promises as fs } from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
/**
 * Repro harness for the dev.6 "editor reported success but the file is not on disk"
 * bug — the real-upstream half.
 *
 * Run:  bun run repro:editor-write        (from apps/vscode)
 *
 * Why a script and not a unit test: the vitest config aliases `@cline/core` to a
 * stub, and the `bun test` runner hits an ESM interop issue with the core bundle's
 * lazy module init (the export key exists but reads as undefined). Running the same
 * code as a normal script resolves `@cline/core` to the real dist, which is what the
 * packaged VSIX executes.
 *
 * What it proves, against the real tool:
 *   - a create at the per-call input limit (32000 chars since dev.6-fix.23, was 6000)
 *     writes the file;
 *   - one character over is REJECTED before touching disk, as a returned envelope
 *     (`success: false` + `error`) — NOT a thrown error, so `isError` is never set;
 *     that envelope is what the iCline post-write guardrail must detect
 *     (`apps/vscode/src/sdk/hooks-adapter.ts`);
 *   - a four-call parallel batch behaves the same per call (the smoke-transcript
 *     shape: the sizes that used to be rejected now land in one call each);
 *   - the same limit applies to edits, and a rejected edit leaves the file untouched.
 */
import { type AgentToolContext, createDefaultTools, createEditorExecutor, type EditFileInput } from "@cline/core"

/** Mirrors EDITOR_INPUT_CHAR_LIMIT in src/icline/harness/guardrails.ts. */
const EXPECTED_LIMIT = 32000

interface ToolOperationResultLike {
	query?: string
	result?: string
	error?: string
	success?: boolean
}

type EditorToolLike = {
	execute(input: EditFileInput, context: AgentToolContext): Promise<ToolOperationResultLike>
}

function toolContext(): AgentToolContext {
	return {
		agentId: "harness",
		conversationId: "harness",
		sessionId: "harness",
		toolCallId: `call-${Math.random().toString(36).slice(2, 10)}`,
		iteration: 1,
	} as unknown as AgentToolContext
}

function makeEditorTool(cwd: string): EditorToolLike {
	const tools = createDefaultTools({
		cwd,
		executors: { editor: createEditorExecutor() },
		enableEditor: true,
		enableReadFiles: false,
		enableSearch: false,
		enableBash: false,
		enableWebFetch: false,
		enableApplyPatch: false,
		enableSkills: false,
		enableAskQuestion: false,
	})
	const editorTool = tools.find((tool) => tool.name === "editor")
	if (!editorTool) {
		throw new Error("editor tool missing from createDefaultTools")
	}
	return editorTool as unknown as EditorToolLike
}

const failures: string[] = []

function check(label: string, ok: boolean, detail: string): void {
	const status = ok ? "PASS" : "FAIL"
	console.log(`${status}  ${label}${detail ? `\n        ${detail}` : ""}`)
	if (!ok) {
		failures.push(label)
	}
}

async function readIfExists(filePath: string): Promise<string | undefined> {
	try {
		return await fs.readFile(filePath, "utf8")
	} catch {
		return undefined
	}
}

async function main(): Promise<void> {
	const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "icline-repro-write-"))
	console.log(`harness cwd: ${cwd}\n`)

	try {
		const editor = makeEditorTool(cwd)

		// 1) Boundary: the limit itself must write.
		const atLimitPath = path.join(cwd, "at-limit.css")
		const atLimit = await editor.execute({ path: atLimitPath, new_text: "a".repeat(EXPECTED_LIMIT) }, toolContext())
		check(
			`create at ${EXPECTED_LIMIT} chars succeeds and lands`,
			atLimit.success === true && (await readIfExists(atLimitPath))?.length === EXPECTED_LIMIT,
			`success=${String(atLimit.success)} error=${String(atLimit.error)} fileChars=${String((await readIfExists(atLimitPath))?.length)}`,
		)

		// 2) One character over: rejected, nothing on disk, envelope (not a throw).
		const overPath = path.join(cwd, "over-limit.css")
		const over = await editor.execute({ path: overPath, new_text: "a".repeat(EXPECTED_LIMIT + 1) }, toolContext())
		check(
			`create at ${EXPECTED_LIMIT + 1} chars is rejected without writing`,
			over.success === false &&
				/Editor input too large/.test(over.error ?? "") &&
				(await readIfExists(overPath)) === undefined,
			`success=${String(over.success)} file=${String(await readIfExists(overPath))}\n        error="${String(over.error).slice(0, 120)}…"`,
		)
		check(
			"the rejection is a returned envelope, so isError never gets set for the guardrail",
			over.result === "" && typeof over.error === "string" && over.error.length > 0,
			`result=${JSON.stringify(over.result)} errorType=${typeof over.error}`,
		)

		// 3) Oversized edit of an existing file: rejected, file untouched.
		const editPath = path.join(cwd, "existing.css")
		await fs.writeFile(editPath, "anchor", "utf8")
		const edit = await editor.execute(
			{ path: editPath, old_text: "anchor", new_text: "b".repeat(EXPECTED_LIMIT + 1) },
			toolContext(),
		)
		check(
			"oversized edit is rejected and leaves the file untouched",
			edit.success === false && (await readIfExists(editPath)) === "anchor",
			`success=${String(edit.success)} fileContent=${JSON.stringify(await readIfExists(editPath))}`,
		)

		// 4) Parallel batch — the shape that produced the smoke failures, with the
		// sizes that actually appeared in that transcript (5000/7020/6741/4963) plus
		// one payload that is genuinely above the limit. Before fix.23 the three
		// mid-size files were rejected and re-sent as chunks; now only the last one is.
		const batch = [
			{ name: "01-shell.html", size: 5000 },
			{ name: "02-base.css", size: 7020 },
			{ name: "03-hero.html", size: 6741 },
			{ name: "04-deck.css", size: EXPECTED_LIMIT + 500 },
		]
		const results = await Promise.all(
			batch.map((entry) =>
				editor.execute({ path: path.join(cwd, entry.name), new_text: "x".repeat(entry.size) }, toolContext()),
			),
		)
		const onDisk = await Promise.all(
			batch.map(async (entry) => ((await readIfExists(path.join(cwd, entry.name))) ? "yes" : "no")),
		)
		console.log(
			`\n      parallel batch: ${batch.map((entry, i) => `${entry.name}(${entry.size})=${String(results[i].success)}/${onDisk[i]}`).join("  ")}`,
		)
		check(
			"parallel batch: every realistic file size lands in one call; only the oversized one is rejected",
			results.map((r) => r.success).join(",") === "true,true,true,false" && onDisk.join(",") === "yes,yes,yes,no",
			`success=[${results.map((r) => String(r.success)).join(",")}] onDisk=[${onDisk.join(",")}]`,
		)
	} finally {
		await fs.rm(cwd, { recursive: true, force: true })
	}

	console.log("")
	if (failures.length > 0) {
		console.error(`RESULT: FAIL (${failures.length} check(s)) — ${failures.join("; ")}`)
		process.exit(1)
	}
	console.log("RESULT: PASS — the per-call limit rejects with a non-error envelope and never writes partial output.")
}

await main()
