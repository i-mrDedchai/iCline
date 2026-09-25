// iCline-layer half of the editor write-pipeline harness for the dev.6 "editor
// reported success but the file is not on disk" bug.
//
// Root cause: upstream's `editor` tool rejects input-level failures (chiefly
// `new_text` above its per-call limit) by RETURNING an envelope —
// `{ query, result: "", error: "Editor input too large …", success: false }` — and
// the agent runtime only sets `isError` for THROWN errors. The guardrail used to
// treat such a result as a success, stat a file that was deliberately never
// written, and replace the actionable message with a phantom ENOENT — which is why
// the model kept re-sending the same oversized call (see the smoke transcripts).
//
// This file pins the guardrail's contract. The real-upstream half — that the tool
// still emits exactly that envelope at the current hard ceiling (2,000,000 chars)
// and writes everything below it whole — is `bun run repro:editor-write`
// (apps/vscode/scripts/repro-editor-write.ts), because the vitest config aliases
// `@cline/core` to a stub.
import { promises as fs } from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { EDITOR_CHUNK_CHAR_LIMIT, EDITOR_INPUT_CHAR_LIMIT } from "@/icline/harness/guardrails"
import { buildAgentHooks } from "./hooks-adapter"

const mocks = vi.hoisted(() => ({
	isIclineBuild: vi.fn(() => true),
	getWorkspacePaths: vi.fn(async () => ({ paths: [] as string[] })),
	getHooksEnabledSafe: vi.fn(() => false),
	hasHook: vi.fn(async () => false),
}))

vi.mock("@/registry", () => ({ isIclineBuild: mocks.isIclineBuild }))
vi.mock("@/hosts/host-provider", () => ({
	HostProvider: { workspace: { getWorkspacePaths: mocks.getWorkspacePaths } },
}))
vi.mock("@/core/hooks/hooks-utils", () => ({ getHooksEnabledSafe: mocks.getHooksEnabledSafe }))
vi.mock("@/core/hooks/hook-factory", () => ({
	HookFactory: class {
		hasHook = mocks.hasHook
		create = vi.fn()
	},
}))

/** Builds the exact envelope the upstream tool returns for an oversized input. */
function sizeRejectionEnvelope(chars: number) {
	return {
		query: "edit:/tmp/oversized.css",
		result: "",
		error: `Editor input too large: new_text was ${chars} characters, above the ${EDITOR_INPUT_CHAR_LIMIT}-character per-call limit; nothing was written. Create the file with a first chunk of at most ${EDITOR_CHUNK_CHAR_LIMIT} characters, then append the remaining chunks with \`insert_line\` (line_count + 1 appends at EOF). Do not re-send the oversized call unchanged.`,
		success: false,
	}
}

