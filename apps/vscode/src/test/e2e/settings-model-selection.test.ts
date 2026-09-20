import { expect } from "@playwright/test"
import { e2e } from "./utils/helpers"

/**
 * E2E guard for "choosing a model in Settings keeps the provider that owns it".
 *
 * A provider form commits a model through `commitModelSelection`, which writes the
 * provider AND the model into the settings layers. For a while that write was shadowed
 * by the remote-config layer (`remote > session > task > global`), because every
 * `setApiConfiguration` write also fed that cache — so the provider silently stayed on
 * whatever it was when some earlier settings write happened. Choosing a Grok model on the
 * xAI page then left the page showing the Cline provider again (smoke 2026-09-20), while
 * the Quick Picker looked fine because it patches its own provider optimistically.
 *
 * The assertion is deliberately about the PROVIDER, not the model: the model id already
 * updated in the broken build, which is what made the bug look like a UI bounce.
 *
 * xAI is the provider under test because its form has a plain model dropdown
 * (`select#model-id`) that can be driven without the picker's hover geometry.
 */
e2e("Settings — a model selection keeps the provider that owns the model", async ({ helper, sidebar, page }) => {
	await helper.signin(sidebar)

	// Same entry point the Quick Picker's footer uses to open API configuration.
	await sidebar.evaluate(() => window.dispatchEvent(new Event("icline:navigate-to-settings-model-picker")))
	const providerInput = sidebar.getByTestId("provider-selector-input")
	await expect(providerInput).toBeVisible({ timeout: 10_000 })

	await providerInput.click({ delay: 50 })
	await page.keyboard.type("xai", { delay: 40 })
	await sidebar.getByTestId("provider-option-xai").click({ delay: 50 })
	await expect(providerInput).toHaveAttribute("current-value", /xAI/i, { timeout: 10_000 })

	const dropdown = sidebar.locator("vscode-dropdown#model-id").first()
	await expect(dropdown).toBeVisible({ timeout: 10_000 })
	const options = await dropdown
		.locator("vscode-option")
		.evaluateAll((els) => els.map((el) => el.getAttribute("value") ?? "").filter((value) => value.length > 0))
	expect(options.length, "the xAI form listed no models to choose from").toBeGreaterThan(1)

	// Pick a model other than the one already selected, so the commit is a real change.
	// (`vscode-dropdown` mirrors its selection into `current-value`, like the toolkit's
	// text field — `value` is not reflected to the DOM.)
	const current = await dropdown.getAttribute("current-value")
	const target = options.find((value) => value !== current)
	expect(target, "the xAI form offered only its current model").toBeTruthy()

	await dropdown.click({ delay: 50 })
	await dropdown.locator(`vscode-option[value="${target}"]`).click({ delay: 50 })

	// The provider must stay put — before the fix the page fell back to Cline here.
	await expect(providerInput).toHaveAttribute("current-value", /xAI/i, { timeout: 10_000 })
	for (let attempt = 0; attempt < 8; attempt += 1) {
		await page.waitForTimeout(250)
		await expect(providerInput).toHaveAttribute("current-value", /xAI/i)
	}

	// And the model that was clicked is the one the form now reports.
	await expect(sidebar.locator("vscode-dropdown#model-id").first()).toHaveAttribute("current-value", target!)
})
