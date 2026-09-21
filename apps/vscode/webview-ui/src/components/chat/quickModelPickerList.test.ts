import { CLINE_RECOMMENDED_MODELS_FALLBACK } from "@shared/cline/recommended-models"
import { filterOpenRouterModelIds } from "@shared/utils/model-filters"
import { describe, expect, it } from "vitest"
import {
	ACTIVE_MODEL_ATTR,
	ACTIVE_PROVIDER_ATTR,
	compareModelEntries,
	computeOptionsPanelTop,
	filterModelsByQuery,
	isFreeModel,
	type ModelEntry,
	modelsMatchQuery,
	OPTIONS_PANEL_BOTTOM_MARGIN_PX,
	OPTIONS_PANEL_MAX_HEIGHT_PX,
	OPTIONS_PANEL_MIN_TOP_PX,
	partitionFreeStandard,
	pickAutoExpandProvider,
	providersMatchingModelQuery,
	queryActivePickerScrollTarget,
	type WarmModelsByProvider,
} from "./quickModelPickerList"

/** Catalog split: paid, blocked :free, allowlisted :free, exception :free, -free name trap. */
const CLINE_BILLING_CATALOG_IDS = [
	"anthropic/claude-sonnet-4.6",
	"meta-llama/llama-3.3-70b:free",
	"org/allowlisted-only:free",
	"arcee-ai/trinity-large-preview:free",
	"tool-free",
] as const

const CLINE_BILLING_ALLOWLIST = ["org/allowlisted-only:free", ...CLINE_RECOMMENDED_MODELS_FALLBACK.free.map((model) => model.id)]

const CLINE_BILLING_NAMES: Record<string, string> = {
	"anthropic/claude-sonnet-4.6": "Claude Sonnet 4.6",
	"meta-llama/llama-3.3-70b:free": "Llama 3.3 70B",
	"org/allowlisted-only:free": "Allowlisted Free",
	"arcee-ai/trinity-large-preview:free": "Trinity Large Preview",
	"tool-free": "Tool Free",
}

describe("isFreeModel", () => {
	it("detects :free in id", () => {
		expect(isFreeModel("openrouter/auto:free")).toBe(true)
	})
	it("detects -free in id", () => {
		expect(isFreeModel("meta-llama-free")).toBe(true)
		expect(isFreeModel("foo-Free-bar")).toBe(true)
	})
	it("detects (free) in name", () => {
		expect(isFreeModel("gpt-4", "GPT-4 (free)")).toBe(true)
	})
	it("is case-insensitive", () => {
		expect(isFreeModel("MODEL:FREE")).toBe(true)
		expect(isFreeModel("x", "(FREE)")).toBe(true)
	})
	it("returns false for paid models", () => {
		expect(isFreeModel("gpt-4o")).toBe(false)
		expect(isFreeModel("claude-3", "Claude 3 Opus")).toBe(false)
		expect(isFreeModel("freedom-fighter")).toBe(false) // no :free / -free / (free)
	})
})

describe("compareModelEntries", () => {
	it("does not pin an active id above A–Z order", () => {
		const a = { id: "zebra", name: "Zebra" }
		const b = { id: "alpha", name: "Alpha" }
		expect(compareModelEntries(a, b)).toBeGreaterThan(0)
		expect(compareModelEntries(b, a)).toBeLessThan(0)
	})
	it("sorts A–Z by display name with base sensitivity", () => {
		expect(compareModelEntries({ id: "b", name: "Beta" }, { id: "a", name: "alpha" })).toBeGreaterThan(0)
		expect(compareModelEntries({ id: "a" }, { id: "b" })).toBeLessThan(0)
	})
	it("falls back to id when name missing", () => {
		expect(compareModelEntries({ id: "mistral" }, { id: "llama" })).toBeGreaterThan(0)
	})
})

