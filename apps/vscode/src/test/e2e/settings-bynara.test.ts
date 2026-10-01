import { expect } from "@playwright/test"
import { e2e } from "./utils/helpers"

/**
 * E2E guard for the NaraRouter provider (dev.4-fix.1) on a REAL VS Code window.
 *
 * Four regressions from the dev.4 smoke round, all reported with screenshots:
 *
 *   1. Empty on first select: after choosing NaraRouter the Settings form
 *      showed NO model dropdown at all (just the "Model" label + the
 *      committed default's info row), and the Quick Picker was empty too —
 *      the list only appeared after collapsing + re-expanding the provider.
 *      Root cause: the SDK merge dropped the bundled/static catalog for any
 *      provider with a `modelsSourceUrl` (Ollama "live is authoritative"
 *      rule), so the keyless fetch failure left zero models. NaraRouter now
 *      unions its static snapshot with live (`modelsSourceAuthoritative:
 *      false`), so the list below must be full on FIRST select with NO key.
 *   2. "Free" everywhere: every model — including paid ones — rendered
 *      "Input: Free / Output: Free". The static snapshot now carries the
 *      gateway's real IDR-book rates converted to USD, so a paid model must
 *      show a $ rate while a gateway-declared-zero model still shows Free.
 *   3. No thinking/effort icons in the list: rows showed "No capability data"
 *      until their model was selected. The live endpoint declares
 *      vision/reasoning per model and those flags now thread through the
 *      fetch, and the merge fills them from the snapshot — so a reasoning
 *      model's row must carry its capability icon WITHOUT being selected.
 *   4. Stale after key save: saving the key never re-resolved the list.
 *      (Keyed live fetch itself is unit-covered; spinning real gateway auth
 *      in e2e is out of scope.) The generic form now refreshes after
 *      credential/endpoint writes — covered at the unit layer via the
 *      refresh-on-write wiring.
 *
 * Everything here runs KEYLESS against the bundled snapshot, so no network
 * or gateway account is needed: the whole point is the picker works before
 * the user ever pastes a key.
 */
e2e("Settings — NaraRouter lists its snapshot models with honest prices, no key", async ({ helper, sidebar, page }) => {
	await helper.signin(sidebar)

	// Same entry point the Quick Picker's footer uses to open API configuration.
	await sidebar.evaluate(() => window.dispatchEvent(new Event("icline:navigate-to-settings-model-picker")))
	const providerInput = sidebar.getByTestId("provider-selector-input")
	await expect(providerInput).toBeVisible({ timeout: 10_000 })

	await providerInput.click({ delay: 50 })
	await page.keyboard.type("nara", { delay: 40 })
	await sidebar.getByTestId("provider-option-bynara").click({ delay: 50 })
	await expect(providerInput).toHaveAttribute("current-value", /NaraRouter/i, { timeout: 10_000 })

	// 1. The model dropdown renders on FIRST select with no key — before the
	// fix there was no dropdown at all until a collapse/re-expand cycle.
	const dropdown = sidebar.locator("vscode-dropdown#provider-model-picker").first()
	await expect(dropdown, "NaraRouter form shows no model dropdown without a key").toBeVisible({ timeout: 20_000 })
	let options: string[] = []
	await expect(async () => {
		options = await dropdown
			.locator("vscode-option")
			.evaluateAll((els) => els.map((el) => el.getAttribute("value") ?? "").filter((value) => value.length > 0))
		expect(options.length, "the NaraRouter form listed almost no models").toBeGreaterThan(50)
	}).toPass({ timeout: 20_000 })
	expect(options).toContain("mimo-v2.5-free")

	// 2a. A paid model shows its real rate — never "Free".
	await dropdown.click({ delay: 50 })
	await dropdown.locator('vscode-option[value="claude-sonnet-5"]').click({ delay: 50 })
	await expect(sidebar.getByText("$3.25/M", { exact: true })).toBeVisible({ timeout: 10_000 })

	// 2b. A gateway-declared-zero model still shows Free — and no $ rate anywhere.
	await dropdown.click({ delay: 50 })
	await dropdown.locator('vscode-option[value="jev"]').click({ delay: 50 })
	// The commit is async: the previous model's rate must disappear first,
	// proving the selection actually landed on jev (not a stale panel).
	await expect(sidebar.getByText("$3.25/M", { exact: true })).toBeHidden({ timeout: 15_000 })
	await expect(sidebar.getByText("Free", { exact: true }).first()).toBeVisible({ timeout: 10_000 })
	await expect(sidebar.getByText("$", { exact: false })).toBeHidden({ timeout: 10_000 })
})

e2e("Quick Picker — NaraRouter rows carry capability icons without being selected", async ({ helper, sidebar }) => {
	await helper.signin(sidebar)

	const trigger = sidebar.locator("[data-icline-model-trigger]")
	await expect(trigger).toHaveCount(1)
	await expect(trigger).toBeVisible()
	await trigger.click({ delay: 30 })

	const picker = sidebar.locator("[data-icline-quick-picker]")
	await expect(picker).toBeVisible({ timeout: 10_000 })

	// Expand NaraRouter specifically (it starts collapsed).
	const bynaraSection = picker.locator('[data-icline-provider="bynara"]')
	await bynaraSection.locator('button[aria-expanded="false"]').click({ delay: 30 })

	// 3. The keyless snapshot fills the section — no expand-twice ritual.
	await expect(async () => {
		expect(await bynaraSection.locator("[data-icline-model-row]").count()).toBeGreaterThan(50)
	}).toPass({ timeout: 20_000 })

	// A reasoning model's row carries its capability icon while unselected —
	// before the fix the Options panel said "No capability data" here.
	const reasoningRow = picker.locator('[data-icline-model-row][data-icline-model-id="glm-5.3-flash"]')
	await expect(reasoningRow).toBeVisible({ timeout: 10_000 })
	await expect(reasoningRow.locator('[data-icline-capability="reasoning"]')).toBeVisible({ timeout: 10_000 })

	// 4. Full flow: picking the default from the picker commits provider+model.
	const freeRow = picker.locator('[data-icline-model-row][data-icline-model-id="mimo-v2.5-free"]')
	await expect(freeRow).toBeVisible({ timeout: 10_000 })
	await freeRow.click({ delay: 50 })
	// The picker closes on commit, so its "Active · …" footer is gone too.
	// The durable commit signal is the chat model trigger, which the error
	// context shows rendering "bynara · mimo-v2.5-free" after the click.
	await expect(picker).toBeHidden({ timeout: 10_000 })
	// The trigger itself re-renders with the committed model (observed in the
	// failure AX tree as "bynara · mimo-v2.5-free act") — assert there, not
	// on the picker's "Active · …" footer, which unmounts with the picker.
	await expect(trigger).toContainText("mimo-v2.5-free", { timeout: 10_000 })
})