describe("write-pipeline guardrail (iCline layer)", () => {
	let tmpDir: string

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "icline-write-"))
		// Keep the guardrail's evidence trace inside the sandbox instead of ~/.cline.
		process.env.CLINE_DIR = path.join(tmpDir, "cline-dir")
		mocks.isIclineBuild.mockReturnValue(true)
	})

	afterEach(async () => {
		delete process.env.CLINE_DIR
		await fs.rm(tmpDir, { recursive: true, force: true })
	})

	function makeHooks() {
		return buildAgentHooks({ getGlobalSettingsKey: vi.fn(() => false) } as never)
	}

	async function runGuardrail(input: unknown, output: unknown, isError?: boolean) {
		const hooks = makeHooks()
		return hooks.afterTool?.({
			snapshot: { agentId: "agent-1", conversationId: "conv-1", runId: "run-1" },
			tool: { name: "editor" },
			toolCall: { toolName: "editor", toolCallId: "call-1" },
			input,
			result: { output, isError },
			startedAt: new Date(),
			endedAt: new Date(),
			durationMs: 3,
		} as never)
	}

	function outputOf(result: unknown): string {
		return String((result as { result?: { output?: unknown } } | undefined)?.result?.output ?? "")
	}

	function isErrorOf(result: unknown): boolean | undefined {
		return (result as { result?: { isError?: boolean } } | undefined)?.result?.isError
	}

	it("keeps the mirrored limits in step with the upstream boundary", () => {
		// The repro script asserts both numbers against the real tool's behavior; if
		// upstream moves a boundary, these and that harness must move together.
		// 2000000 is the hard safety ceiling: ordinary writes — including the 40,243-char
		// file the fix.29 smoke chat was refused at — must land in one call, so lowering
		// it back brings the chunked-retry storm back. 32000 is guidance only (the chunk
		// size the recovery recipe names).
		expect(EDITOR_INPUT_CHAR_LIMIT).toBe(2000000)
		expect(EDITOR_CHUNK_CHAR_LIMIT).toBe(32000)
	})

	it("turns an oversized rejection into an actionable error instead of a phantom ENOENT", async () => {
		const target = path.join(tmpDir, "oversized.css")
		const chars = EDITOR_INPUT_CHAR_LIMIT + 2020
		const result = await runGuardrail(
			{ path: target, new_text: "y".repeat(chars) },
			{ ...sizeRejectionEnvelope(chars), query: `edit:${target}` },
		)

		expect(isErrorOf(result)).toBe(true)
		const output = outputOf(result)
		expect(output).toContain("Editor input too large")
		expect(output).toContain(`new_text was ${chars} characters`)
		expect(output).toContain(`above the ${EDITOR_INPUT_CHAR_LIMIT}-character per-call limit`)
		expect(output).toContain(`first chunk of at most ${EDITOR_CHUNK_CHAR_LIMIT} characters`)
		expect(output).toContain("insert_line")
		// ui-guidelines rule 8: the refusal reaches the model as ONE message — the
		// guardrail must not append a second paragraph carrying the same notice.
		expect(output.match(/per-call limit/g)).toHaveLength(1)
		expect(output).not.toContain("The call carried")
		// The old failure mode: a filesystem error that hid the real cause.
		expect(output).not.toContain("Verification failed")
		// And nothing was invented on disk by the verifier.
		await expect(fs.access(target)).rejects.toThrow()
	})

	it("appends sizes and the chunk recipe when the failure message lacks them", async () => {
		const target = path.join(tmpDir, "mystery.txt")
		const chars = EDITOR_INPUT_CHAR_LIMIT + 1
		const result = await runGuardrail(
			{ path: target, new_text: "y".repeat(chars) },
			{
				query: `edit:${target}`,
				result: "",
				error: "Editor operation failed: ENOSPC (no space left on device)",
				success: false,
			},
		)

		expect(isErrorOf(result)).toBe(true)
		const output = outputOf(result)
		expect(output).toContain("Editor operation failed: ENOSPC")
		expect(output).toContain(`The call carried ${chars} characters of new_text`)
		expect(output).toContain(`first chunk of at most ${EDITOR_CHUNK_CHAR_LIMIT} characters of new_text`)
		expect(output).not.toContain("Verification failed")
	})

	it("surfaces an executor-level rejection (same envelope, no size detail)", async () => {
		const target = path.join(tmpDir, "missing.txt")
		const result = await runGuardrail(
			{ path: target, old_text: "nope", new_text: "x" },
			{
				query: `edit:${target}`,
				result: "",
				error: "Editor operation failed: No replacement performed: text not found in missing.txt.",
				success: false,
			},
		)

		expect(isErrorOf(result)).toBe(true)
		expect(outputOf(result)).toContain("No replacement performed")
		// Only the oversize path adds the per-call-limit explanation.
		expect(outputOf(result)).not.toContain("per-call limit")
	})

	it("keeps the tool's own claim when a real success turns out to be missing on disk", async () => {
		const target = path.join(tmpDir, "never-written.css")
		const result = await runGuardrail(
			{ path: target, new_text: "small" },
			{ query: `edit:${target}`, result: `File created successfully at: ${target}`, success: true },
		)

		expect(isErrorOf(result)).toBe(true)
		expect(outputOf(result)).toContain("Verification failed")
		expect(outputOf(result)).toContain("File created successfully at:")
	})

	it("stays quiet when the write really landed, and never rewrites a genuine success", async () => {
		const target = path.join(tmpDir, "written.css")
		await fs.writeFile(target, "body{}", "utf8")
		const result = await runGuardrail(
			{ path: target, new_text: "body{}" },
			{ query: `edit:${target}`, result: `File created successfully at: ${target}`, success: true },
		)

		expect(result).toBeUndefined()
	})

	it("keeps the original message when the tool already threw", async () => {
		const result = await runGuardrail(
			{ path: path.join(tmpDir, "x.css"), new_text: "x" },
			"Editor operation failed: disk full",
			true,
		)
		expect(result).toBeUndefined()
	})

	// The core guard rejects an oversized old_text with its own single message
	// (helpers.ts getEditorSizeError); that refusal must reach the model exactly
	// once too — passed through whole, with no new_text-flavored explanation
	// bolted on beside it. Only the new_text branch had a dedupe test before.
	it("returns an old_text size rejection once, without new_text guidance", async () => {
		const target = path.join(tmpDir, "old-text.txt")
		const chars = EDITOR_INPUT_CHAR_LIMIT + 1
		const message = `Editor input too large: old_text was ${chars} characters, above the ${EDITOR_INPUT_CHAR_LIMIT}-character per-call limit; nothing was written. Create the file with a first chunk of at most ${EDITOR_CHUNK_CHAR_LIMIT} characters, then append the remaining chunks with \`insert_line\` (line_count + 1 appends at EOF). Do not re-send the oversized call unchanged.`
		const result = await runGuardrail(
			{ path: target, old_text: "x".repeat(chars), new_text: "replacement" },
			{ query: `edit:${target}`, result: "", error: message, success: false },
		)

		expect(isErrorOf(result)).toBe(true)
		const output = outputOf(result)
		expect(output).toBe(message)
		expect(output.match(/per-call limit/g)).toHaveLength(1)
		expect(output).not.toContain("The call carried")
	})

	// fix.7's other half: the tool claims success but the file is not on disk AND
	// the input was oversized — the appended explanation must appear exactly once
	// beside the verification failure (the fix.29 chat's two-paragraph notice was
	// an append running on top of a message that already carried the notice).
	it("appends the oversize explanation once when verification fails on an oversized input", async () => {
		const target = path.join(tmpDir, "vanished.css")
		const chars = EDITOR_INPUT_CHAR_LIMIT + 1
		const result = await runGuardrail(
			{ path: target, new_text: "y".repeat(chars) },
			{ query: `edit:${target}`, result: `File created successfully at: ${target}`, success: true },
		)

		expect(isErrorOf(result)).toBe(true)
		const output = outputOf(result)
		expect(output).toContain("Verification failed")
		expect(output).toContain("File created successfully at:")
		expect(output).toContain(`The call carried ${chars} characters of new_text`)
		expect(output.match(/per-call limit/g)).toHaveLength(1)
	})
})