describe("filterModelsByQuery", () => {
	const models = {
		"org/gpt-4": { name: "GPT-4" },
		"org/llama-free": { name: "Llama Free" },
		"other/claude": { name: "Claude" },
	}

	it("returns all when query empty", () => {
		expect(filterModelsByQuery(models, "")).toHaveLength(3)
		expect(filterModelsByQuery(models, "   ")).toHaveLength(3)
	})
	it("filters by id case-insensitively", () => {
		const r = filterModelsByQuery(models, "LLAMA")
		expect(r.map(([id]) => id)).toEqual(["org/llama-free"])
	})
	it("filters by name case-insensitively", () => {
		const r = filterModelsByQuery(models, "claude")
		expect(r.map(([id]) => id)).toEqual(["other/claude"])
	})
	it("returns empty when nothing matches", () => {
		expect(filterModelsByQuery(models, "xyzzy")).toHaveLength(0)
	})
	it("accepts Record with richer ModelInfo-like values without cast", () => {
		const rich: Record<string, { name?: string; supportsPromptCache: boolean }> = {
			"a/b": { name: "Bee", supportsPromptCache: true },
		}
		expect(filterModelsByQuery(rich, "bee")).toHaveLength(1)
	})
})

describe("partitionFreeStandard", () => {
	it("puts free first section and keeps A–Z within each group, including the active model", () => {
		const entries: ModelEntry[] = [
			["paid/b", { name: "Beta Paid" }],
			["free/a:free", { name: "Alpha Free" }],
			["paid/active", { name: "Active Paid" }],
			["free/z-free", { name: "Zebra Free" }],
		]
		const { free, standard } = partitionFreeStandard(entries)
		expect(free.map(([id]) => id)).toEqual(["free/a:free", "free/z-free"])
		expect(standard.map(([id]) => id)).toEqual(["paid/active", "paid/b"])
	})
	it("leaves a section empty when no models of that kind", () => {
		const entries: ModelEntry[] = [["a", { name: "A" }]]
		const { free, standard } = partitionFreeStandard(entries)
		expect(free).toHaveLength(0)
		expect(standard).toHaveLength(1)
	})
})

describe("modelsMatchQuery", () => {
	it("is true when any model matches", () => {
		expect(modelsMatchQuery({ "x/y": { name: "Hello" } }, "hel")).toBe(true)
	})
	it("is false when none match", () => {
		expect(modelsMatchQuery({ "x/y": { name: "Hello" } }, "zzz")).toBe(false)
	})
})

describe("providersMatchingModelQuery", () => {
	const providers = [
		{ id: "zenmux", name: "ZenMux" },
		{ id: "anthropic", name: "Anthropic" },
		{ id: "openrouter", name: "OpenRouter" },
	]
	const warm: WarmModelsByProvider = {
		openrouter: {
			models: {
				"anthropic/claude-3.5-sonnet": { name: "Claude 3.5 Sonnet" },
				"meta/llama": { name: "Llama" },
			},
		},
		// anthropic never warmed — model search won't find its models
	}

	it("returns empty for empty query", () => {
		expect(providersMatchingModelQuery(providers, warm, "")).toEqual([])
		expect(providersMatchingModelQuery(providers, warm, "  ")).toEqual([])
	})

	it("matches by provider name/id (A–Z)", () => {
		const r = providersMatchingModelQuery(providers, warm, "open")
		expect(r.map((p) => p.id)).toEqual(["openrouter"])
	})

	it("matches across providers via warm model id/name", () => {
		const r = providersMatchingModelQuery(providers, warm, "claude")
		expect(r.map((p) => p.id)).toEqual(["openrouter"])
	})

	it("includes both name and warm model hits, sorted A–Z", () => {
		const r = providersMatchingModelQuery(providers, warm, "anthropic")
		// anthropic by provider name; openrouter by warm model id prefix "anthropic/…"
		expect(r.map((p) => p.id)).toEqual(["anthropic", "openrouter"])
	})

	it("does not surface unwarmed providers for model-only queries", () => {
		const r = providersMatchingModelQuery(providers, warm, "llama")
		expect(r.map((p) => p.id)).toEqual(["openrouter"])
		expect(r.find((p) => p.id === "anthropic")).toBeUndefined()
	})
})

