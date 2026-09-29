import { expect } from "@playwright/test"
import { getMockApiServerUrl } from "./fixtures/server"
import { E2E_GATEWAY_API_KEY, E2E_GATEWAY_MODEL_ID } from "./fixtures/server/api"
import { e2e } from "./utils/helpers"

/**
 * E2E guard for multi custom-provider management (add / edit / delete / auto-fetch models).
 *
 * Before this feature the data layer already stored several custom providers
 * (models.json is a map keyed by id) but the VS Code UI had no way to add or
 * remove any — only the settings of whichever provider already existed could
 * be edited, one form at a time. This proves the whole loop in a real VS Code
 * window:
 * 1. Automatic model fetching populates the models field from mock gateway
 * 2. Two providers can be created back-to-back from the Settings card
 * 3. One can be edited in place
 * 4. One can be deleted behind a confirmation, and the surviving provider keeps working.
 *
 * The second test below covers the case the card cannot fix on its own: the
 * provider being deleted is the one the workspace is USING. The host resolves a
 * fallback and re-posts state (see `deleteCustomProvider`), and the point of
 * proving it in a real window is that a stranded mode is exactly where this
 * surface stops responding — the unit test can only observe the writes.
 */
e2e("Settings — custom providers can be added, edited, deleted and models auto-fetched", async ({ helper, sidebar, page }) => {
	await helper.signin(sidebar)

	// Same entry point the Quick Picker's footer uses to open API configuration.
	await sidebar.evaluate(() => window.dispatchEvent(new Event("icline:navigate-to-settings-model-picker")))
	const providerInput = sidebar.getByTestId("provider-selector-input")
	await expect(providerInput).toBeVisible({ timeout: 10_000 })

	const manager = sidebar.getByTestId("custom-provider-manager")
	await expect(manager).toBeVisible({ timeout: 10_000 })
	const gatewayUrl = `${getMockApiServerUrl()}/e2e-gateway/v1`

	// --- 1. Test auto-fetch models feature on create ---
	await sidebar.getByTestId("custom-provider-add").click({ delay: 40 })
	await sidebar.getByTestId("custom-provider-id").fill("e2e-gw-auto")
	await sidebar.getByTestId("custom-provider-name").fill("E2E Gateway Auto")
	await sidebar.getByTestId("custom-provider-base-url").fill(gatewayUrl)
	await sidebar.getByTestId("custom-provider-api-key").fill(E2E_GATEWAY_API_KEY)

	// Click auto-fetch models button
	await sidebar.getByTestId("custom-provider-fetch-models").click({ delay: 40 })
	// Should populate models with E2E_GATEWAY_MODEL_ID from mock server
	await expect(sidebar.getByTestId("custom-provider-models")).toHaveValue(new RegExp(E2E_GATEWAY_MODEL_ID), {
		timeout: 10_000,
	})

	await sidebar.getByTestId("custom-provider-save").click({ delay: 40 })
	await expect(sidebar.getByTestId("custom-provider-row-e2e-gw-auto")).toBeVisible({ timeout: 15_000 })

	// --- 2. Create second provider back-to-back ---
	await sidebar.getByTestId("custom-provider-add").click({ delay: 40 })
	await sidebar.getByTestId("custom-provider-id").fill("e2e-gw-two")
	await sidebar.getByTestId("custom-provider-name").fill("E2E Gateway Two")
	await sidebar.getByTestId("custom-provider-base-url").fill(gatewayUrl)
	await sidebar.getByTestId("custom-provider-api-key").fill(E2E_GATEWAY_API_KEY)
	await sidebar.getByTestId("custom-provider-models").fill(E2E_GATEWAY_MODEL_ID)
	await sidebar.getByTestId("custom-provider-save").click({ delay: 40 })
	await expect(sidebar.getByTestId("custom-provider-row-e2e-gw-two")).toBeVisible({ timeout: 15_000 })

	// The created providers feed the provider selector like any built-in.
	await providerInput.click({ delay: 50 })
	await page.keyboard.type("E2E Gateway Auto", { delay: 40 })
	await expect(sidebar.getByTestId("provider-option-e2e-gw-auto")).toBeVisible({ timeout: 10_000 })
	await page.keyboard.press("Escape")

	// --- 3. Edit one in place ---
	await sidebar.getByTestId("custom-provider-edit-e2e-gw-two").click({ delay: 40 })
	const nameField = sidebar.getByTestId("custom-provider-name")
	await expect(nameField).toBeVisible({ timeout: 10_000 })
	await nameField.fill("E2E Gateway Two Renamed")
	await sidebar.getByTestId("custom-provider-save").click({ delay: 40 })
	await expect(sidebar.getByTestId("custom-provider-row-e2e-gw-two")).toContainText("E2E Gateway Two Renamed", {
		timeout: 15_000,
	})

	// --- 4. Delete one behind the confirmation, keep the other ---
	await sidebar.getByTestId("custom-provider-delete-e2e-gw-two").click({ delay: 40 })
	await sidebar.getByTestId("custom-provider-delete-confirm-e2e-gw-two").click({ delay: 40 })
	await expect(sidebar.getByTestId("custom-provider-row-e2e-gw-two")).toHaveCount(0, { timeout: 15_000 })
	await expect(sidebar.getByTestId("custom-provider-row-e2e-gw-auto")).toBeVisible()
})

