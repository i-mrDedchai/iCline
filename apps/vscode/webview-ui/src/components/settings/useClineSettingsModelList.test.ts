import { CLINE_RECOMMENDED_MODELS_FALLBACK } from "@shared/cline/recommended-models"
import { filterOpenRouterModelIds } from "@shared/utils/model-filters"
import { describe, expect, it } from "vitest"
import { isFreeModel, type ModelEntry, partitionFreeStandard } from "@/components/chat/quickModelPickerList"
import { filterClineSettingsModelIds, partitionClinePickerSections } from "./useClineSettingsModelList"

const CATALOG_IDS = [
	"anthropic/claude-sonnet-4.6",
	"meta-llama/llama-3.3-70b:free",
	"org/allowlisted-only:free",
	"arcee-ai/trinity-large-preview:free",
	"tool-free",
]

const ALLOWLIST = ["org/allowlisted-only:free", ...CLINE_RECOMMENDED_MODELS_FALLBACK.free.map((model) => model.id)]

describe("filterClineSettingsModelIds", () => {
	it("matches filterOpenRouterModelIds(..., 'cline', allowlist) and is not the picker :free heuristic", () => {
		const settings = filterClineSettingsModelIds(CATALOG_IDS, ALLOWLIST)
		expect(settings.sort()).toEqual(filterOpenRouterModelIds(CATALOG_IDS, "cline", ALLOWLIST).sort())
		expect(settings).not.toContain("meta-llama/llama-3.3-70b:free")
		expect(settings).toContain("org/allowlisted-only:free")
		expect(settings).toContain("tool-free")
		expect(settings.sort()).not.toEqual([...CATALOG_IDS].sort())

		const heuristicDrop = CATALOG_IDS.filter((id) => !isFreeModel(id))
		const partitioned = partitionFreeStandard(CATALOG_IDS.map((id) => [id, {}]))
		const heuristicKeepAll = [...partitioned.free, ...partitioned.standard].map(([id]) => id)
		expect(settings.sort()).not.toEqual([...heuristicDrop].sort())
		expect(settings.sort()).not.toEqual([...heuristicKeepAll].sort())
	})
})

describe("partitionClinePickerSections", () => {
	it("puts Settings featured free ids in Free with FREE badges even when the name has no :free", () => {
		const catalog: ModelEntry[] = [
			["z-ai/glm-5.3-flash", { name: "GLM-5.3-Flash" }],
			["aion-2.0", { name: "Aion-2.0" }],
			["poolside/laguna-s-2.1:free", { name: "Laguna S 2.1 (free)" }],
		]
		const featuredFree = [
			{ id: "cline-free/deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", tags: ["FREE"] },
			{ id: "z-ai/glm-5.3-flash", name: "GLM-5.3-Flash", tags: ["FREE"] },
			{ id: "poolside/laguna-s-2.1:free", name: "Laguna S 2.1", tags: ["FREE"] },
			{ id: "cline-free/muse-spark-1.3-contributor", name: "Muse Spark", tags: ["FREE"] },
			{ id: "cline-free/solar-pro4", name: "Solar Pro 4", tags: ["FREE"] },
		]
		const featuredRecommended = [{ id: "openai/gpt-6-astra", name: "GPT-6 Astra", tags: ["NEW"] }]

		const catalogPlusFeatured: ModelEntry[] = [
			...catalog,
			...featuredFree
				.filter((model) => !catalog.some(([id]) => id === model.id))
				.map((model) => [model.id, { name: model.name }] as ModelEntry),
			["openai/gpt-6-astra", { name: "GPT-6 Astra" }],
		]

		const sections = partitionClinePickerSections(catalogPlusFeatured, featuredRecommended, featuredFree)

		expect(sections.free.map((row) => row.id)).toEqual(featuredFree.map((model) => model.id))
		expect(sections.free.every((row) => row.badge === "FREE")).toBe(true)
		expect(sections.recommended.map((row) => row.id)).toEqual(["openai/gpt-6-astra"])
		expect(sections.recommended[0]?.badge).toBe("NEW")
		expect(sections.standard.map((row) => row.id)).toEqual(["aion-2.0"])
		expect(isFreeModel("z-ai/glm-5.3-flash", "GLM-5.3-Flash")).toBe(false)
	})

	it("keeps the catalog's capability fields on a featured row", () => {
		// A featured row is what the Options panel renders its Thinking switch and its
		// capability readout from. Passing only `{ name }` is why a free model showed
		// "No capability data" while its catalog entry listed reasoning support.
		const catalog: ModelEntry[] = [
			[
				"z-ai/glm-5.3-flash",
				{
					name: "GLM-5.3-Flash (free)",
					supportsReasoning: true,
					supportsImages: true,
					reasoningEffortOptions: ["low", "high", "max"],
				},
			],
		]
		const featuredFree = [{ id: "z-ai/glm-5.3-flash", name: "glm-5.3-flash", tags: ["FREE"] }]

		const sections = partitionClinePickerSections(catalog, [], featuredFree)

		// The feed's display name still wins…
		expect(sections.free[0]?.info.name).toBe("GLM-5.3-Flash (free)")
		// …and the rest of the entry comes with it.
		expect(sections.free[0]?.info).toMatchObject({
			supportsReasoning: true,
			supportsImages: true,
			reasoningEffortOptions: ["low", "high", "max"],
		})
	})
})
