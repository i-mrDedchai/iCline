import { expect } from "@playwright/test"
import { e2e } from "./utils/helpers"

/**
 * E2E guard for the Quick Picker's two SURFACES — the model list and the hover Options
 * panel — on a real VS Code window.
 *
 * Reported from a smoke run (dev.6-fix.25): "a grey bar appears along the bottom of the
 * model picker when I hover a model row with no status icons; rows that show icons are
 * fine". A grey strip like that is a scrollbar, and a scrollbar is drawn by the browser,
 * so no component in the tree says "grey bar": it can only be found by asking the live
 * DOM which element actually overflows. That is what this spec does, for EVERY row, and
 * it fails on any element inside the picker that scrolls horizontally — these surfaces
 * have no use for one (rows truncate, the panel wraps).
 *
 * It also pins the panel's two legitimate shapes, because the report's own trigger —
 * hovering a model with no metadata — is the state that must stay honest rather than
 * grow a second layout: the Effort section is either levels or the "no effort options"
 * copy, and the capability section is either icons with labels or the "no capability
 * data" copy. Never a bare strip.
 */
e2e("Quick Picker — no stray scrollbars in the list or the hover panel", async ({ helper, sidebar, page }) => {
	await helper.signin(sidebar)

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

	/** Every element under the picker that can scroll sideways, named for the failure. */
	const sidewaysScrollers = () =>
		sidebar.evaluate(() => {
			const root = document.querySelector("[data-icline-quick-picker]") as HTMLElement | null
			const found: string[] = []
			for (const el of root ? [root, ...root.querySelectorAll("*")] : []) {
				const node = el as HTMLElement
				if (node.tagName === "SVG" || node.closest("svg")) {
					continue
				}
				// `visible` / `clip` overflow is not scrollable, and an absolutely
				// positioned balloon sticking out of the popover is one of those:
				// only a scroll CONTAINER can draw the reported bar.
				const overflowX = getComputedStyle(node).overflowX
				if (overflowX !== "auto" && overflowX !== "scroll") {
					continue
				}
				if (node.scrollWidth <= node.clientWidth + 1) {
					continue
				}
				const rect = node.getBoundingClientRect()
				found.push(
					`${node.tagName.toLowerCase()}[${node.getAttribute("data-icline-picker-options") !== null ? "panel" : node.getAttribute("data-icline-picker-list") !== null ? "list" : node.className.toString().slice(0, 40)}] scrollWidth=${node.scrollWidth} clientWidth=${node.clientWidth} bottom=${Math.round(rect.bottom)}`,
				)
			}
			return found
		})

	const count = Math.min(await rows.count(), 20)
	let hovered = 0
	for (let index = 0; index < count; index += 1) {
		const box = await rows.nth(index).boundingBox()
		if (!box) {
			continue
		}
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 })
		await expect(panel).toBeVisible({ timeout: 5_000 })
		hovered += 1

		const modelId = (await panel.locator("[data-icline-options-model-id]").innerText()).trim()
		expect(modelId.length).toBeGreaterThan(0)

		// Effort: levels, or the copy that says there are none. Never nothing at all.
		const efforts = await panel.locator("[data-icline-effort-option]").count()
		if (efforts === 0) {
			await expect(panel).toHaveText(/No effort options for this model|โมเดลนี้ไม่มีตัวเลือก Effort/)
		}

		// Capabilities: a labelled icon per capability, or the copy that says there is
		// no data. The no-data state is the one the report tied the bar to.
		const caps = panel.locator("[data-icline-options-caps]")
		const capIcons = await caps.locator("[data-icline-capability]").count()
		if (capIcons === 0) {
			await expect(caps).toHaveText(/No capability data|ไม่มีข้อมูล capability/)
		}

		expect(await sidewaysScrollers(), `${modelId} must not scroll the picker sideways`).toEqual([])
	}

	expect(hovered).toBeGreaterThan(0)
})
