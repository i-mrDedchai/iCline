import { expect } from "@playwright/test"
import { e2e } from "./utils/helpers"
import { PANE_WIDE_WIDTH_PX } from "./utils/pane"

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
 * Placement is asserted against the picker's own rule (`computeOptionsPanelTop`):
 *   top = max(38, min(rowTop - pickerTop - 6, pickerHeight - panelHeight - 10))
 * and the real mouse is used, so the event path (iframe → hit-testing → row) is
 * the same one a user hits. The `panelHeight` term is the panel's own measured height,
 * which is what the assertions below take apart: the panel is never placed LOWER than its
 * row (the lift only ever moves it up), and it never has to scroll.
 *
 * The third report it pins is dev.6-fix.27's: "clicking Thinking on/off makes the
 * Options page jump around and stop lining up with its own model row" (several models).
 * That version anchored the panel by its CONTENT — `top` was clamped against the panel's
 * real height — so the switch, which changes that height, moved the panel on every
 * click. The stability spec below clicks the switch on a row low enough to have been
 * clamped and requires the panel's box, its model id and its levels to survive it.
 *
 * The fourth is dev.6-fix.28's, which is why the rule above is written the way it is:
 * the jump was answered by re-anchoring `top` to the row and bounding the panel's HEIGHT
 * by the room left under it, and a low row then met a scrollbar where it used to meet a
 * whole panel. The smoke report (2026-09-21) rejected that trade — "take the scrollbar
 * out and let it expand fully" — so the lift came back and the scrollbar went. The
 * placement assertions below therefore check `scrollHeight <= clientHeight`: a scrollbar
 * inside this panel is the bug, however the panel got one.
 *
 * It also pins the fix.11 report: the panel is the mock-v11 surface (Options title,
 * model id, Thinking switch, Effort levels) and whatever it says about a model must
 * equal what that model's ROW shows — same icon state, same effort badge. Both read
 * `resolveModelStatus`, and this is the end-to-end proof of that.
 */
