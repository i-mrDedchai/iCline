import { expect, type Frame } from "@playwright/test"
import { e2e } from "./utils/helpers"
import { PANE_WIDE_WIDTH_PX } from "./utils/pane"

/**
 * E2E guard for the composer's split chip on a REAL VS Code window (fix.17) and for the
 * menu-anchoring rule that came with it (fix.18). The pane's width is driven through the
 * shared `pane` fixture (utils/pane.ts), which is what makes the second test able to reach
 * the wide pane the anchoring rule was requested for.
 *
 * The status readout used to be part of the model-name button, so changing the Effort
 * of the model already driving the chat meant opening the model list and hunting for its
 * row. Now:
 *   - `[data-icline-model-trigger]` (name + chevron) opens the MODEL LIST, and
 *   - `[data-icline-model-status-button]` (capability icons / effort badge) opens the
 *     Options surface for the ACTIVE model,
 * with the panel body shared by both surfaces (`ModelOptionsPanel`).
 *
 * What the two tests pin, on a real window: the readout is not inside the model button,
 * clicking it opens Options for the model in use (not the list), picking a level there
 * writes to that model and leaves the selection alone, the chip's own badge follows, and
 * the panel is anchored to the edge of that button the pane can afford — its LEFT edge
 * (`align="start"`) while the pane can hold the panel beside the button, its RIGHT edge
 * (`align="end"`, the behaviour before this round) once it cannot. The first test runs on
 * VS Code's default sidebar, which is the fallback case; the second drags the pane wide
 * and watches the SAME open panel move onto the left edge, which is the case the request
 * was made about (a ~930px working pane) plus the `resize` path that goes with it.
 */

/** Bounding box of a locator, with Playwright's nullability narrowed away. */
type Box = { x: number; y: number; width: number; height: number }

/**
 * Bring up a model that has a status readout, so the composer's status button exists:
 * open the picker and walk the provider headers until one lists a reasoning model.
 * Returns the model id that is selected as a result.
 */
async function pickReasoningModel(sidebar: Frame): Promise<string> {
	const trigger = sidebar.locator("[data-icline-model-trigger]")
	const picker = sidebar.locator("[data-icline-quick-picker]")
	await expect(trigger).toBeVisible({ timeout: 10_000 })

	await trigger.click({ delay: 30 })
	await expect(picker).toBeVisible({ timeout: 10_000 })
	const reasoningRow = sidebar.locator("[data-icline-model-row]").filter({
		has: sidebar.locator('[data-icline-capability="reasoning"]'),
	})
	let targetRow = null as null | ReturnType<typeof reasoningRow.first>
	const providerIds = await sidebar
		.locator("[data-icline-provider]")
		.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-icline-provider") ?? ""))
	for (const id of providerIds) {
		const expanded = sidebar.locator(`[data-icline-provider="${id}"] button[aria-expanded="true"]`)
		if ((await expanded.count()) === 0) {
			await sidebar.locator(`[data-icline-provider="${id}"] button[aria-expanded]`).click({ delay: 30 })
		}
		try {
			await expect(reasoningRow.first()).toBeVisible({ timeout: 5_000 })
			targetRow = reasoningRow.first()
			break
		} catch {
			// No reasoning model in this provider's list — try the next one.
		}
	}
	expect(targetRow, `no reasoning model listed in any provider (${providerIds.join(",")})`).not.toBeNull()

	const chosenModelId = await targetRow?.getAttribute("data-icline-model-id")
	expect(chosenModelId).toBeTruthy()
	await targetRow?.click({ delay: 30 })
	await expect(picker).toBeHidden({ timeout: 10_000 })
	return chosenModelId as string
}

