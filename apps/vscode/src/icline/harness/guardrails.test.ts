import { describe, expect, it } from "vitest"
import {
	createHarnessMistakeState,
	getIclineHarnessOverlay,
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

	it("requires ACT MODE conversational replies to use runtime tools", () => {
		const overlay = getIclineHarnessOverlay()
		expect(overlay).toContain("attempt_completion")
		expect(overlay).toContain("ask_question")
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
