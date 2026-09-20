import type { FrameLocator, Locator } from "@playwright/test"
import { expect } from "@playwright/test"
import { e2e } from "./utils/helpers"

/**
 * E2E guard for the Effort-clamp notice on a REAL VS Code window.
 *
 * Effort is stored once per mode, so a level can be in force for a model that does not
 * accept it; the SDK gateway then sends a different one (`max` on a model whose top
 * level is `high` reaches the provider as High). Until fix.15 nothing said so — the only
 * way to notice was to compare the provider's answer with the dropdown.
 *
 * What is asserted: with Max stored, a model the catalog caps below Max shows a notice
 * naming the level that really goes out, the marked level stays the user's choice, and a
 * model that does accept Max stays quiet. Which models those are is not hardcoded: the
 * expectation is computed with `decideReasoningEffort` — the function the gateway itself
 * calls — from the same registry the host resolves the model from, so a catalog update
 * changes what the test expects instead of breaking it.
 *
 * The stored level is seeded into the picker's own preference store rather than clicked,
 * because of a separate, still-open geometry problem: at the default window the sidebar
 * webview is ~297px wide while the Options panel is placed at `pickerRight + 8` and
 * measures 236px wide, so it sits entirely outside the frame and a real mouse click
 * cannot reach it (measured on this harness: picker right = 320, panel left = 323).
 * Hovering, which is all this test needs, is unaffected.
 */

/** The labels the UI shows for each level — the user-visible half of the contract. */
const LEVEL_LABELS: Record<string, string> = {
	minimal: "Minimal",
	low: "Low",
	medium: "Medium",
	high: "High",
	xhigh: "X-High",
	max: "Max",
}

/** The picker, the panel of an open picker, and the pieces this test reads from it. */
const panelOf = (picker: FrameLocator) => {
	const panel = picker.locator("[data-icline-picker-options]")
	return {
		panel,
		notice: panel.locator("[data-icline-effort-clamp]"),
		maxOption: panel.locator('[data-icline-effort-option="max"]'),
	}
}

