import { expect } from "@playwright/test"
import { e2e } from "./utils/helpers"

/**
 * E2E guard for Settings → Appearance (dev.2-fix.2).
 *
 * Three real-window regressions in one spec — none of them is reachable from
 * unit tests, because all three are about how the rendered row behaves at a
 * real webview width against the real settings plumbing:
 *
 *   1. Swatch alignment: 8 swatches wrap LEFT-aligned when the pane is too
 *      narrow for one row (8 × ~44px slots > real webview width), so wrapped
 *      stragglers hug the left instead of spreading to opposite edges.
 *   2. Slider scale: the slider gets a full row to itself (label above), so
 *      the track spans the row width (capped at the 8-swatch distance) at any
 *      pane width — 0–100 maps to the same thumb travel on every machine.
 *   3. Icon palette: opening it from the Completed row must render all 12
 *      options in a 6-column grid with no clipping, and choosing one must
 *      close the dialog.
 *
 * The updateSetting round-trip itself (slider drag → persisted value) is
 * covered by the unit layer; this spec pins the geometry and the dialog.
 */
e2e("Settings — Appearance swatches, slider and icon palette render correctly", async ({ helper, sidebar, page }) => {
	await helper.signin(sidebar)

	await page.locator('.action-label[aria-label="Settings"]:visible').first().click({ delay: 30 })
	await sidebar.getByTestId("tab-appearance").click()

	const completedRow = sidebar.locator('[role="radiogroup"]', { hasText: "Yellow" }).first()
	await expect(completedRow).toBeVisible({ timeout: 10_000 }) // 1. The row hugs the left: the FIRST swatch of every visual line starts at
	// the row's own left edge (justify-start, never space-between). Group by
	// top edge so a wrapped line counts as its own row.
	const swatchBoxes = await completedRow.locator('[role="radio"]').evaluateAll((els) => {
		const groupLeft = els[0]?.closest('[role="radiogroup"]')?.getBoundingClientRect().left ?? 0
		return els.map((el) => {
			const box = el.getBoundingClientRect()
			return { top: Math.round(box.top), left: Math.round(box.left) - Math.round(groupLeft) }
		})
	})
	expect(swatchBoxes, "expected 8 swatches").toHaveLength(8)
	const lines = new Map<number, number[]>()
	for (const box of swatchBoxes) {
		const line = lines.get(box.top) ?? []
		line.push(box.left)
		lines.set(box.top, line)
	}
	for (const [top, lefts] of lines) {
		expect(Math.min(...lefts), `wrapped line at y=${top} does not start at the left edge`).toBeLessThan(8)
	}

	// 2. Slider track fills its own row: comfortably wider than the ~90px
	// intrinsic floor a range input collapses to when starved of space.
	const slider = sidebar.locator("#appearance-opacity-completed")
	await expect(slider).toBeVisible({ timeout: 10_000 })
	const sliderWidth = await sidebar.evaluate(() => {
		const track = document.querySelector("#appearance-opacity-completed")
		return track?.getBoundingClientRect().width ?? 0
	})
	expect(sliderWidth, "the slider track collapsed to its intrinsic floor").toBeGreaterThan(120)

	// 3. The icon palette opens with all 12 options and closes on pick.
	await sidebar
		.getByRole("button", { name: /change icon/i })
		.first()
		.click({ delay: 50 })
	const palette = sidebar.locator('[role="dialog"]')
	await expect(palette).toBeVisible({ timeout: 10_000 })
	const options = palette.locator("button[aria-pressed]")
	await expect(options, "the palette does not offer all 12 icons").toHaveCount(12)
	// No clipping: every option's box sits inside the dialog's box.
	const clipped = await palette.evaluate((dialog) => {
		const frame = dialog.getBoundingClientRect()
		return [...dialog.querySelectorAll("button[aria-pressed]")].filter((el) => {
			const box = el.getBoundingClientRect()
			return box.right > frame.right + 1 || box.left < frame.left - 1
		}).length
	})
	expect(clipped, "palette options overflow the dialog").toBe(0)
	await options.first().click({ delay: 50 })
	await expect(palette, "the palette stayed open after picking an icon").toHaveCount(0)
})
