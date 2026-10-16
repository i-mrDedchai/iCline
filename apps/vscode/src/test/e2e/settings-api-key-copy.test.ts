import { expect } from "@playwright/test"
import { getMockApiServerUrl } from "./fixtures/server"
import { E2E_GATEWAY_API_KEY } from "./fixtures/server/api"
import { e2e } from "./utils/helpers"

/**
 * E2E guard for the saved API key on the API configuration form.
 *
 * The host never sends a saved key back to the webview, so the form shows a mask of its
 * length and a copy button. Copy must put the REAL key on the system clipboard (written by
 * the host) while the field keeps showing only the mask. Before this the eye toggle only
 * flipped the input type, so clicking it changed nothing visible.
 */
e2e("Settings — a saved API key is masked and its copy button copies the real key", async ({ helper, sidebar, page, app }) => {
	await helper.signin(sidebar)

	// Same entry point the Quick Picker's footer uses to open API configuration.
	await sidebar.evaluate(() => window.dispatchEvent(new Event("icline:navigate-to-settings-model-picker")))
	const providerInput = sidebar.getByTestId("provider-selector-input")
	await expect(providerInput).toBeVisible({ timeout: 10_000 })

	await providerInput.click({ delay: 50 })
	await page.keyboard.type("openai compatible", { delay: 40 })
	await sidebar.getByTestId("provider-option-openai-compatible").click({ delay: 50 })
	await expect(providerInput).toHaveAttribute("current-value", /OpenAI Compatible/i, { timeout: 10_000 })

	const baseField = sidebar.locator('input[placeholder="Enter base URL..."]')
	await baseField.click({ delay: 50 })
	await baseField.fill(`${getMockApiServerUrl()}/e2e-gateway/v1`)
	const keyField = sidebar.locator('input[placeholder="Enter API Key..."]')
	await expect(keyField).toBeVisible({ timeout: 10_000 })
	await keyField.click({ delay: 50 })
	await keyField.fill(E2E_GATEWAY_API_KEY)
	// Blur so the debounced save reaches the host before we leave the provider.
	await page.keyboard.press("Tab")
	await expect(keyField).toBeVisible()

	// Leave the provider and come back so the field is rebuilt from the host's saved state.
	await providerInput.click({ delay: 50 })
	await page.keyboard.type("anthropic", { delay: 40 })
	await sidebar.getByTestId("provider-option-anthropic").click({ delay: 50 })
	await expect(providerInput).toHaveAttribute("current-value", /Anthropic/i, { timeout: 10_000 })
	await providerInput.click({ delay: 50 })
	await page.keyboard.type("openai compatible", { delay: 40 })
	await sidebar.getByTestId("provider-option-openai-compatible").click({ delay: 50 })
	await expect(providerInput).toHaveAttribute("current-value", /OpenAI Compatible/i, { timeout: 10_000 })

	// The saved key is a mask of its length, never the key itself.
	const maskedField = sidebar.locator('input[placeholder="Enter API Key..."]')
	await expect(maskedField).toHaveValue("•".repeat(E2E_GATEWAY_API_KEY.length), { timeout: 15_000 })
	await expect(sidebar.getByTestId("api-key-visibility-toggle")).toHaveCount(0)

	// Copy: the real key lands on the system clipboard, and the field stays masked.
	const copyButton = sidebar.getByTestId("api-key-copy-saved")
	await expect(copyButton).toBeVisible({ timeout: 10_000 })
	await copyButton.click({ delay: 40 })
	await expect.poll(() => app.evaluate(({ clipboard }) => clipboard.readText()), { timeout: 10_000 }).toBe(E2E_GATEWAY_API_KEY)
	await expect(maskedField).toHaveValue("•".repeat(E2E_GATEWAY_API_KEY.length))
})

/**
 * LiteLLM and OpenRouter do not build their key field from `ApiKeyField` — each owns its
 * own text field — so they showed the mask without a copy control. A masked key must be
 * copyable wherever it appears, and the copy has to reach the REAL key through the host
 * (the webview only ever holds the mask).
 */
e2e("Settings — LiteLLM and OpenRouter also offer the saved-key copy control", async ({ helper, sidebar, page, app }) => {
	await helper.signin(sidebar)

	await sidebar.evaluate(() => window.dispatchEvent(new Event("icline:navigate-to-settings-model-picker")))
	const providerInput = sidebar.getByTestId("provider-selector-input")
	await expect(providerInput).toBeVisible({ timeout: 10_000 })

	const selectProvider = async (search: string, option: string, name: RegExp) => {
		await providerInput.click({ delay: 50 })
		await page.keyboard.type(search, { delay: 40 })
		await sidebar.getByTestId(option).click({ delay: 50 })
		await expect(providerInput).toHaveAttribute("current-value", name, { timeout: 10_000 })
	}

	const cases = [
		{
			name: /LiteLLM/i,
			option: "provider-option-litellm",
			placeholder: "Default: noop",
			search: "litellm",
			testId: "litellm-api-key-copy-saved",
		},
		{
			name: /OpenRouter/i,
			option: "provider-option-openrouter",
			placeholder: "Enter API Key...",
			search: "openrouter",
			testId: "openrouter-api-key-copy-saved",
		},
	]

	for (const item of cases) {
		const key = `sk-${item.search}-e2e-saved-key`
		await selectProvider(item.search, item.option, item.name)

		const keyField = sidebar.locator(`input[placeholder="${item.placeholder}"]`)
		await expect(keyField).toBeVisible({ timeout: 15_000 })
		await keyField.click({ delay: 50 })
		await keyField.fill(key)
		// Blur so the debounced save reaches the host before we leave the provider.
		await page.keyboard.press("Tab")

		// Leave and come back: the field is then rebuilt from the host's saved state, which
		// is also what makes the copy control appear (it needs a stored key, not a typed one).
		await selectProvider("anthropic", "provider-option-anthropic", /Anthropic/i)
		await selectProvider(item.search, item.option, item.name)

		await expect(keyField).toHaveValue("•".repeat(key.length), { timeout: 15_000 })
		const copyButton = sidebar.getByTestId(item.testId)
		await expect(copyButton).toBeVisible({ timeout: 10_000 })
		await copyButton.click({ delay: 40 })
		await expect.poll(() => app.evaluate(({ clipboard }) => clipboard.readText()), { timeout: 10_000 }).toBe(key)
		// The form still shows only the mask after copying.
		await expect(keyField).toHaveValue("•".repeat(key.length))
	}
})
