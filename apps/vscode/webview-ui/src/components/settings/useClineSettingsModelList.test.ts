import { CLINE_RECOMMENDED_MODELS_FALLBACK } from "@shared/cline/recommended-models"
import { filterOpenRouterModelIds } from "@shared/utils/model-filters"
import { describe, expect, it } from "vitest"
import { isFreeModel, partitionFreeStandard } from "@/components/chat/quickModelPickerList"
import { filterClineSettingsModelIds } from "./useClineSettingsModelList"

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