e2e("Composer — the status button opens Options for the model in use", async ({ helper, sidebar }) => {
	await helper.signin(sidebar)

	const trigger = sidebar.locator("[data-icline-model-trigger]")
	const statusButton = sidebar.locator("[data-icline-model-status-button]")
	const picker = sidebar.locator("[data-icline-quick-picker]")

	const chosenModelId = await pickReasoningModel(sidebar)

	// The readout exists for this model and is a button of its own.
	await expect(statusButton).toBeVisible({ timeout: 10_000 })
	await expect(statusButton).toHaveCount(1)
	const readoutInsideTrigger = await trigger.evaluate((el) => el.querySelector("[data-icline-model-status]") !== null)
	expect(readoutInsideTrigger).toBe(false)
	const modelBefore = (await trigger.innerText()).trim()

	// Clicking it opens Options for THAT model, not the model list.
	await statusButton.click({ delay: 30 })
	const panel = sidebar.locator("[data-icline-status-options]")
	await expect(panel).toBeVisible({ timeout: 10_000 })
	await expect(panel.locator("[data-icline-options-model-id]")).toHaveText(chosenModelId)
	await expect(picker).toBeHidden()
	await expect(panel).toHaveText(/Options|ตัวเลือก/)

	// Which edge the panel is anchored to is a decision, not a constant (request of
	// 2026-09-20): its LEFT edge sits on the button's left edge while the pane can hold the
	// 236px panel beside the button — the ~930px working pane the request came from — and
	// it falls back to the older right-edge anchoring when it cannot, so a squeezed sidebar
	// still shows the whole panel instead of losing it off the side of the pane.
	//
	// Measured on the real window, because jsdom has no layout for the placement maths: this
	// window runs VS Code's default sidebar (~300px) with the composer row already filled by
	// the four icons and the model chip, so it is the FALLBACK case. The left-edge case is
	// the second test's job — it widens this very pane.
	//
	// Radix republishes the resolved side as `data-align`, and still nudges the panel back
	// inside the pane when even the chosen edge would overflow — so the edge coincidence is
	// asserted only while there is room for it.
	const [buttonBox, panelBox, viewportWidth] = await Promise.all([
		statusButton.boundingBox(),
		panel.boundingBox(),
		panel.evaluate(() => window.innerWidth),
	])
	expect(buttonBox).not.toBeNull()
	expect(panelBox).not.toBeNull()
	const button = buttonBox as Box
	const content = panelBox as Box

	// The same rule the picker itself uses (`pickMenuPopoverAlign`, panel width 236 plus an
	// 8px viewport margin).
	const leftEdgeFits = button.x + content.width + 8 <= viewportWidth
	expect(await panel.getAttribute("data-align")).toBe(leftEdgeFits ? "start" : "end")
	if (leftEdgeFits) {
		// 1px of slack absorbs sub-pixel rounding of the popper's transform.
		expect(Math.abs(content.x - button.x)).toBeLessThanOrEqual(1)
	} else if (button.x + button.width - content.width >= 0) {
		expect(Math.abs(content.x + content.width - (button.x + button.width))).toBeLessThanOrEqual(1)
	}

	// Changing the level here writes to the model in use — and does not switch models.
	const levels = panel.locator("[data-icline-effort-option]")
	await expect(levels.first()).toBeVisible({ timeout: 5_000 })
	const levelValue = await levels.first().getAttribute("data-icline-effort-option")
	await levels.first().click({ delay: 30 })
	await expect(statusButton.locator(`[data-icline-effort="${levelValue}"]`)).toBeVisible({ timeout: 10_000 })
	await expect(trigger).toHaveText(modelBefore)
})

e2e("Composer — a widened pane pulls the open Options panel onto the button's left edge", async ({ helper, pane, sidebar }) => {
	await helper.signin(sidebar)
	const chosenModelId = await pickReasoningModel(sidebar)

	const statusButton = sidebar.locator("[data-icline-model-status-button]")
	const panel = sidebar.locator("[data-icline-status-options]")
	await expect(statusButton).toBeVisible({ timeout: 10_000 })

	// Open Options while the pane is still narrow, and confirm the fallback edge is what is
	// on screen: without that precondition the flip below would prove nothing.
	await statusButton.click({ delay: 30 })
	await expect(panel).toBeVisible({ timeout: 10_000 })
	await expect(panel.locator("[data-icline-options-model-id]")).toHaveText(chosenModelId)
	const narrowWidth = await panel.evaluate(() => window.innerWidth)
	const [narrowButtonBox, narrowPanelBox] = await Promise.all([statusButton.boundingBox(), panel.boundingBox()])
	expect(narrowButtonBox).not.toBeNull()
	expect(narrowPanelBox).not.toBeNull()
	const fitsNarrow = (narrowButtonBox as Box).x + (narrowPanelBox as Box).width + 8 <= narrowWidth
	expect(fitsNarrow, "the default VS Code pane is expected to be too narrow for the left-edge anchor").toBe(false)
	expect(await panel.getAttribute("data-align")).toBe("end")

	// Now widen the pane to the width the request came from, the way a user does it (give the
	// window room, then drag VS Code's own sash). The drag happens in the WORKBENCH document —
	// the sash is not inside the webview — so it never counts as a click outside the panel: the
	// panel must stay open across it and re-decide its edge as the pane resizes.
	const wideWidth = await pane.widenTo(PANE_WIDE_WIDTH_PX)
	await expect(panel).toBeVisible()

	const [buttonBox, panelBox] = await Promise.all([statusButton.boundingBox(), panel.boundingBox()])
	expect(buttonBox).not.toBeNull()
	expect(panelBox).not.toBeNull()
	const button = buttonBox as Box
	const content = panelBox as Box
	// The precondition the request is about: this pane CAN hold the panel beside the button
	// (if VS Code's composer row ever pushes the button out to the far edge, this says so
	// instead of silently passing on the fallback).
	expect(
		button.x + content.width + 8 <= wideWidth,
		`the widened pane (${wideWidth}px) still cannot hold the ${content.width}px panel at x=${button.x}`,
	).toBe(true)
	expect(await panel.getAttribute("data-align")).toBe("start")
	expect(Math.abs(content.x - button.x)).toBeLessThanOrEqual(1)
})
