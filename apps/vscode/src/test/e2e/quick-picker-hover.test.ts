import { expect } from "@playwright/test"
import { e2e } from "./utils/helpers"

/**
 * E2E guard for the Quick Picker hover Options panel on a REAL VS Code window.
 *
 * Two regressions it pins, both reported from real smoke runs:
 *
 *  - fix.8: the panel never appeared at all. The delegated move handler was a
 *    native listener added in a useEffect keyed on `open`, but Radix `Presence`
 *    mounts the popover body one commit later (`send("MOUNT")` from a layout
 *    effect) — the effect ran with `listRef.current === null`, early-returned,
 *    and never re-ran.
 *  - fix.9: the panel appeared but only followed the first few rows. Placement
 *    clamped against the panel's 320px MAX-height instead of its real height,
 *    so every row past ~90px was pinned to one top.
 *
 * Placement is asserted against the locked mock's own rule
 * (`.icline/plans/quick-picker-redesign/mock.v11-locked-2026-09-16.html`):
 *   top = max(38, min(rowTop - pickerTop - 6, pickerHeight - panelHeight - 10))
 * and the real mouse is used, so the event path (iframe → hit-testing → row) is
 * the same one a user hits.
 *
 * It also pins the fix.11 report: the panel is the mock-v11 surface (Options title,
 * model id, Thinking switch, Effort levels) and whatever it says about a model must
 * equal what that model's ROW shows — same icon state, same effort badge. Both read
 * `resolveModelStatus`, and this is the end-to-end proof of that.
 */