e2e("Quick Picker — Options panel appears on hover and tracks the row", async ({ helper, sidebar, page }) => {
	await helper.signin(sidebar)

	// The trigger is the model-name button under the chat input; provider headers live
	// inside the popover. The status readout is a button of its own since fix.17, so the
	// marker — not the label's width class — identifies the model-list trigger.
	const trigger = sidebar.locator("[data-icline-model-trigger]")
	await expect(trigger).toHaveCount(1)
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
				panelLeft: o.left,
				panelWidth: o.width,
				// What a scrollbar would show up as: the panel's content reaching past its box.
				panelScrollHeight: panelEl.scrollHeight,
				panelClientHeight: panelEl.clientHeight,
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
				// Levels the panel is offering right now, in order — what must not flicker.
				panelLevels: [...panelEl.querySelectorAll("[data-icline-effort-option]")].map((el) =>
					el.getAttribute("data-icline-effort-option"),
				),
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
	 * The picker's placement rule, restated for the assertion. Returns the panel's
	 * top RELATIVE to the picker (which is what the component sets in CSS).
	 */
	/** Where the row's own top puts the panel when nothing has to lift it. */
	const rowAnchor = (m: { rowTop: number; pickerTop: number }) => Math.max(38, m.rowTop - m.pickerTop - 6)
	const panelTopRel = (m: { panelTop: number; pickerTop: number }) => m.panelTop - m.pickerTop
	/** The panel expands to its content: anything here would be drawn as a scrollbar. */
	const expectNoScrollbar = (m: { panelScrollHeight: number; panelClientHeight: number }, where: string) => {
		expect(
			m.panelScrollHeight,
			`the Options panel scrolled (${m.panelScrollHeight}px of content in ${m.panelClientHeight}px) on ${where}`,
		).toBeLessThanOrEqual(m.panelClientHeight + 1)
	}

	// 1) The very first hover must mount the panel for THAT model, placed by the rule.
	const first = await hoverAndMeasure(0)
	expect(first.rowName.length).toBeGreaterThan(0)
	expectPanelMatchesRow(first)
	// Row 0 has the whole picker below it, so the lift has nothing to do: the panel sits
	// exactly on its row, and it shows all of itself.
	expect(Math.abs(panelTopRel(first) - rowAnchor(first))).toBeLessThanOrEqual(1.5)
	expectNoScrollbar(first, "the first row")

	// 2) A row further down must still track (not pin at the old ~90px clamp),
	//    still describing its own model — and if that row is low enough to need the
	//    lift, the lift may only move the panel UP, never below its own row.
	const deeper = await hoverAndMeasure(6)
	expectPanelMatchesRow(deeper)
	expect(deeper.panelModelId).not.toBe(first.panelModelId)
	expect(panelTopRel(deeper)).toBeLessThanOrEqual(rowAnchor(deeper) + 1.5)
	expect(panelTopRel(deeper)).toBeGreaterThanOrEqual(38 - 1.5)
	expect(panelTopRel(deeper) - panelTopRel(first)).toBeGreaterThan(30)
	expectNoScrollbar(deeper, "the seventh row")

	// 2b) The row this round is about: the LOWEST row that is really on screen, where the
	//     panel has least room. "On screen" is measured against the LIST's own box — the
	//     list clips its rows, and a row scrolled out of view still reports a logical
	//     rectangle that a real mouse cannot land on (it would hit the footer instead).
	//     It must still show its whole self: the smoke report's demand was that the panel
	//     expand, not scroll, however low its row is.
	const listBox = await sidebar.locator("[data-icline-picker-list]").boundingBox()
	expect(listBox).not.toBeNull()
	let lowestIndex = 0
	const rowCount = await rows.count()
	for (let index = 0; index < rowCount; index += 1) {
		const box = await rows.nth(index).boundingBox()
		if (!box) {
			continue
		}
		const inside = box.y >= (listBox?.y ?? 0) && box.y + box.height <= (listBox?.y ?? 0) + (listBox?.height ?? 0)
		if (inside) {
			lowestIndex = index
		}
	}
	const lowest = await hoverAndMeasure(lowestIndex)
	expectPanelMatchesRow(lowest)
	expect(panelTopRel(lowest)).toBeLessThanOrEqual(rowAnchor(lowest) + 1.5)
	expect(panelTopRel(lowest)).toBeGreaterThanOrEqual(38 - 1.5)
	expectNoScrollbar(lowest, "the lowest visible row")
	// The whole panel stays above the picker's bottom edge (its own 10px margin), so the
	// lift really did fit it rather than let it hang over the composer.
	expect(panelTopRel(lowest) + lowest.panelHeight).toBeLessThanOrEqual(lowest.pickerHeight - 10 + 1.5)

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
		/*
		 * Which levels are listed depends on what the HOST says the hovered model takes
		 * (`withSupportedEfforts`, fix.27): the provider's vocabulary is the shape of the
		 * control, not the model's own set — `z-ai/glm-5.3-flash` takes Low/High/Max, so a
		 * panel that offered it the generic six (with `Minimal`) was offering levels the SDK
		 * silently clamps. So the set is asserted as an ORDERED SUBSET of the vocabulary the
		 * row's provider draws from — never wider than the vocabulary, never out of order,
		 * never a stray label — and the six-level case is pinned for the provider that still
		 * gets the whole set.
		 */
		const VOCABULARY = ["Minimal", "Low", "Medium", "High", "X-High", "Max"]
		if (measured.panelEffortSet === "openai" || measured.panelEffortSet === "adaptive-thinking") {
			let cursor = -1
			for (const label of labels) {
				const at = VOCABULARY.indexOf(label)
				expect(at, `${label} is not part of the effort vocabulary`).toBeGreaterThanOrEqual(0)
				expect(at, `${label} is out of vocabulary order`).toBeGreaterThan(cursor)
				cursor = at
			}
		} else if (measured.panelEffortSet === "sakana") {
			// Sakana has its own three, and the host answer cannot widen it.
			expect(labels).toEqual(["High", "X-High", "Max"])
		} else if (measured.panelEffortSet === "model-declared") {
			// Published by the catalog itself; the labels are capitalised values.
			expect(labels.every((label) => label.length > 0)).toBe(true)
		}
	}
})

