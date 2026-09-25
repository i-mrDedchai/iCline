import { describe, expect, it } from "vitest"
import {
	createHarnessMistakeState,
	EDITOR_CHUNK_CHAR_LIMIT,
	EDITOR_INPUT_CHAR_LIMIT,
	getIclineHarnessOverlay,
	getLargeWriteGuidance,
	incrementHarnessMistake,
	normalizeCompactionThreshold,
	totalHarnessMistakes,
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

describe("getIclineHarnessOverlay", () => {
	it("requires epistemic discipline for user factual claims", () => {
		const overlay = getIclineHarnessOverlay()
		expect(overlay).toContain("Epistemic discipline")
		expect(overlay).toContain("do not echo the user's factual claims")
		expect(overlay).toContain("# Current Time")
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

describe("harness mistake counters", () => {
	it("tracks verification mistakes", () => {
		const state = createHarnessMistakeState()
		incrementHarnessMistake(state, "verification")
		expect(totalHarnessMistakes(state)).toBe(1)
	})
})

describe("normalizeCompactionThreshold", () => {
	it("clamps out-of-range values", () => {
		expect(normalizeCompactionThreshold(0.1)).toBe(0.5)
		expect(normalizeCompactionThreshold(0.99)).toBe(0.95)
	})
})
