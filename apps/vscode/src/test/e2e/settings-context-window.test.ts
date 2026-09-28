import { expect } from "@playwright/test"
import { getMockApiServerUrl } from "./fixtures/server"
import { E2E_GATEWAY_API_KEY, E2E_GATEWAY_MODEL_ID } from "./fixtures/server/api"
import { e2e } from "./utils/helpers"

/**
 * E2E guard for "Settings shows a custom gateway's own context window".
 *
 * The fix.39 smoke report ("Context ไม่แสดงเลย") had the OpenAI Compatible
 * Settings page show NO Context row at all for a Cleanapis-sold `gpt-5.6-sol`:
 * model-info resolution is keyed provider → model id, and a custom gateway has
 * no row for the models it resells. fix.40 feeds the endpoint's own `/models`
 * payload — context window included, behind the API key like the real
 * cleanapis.com/v1/models — into model-info resolution (see
 * `refreshOpenAiModels` → live models cache → `readBaseModelInfoForProvider`).
 *
 * The assertion is deliberately about the DECLARED window (444K), not just
 * "some value": the bundled catalog's cross-provider majority describes
 * `gpt-5.6-sol` as 1,050,000 (1.1M), so only the provider's own statement can
 * render 444K. A blank row (fix.39) and a cross-catalog guess both fail here.
 */
e2e("Settings — a custom gateway's own /models context window is shown", async ({ helper, sidebar, page }) => {
	await helper.signin(sidebar)

	// Same entry point the Quick Picker's footer uses to open API configuration.
	await sidebar.evaluate(() => window.dispatchEvent(new Event("icline:navigate-to-settings-model-picker")))
	const providerInput = sidebar.getByTestId("provider-selector-input")
	await expect(providerInput).toBeVisible({ timeout: 10_000 })

	await providerInput.click({ delay: 50 })
	await page.keyboard.type("openai compatible", { delay: 40 })
	await sidebar.getByTestId("provider-option-openai-compatible").click({ delay: 50 })
	await expect(providerInput).toHaveAttribute("current-value", /OpenAI Compatible/i, { timeout: 10_000 })

	// Point the provider at the gated mock gateway. Both the model dropdown's
	// refresh and the SDK's model-source fetch derive "<baseUrl>/models".
	const gatewayUrl = `${getMockApiServerUrl()}/e2e-gateway/v1`
	// Scoped to the inner <input>: the toolkit's <vscode-text-field> host also
	// reflects the placeholder, so a bare getByPlaceholder matches twice.
	const baseField = sidebar.locator('input[placeholder="Enter base URL..."]')
	await expect(baseField).toBeVisible({ timeout: 10_000 })
	await baseField.click({ delay: 50 })
	await baseField.fill(gatewayUrl)

	// The gateway answers 401 without a key — typing it is what makes the
	// model list (and the declared limits) arrive at all.
	const keyField = sidebar.locator('input[placeholder="Enter API Key..."]')
	await expect(keyField).toBeVisible({ timeout: 10_000 })
	await keyField.click({ delay: 50 })
	await keyField.fill(E2E_GATEWAY_API_KEY)

	// The free-text model field is replaced by the dropdown only after a
	// successful /models fetch, so its presence also proves the authed fetch
	// (and the live-models-cache mirror of the declared limits) landed.
	const modelSelect = sidebar.locator("select#openai-compatible-model-picker")
	await expect(modelSelect).toBeVisible({ timeout: 20_000 })
	await modelSelect.selectOption(E2E_GATEWAY_MODEL_ID)
	await expect(modelSelect).toHaveValue(E2E_GATEWAY_MODEL_ID)

	// THE assertion: the model info row shows the window the GATEWAY declared.
	await expect(sidebar.getByText("Context:")).toBeVisible({ timeout: 15_000 })
	await expect(sidebar.getByText("444K")).toBeVisible({ timeout: 15_000 })
	// ...never the bundled catalog's majority for this id (1.05M → "1.1M").
	await expect(sidebar.getByText(/1\.\dM/)).toHaveCount(0)
})