describe("pickAutoExpandProvider", () => {
	const providers = [
		{ id: "zenmux", name: "ZenMux" },
		{ id: "anthropic", name: "Anthropic" },
		{ id: "openrouter", name: "OpenRouter" },
	]
	const warm: WarmModelsByProvider = {
		openrouter: {
			models: { "org/claude-sonnet": { name: "Claude Sonnet" } },
		},
		zenmux: {
			models: { "z/claude-lite": { name: "Claude Lite" } },
		},
	}

	it("returns null for empty query", () => {
		expect(pickAutoExpandProvider(providers, warm, "", "anthropic")).toBeNull()
	})

	it("prefers active provider when it has a warm or name match", () => {
		expect(pickAutoExpandProvider(providers, warm, "claude", "zenmux")).toBe("zenmux")
		expect(pickAutoExpandProvider(providers, warm, "anthropic", "anthropic")).toBe("anthropic")
	})

	it("else picks first A–Z provider with warm model match", () => {
		// active anthropic has neither warm model nor (for "claude") name match on models —
		// "claude" does not match provider name "Anthropic"
		expect(pickAutoExpandProvider(providers, warm, "claude", "anthropic")).toBe("openrouter")
	})

	it("else falls back to first A–Z provider name/id match", () => {
		expect(pickAutoExpandProvider(providers, {}, "zen", "anthropic")).toBe("zenmux")
	})

	it("returns null when nothing matches", () => {
		expect(pickAutoExpandProvider(providers, warm, "xyzzy", "anthropic")).toBeNull()
	})
})

describe("Cline Usage-Billing filter vs Quick Picker heuristic", () => {
	const catalogIds = [...CLINE_BILLING_CATALOG_IDS]
	const settingsSet = filterOpenRouterModelIds(catalogIds, "cline", CLINE_BILLING_ALLOWLIST)
	const heuristicDrop = catalogIds.filter((id) => !isFreeModel(id, CLINE_BILLING_NAMES[id]))
	const partitionedAll = (() => {
		const entries: ModelEntry[] = catalogIds.map((id) => [id, { name: CLINE_BILLING_NAMES[id] }])
		const { free, standard } = partitionFreeStandard(entries)
		return [...free, ...standard].map(([id]) => id)
	})()

	it("keeps paid, allowlisted :free, exception :free, and -free ids; drops other :free", () => {
		expect([...settingsSet].sort()).toEqual(
			[
				"anthropic/claude-sonnet-4.6",
				"org/allowlisted-only:free",
				"arcee-ai/trinity-large-preview:free",
				"tool-free",
			].sort(),
		)
		expect(settingsSet).not.toContain("meta-llama/llama-3.3-70b:free")
	})

	it("is not the raw catalog", () => {
		expect([...settingsSet].sort()).not.toEqual([...catalogIds].sort())
	})

	it("is not the :free-name heuristic in quickModelPickerList (drop-filter or keep-all partition)", () => {
		expect([...settingsSet].sort()).not.toEqual([...heuristicDrop].sort())
		expect([...settingsSet].sort()).not.toEqual([...partitionedAll].sort())
	})
})

describe("queryActivePickerScrollTarget", () => {
	it("prefers the current model row over the provider group", () => {
		const root = document.createElement("div")
		root.innerHTML = `
			<div ${ACTIVE_PROVIDER_ATTR}="cerebras"></div>
			<div ${ACTIVE_PROVIDER_ATTR}="xai">
				<button ${ACTIVE_MODEL_ATTR} id="current-model">Grok</button>
			</div>
		`
		expect(queryActivePickerScrollTarget(root, "xai")?.id).toBe("current-model")
	})

	it("falls back to the active provider group when the model row is not mounted yet", () => {
		const root = document.createElement("div")
		root.innerHTML = `
			<div ${ACTIVE_PROVIDER_ATTR}="cerebras"></div>
			<div ${ACTIVE_PROVIDER_ATTR}="xai" id="xai-group"></div>
		`
		expect(queryActivePickerScrollTarget(root, "xai")?.id).toBe("xai-group")
		expect(queryActivePickerScrollTarget(root, "zai")).toBeNull()
	})
})