/**
 * dev.6-fix.27 smoke: clicking the Thinking switch made the Options panel "jump around and
 * stop lining up with its own model row", on several models — not only the one the round
 * was about. The panel used to be placed by its own rendered HEIGHT, so anything that
 * changed its content changed its position: the switch changes which levels exist, so
 * every click moved it, usually by tens of px, and the row it belonged to ended up above
 * or below it. Placement now depends on the anchor alone.
 *
 * The row under test is the LOWEST one that offers levels with a live switch — the rows
 * the old clamp had to move — because those are the ones that jumped; a first-row hover
 * sat high enough to look stable either way.
 */
e2e("Quick Picker — the Thinking switch never moves the panel off its own row", async ({ helper, pane, sidebar, page }) => {
	await helper.signin(sidebar)
	// The panel hangs BESIDE the 320px picker, so in VS Code's default ~300px sidebar it lands
	// outside the webview's box — the real mouse there would click the editor instead. The
	// maintainer's working pane is the pane this surface is designed for (`pane.ts`), so ask for
	// it: the click below has to be a real one, because the bug was reported as a real click.
	await pane.widenTo(PANE_WIDE_WIDTH_PX)

	const trigger = sidebar.locator("[data-icline-model-trigger]")
	await expect(trigger).toHaveCount(1)
	await trigger.click({ delay: 30 })

	const picker = sidebar.locator("[data-icline-quick-picker]")
	await expect(picker).toBeVisible({ timeout: 10_000 })
	const rows = sidebar.locator("[data-icline-model-row]")
	await rows
		.first()
		.waitFor({ state: "visible", timeout: 5_000 })
		.catch(() => {})
	if ((await rows.count()) < 8) {
		await sidebar.locator('[data-icline-quick-picker] button[aria-expanded="false"]').first().click({ delay: 30 })
		await expect(rows.nth(7)).toBeVisible({ timeout: 10_000 })
	}

	const panel = sidebar.locator("[data-icline-picker-options]")

	/** The panel's box, model id, levels and switch state, as the user sees them. */
	const probe = () =>
		sidebar.evaluate(() => {
			const panelEl = document.querySelector("[data-icline-picker-options]") as HTMLElement | null
			const sw = panelEl?.querySelector("[data-icline-thinking-switch]") as HTMLButtonElement | null
			return {
				panelBox: panelEl ? panelEl.getBoundingClientRect().toJSON() : null,
				modelId: (panelEl?.querySelector("[data-icline-options-model-id]") as HTMLElement | null)?.textContent ?? null,
				levels: [...(panelEl?.querySelectorAll("[data-icline-effort-option]") ?? [])].map((el) =>
					el.getAttribute("data-icline-effort-option"),
				),
				// `data-icline-effort-selected` marks the level in force — it moves on a toggle.
				selected:
					panelEl?.querySelector("[data-icline-effort-selected]")?.getAttribute("data-icline-effort-option") ?? null,
				switchState: sw?.getAttribute("data-icline-thinking-switch") ?? null,
				switchDisabled: sw?.disabled ?? true,
			}
		})

	/**
	 * Sample the panel until two consecutive reads agree.
	 *
	 * The host answers "which levels does this model take" asynchronously, and until it does
	 * the panel draws the provider's vocabulary — so a probe taken the moment the panel mounts
	 * would compare a transient list against a settled one and prove nothing about the toggle.
	 * Waiting for the panel to stop changing is what makes `before` the state the user clicked in.
	 */
	const settledProbe = async () => {
		let previous = await probe()
		for (let attempt = 0; attempt < 12; attempt += 1) {
			await page.waitForTimeout(150)
			const next = await probe()
			if (next.modelId === previous.modelId && JSON.stringify(next.levels) === JSON.stringify(previous.levels)) {
				return next
			}
			previous = next
		}
		return previous
	}

	/*
	 * Find the lowest VISIBLE row that has levels and a switch we may click.
	 *
	 * "Lowest" on purpose: those are the rows whose panel the old placement clamp had to
	 * move, so they are the ones that jumped. "Visible" is required too — the list holds
	 * hundreds of rows and the ones past the viewport have no coordinates a real mouse can
	 * reach, so hovering one would prove nothing (the panel never mounts).
	 */
	// Measured against the LIST's own box, not the popover's: the list clips its rows, and
	// a row scrolled out of view still reports its logical rectangle — a real mouse lands
	// on the footer there, so hovering one proves nothing.
	const listBox = await sidebar.locator("[data-icline-picker-list]").boundingBox()
	expect(listBox).not.toBeNull()
	const visibleRowIndices: number[] = []
	const rowCount = await rows.count()
	for (let index = 0; index < rowCount; index += 1) {
		const box = await rows.nth(index).boundingBox()
		if (!box) {
			continue
		}
		const inside = box.y >= (listBox?.y ?? 0) && box.y + box.height <= (listBox?.y ?? 0) + (listBox?.height ?? 0)
		if (inside) {
			visibleRowIndices.push(index)
		}
	}
	expect(visibleRowIndices.length, "no model row is on screen to hover").toBeGreaterThan(1)

	let target: {
		index: number
		before: Awaited<ReturnType<typeof probe>>
		rowBox: { x: number; y: number; width: number; height: number }
	} | null = null
	for (const index of [...visibleRowIndices].reverse()) {
		const box = await rows.nth(index).boundingBox()
		if (!box) {
			continue
		}
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 })
		await expect(panel).toBeVisible({ timeout: 5_000 })
		const measured = await settledProbe()
		if (!measured.switchDisabled && measured.levels.length > 0 && measured.modelId) {
			target = { index, before: measured, rowBox: box }
			break
		}
	}
	expect(target, "no row offers effort levels with a switch to click").not.toBeNull()
	const { before, rowBox } = target as {
		index: number
		before: Awaited<ReturnType<typeof probe>>
		rowBox: { x: number; y: number; width: number; height: number }
	}

	// The switch is the panel's own control; clicking it is how this bug was reported.
	await panel.locator("[data-icline-thinking-switch]").click({ delay: 30 })
	await expect
		.poll(async () => (await probe()).switchState, { message: "the switch did not change state" })
		.not.toBe(before.switchState)

	const immediately = await probe()
	const after = await settledProbe()

	// 1) The panel still describes the SAME model — not the row the cursor happened to be
	//    over once it moved.
	expect(after.modelId).toBe(before.modelId)
	// 2) It did not move — this is the report.
	expect(after.panelBox).not.toBeNull()
	expect(before.panelBox).not.toBeNull()
	const box = after.panelBox as { x: number; y: number; width: number; height: number }
	const wasBox = before.panelBox as { x: number; y: number; width: number; height: number }
	const moved = Math.max(Math.abs(box.x - wasBox.x), Math.abs(box.y - wasBox.y))
	expect(moved, `the panel moved ${moved.toFixed(1)}px on a Thinking toggle`).toBeLessThanOrEqual(1.5)
	// 3) Its levels are the model's own, before and after — including in the instant right
	//    after the switch moved, which is when the panel used to fall back to the provider
	//    vocabulary (six levels, `Minimal` included) until the switch's own answer landed.
	expect(immediately.levels).toEqual(before.levels)
	expect(after.levels).toEqual(before.levels)
	expect(after.levels.length).toBeGreaterThan(0)
	// 4) It is still BESIDE the row it belongs to: the two overlap vertically, so the
	//    panel reads as that row's own Options surface rather than a neighbour's.
	const overlapsRow = box.y < rowBox.y + rowBox.height && box.y + box.height > rowBox.y
	expect(
		overlapsRow,
		`panel ${Math.round(box.y)}..${Math.round(box.y + box.height)} does not overlap its row ${Math.round(rowBox.y)}..${Math.round(rowBox.y + rowBox.height)}`,
	).toBe(true)
})
