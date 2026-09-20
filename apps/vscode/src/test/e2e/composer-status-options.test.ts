import { expect } from "@playwright/test"
import { e2e } from "./utils/helpers"

/**
 * E2E guard for the composer's split chip on a REAL VS Code window (fix.17).
 *
 * The status readout used to be part of the model-name button, so changing the Effort
 * of the model already driving the chat meant opening the model list and hunting for its
 * row. Now:
 *   - `[data-icline-model-trigger]` (name + chevron) opens the MODEL LIST, and
 *   - `[data-icline-model-status-button]` (capability icons / effort badge) opens the
 *     Options surface for the ACTIVE model,
 * with the panel body shared by both surfaces (`ModelOptionsPanel`).
 *
 * What it pins, on a real window: the readout is not inside the model button, clicking
 * it opens Options for the model in use (not the list), picking a level there writes to
 * that model and leaves the selection alone, and the chip's own badge follows.
 */
e2e("Composer — the status button opens Options for the model in use", async ({ helper, sidebar }) => {
	await helper.signin(sidebar)

	const trigger = sidebar.locator("[data-icline-model-trigger]")
	const statusButton = sidebar.locator("[data-icline-model-status-button]")
	const picker = sidebar.locator("[data-icline-quick-picker]")
	await expect(trigger).toBeVisible({ timeout: 10_000 })

	// Pick a model that has a status readout (a reasoning model), so the status button is
	// guaranteed to exist. The active provider is expanded on open; otherwise walk the
	// provider headers until one of them lists a reasoning model.
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

	const chosenModelId = await targetRow!.getAttribute("data-icline-model-id")
	expect(chosenModelId).toBeTruthy()
	await targetRow!.click({ delay: 30 })
	await expect(picker).toBeHidden({ timeout: 10_000 })

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
	await expect(panel.locator("[data-icline-options-model-id]")).toHaveText(chosenModelId as string)
	await expect(picker).toBeHidden()
	await expect(panel).toHaveText(/Options|ตัวเลือก/)

	// Changing the level here writes to the model in use — and does not switch models.
	const levels = panel.locator("[data-icline-effort-option]")
	await expect(levels.first()).toBeVisible({ timeout: 5_000 })
	const levelValue = await levels.first().getAttribute("data-icline-effort-option")
	await levels.first().click({ delay: 30 })
	await expect(statusButton.locator(`[data-icline-effort="${levelValue}"]`)).toBeVisible({ timeout: 10_000 })
	await expect(trigger).toHaveText(modelBefore)
})
