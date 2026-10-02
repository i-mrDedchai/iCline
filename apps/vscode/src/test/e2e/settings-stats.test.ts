import { expect } from "@playwright/test"
import { getMockApiServerUrl } from "./fixtures/server"
import { E2E_GATEWAY_API_KEY, E2E_GATEWAY_MODEL_ID } from "./fixtures/server/api"
import { e2e } from "./utils/helpers"

/**
 * Realtime guard for the Settings stats card (dev.4-fix.2).
 *
 * The card (`provider-stats-card`: N Providers / M Models / K Free) reads the
 * shared `useProviderListings` cache, which every mutation path refreshes —
 * but nothing proved the number on screen actually moves without a reload.
 * This spec watches the exact flow the dev.4 smoke round questioned: add a
 * custom provider and the Providers count must tick up on the SAME Settings
 * visit; delete it and it must tick back down.
 *
 * Absolute numbers are deliberately never asserted (other specs leave
 * providers behind in the shared profile); only the delta within this visit.
 * Counts are static bundled-registry numbers — a saved key unlocking live
 * models moves the pickers, not these counters (see the card's tooltips) —
 * so custom add/delete is the flow whose realtime behavior can be pinned.
 */
e2e("Settings — provider stats track custom provider add/delete live", async ({ helper, sidebar }) => {
	await helper.signin(sidebar)

	// Same entry point the Quick Picker's footer uses to open API configuration.
	await sidebar.evaluate(() => window.dispatchEvent(new Event("icline:navigate-to-settings-model-picker")))
	const providerInput = sidebar.getByTestId("provider-selector-input")
	await expect(providerInput).toBeVisible({ timeout: 10_000 })

	const stats = sidebar.getByTestId("provider-stats-card")
	await expect(stats).toBeVisible({ timeout: 10_000 })

	const providerCount = async (): Promise<number> => {
		const text = (await stats.textContent()) ?? ""
		const match = text.match(/([\d,]+)\s*Providers/)
		if (!match) {
			throw new Error(`could not read Providers count from stats card: ${JSON.stringify(text)}`)
		}
		return Number(match[1].replace(/,/g, ""))
	}

	const manager = sidebar.getByTestId("custom-provider-manager")
	await expect(manager).toBeVisible({ timeout: 10_000 })

	// Idempotent start: a previous interrupted run may have left the probe
	// behind, and re-creating the same id fails the save with no new row.
	const probeRow = sidebar.getByTestId("custom-provider-row-e2e-stats-probe")
	if ((await probeRow.count()) > 0) {
		await sidebar.getByTestId("custom-provider-delete-e2e-stats-probe").click()
		const staleConfirm = sidebar.getByTestId("custom-provider-delete-confirm-e2e-stats-probe")
		await expect(staleConfirm).toBeVisible({ timeout: 5_000 })
		await staleConfirm.click()
		await expect(probeRow).toHaveCount(0, { timeout: 15_000 })
	}
	const before = await providerCount()

	// Add one provider; the count must move on this same visit — no reload.
	// Same reachable mock-gateway shape the custom-providers spec uses, so a
	// save can never fail on endpoint validation instead of the wiring.
	await sidebar.getByTestId("custom-provider-add").click({ delay: 40 })
	await sidebar.getByTestId("custom-provider-id").fill("e2e-stats-probe")
	await sidebar.getByTestId("custom-provider-name").fill("E2E Stats Probe")
	await sidebar.getByTestId("custom-provider-base-url").fill(`${getMockApiServerUrl()}/e2e-gateway/v1`)
	await sidebar.getByTestId("custom-provider-api-key").fill(E2E_GATEWAY_API_KEY)
	await sidebar.getByTestId("custom-provider-models").fill(E2E_GATEWAY_MODEL_ID)
	await sidebar.getByTestId("custom-provider-save").click()
	await expect(sidebar.getByTestId("custom-provider-error")).toHaveCount(0, { timeout: 15_000 })
	await expect(probeRow).toBeVisible({ timeout: 15_000 })
	await expect(async () => {
		expect(await providerCount()).toBe(before + 1)
	}).toPass({ timeout: 15_000 })

	// Delete it behind the two-step confirmation; the count must move back.
	await sidebar.getByTestId("custom-provider-delete-e2e-stats-probe").click()
	const confirmButton = sidebar.getByTestId("custom-provider-delete-confirm-e2e-stats-probe")
	await expect(confirmButton).toBeVisible({ timeout: 5_000 })
	await confirmButton.click()
	await expect(sidebar.getByTestId("custom-provider-row-e2e-stats-probe")).toHaveCount(0, { timeout: 15_000 })
	await expect(async () => {
		expect(await providerCount()).toBe(before)
	}).toPass({ timeout: 15_000 })
})
