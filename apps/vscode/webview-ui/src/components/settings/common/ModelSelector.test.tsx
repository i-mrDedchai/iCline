import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { DropdownContainer, FORM_DROPDOWN_BASE_Z_INDEX, formDropdownZIndex } from "./ModelSelector"

/**
 * Why this is worth a test: `vscode-dropdown` renders its open list inside the
 * container, so the list is painted at the container's z-index. Two positioned
 * siblings that share a z-index are decided by DOM order — the later one wins — and the
 * form's later control therefore covered the earlier one's open list (Sakana shipped
 * with the Effort select on top of the Model list; Zenmux with Provider routing on top
 * of API Protocol). The fix is an ordering property, not a look, so it is asserted as
 * one: same z-index for every control in a form is the bug.
 */
describe("form dropdown z-index ladder", () => {
	it("puts an earlier control above a later one, and stacks strictly downward", () => {
		const ladder = [0, 1, 2, 3].map(formDropdownZIndex)
		for (let index = 1; index < ladder.length; index += 1) {
			expect(ladder[index]).toBeLessThan(ladder[index - 1])
		}
		expect(new Set(ladder).size, "a flat value is the bug this guards").toBe(ladder.length)
	})

	it("renders the ladder unchanged on positioned containers", () => {
		render(
			<div>
				<DropdownContainer data-testid="first" zIndex={formDropdownZIndex(0)} />
				<DropdownContainer data-testid="second" zIndex={formDropdownZIndex(1)} />
			</div>,
		)
		const first = screen.getByTestId("first")
		const second = screen.getByTestId("second")
		// Positioned, so the two compete: equal values would hand the tie to `second`.
		expect(getComputedStyle(first).position).toBe("relative")
		expect(getComputedStyle(second).position).toBe("relative")
		expect(Number(getComputedStyle(first).zIndex)).toBeGreaterThan(Number(getComputedStyle(second).zIndex))
	})

	it("stays under the model pickers a form sits beneath", () => {
		// `ModelSelector`'s own container defaults to 1000 and ApiOptions' dropdowns to
		// 1002; the ladder only has to outrank the form's own controls.
		expect(FORM_DROPDOWN_BASE_Z_INDEX).toBeLessThan(1000)
		expect(formDropdownZIndex(0)).toBe(FORM_DROPDOWN_BASE_Z_INDEX)
	})
})
