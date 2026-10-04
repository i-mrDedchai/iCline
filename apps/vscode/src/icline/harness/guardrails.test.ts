import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
	applyIclineAgentIdentity,
	EDITOR_CHUNK_CHAR_LIMIT,
	EDITOR_INPUT_CHAR_LIMIT,
	getIclineHarnessOverlay,
	getLargeWriteGuidance,
	getProviderDisplayName,
	PROVIDER_DISPLAY_NAMES,
	verifyWrittenFile,
} from "./guardrails"

// Classic-Cline tool names that do NOT exist in the SDK runtime. The runtime
// exposes: skills, read_files, search_codebase, fetch_web_content, editor,
// ask_question, attempt_completion, run_commands. Instructing the model to call
// anything else produces a fail-fast tool rejection (seen with write_file) or,
// worse, derails small models that try to obey the prompt (fix.35 root cause:
// the overlay told every session to use `ask_followup_question`).
const STALE_TOOL_NAMES = [
	"ask_followup_question",
	"write_file",
	"write_to_file",
	"replace_in_file",
	"execute_command",
	"read_file\\b",
	"new_task",
	"plan_mode_respond",
	"list_files",
	"search_files",
]

// Context blocks that do NOT exist in the SDK runtime. The overlay may only
// point the model at context that actually arrives: `# Current Time` inside
// `environment_details` was a classic-Cline context block the SDK runtime never
// sends (the only reference repo-wide WAS this overlay), and the old test PINNED
// the stale reference so it could never be fixed. Today's date really arrives in
// the `<env>` block of the system prompt ("2. Date: …",
// sdk/packages/shared/src/prompt/system/act.ts), so the overlay points there.
const STALE_CONTEXT_REFS = ["environment_details", "# Current Time"]

describe("getIclineHarnessOverlay", () => {
	it("requires epistemic discipline for user factual claims", () => {
		const overlay = getIclineHarnessOverlay()
		expect(overlay).toContain("Epistemic discipline")
		expect(overlay).toContain("do not echo the user's factual claims")
		// Points at the date source the runtime really sends.
		expect(overlay).toContain("`Date:` line")
		expect(overlay).toContain("<env>")
	})

	it("never references context blocks the runtime does not send", () => {
		const overlay = getIclineHarnessOverlay()
		for (const stale of STALE_CONTEXT_REFS) {
			expect(overlay, `overlay must not reference stale context ${stale}`).not.toContain(stale)
		}
	})

	it("never assumes a single file-editing tool", () => {
		// Routing disables `editor` for some providers and substitutes
		// `apply_patch` (sdk/packages/core/src/extensions/tools/
		// model-tool-routing.ts), so the overlay must not hard-code one tool name
		// as THE way to write a file.
		const overlay = getIclineHarnessOverlay()
		expect(overlay).not.toContain("in one `editor` call")
		expect(overlay).toContain("whichever your session provides")
	})

	it("guides provider display names for self-reports without inventing model vendors (F1)", () => {
		const overlay = getIclineHarnessOverlay()
		expect(overlay).toContain("display name")
		expect(overlay).toContain('"bynara" → "NaraRouter"')
		expect(overlay).toContain("never invent a vendor")
	})

	it("never demands tool usage in a way that induces fabricated tool markup", () => {
		const overlay = getIclineHarnessOverlay()
		// fix.5 lesson: demanding "must use a tool (attempt_completion or …)"
		// made weak models write the tool call as plain-text XML (their runtime
		// may not support native tool calls), producing raw markup soup in the
		// chat. The overlay guides behavior, it does not command tool usage.
		expect(overlay).not.toContain("must use a tool")
		expect(overlay).toContain("do not fabricate tool-call markup")
	})

	it("never references tools that do not exist in the SDK runtime", () => {
		const overlay = getIclineHarnessOverlay()
		for (const stale of STALE_TOOL_NAMES) {
			expect(overlay, `overlay must not reference stale tool ${stale}`).not.toMatch(new RegExp(stale))
		}
	})

	it("retains verify-before-claim for technical work", () => {
		expect(getIclineHarnessOverlay()).toContain("Verify before claiming")
	})

	it("keeps the mirrored editor limits in step with core", () => {
		// Core (`extensions/tools/schemas.ts`) holds the same pair: 2_000_000 is the
		// hard safety ceiling the tool refuses above, 32_000 is guidance only (the
		// chunk size the recovery recipe names). vitest aliases @cline/core to a stub,
		// so these mirrors are the only way the fork sees the numbers.
		expect(EDITOR_INPUT_CHAR_LIMIT).toBe(2_000_000)
		expect(EDITOR_CHUNK_CHAR_LIMIT).toBe(32_000)
	})

	it("never teaches a per-call size number the model could shrink to", () => {
		// The old overlay printed "up to ~32000 characters of new_text", which models
		// read as a size to obey: the fix.29 smoke model still sent 40,243 anyway, but
		// others split or refused files at the number. The overlay now states the
		// behavior with no numeric cap; only the recovery recipe names a size.
		const overlay = getIclineHarnessOverlay()
		expect(overlay).not.toContain("32000")
		expect(overlay).not.toMatch(/up to ~/)
		expect(overlay).toContain("do not split a normal file across calls")
		expect(overlay).toContain("do not shrink a file to fit a per-call budget")
	})

	it("keeps the chunk recipe in the recovery guidance, out of the prompt", () => {
		const recipe = getLargeWriteGuidance()
		expect(recipe).toContain(`first chunk of at most ${EDITOR_CHUNK_CHAR_LIMIT} characters`)
		expect(recipe).toContain("insert_line")
		expect(recipe).toContain("Do not re-send the oversized call unchanged")
		// The overlay may only point at the rejection's recipe, not embed it.
		expect(getIclineHarnessOverlay()).not.toContain(recipe)
	})
})