/**
 * Options-panel placement, pinned against measurements taken from the locked mock v11
 * (picker height 504px): the panel's top is the row's top, nudged 6px, lifted only as far
 * as the panel's own height needs so the WHOLE panel stays inside the picker.
 *
 * The three rounds of real reports behind this rule, in order: clamping against the
 * panel's 320px MAX-height pinned every row past ~90px to one top, so the panel stopped
 * following the list (fix.9); clamping against the panel's REAL height is right for the
 * placement but was re-run on every content change, so the Thinking switch — which
 * changes content — slid the panel off its row on each click (dev.6-fix.27); bounding the
 * panel's HEIGHT by the room left under a row-anchored top fixed that by handing low rows
 * a scrollbar instead of a whole panel, which the next smoke report rejected outright
 * (dev.6-fix.28: "take the scrollbar out and let it expand fully", 2026-09-21).
 *
 * What keeps it still is WHERE this is called from, not the maths: the picker's layout
 * effect depends on the hovered row alone, so the panel is measured once per row and a
 * toggle can no longer move it. `quick-picker-hover.test.ts` clicks a real switch on a
 * real row and fails if the box moves.
 */
describe("computeOptionsPanelTop", () => {
	const PICKER_HEIGHT = 504
	const place = (rowTop: number, panelHeight: number) =>
		computeOptionsPanelTop({ rowTop, pickerTop: 0, pickerHeight: PICKER_HEIGHT, panelHeight })
	/** What the panel really measured for a model with a Thinking switch and three levels. */
	const THREE_LEVELS = 260

	it("top-aligns the panel with the row (mock nudge of 6px)", () => {
		// Mock: row 109px → top 103 (rendered 104 after rounding); row 132px → 126.
		expect(place(109, THREE_LEVELS)).toBe(103)
		expect(place(132, THREE_LEVELS)).toBe(126)
	})

	it("lifts a low row only as far as that panel's own height needs", () => {
		// 504 - 260 - 10 = 234, so the panel's bottom rests exactly on the picker's
		// bottom margin — the whole panel is readable, with nothing to scroll.
		expect(place(440, THREE_LEVELS)).toBe(234)
		expect(place(999, THREE_LEVELS)).toBe(234)
		expect(place(440, THREE_LEVELS) + THREE_LEVELS + OPTIONS_PANEL_BOTTOM_MARGIN_PX).toBe(PICKER_HEIGHT)
		// A taller panel is lifted a little further; a shorter one less. The lift follows
		// the CONTENT, which is why the caller must measure it once per row.
		expect(place(440, 210)).toBe(284)
	})

	it("follows every row that has room below it — no pin to one top", () => {
		// Regression for the fix.9 report: clamping against the 320px max-height
		// instead gave 504 - 10 - 320 = 174 for every row, so the panel stopped
		// tracking after the first ~90px of list.
		expect(place(311, 100)).toBe(305)
		expect(place(311, THREE_LEVELS)).not.toBe(PICKER_HEIGHT - OPTIONS_PANEL_MAX_HEIGHT_PX - OPTIONS_PANEL_BOTTOM_MARGIN_PX)
	})

	it("keeps the entire panel inside the picker for any height a model can draw", () => {
		for (const rowTop of [60, 150, 250, 350, 460, 999]) {
			for (const panelHeight of [140, 210, THREE_LEVELS, OPTIONS_PANEL_MAX_HEIGHT_PX]) {
				const top = place(rowTop, panelHeight)
				expect(top).toBeGreaterThanOrEqual(OPTIONS_PANEL_MIN_TOP_PX)
				expect(top + panelHeight + OPTIONS_PANEL_BOTTOM_MARGIN_PX).toBeLessThanOrEqual(PICKER_HEIGHT)
			}
		}
	})

	it("never rises above the minimum top, even for a row at the very top", () => {
		expect(place(10, THREE_LEVELS)).toBe(OPTIONS_PANEL_MIN_TOP_PX)
		expect(place(0, THREE_LEVELS)).toBe(OPTIONS_PANEL_MIN_TOP_PX)
	})
})

/*
 * The pane-fitting anchoring rule moved to `@/icline/menuPopover` with the rest of the
 * menu conventions; its tests moved to `src/icline/menuPopover.test.ts`.
 */
