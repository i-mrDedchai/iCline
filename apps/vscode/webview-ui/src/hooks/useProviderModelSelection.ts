import type { ModelInfo } from "@shared/api"
import type { ProviderConfigResponse } from "@shared/proto/cline/models"
import { fromProtobufModelInfo } from "@shared/proto-conversions/models/typeConversion"
import type { Mode } from "@shared/storage/types"
import { useCallback } from "react"
import type { ProviderId } from "@/context/ExtensionStateContext"
import type { ProviderModelSelection } from "./useProviderConfig"

type ProviderModelSelectionInput =
	| (Omit<ProviderModelSelection, "providerId"> & { modelInfo?: ModelInfo })
	| (ProviderModelSelection & { modelInfo?: ModelInfo })

interface DisplayProviderModelSelection extends ProviderModelSelection {
	modelInfo: ModelInfo
}

interface UseProviderModelSelectionOptions {
	models: Record<string, ModelInfo>
	defaultModelId?: string
	config?: ProviderConfigResponse
	commitSelection: (mode: "plan" | "act", selection: ProviderModelSelection) => Promise<unknown>
	fallbackModelInfo?: ModelInfo
	customModelInfo?: (modelId: string) => ModelInfo
}

export function useProviderModelSelection(
	providerId: ProviderId,
	currentMode: Mode,
	{
		models,
		defaultModelId,
		config,
		commitSelection,
		// Unknown model metadata stays unknown: fabricating the openai-compatible
		// safe defaults here displayed "Context: 128K" for models whose real
		// window is 500K/1M (the metadata is simply not known yet).
		fallbackModelInfo = { supportsPromptCache: false },
		customModelInfo,
	}: UseProviderModelSelectionOptions,
) {
	const committedSelection = currentMode === "plan" ? config?.planSelection : config?.actSelection
	const fallbackModelId = defaultModelId || Object.keys(models)[0] || ""
	const selectedModelId = committedSelection?.modelId ?? fallbackModelId
	const selectedModelInfo = committedSelection?.modelInfo
		? fromProtobufModelInfo(committedSelection.modelInfo)
		: (models[selectedModelId] ??
			(selectedModelId && customModelInfo ? customModelInfo(selectedModelId) : undefined) ??
			fallbackModelInfo)

	const selectedModel: DisplayProviderModelSelection = {
		providerId,
		modelId: selectedModelId,
		modelInfo: selectedModelInfo,
	}

	const commitModelSelection = useCallback(
		(selection: ProviderModelSelectionInput) => {
			return commitSelection(currentMode, {
				providerId,
				modelId: selection.modelId,
				...(selection.overrides !== undefined ? { overrides: selection.overrides } : {}),
			})
		},
		[commitSelection, currentMode, providerId],
	)

	return {
		committedSelection,
		fallbackModelId,
		selectedModel,
		selectedModelId,
		selectedModelInfo,
		commitModelSelection,
	}
}
