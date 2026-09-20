import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { ReasoningEffortOutcome } from "@/hooks/useReasoningEffortOutcome"
import { createPickerTranslator } from "@/icline/i18n/pickerStrings"
import { effortClampNotice, ReasoningEffortNotice } from "./ReasoningEffortNotice"

const en = createPickerTranslator("en")
const th = createPickerTranslator("th")

function outcome(overrides: Partial<ReasoningEffortOutcome> = {}): ReasoningEffortOutcome {
	return {
		requested: "max",
		applied: "xhigh",
		supportedEfforts: ["high", "xhigh"],
		reason: "nearest-supported",
		clamped: true,
		suppressedByBudget: false,
		...overrides,
	}
}

describe("effortClampNotice", () => {
	it("names both the requested and the applied level", () => {
		expect(effortClampNotice(outcome(), en)).toBe("Max → X-High · this model does not accept Max, so X-High is sent")
	})

	it("explains a level the catalog has no data for", () => {
		// A model with no catalog entry gets only broadly supported levels (max → high).
		expect(effortClampNotice(outcome({ applied: "high", supportedEfforts: [], reason: "catalog-unknown" }), en)).toBe(
			"Max → High · no Effort data for this model, so High is sent",
		)
	})

	it("says the level is not sent at all when the model has no Effort control", () => {
		expect(effortClampNotice(outcome({ applied: undefined, reason: "no-effort-control" }), en)).toBe(
			"Max is not sent · this model has no Effort control",
		)
	})

	it("never renders an empty level: a clamp with no level reads as `not sent`", () => {
		// The registry scan in the host guarantees this shape does not exist today
		// (`clamped` without a level always means `no-effort-control`), so this pins the
		// fallback for a future reason that forgets to name what it sends.
		const orphaned = effortClampNotice(outcome({ applied: undefined, reason: "nearest-supported" }), en)

		expect(orphaned).toBe("Max is not sent · this model has no Effort control")
		expect(orphaned).not.toContain("→")
	})

	it("stays quiet for a level that is sent as chosen, or under a thinking budget", () => {
		expect(effortClampNotice(undefined, en)).toBeUndefined()
		expect(effortClampNotice(outcome({ clamped: false }), en)).toBeUndefined()
		expect(effortClampNotice(outcome({ suppressedByBudget: true }), en)).toBeUndefined()
		// A reason this build cannot describe must not be guessed at.
		expect(effortClampNotice(outcome({ reason: "something-new" }), en)).toBeUndefined()
	})

	it("speaks Thai when the locale is Thai", () => {
		expect(effortClampNotice(outcome(), th)).toBe("Max → X-High · โมเดลนี้ไม่รับ Max จะส่ง X-High แทน")
	})
})

describe("ReasoningEffortNotice", () => {
	it("renders the sentence with the machine-readable reason for tests", () => {
		render(<ReasoningEffortNotice outcome={outcome()} tr={en} />)
		const notice = document.querySelector("[data-icline-effort-clamp]")

		expect(notice?.getAttribute("data-icline-effort-clamp")).toBe("nearest-supported")
		expect(notice?.textContent).toContain("Max → X-High")
	})

	it("renders nothing at all when there is nothing to report", () => {
		const { container } = render(<ReasoningEffortNotice outcome={outcome({ clamped: false })} tr={en} />)

		expect(container.firstChild).toBeNull()
		expect(document.querySelector("[data-icline-effort-clamp]")).toBeNull()
		expect(screen.queryByText(/→/)).toBeNull()
	})
})
