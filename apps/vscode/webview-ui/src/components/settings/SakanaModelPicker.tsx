import { type SakanaModelId, sakanaDefaultModelId, sakanaModels } from "@shared/api"
import type { Mode } from "@shared/storage/types"
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import React, { useMemo } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useProviderModels } from "@/hooks/useProviderModels"
import {
	defaultEffortValue,
	normalizeEffortValue,
	resolveEffortLevels,
	resolveModelThinkingOptions,
} from "@/utils/modelThinkingOptions"
import { ModelInfoView } from "./common/ModelInfoView"
import { DropdownContainer, formDropdownZIndex, ModelSelector } from "./common/ModelSelector"
import { getModeSpecificFields } from "./utils/providerUtils"
import { useApiConfigurationHandlers } from "./utils/useApiConfigurationHandlers"

export interface SakanaModelPickerProps {
	isPopup?: boolean
	currentMode: Mode
}

const SakanaModelPicker: React.FC<SakanaModelPickerProps> = ({ isPopup, currentMode }) => {
	const { apiConfiguration } = useExtensionState()
	const { handleModeFieldsChange, handleModeFieldChange } = useApiConfigurationHandlers()
	const modeFields = getModeSpecificFields(apiConfiguration, currentMode)
	// Live registry models (generated models.dev catalog — currently 7 entries
	// incl. fugu-ultra-v2 / namazu with prompt-cache) win per-id; the static
	// @shared/api table stays as the offline/first-paint fallback.
	const { models: liveSakanaModels, defaultModelId: liveDefaultModelId } = useProviderModels("sakana")
	const models = useMemo(() => {
		if (liveSakanaModels && Object.keys(liveSakanaModels).length > 0) {
			return { ...sakanaModels, ...liveSakanaModels }
		}
		return sakanaModels
	}, [liveSakanaModels])
	const defaultModelId =
		liveSakanaModels && Object.keys(liveSakanaModels).length > 0
			? liveDefaultModelId || sakanaDefaultModelId
			: sakanaDefaultModelId

	const selectedModelId = modeFields.sakanaModelId || defaultModelId
	const selectedModelInfo = modeFields.sakanaModelInfo || models[selectedModelId as SakanaModelId]
	// WHICH models get an effort control, WHICH levels it offers and its default are all
	// provider metadata (`@/utils/modelThinkingOptions`) — the same table the Quick Picker
	// and every other provider form reads. Sakana's three levels (high/xhigh/max) and the
	// per-model default (Fugu Ultra → X-High) live there, not in this component.
	const thinkingOptions = resolveModelThinkingOptions({
		providerId: "sakana",
		modelId: selectedModelId,
		modelInfo: selectedModelInfo,
	})
	const effortLevels = resolveEffortLevels({
		providerId: "sakana",
		modelId: selectedModelId,
		modelInfo: selectedModelInfo,
	})
	const selectedReasoningEffort = normalizeEffortValue(
		effortLevels,
		modeFields.reasoningEffort,
		defaultEffortValue(effortLevels, selectedModelId),
	)

	const handleModelChange = (newModelId: string) => {
		const modelInfo = models[newModelId as SakanaModelId]
		handleModeFieldsChange(
			{
				sakanaModelId: { plan: "planModeSakanaModelId", act: "actModeSakanaModelId" },
				sakanaModelInfo: { plan: "planModeSakanaModelInfo", act: "actModeSakanaModelInfo" },
			},
			{
				sakanaModelId: newModelId,
				sakanaModelInfo: modelInfo,
			},
			currentMode,
		)
	}

	return (
		<div>
			{/* Shared ModelSelector keeps the label inside the dropdown container —
			    the same proven layout as the xai page (smoke 2026-09: the hand-rolled
			    label + container stacked here overlapped the Reasoning Effort block). */}
			<div style={{ marginBottom: 12 }}>
				<ModelSelector
					label="Model"
					models={models}
					onChange={(e: any) => handleModelChange(e.target.value)}
					selectedModelId={selectedModelId}
					// Sakana form ladder: billing 0, protocol 1 (SakanaProvider) — model 2, effort 3.
					zIndex={formDropdownZIndex(2)}
				/>
			</div>

			{selectedModelInfo && thinkingOptions.showEffort && (
				<div style={{ marginTop: 4, marginBottom: 12 }}>
					<label htmlFor="sakana-reasoning-effort">
						<span style={{ fontWeight: 500 }}>Reasoning Effort</span>
					</label>
					<DropdownContainer className="dropdown-container" zIndex={formDropdownZIndex(3)}>
						<VSCodeDropdown
							id="sakana-reasoning-effort"
							onChange={(e: any) =>
								handleModeFieldChange(
									{ plan: "planModeReasoningEffort", act: "actModeReasoningEffort" },
									e.target.value,
									currentMode,
								)
							}
							style={{ width: "100%", marginTop: 3 }}
							value={selectedReasoningEffort}>
							{effortLevels.levels.map((level) => (
								<VSCodeOption key={level.value} value={level.value}>
									{level.label}
								</VSCodeOption>
							))}
						</VSCodeDropdown>
					</DropdownContainer>
					<p style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)", marginTop: 5 }}>
						{effortLevels.description}
					</p>
				</div>
			)}

			{selectedModelInfo && (
				<ModelInfoView isPopup={isPopup} modelInfo={selectedModelInfo} selectedModelId={selectedModelId} />
			)}
		</div>
	)
}

export default SakanaModelPicker