e2e("Quick Picker — Options panel appears on hover and tracks the row", async ({ helper, sidebar, page }) => {
	await helper.signin(sidebar)

	// The trigger is the model-name button in the chat header (label span is
	// capped at max-w-[180px]); provider headers live inside the popover.
	const trigger = sidebar.locator('button:has(span[class~="max-w-[180px]"])').first()
	await expect(trigger).toBeVisible()
	await trigger.click({ delay: 30 })

	const picker = sidebar.locator("[data-icline-quick-picker]")
	await expect(picker).toBeVisible({ timeout: 10_000 })

	const rows = sidebar.locator("[data-icline-model-row]")
	await rows
		.first()
		.waitFor({ state: "visible", timeout: 5_000 })
		.catch(() => {})
	if ((await rows.count()) < 8) {
		// Open the first collapsed provider so there are enough rows to track.
		await sidebar.locator('[data-icline-quick-picker] button[aria-expanded="false"]').first().click({ delay: 30 })
		await expect(rows.nth(7)).toBeVisible({ timeout: 10_000 })
	}

	const panel = sidebar.locator("[data-icline-picker-options]")

	/** Hover a row with the real mouse and read the geometry back. */
	const hoverAndMeasure = async (index: number) => {
		const box = await rows.nth(index).boundingBox()
		expect(box).not.toBeNull()
		await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2, { steps: 8 })
		await expect(panel).toBeVisible({ timeout: 5_000 })
		return sidebar.evaluate((rowIndex) => {
			const attr = (el: Element | null, name: string) => el?.getAttribute(name) ?? null
			const pickerEl = document.querySelector("[data-icline-quick-picker]") as HTMLElement
			const panelEl = document.querySelector("[data-icline-picker-options]") as HTMLElement
			const rowEl = document.querySelectorAll("[data-icline-model-row]")[rowIndex] as HTMLElement
			const p = pickerEl.getBoundingClientRect()
			const o = panelEl.getBoundingClientRect()
			const r = rowEl.getBoundingClientRect()
			return {
				rowName: (rowEl.querySelector("span.truncate") as HTMLElement).innerText.trim(),
				rowTop: r.top,
				pickerTop: p.top,
				pickerHeight: p.height,
				panelTop: o.top,
				panelHeight: o.height,
				// The panel must describe THIS row, and the row's own status must agree
				// with the panel's controls.
				rowId: attr(rowEl, "data-icline-model-id"),
				rowState: attr(rowEl.querySelector("[data-icline-state]"), "data-icline-state"),
				rowEffort: attr(rowEl.querySelector("[data-icline-effort]"), "data-icline-effort"),
				panelModelId: (panelEl.querySelector("[data-icline-options-model-id]") as HTMLElement | null)?.innerText.trim(),
				panelSwitch: attr(panelEl.querySelector("[data-icline-thinking-switch]"), "data-icline-thinking-switch"),
				panelEffort: attr(panelEl.querySelector("[data-icline-effort-selected]"), "data-icline-effort-option"),
				// Which metadata entry named this row's levels (see modelThinkingOptions).
				panelEffortSet: attr(panelEl.querySelector("[data-icline-effort-set]"), "data-icline-effort-set"),
			}
		}, index)
	}

	/** The panel and the hovered row must report the same real state. */
	const expectPanelMatchesRow = (m: {
		rowId: string | null
		rowState: string | null
		rowEffort: string | null
		panelModelId?: string
		panelSwitch: string | null
		panelEffort: string | null
	}) => {
		expect(m.panelModelId).toBe(m.rowId)
		expect(m.panelEffort).toBe(m.rowEffort)
		if (m.rowState !== null) {
			expect(m.rowState).toBe(m.panelSwitch)
		}
	}

	/**
	 * The mock's placement rule, restated for the assertion. Returns the panel's
	 * top RELATIVE to the picker (which is what the component sets in CSS).
	 */
	const expectedTop = (m: { rowTop: number; pickerTop: number; pickerHeight: number; panelHeight: number }) =>
		Math.max(38, Math.min(m.rowTop - m.pickerTop - 6, m.pickerHeight - m.panelHeight - 10))
	const panelTopRel = (m: { panelTop: number; pickerTop: number }) => m.panelTop - m.pickerTop

	// 1) The very first hover must mount the panel for THAT model, placed by the rule.
	const first = await hoverAndMeasure(0)
	expect(first.rowName.length).toBeGreaterThan(0)
	expectPanelMatchesRow(first)
	expect(Math.abs(panelTopRel(first) - expectedTop(first))).toBeLessThanOrEqual(1.5)

	// 2) A row further down must still track (not pin at the old ~90px clamp),
	//    still describing its own model.
	const deeper = await hoverAndMeasure(6)
	expectPanelMatchesRow(deeper)
	expect(deeper.panelModelId).not.toBe(first.panelModelId)
	expect(Math.abs(panelTopRel(deeper) - expectedTop(deeper))).toBeLessThanOrEqual(1.5)
	expect(panelTopRel(deeper) - panelTopRel(first)).toBeGreaterThan(30)

	// 3) It really is the mock-v11 Options surface, not a stray node. Locale-dependent,
	// so accept the English and Thai labels the string map ships.
	await expect(panel).toHaveText(/Options|ตัวเลือก/)
	await expect(panel).toHaveText(/Effort/)
	await expect(panel.locator("[data-icline-thinking-switch]")).toHaveCount(1)

	// 4) Every row we hover must publish a status that agrees with the panel beside
	//    it, and the Effort section must be in one of the two legitimate states: levels,
	//    or the "no effort options" copy (fix.11 report). The LEVELS themselves are
	//    provider metadata now, so the set depends on the row's provider. The panel
	//    publishes which metadata entry answered, so each set can be asserted exactly.
	const hoverable = Math.min(await rows.count(), 12)
	for (let index = 0; index < hoverable; index += 1) {
		const measured = await hoverAndMeasure(index)
		expectPanelMatchesRow(measured)
		const labels = (await panel.locator("[data-icline-effort-option]").allInnerTexts()).map((label) => label.trim())
		if (labels.length === 0) {
			await expect(panel).toHaveText(/No effort options for this model|โมเดลนี้ไม่มีตัวเลือก Effort/)
			continue
		}
		// The off level is never a button — the Thinking switch owns it.
		expect(labels).not.toContain("None")
		expect(new Set(labels).size).toBe(labels.length)
		expect(labels.every((label) => label.length > 0)).toBe(true)
		if (measured.panelEffortSet === "openai" || measured.panelEffortSet === "adaptive-thinking") {
			// Every value the app can store, in shared-vocabulary order. `xhigh` reads
			// "X-High" (not mock v11's "Max") because `max` is a real level of its own now.
			expect(labels).toEqual(["Minimal", "Low", "Medium", "High", "X-High", "Max"])
		}
		if (measured.panelEffortSet === "sakana") {
			expect(labels).toEqual(["High", "X-High", "Max"])
		}
	}
})
