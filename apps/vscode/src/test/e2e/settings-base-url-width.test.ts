import { expect } from "@playwright/test"
import { getMockApiServerUrl } from "./fixtures/server"
import { e2e } from "./utils/helpers"
import { PANE_WIDE_WIDTH_PX } from "./utils/pane"

/**
 * E2E guard for how wide the Base URL field gets, on both sides of its cap.
 *
 * The field asked for `width: 100%` but sat inside a Radix `TooltipTrigger`, which
 * renders a `<button>` — a shrink-to-fit box. The percentage therefore resolved
 * against the button's intrinsic width, so the input rendered at the toolkit field's
 * own 167px at every pane width and clipped a gateway URL such as
 * `https://opencode.ai/zen/v1` to `https://opencode.ai/zen/v` (dev.5-fix.8).
 *
 * The first fix made it a flat 250px, which the fix.8 smoke then found overflowed a
 * pane narrower than the field: the field stopped being responsive (dev.5-fix.9).
 * The contract is now "fills the pane, stops at 250", and both halves are measured
 * here in a real window — jsdom has no layout, and only a resized pane can show the
 * cap and the shrink are decided by different things.
 */
e2e("Settings — the Base URL field fills a narrow pane and stops growing at 250px", async ({ helper, pane, sidebar, page }) => {
	await helper.signin(sidebar)

	// Same entry point the Quick Picker's footer uses to open API configuration.
	await sidebar.evaluate(() => window.dispatchEvent(new Event("icline:navigate-to-settings-model-picker")))
	const providerInput = sidebar.getByTestId("provider-selector-input")
	await expect(providerInput).toBeVisible({ timeout: 10_000 })

	await providerInput.click({ delay: 50 })
	await page.keyboard.type("openai compatible", { delay: 40 })
	await sidebar.getByTestId("provider-option-openai-compatible").click({ delay: 50 })
	await expect(providerInput).toHaveAttribute("current-value", /OpenAI Compatible/i, { timeout: 10_000 })

	// The host element carries the width; its parent is the settings column it must fit.
	const field = sidebar.locator("#openai-compatible-base-url")
	await expect(field).toBeVisible({ timeout: 10_000 })
	const measure = () =>
		field.evaluate((host) => {
			const parent = host.parentElement as HTMLElement
			return { field: host.getBoundingClientRect().width, pane: parent.getBoundingClientRect().width }
		})

	// --- narrow: VS Code's default sidebar is narrower than the 250px cap ---
	const narrow = await measure()
	expect(Math.round(narrow.pane), "the default pane is expected to be narrower than the 250px cap").toBeLessThan(250)
	// The field tracks the pane instead of sitting at 250px and overflowing it.
	expect(Math.abs(narrow.field - narrow.pane)).toBeLessThanOrEqual(1)

	// --- wide: the cap is what stops it now, not the pane ---
	await pane.widenTo(PANE_WIDE_WIDTH_PX)
	await expect.poll(async () => Math.round((await measure()).field), { timeout: 10_000 }).toBe(250)
	const wide = await measure()
	expect(Math.round(wide.pane), "the widened pane should be wider than the cap").toBeGreaterThan(250)

	// The wider field must not push the pane into horizontal scrolling.
	const overflowX = await sidebar.evaluate(() => {
		const doc = document.scrollingElement ?? document.documentElement
		return doc.scrollWidth - doc.clientWidth
	})
	expect(overflowX).toBeLessThanOrEqual(0)

	// A URL only the wider field can show whole (~29 characters, the length of
	// `https://opencode.ai/zen/v1`): scrollWidth > clientWidth would mean the tail is
	// still hidden. Still local, so no test reaches the public internet.
	const url = `${getMockApiServerUrl()}/e2e/v1`
	const input = sidebar.locator('input[placeholder="Enter base URL..."]')
	await input.click({ delay: 50 })
	await input.fill(url)
	await expect(input).toHaveValue(url)
	const overflow = await input.evaluate((element) => ({
		client: element.clientWidth,
		scroll: element.scrollWidth,
	}))
	expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1)
})