describe("applyIclineAgentIdentity", () => {
	it("rewrites every Cline identity form to iCline", () => {
		const prompt = ["You are Cline, a coding agent.", "When asked who you are, I'm Cline.", "I am Cline."].join("\n")
		expect(applyIclineAgentIdentity(prompt)).toBe(
			["You are iCline, a coding agent.", "When asked who you are, I'm iCline.", "I am iCline."].join("\n"),
		)
	})

	it("never leaves an identity claim naming plain Cline", () => {
		// D9 guard: the fork's system prompt must not identify the agent as the
		// upstream product in ANY first/second-person form.
		const rewritten = applyIclineAgentIdentity("You are Cline. I'm Cline. I am Cline.")
		expect(rewritten).not.toMatch(/\b(?:You are|I'm|I am) Cline\b/)
		expect(rewritten).not.toMatch(/\bCline\b/)
	})

	it("rewrites repeatedly within one prompt", () => {
		const rewritten = applyIclineAgentIdentity("You are Cline. You are Cline.")
		expect(rewritten).toBe("You are iCline. You are iCline.")
	})

	it("leaves unrelated text untouched", () => {
		expect(applyIclineAgentIdentity("Configure the Cline extension settings.")).toBe(
			"Configure the Cline extension settings.",
		)
	})
})

describe("provider display names (one shared table, C2)", () => {
	it("maps known provider ids to their display names", () => {
		expect(getProviderDisplayName("bynara")).toBe("NaraRouter")
		expect(getProviderDisplayName("cline")).toBe("Cline")
	})

	it("never invents a name: unknown ids fall back to the raw id", () => {
		expect(getProviderDisplayName("some-new-provider")).toBe("some-new-provider")
	})

	it("keeps the overlay's self-report table identical to the shared map", () => {
		// The overlay and the `# Active Session` block both read this map, so the
		// two prompt sections can no longer name the same provider differently.
		const overlay = getIclineHarnessOverlay()
		for (const [id, name] of Object.entries(PROVIDER_DISPLAY_NAMES)) {
			expect(overlay).toContain(`"${id}" → "${name}"`)
		}
	})
})

describe("verifyWrittenFile (real filesystem)", () => {
	let tmp = ""
	beforeAll(async () => {
		tmp = await fs.mkdtemp(path.join(os.tmpdir(), "icline-verify-"))
	})
	afterAll(async () => {
		await fs.rm(tmp, { recursive: true, force: true })
	})

	it("passes when the file exists with expected content", async () => {
		const target = path.join(tmp, "ok.ts")
		await fs.writeFile(target, "body {}")
		const result = await verifyWrittenFile({ absolutePath: target, expectedMinBytes: 1, expectedContent: "body {}" })
		expect(result.ok).toBe(true)
	})

	it("fails when the file is missing", async () => {
		const result = await verifyWrittenFile({ absolutePath: path.join(tmp, "missing.ts") })
		expect(result.ok).toBe(false)
		expect(result.message).toContain("could not read")
	})

	it("fails when the path is a directory, not a file", async () => {
		const dir = path.join(tmp, "a-directory")
		await fs.mkdir(dir)
		const result = await verifyWrittenFile({ absolutePath: dir })
		expect(result.ok).toBe(false)
		expect(result.message).toContain("is not a file")
	})

	it("fails an empty file when content was expected", async () => {
		const target = path.join(tmp, "empty.ts")
		await fs.writeFile(target, "")
		const result = await verifyWrittenFile({ absolutePath: target, expectedMinBytes: 1 })
		expect(result.ok).toBe(false)
		expect(result.message).toContain("empty or too small")
	})

	it("fails an existing file whose content does not match the full-file write (D10)", async () => {
		// The phantom-write mirror image: SOMETHING is on disk (a stale file),
		// but not what the call reported writing — existence alone cannot see it.
		const target = path.join(tmp, "stale.ts")
		await fs.writeFile(target, "stale content from an earlier run")
		const result = await verifyWrittenFile({ absolutePath: target, expectedContent: "fresh content" })
		expect(result.ok).toBe(false)
		expect(result.message).toContain("content does not match")
	})

	it("does not manufacture a failure from line-ending differences", async () => {
		// The executors rewrite EOL per platform (normalizeNewFileLineEndings):
		// the content hash must judge content, not line-ending style.
		const target = path.join(tmp, "eol.ts")
		await fs.writeFile(target, "a\r\nb\r\n")
		const result = await verifyWrittenFile({ absolutePath: target, expectedContent: "a\nb\n" })
		expect(result.ok).toBe(true)
	})

	it("reads through a directory junction / symlink to the real target", async () => {
		// Test gap #5: Windows junctions and POSIX symlinks must verify against
		// the REAL file — fs.stat follows the link, so a link to the target must
		// never read as "missing" or "not a file".
		const realDir = path.join(tmp, "real-dir")
		await fs.mkdir(realDir)
		await fs.writeFile(path.join(realDir, "file.ts"), "x")
		const linkDir = path.join(tmp, "linked-dir")
		await fs.symlink(realDir, linkDir, process.platform === "win32" ? "junction" : "dir")
		const result = await verifyWrittenFile({ absolutePath: path.join(linkDir, "file.ts"), expectedContent: "x" })
		expect(result.ok).toBe(true)
	})

	it("verifies a file behind a deep (260+ char) path", async () => {
		// Test gap #5: legacy MAX_PATH territory.
		let deep = tmp
		for (let index = 0; index < 20; index += 1) {
			deep = path.join(deep, `directory-with-a-long-name-${index}`)
		}
		await fs.mkdir(deep, { recursive: true })
		const target = path.join(deep, "file.ts")
		expect(target.length).toBeGreaterThan(260)
		await fs.writeFile(target, "deep")
		const result = await verifyWrittenFile({ absolutePath: target, expectedContent: "deep" })
		expect(result.ok).toBe(true)
	})
})