const ACTIVE_PROVIDER_ID = "e2e-gw-active"
const ACTIVE_PROVIDER_NAME = "E2E Gateway Active"

e2e("Settings — deleting the provider in use falls back instead of stranding the mode", async ({ helper, sidebar, page }) => {
	await helper.signin(sidebar)

	await sidebar.evaluate(() => window.dispatchEvent(new Event("icline:navigate-to-settings-model-picker")))
	const providerInput = sidebar.getByTestId("provider-selector-input")
	await expect(providerInput).toBeVisible({ timeout: 10_000 })
	await expect(sidebar.getByTestId("custom-provider-manager")).toBeVisible({ timeout: 10_000 })

	const row = sidebar.getByTestId(`custom-provider-row-${ACTIVE_PROVIDER_ID}`)

	// This spec runs in the worker's shared VS Code profile, and an interrupted
	// run leaves the provider behind — creating it again would then fail on the
	// duplicate id rather than on anything this test is about.
	if (await row.isVisible().catch(() => false)) {
		await sidebar.getByTestId(`custom-provider-delete-${ACTIVE_PROVIDER_ID}`).click({ delay: 40 })
		await sidebar.getByTestId(`custom-provider-delete-confirm-${ACTIVE_PROVIDER_ID}`).click({ delay: 40 })
		await expect(row).toHaveCount(0, { timeout: 15_000 })
	}

	await sidebar.getByTestId("custom-provider-add").click({ delay: 40 })
	await sidebar.getByTestId("custom-provider-id").fill(ACTIVE_PROVIDER_ID)
	await sidebar.getByTestId("custom-provider-name").fill(ACTIVE_PROVIDER_NAME)
	await sidebar.getByTestId("custom-provider-base-url").fill(`${getMockApiServerUrl()}/e2e-gateway/v1`)
	await sidebar.getByTestId("custom-provider-api-key").fill(E2E_GATEWAY_API_KEY)
	await sidebar.getByTestId("custom-provider-models").fill(E2E_GATEWAY_MODEL_ID)
	await sidebar.getByTestId("custom-provider-save").click({ delay: 40 })
	await expect(row).toBeVisible({ timeout: 15_000 })

	// Make it the provider this workspace is actually using.
	await providerInput.click({ delay: 50 })
	await page.keyboard.type(ACTIVE_PROVIDER_NAME, { delay: 40 })
	await sidebar.getByTestId(`provider-option-${ACTIVE_PROVIDER_ID}`).click({ delay: 50 })
	await expect(providerInput).toHaveAttribute("current-value", new RegExp(ACTIVE_PROVIDER_NAME, "i"), { timeout: 10_000 })
	// Close the selector before reaching for the card: a list still painted over the
	// row swallows the next click (the option never receives its own mouseup).
	await page.keyboard.press("Escape")
	await expect(sidebar.getByTestId(`provider-option-${ACTIVE_PROVIDER_ID}`)).toHaveCount(0, { timeout: 5_000 })

	// Now delete what is in use.
	await sidebar.getByTestId(`custom-provider-delete-${ACTIVE_PROVIDER_ID}`).click({ delay: 40 })
	await sidebar.getByTestId(`custom-provider-delete-confirm-${ACTIVE_PROVIDER_ID}`).click({ delay: 40 })
	await expect(row).toHaveCount(0, { timeout: 15_000 })

	// The affected mode must not keep pointing at a provider that no longer exists.
	await expect(providerInput).not.toHaveAttribute("current-value", new RegExp(ACTIVE_PROVIDER_NAME, "i"), {
		timeout: 15_000,
	})

	// The page is still alive: the selector reopens and filters to a real provider.
	// (This surface is where a stranded mode used to stop responding, so "the
	// dropdown still works" is the assertion, not decoration.)
	await providerInput.click({ delay: 50 })
	await page.keyboard.press("Control+a")
	await page.keyboard.type("anthropic", { delay: 40 })
	await expect(sidebar.getByTestId("provider-option-anthropic")).toBeVisible({ timeout: 10_000 })
	await page.keyboard.press("Escape")

	// And the deleted provider is gone from the selector, not just from the card.
	await providerInput.click({ delay: 50 })
	await page.keyboard.press("Control+a")
	await page.keyboard.type(ACTIVE_PROVIDER_ID, { delay: 40 })
	await expect(sidebar.getByTestId(`provider-option-${ACTIVE_PROVIDER_ID}`)).toHaveCount(0, { timeout: 10_000 })
	await page.keyboard.press("Escape")
})
