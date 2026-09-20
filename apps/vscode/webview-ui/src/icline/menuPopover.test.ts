/**
 * The anchoring rule every iCline menu follows (maintainer request, 2026-09-20). Two rules,
 * in this order: the menu's LEFT edge on the trigger's left edge while the pane can hold
 * the menu beside it — the ~930px working pane, and the shape the request describes — and
 * the older RIGHT-edge anchoring only once the pane is too narrow for that, so a squeezed
 * sidebar still shows the whole menu instead of losing it off the side of the pane.
 *
 * The React side of the convention (`useMenuPopoverAnchor`) is exercised through the
 * component that uses it — QuickModelPickerRealPopover.test.tsx drives the popover open,
 * narrow and wide again — and the source-scanning side lives in menuPopover.guard.test.ts.
 */
import { describe, expect, it } from "vitest"
import { MENU_POPOVER_VIEWPORT_MARGIN_PX, pickMenuPopoverAlign } from "./menuPopover"

/** The composer's Options panel is this wide (`OPTIONS_PANEL_WIDTH_PX` in the picker). */
const OPTIONS_PANEL_WIDTH = 236

describe("pickMenuPopoverAlign", () => {
	it("anchors on the trigger's left edge while the menu fits beside it", () => {
		// The pane the request was made about (~930px), with the status button near its end.
		expect(pickMenuPopoverAlign({ triggerLeft: 640, viewportWidth: 930, panelWidth: OPTIONS_PANEL_WIDTH })).toBe("start")
	})

	it("falls back to the trigger's right edge when the pane cannot hold the menu", () => {
		// VS Code's default sidebar (~300px) with the composer row already filled by the
		// four icons and the model chip: the menu cannot start where the button starts.
		expect(pickMenuPopoverAlign({ triggerLeft: 250, viewportWidth: 297, panelWidth: OPTIONS_PANEL_WIDTH })).toBe("end")
	})

	it("switches exactly at panel width plus the viewport margin", () => {
		const exactlyFits = OPTIONS_PANEL_WIDTH + MENU_POPOVER_VIEWPORT_MARGIN_PX
		expect(pickMenuPopoverAlign({ triggerLeft: 0, viewportWidth: exactlyFits, panelWidth: OPTIONS_PANEL_WIDTH })).toBe(
			"start",
		)
		expect(pickMenuPopoverAlign({ triggerLeft: 1, viewportWidth: exactlyFits, panelWidth: OPTIONS_PANEL_WIDTH })).toBe("end")
	})

	it("keeps the left edge as the rule for every pane wide enough for it", () => {
		for (const viewportWidth of [600, 800, 1200, 1920]) {
			expect(pickMenuPopoverAlign({ triggerLeft: 300, viewportWidth, panelWidth: OPTIONS_PANEL_WIDTH })).toBe("start")
		}
	})

	it("scales with the menu: a wider menu needs a wider pane to keep the left edge", () => {
		// Same trigger, same pane: the 236px Options panel fits, a 320px model list does not —
		// which is why the width is an argument rather than a constant.
		expect(pickMenuPopoverAlign({ triggerLeft: 420, viewportWidth: 700, panelWidth: OPTIONS_PANEL_WIDTH })).toBe("start")
		expect(pickMenuPopoverAlign({ triggerLeft: 420, viewportWidth: 700, panelWidth: 320 })).toBe("end")
	})
})
