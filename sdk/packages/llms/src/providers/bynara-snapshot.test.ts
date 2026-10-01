import { describe, expect, it } from "vitest"
import { buildBynaraModels, BYNARA_DEFAULT_MODEL_ID, BYNARA_SNAPSHOT_DATE } from "./bynara-snapshot"
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
})
