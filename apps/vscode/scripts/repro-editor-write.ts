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
 *   - ordinary writes land whole, in one call: the old 32k guidance size, the exact
 *     40,243 characters the dev.6-fix.29 smoke chat was refused at, and the hard
 *     ceiling itself (2,000,000 chars since this build) all write successfully;
 *   - one character over the ceiling is REJECTED before touching disk, as a returned
 *     envelope (`success: false` + `error`) — NOT a thrown error, so `isError` is
 *     never set; that envelope is what the iCline post-write guardrail must detect
 *     (`apps/vscode/src/sdk/hooks-adapter.ts`), and its message names the real size,
 *     the hard limit, "nothing was written", and the chunk recipe;
 *   - a multi-call parallel batch behaves the same per call (only the over-ceiling
 *     payload is refused);
 *   - the same limit applies to edits, and a rejected edit leaves the file untouched;
 *   - the atomic write (temp file + rename) leaves no `.icline-tmp` litter behind.
 */
import { type AgentToolContext, createDefaultTools, createEditorExecutor, type EditFileInput } from "@cline/core"

/** Mirrors EDITOR_INPUT_CHAR_LIMIT in src/icline/harness/guardrails.ts (hard ceiling). */
const EXPECTED_HARD_LIMIT = 2_000_000

/** Mirrors EDITOR_CHUNK_CHAR_LIMIT — the chunk size the recovery recipe recommends. */
const EXPECTED_CHUNK_LIMIT = 32_000

/** The new_text size the dev.6-fix.29 smoke chat was refused at under the old 32k wall. */
const SMOKE_TRANSCRIPT_SIZE = 40_243

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

		// 1) The old guidance size still writes (it always did since fix.23).
		const atChunkPath = path.join(cwd, "at-chunk.css")
		const atChunk = await editor.execute({ path: atChunkPath, new_text: "a".repeat(EXPECTED_CHUNK_LIMIT) }, toolContext())
		check(
			`create at ${EXPECTED_CHUNK_LIMIT} chars (guidance size) succeeds`,
			atChunk.success === true && (await readIfExists(atChunkPath))?.length === EXPECTED_CHUNK_LIMIT,
			`success=${String(atChunk.success)} error=${String(atChunk.error)}`,
		)

		// 2) The exact size the fix.29 smoke chat was refused at lands in ONE call.
		const smokePath = path.join(cwd, "smoke-transcript.css")
		const smoke = await editor.execute({ path: smokePath, new_text: "b".repeat(SMOKE_TRANSCRIPT_SIZE) }, toolContext())
		check(
			`create at ${SMOKE_TRANSCRIPT_SIZE} chars (the refused transcript size) succeeds in one call`,
			smoke.success === true && (await readIfExists(smokePath))?.length === SMOKE_TRANSCRIPT_SIZE,
			`success=${String(smoke.success)} error=${String(smoke.error)}`,
		)

		// 3) Boundary: the hard ceiling itself must write.
		const atHardPath = path.join(cwd, "at-hard.txt")
		const atHard = await editor.execute({ path: atHardPath, new_text: "c".repeat(EXPECTED_HARD_LIMIT) }, toolContext())
		check(
			`create at the hard ceiling (${EXPECTED_HARD_LIMIT} chars) succeeds`,
			atHard.success === true && (await readIfExists(atHardPath))?.length === EXPECTED_HARD_LIMIT,
			`success=${String(atHard.success)} error=${String(atHard.error)} fileChars=${String((await readIfExists(atHardPath))?.length)}`,
		)

		// 4) One character over the ceiling: rejected, nothing on disk, envelope (not a throw).
		const overPath = path.join(cwd, "over-limit.txt")
		const over = await editor.execute({ path: overPath, new_text: "d".repeat(EXPECTED_HARD_LIMIT + 1) }, toolContext())
		const recipeNamesChunkSize = (over.error ?? "").includes(`first chunk of at most ${EXPECTED_CHUNK_LIMIT} characters`)
		check(
			`create at ${EXPECTED_HARD_LIMIT + 1} chars is rejected without writing`,
			over.success === false &&
				/Editor input too large/.test(over.error ?? "") &&
				(over.error ?? "").includes(`${EXPECTED_HARD_LIMIT + 1} characters`) &&
				(over.error ?? "").includes(`${EXPECTED_HARD_LIMIT}-character per-call limit`) &&
				recipeNamesChunkSize &&
				(await readIfExists(overPath)) === undefined,
			`success=${String(over.success)} file=${String(await readIfExists(overPath))}\n        error="${String(over.error).slice(0, 220)}…"`,
		)
		check(
			"the rejection is a returned envelope, so isError never gets set for the guardrail",
			over.result === "" && typeof over.error === "string" && over.error.length > 0,
			`result=${JSON.stringify(over.result)} errorType=${typeof over.error}`,
		)

		// 5) Oversized edit of an existing file: rejected, file untouched.
		const editPath = path.join(cwd, "existing.txt")
		await fs.writeFile(editPath, "anchor", "utf8")
		const edit = await editor.execute(
			{ path: editPath, old_text: "anchor", new_text: "e".repeat(EXPECTED_HARD_LIMIT + 1) },
			toolContext(),
		)
		check(
			"oversized edit is rejected and leaves the file untouched",
			edit.success === false && (await readIfExists(editPath)) === "anchor",
			`success=${String(edit.success)} fileContent=${JSON.stringify((await readIfExists(editPath))?.slice(0, 40))}`,
		)

		// 6) Parallel batch — the shape that produced the smoke failures: every
		// realistic size lands in one call each; only the over-ceiling payload is
		// refused. 40243 is the transcript size, 5000/7020/6741 the older ones.
		const batch = [
			{ name: "01-shell.html", size: 5000 },
			{ name: "02-base.css", size: 7020 },
			{ name: "03-hero.html", size: 6741 },
			{ name: "04-audit.js", size: SMOKE_TRANSCRIPT_SIZE },
			{ name: "05-garbage.txt", size: EXPECTED_HARD_LIMIT + 500 },
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
			"parallel batch: every realistic file size lands in one call; only the over-ceiling one is rejected",
			results.map((r) => r.success).join(",") === "true,true,true,true,false" && onDisk.join(",") === "yes,yes,yes,yes,no",
			`success=[${results.map((r) => String(r.success)).join(",")}] onDisk=[${onDisk.join(",")}]`,
		)

		// 7) The atomic write's temp files are all renamed away — none may linger.
		const leftovers = (await fs.readdir(cwd)).filter((name) => name.includes(".icline-tmp"))
		check(
			"no .icline-tmp files are left behind by any of the writes",
			leftovers.length === 0,
			`leftovers=[${leftovers.join(", ")}]`,
		)
	} finally {
		await fs.rm(cwd, { recursive: true, force: true })
	}

	console.log("")
	if (failures.length > 0) {
		console.error(`RESULT: FAIL (${failures.length} check(s)) — ${failures.join("; ")}`)
		process.exit(1)
	}
	console.log(
		"RESULT: PASS — ordinary writes land whole in one call; only payloads above the hard ceiling are rejected (envelope, no disk writes, no temp litter).",
	)
}

await main()
