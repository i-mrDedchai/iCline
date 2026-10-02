import { describe, expect, it } from "vitest"
import {
	buildBynaraModels,
	BYNARA_DEFAULT_MODEL_ID,
	BYNARA_MODEL_TIERS,
	BYNARA_SNAPSHOT_DATE,
	bynaraTierOf,
} from "./bynara-snapshot"
import { BUILTIN_SPECS } from "./builtins"

describe("bynara snapshot catalog", () => {
	it("ships the full gateway snapshot captured 2026-10-02", () => {
		const models = buildBynaraModels()
		// 57 live entries minus agnes-video-v2.0 (video-only, kept out of the
		// chat picker). Re-snapshot deliberately when the gateway grows and
		// update this number with it — never hand-add ids.
		expect(Object.keys(models)).toHaveLength(56)
		expect(BYNARA_SNAPSHOT_DATE).toBe("2026-10-02")
	})

	it("every entry is picker-ready with honest capabilities", () => {
		const models = buildBynaraModels()
		for (const [id, info] of Object.entries(models)) {
			expect(id.trim().length).toBeGreaterThan(0)
			expect(info.id).toBe(id)
			expect(info.name?.trim().length).toBeGreaterThan(0)
			expect(info.capabilities).toEqual(expect.arrayContaining(["streaming", "tools"]))
			if (info.contextWindow !== undefined) {
				expect(info.contextWindow).toBeGreaterThan(0)
			}
			// Pricing is USD per 1M converted from the gateway's IDR book
			// (see file header for the rate): finite and non-negative —
			// never absent-shaped-as-free, never guessed per-model.
			if (info.pricing) {
				for (const value of [
					info.pricing.input,
					info.pricing.output,
					info.pricing.cacheRead,
					info.pricing.cacheWrite,
				]) {
					if (value !== undefined) {
						expect(Number.isFinite(value)).toBe(true)
						expect(value).toBeGreaterThanOrEqual(0)
					}
				}
			}
		}
	})

	it("default model exists in the snapshot and in the builtin spec", () => {
		const models = buildBynaraModels()
		expect(models[BYNARA_DEFAULT_MODEL_ID]).toBeDefined()
		const spec = BUILTIN_SPECS.find((s) => s.id === "bynara")
		expect(spec?.defaultModelId).toBe(BYNARA_DEFAULT_MODEL_ID)
	})

	it("tiers follow the dashboard shelves: 12 free, 5 bonus, rest PAYG", () => {
		const models = buildBynaraModels()
		const ids = Object.keys(models)
		// The map covers exactly the snapshot: an id added to either side
		// without the other fails here (never hand-add ids).
		expect(Object.keys(BYNARA_MODEL_TIERS).sort()).toEqual(
			ids.filter((id) => bynaraTierOf(id) !== "payg").sort(),
		)
		const tiers = ids.map((id) => bynaraTierOf(id))
		expect(tiers.filter((tier) => tier === "free")).toHaveLength(12)
		expect(tiers.filter((tier) => tier === "bonus")).toHaveLength(5)
		expect(tiers.filter((tier) => tier === "payg")).toHaveLength(39)
		// "Free" is plan-quota inclusion, NOT price zero: the dashboard's
		// Free shelf carries real PAYG rates on these three.
		for (const id of ["agnes-2.5-flash", "agnes-3-flash", "longcat-2.5"]) {
			expect(bynaraTierOf(id)).toBe("free")
			expect(models[id].pricing?.input).toBeGreaterThan(0)
		}
		// The shelf is visible where the model is picked (Settings renders
		// description); PAYG models carry no such note.
		expect(models.jev.description).toMatch(/Free-plan/)
		expect(models["mimo-v2.5-free"].description).toMatch(/qualifying credit balance/)
		expect(models["claude-sonnet-5"].description).toBeUndefined()
	})
})