e2e("Quick Picker — an Effort level the model cannot take says what will really be sent", async ({ helper, sidebar, page }) => {
	// Long by nature: the expectations are computed, and finding which of the
	// catalog's capped models the picker lists costs one search per candidate.
	e2e.setTimeout(150_000)
	// The app offers every stored level for every model and the gateway narrows it per
	// model, so the two halves of this test must not disagree about which model takes
	// Max — ask the SDK the host asks.
	const sdk = await import("@cline/llms")

	await helper.signin(sidebar)
	// A previous run may have left levels in this profile; pass 1 is only meaningful
	// with nothing stored.
	await sidebar.evaluate(() => localStorage.removeItem("icline-chat-model-preferences-v1"))

	// The model-name button (the status readout is a button of its own since fix.17).
	const trigger = sidebar.locator("[data-icline-model-trigger]")
	await expect(trigger).toBeVisible()

	const picker = sidebar.locator("[data-icline-quick-picker]")
	const rows = picker.locator("[data-icline-model-row]")

	const openPicker = async () => {
		await page.keyboard.press("Escape")
		await trigger.click({ delay: 30 })
		await expect(picker).toBeVisible({ timeout: 10_000 })
	}

	/**
	 * Narrow the list to one model. Searching auto-expands the provider that owns a
	 * match when its catalog is warm; otherwise the first collapsed provider is opened
	 * as a fallback. A needle that matches nothing is NOT a failure — the caller asks
	 * whether the row it wanted is there.
	 */
	const search = async (needle: string) => {
		await picker.locator("input[type=text]").fill(needle)
		await rows
			.first()
			.waitFor({ state: "visible", timeout: 1_500 })
			.catch(() => {})
		if ((await rows.count()) === 0) {
			await picker
				.locator('[data-icline-provider] button[aria-expanded="false"]')
				.first()
				.click({ delay: 30, timeout: 3_000 })
				.catch(() => {})
		}
		await rows
			.first()
			.waitFor({ state: "visible", timeout: 2_000 })
			.catch(() => {})
	}

	const hover = async (locator: Locator) => {
		const box = await locator.boundingBox()
		expect(box).not.toBeNull()
		await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2, { steps: 8 })
	}

	/** The level the panel marks, read as a whole so a marker elsewhere cannot pass. */
	const markedLevel = () =>
		sidebar.evaluate(
			() =>
				document
					.querySelector("[data-icline-picker-options] [data-icline-effort-selected]")
					?.getAttribute("data-icline-effort-option") ?? null,
		)

	// ---- Which models to ask about: ids the registry knows AND the picker can show.
	// The search box matches substrings of the model name, so the last path segment is
	// the needle (`google/gemini-3.8-flash` -> `gemini-3.8-flash`).
	// The picker groups Cline-catalog ids under the provider the SDK also calls `cline`;
	// a model the registry does not know cannot be asked about at all (the host would
	// answer from the conservative fallback, not from data).
	const collection = sdk.getProviderCollectionSync("cline")
	expect(collection, "the SDK registry has no `cline` provider to read models from").toBeTruthy()
	const fateOf = (modelId: string) =>
		sdk.decideReasoningEffort({ effort: "max", reasoningOptions: collection!.models[modelId].reasoningOptions })
	const needleOf = (modelId: string) => modelId.split("/").pop()?.replace(/^~/, "") ?? modelId

	/** At most this many of each kind: one is required, more only guards a stale list. */
	const CAPPED_ATTEMPTS = 3
	const EXACT_ATTEMPTS = 2
	const capped: string[] = []
	const exact: string[] = []
	for (const modelId of Object.keys(collection!.models)) {
		const fate = fateOf(modelId)
		if (fate.reason === "nearest-supported" && fate.applied !== undefined && capped.length < CAPPED_ATTEMPTS) {
			capped.push(modelId)
			continue
		}
		if (fate.reason === "exact" && exact.length < EXACT_ATTEMPTS) {
			exact.push(modelId)
		}
	}
	const candidates = [...capped, ...exact]
	expect(capped.length, "the registry lists no model that caps Max below itself").toBeGreaterThan(0)
	expect(exact.length, "the registry lists no model that takes Max as asked").toBeGreaterThan(0)
	// biome-ignore lint/suspicious/noConsole: the candidate list is what a failure is read against
	console.log("picker notice e2e candidates", JSON.stringify(candidates))

	// ---- Pass 1: find which candidates the picker can actually show, and prove that
	// nothing is claimed while no level is stored.
	await openPicker()
	const shown: { providerId: string; modelId: string; fate: ReturnType<typeof fateOf> }[] = []
	for (const candidate of candidates) {
		if (shown.length >= 3) {
			break
		}
		await search(needleOf(candidate))
		const row = picker.locator(`[data-icline-model-id="${candidate}"]`).first()
		if ((await row.count()) === 0) {
			continue
		}
		const { panel, notice, maxOption } = panelOf(picker)
		await hover(row)
		await expect(panel).toBeVisible({ timeout: 5_000 })
		// The scenario only exists when the level that will be clamped is offered.
		await expect(maxOption).toHaveCount(1)
		// The panel must describe the model under the cursor, not the previous one.
		await expect(panel.locator("[data-icline-options-model-id]")).toHaveText(candidate)
		await page.waitForTimeout(500)
		await expect(notice).toHaveCount(0)
		const providerId = await row.evaluate(
			(el) => el.closest("[data-icline-provider]")?.getAttribute("data-icline-provider") ?? "",
		)
		expect(providerId.length).toBeGreaterThan(0)
		shown.push({ providerId, modelId: candidate, fate: fateOf(candidate) })
	}
	expect(shown.length, "none of the registry's candidates is listed in the picker").toBeGreaterThan(0)
	expect(
		shown.some((entry) => entry.fate.clamped),
		"every model the picker lists takes Max as asked, so the clamp path cannot be exercised",
	).toBe(true)
	// biome-ignore lint/suspicious/noConsole: which models the run used is what a failure is read against
	console.log(
		"picker notice e2e models",
		JSON.stringify(
			shown.map((entry) => ({ modelId: entry.modelId, reason: entry.fate.reason, applied: entry.fate.applied })),
		),
	)

	// ---- Seed the stored level the picker itself would have written, then reopen: a
	// fresh mount is what re-reads the preference store for every row.
	await sidebar.evaluate(
		(entries) => {
			localStorage.setItem(
				"icline-chat-model-preferences-v1",
				JSON.stringify(
					Object.fromEntries(
						entries.map(({ providerId, modelId }) => [`${providerId}::${modelId}`, { reasoningEffort: "max" }]),
					),
				),
			)
		},
		shown.map(({ providerId, modelId }) => ({ providerId, modelId })),
	)

	// ---- Pass 2: every model capped below Max must say which level really goes out;
	// a model that takes Max must say nothing.
	await openPicker()
	let clampedSeen = 0
	for (const entry of shown) {
		await search(needleOf(entry.modelId))
		const row = picker.locator(`[data-icline-model-id="${entry.modelId}"]`).first()
		expect(await row.count(), `${entry.modelId} disappeared from the picker`).toBeGreaterThan(0)
		await hover(row)
		const { panel, notice } = panelOf(picker)
		await expect(panel).toBeVisible({ timeout: 5_000 })
		await expect(panel.locator("[data-icline-options-model-id]")).toHaveText(entry.modelId)
		// Marked level stays the user's choice, whatever will be sent.
		await expect(panel.locator('[data-icline-effort-selected][data-icline-effort-option="max"]')).toHaveCount(1)

		await page.waitForTimeout(600)
		expect(await markedLevel()).toBe("max")

		if (!entry.fate.clamped) {
			await expect(notice).toHaveCount(0)
			continue
		}

		clampedSeen += 1
		const applied = entry.fate.applied ?? ""
		const expectedLabel = LEVEL_LABELS[applied]
		expect(expectedLabel, `no UI label is pinned for the level \`${applied}\``).toBeTruthy()
		await expect(notice).toBeVisible({ timeout: 5_000 })
		await expect(notice).toHaveAttribute("data-icline-effort-clamp", entry.fate.reason)
		const text = (await notice.innerText()).replace(/\s+/g, " ").trim()
		expect(text).toMatch(new RegExp(`^Max → ${expectedLabel} · `))
		expect(text).not.toContain("Max → Max")
	}
	expect(clampedSeen, "no capped model produced a clamp notice").toBeGreaterThan(0)
})
