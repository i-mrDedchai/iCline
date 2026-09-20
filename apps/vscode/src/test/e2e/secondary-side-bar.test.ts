import { expect } from "@playwright/test"
import { toggleNotifications } from "./utils/common"
import { e2e } from "./utils/helpers"

/**
 * E2E guard for "the chat still works when the user moves the view to the Secondary Side
 * Bar" — the case the pane fixture could not reach before: every other test runs the chat in
 * VS Code's primary sidebar, because that is where the extension puts its view.
 *
 * The move is driven through VS Code's own UI (`pane.moveToAuxiliaryBar()`: command palette →
 * `View: Move View` → `New Secondary Side Bar Entry`), not by moving DOM nodes, so what is
 * tested is the thing a user does when they drag the view to the secondary side bar. Two
 * claims follow from it, on a real window:
 *
 *   1. **the pane fixture follows the view.** The width controller finds the sash by tracing
 *      the frame stack back to the workbench part that hosts the webview, so it keeps working
 *      after the move — the width is measured (and changed) in the new part.
 *   2. **the moved chat is a working chat.** A full turn goes through it (the mock's answer
 *      arrives where the view now lives), and the picker's popover still obeys the shared
 *      anchoring rule (left edge of the trigger while the part can hold the menu, right edge
 *      when it cannot) instead of being placed against coordinates from the old part.
 */

/** The picker body's own width (`PICKER_WIDTH_PX`), used by the anchoring rule before render. */
const PICKER_WIDTH_PX = 320
/** The rule's viewport margin (`MENU_POPOVER_VIEWPORT_MARGIN_PX`). */
const MENU_MARGIN_PX = 8
/** How much wider the secondary side bar is asked to become — enough to prove the drag works. */
const AUX_BAR_GROWTH_PX = 120

e2e(
	"Secondary Side Bar — the chat keeps working after the view is moved there",
	async ({ helper, page, pane, sidebar, widePane }) => {
		void widePane // gives the window the room the side bar needs to be widened later

		await helper.signin(sidebar)
		// The harness runs VS Code with `--disable-extensions`, so VS Code puts its own "Reload and
		// Enable Extensions" toast in the bottom-right corner — exactly where the chat's composer
		// sits once the view lives in the secondary side bar, on top of the send button.
		await toggleNotifications(page)

		const moved = await pane.moveToAuxiliaryBar()
		expect(await pane.location(), "the chat view should be in the secondary side bar now").toBe("auxiliarybar")

		// 1) The pane the fixture measures and drags is the one the chat landed in.
		const before = await pane.measure()
		const after = await pane.widenTo(before + AUX_BAR_GROWTH_PX)
		expect(after, `the secondary side bar should widen from ${before}px`).toBeGreaterThanOrEqual(before + AUX_BAR_GROWTH_PX)

		// 2) A whole turn still goes through where the view now lives.
		const inputbox = moved.getByTestId("chat-input")
		await expect(inputbox).toBeVisible({ timeout: 10_000 })
		await inputbox.fill("Hello from the secondary side bar")
		await expect(inputbox).toHaveValue("Hello from the secondary side bar")
		await moved.getByTestId("send-button").click({ delay: 50 })
		await expect(moved.getByText("mock Cline API response")).toBeVisible({ timeout: 20_000 })

		// 3) And the popover still decides its own edge in the new part, by the shared rule.
		const trigger = moved.locator("[data-icline-model-trigger]")
		await expect(trigger).toBeVisible({ timeout: 10_000 })
		await trigger.click({ delay: 30 })
		const panel = moved.locator("[data-icline-quick-picker]")
		await expect(panel).toBeVisible({ timeout: 10_000 })

		// Measured inside the webview: the rule compares the trigger and the pane in the pane's own
		// coordinates, and after a move those are the secondary side bar's, not the sidebar's.
		const measured = await moved.evaluate((pickerWidth) => {
			const triggerEl = document.querySelector("[data-icline-model-trigger]")
			const panelEl = document.querySelector("[data-icline-quick-picker]")
			if (!triggerEl || !panelEl) {
				return null
			}
			const triggerRect = triggerEl.getBoundingClientRect()
			const panelRect = panelEl.getBoundingClientRect()
			return {
				triggerLeft: triggerRect.left,
				triggerRight: triggerRect.right,
				panelLeft: panelRect.left,
				panelRight: panelRect.right,
				panelWidth: panelRect.width,
				viewportWidth: window.innerWidth,
				align: panelEl.getAttribute("data-align"),
				configuredWidth: pickerWidth,
			}
		}, PICKER_WIDTH_PX)
		expect(measured, "the picker and its trigger should both be in the moved view").not.toBeNull()
		const geometry = measured as NonNullable<typeof measured>

		// The picker is the width the rule was given, which is what makes the expectation below
		// the app's own decision rather than a guess at what rendered.
		expect(geometry.panelWidth).toBe(geometry.configuredWidth)
		const leftEdgeFits = geometry.triggerLeft + geometry.panelWidth + MENU_MARGIN_PX <= geometry.viewportWidth
		expect(
			geometry.align,
			`the picker should anchor by the rule in a ${geometry.viewportWidth}px pane (trigger at ${geometry.triggerLeft})`,
		).toBe(leftEdgeFits ? "start" : "end")
		if (leftEdgeFits) {
			// 1px of slack absorbs sub-pixel rounding of the popper's transform.
			expect(Math.abs(geometry.panelLeft - geometry.triggerLeft)).toBeLessThanOrEqual(1)
		}
		// Whatever edge was chosen, the pane must still show the whole menu: Radix nudges the panel
		// back inside when even the chosen edge would overflow.
		expect(geometry.panelLeft).toBeGreaterThanOrEqual(-1)
		expect(geometry.panelRight).toBeLessThanOrEqual(geometry.viewportWidth + 1)
	},
)
