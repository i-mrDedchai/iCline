import { type SakanaModelId, sakanaDefaultModelId, sakanaModels } from "@shared/api"
import type { Mode } from "@shared/storage/types"
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import React, { useMemo } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useProviderModels } from "@/hooks/useProviderModels"
import { DROPDOWN_Z_INDEX } from "./ApiOptions"
import { ModelInfoView } from "./common/ModelInfoView"
import { DropdownContainer, ModelSelector } from "./common/ModelSelector"
import { getModeSpecificFields } from "./utils/providerUtils"
import { useApiConfigurationHandlers } from "./utils/useApiConfigurationHandlers"

export interface SakanaModelPickerProps {
	isPopup?: boolean
	currentMode: Mode
}

const SAKANA_REASONING_EFFORTS = ["high", "xhigh", "max"] as const
type SakanaReasoningEffort = (typeof SAKANA_REASONING_EFFORTS)[number]

function defaultSakanaReasoningEffort(modelId: string): SakanaReasoningEffort {
	return modelId === "fugu-ultra" || modelId.startsWith("fugu-ultra") ? "xhigh" : "high"
}

function normalizeSakanaReasoningEffort(value: string | undefined, modelId: string): SakanaReasoningEffort {
	if (value && SAKANA_REASONING_EFFORTS.includes(value as SakanaReasoningEffort)) {
		return value as SakanaReasoningEffort
	}
	return defaultSakanaReasoningEffort(modelId)
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
	const selectedReasoningEffort = normalizeSakanaReasoningEffort(modeFields.reasoningEffort, selectedModelId)

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
					zIndex={DROPDOWN_Z_INDEX - 100}
				/>
			</div>

			{selectedModelInfo?.supportsReasoning && (
				<div style={{ marginTop: 4, marginBottom: 12 }}>
					<label htmlFor="sakana-reasoning-effort">
						<span style={{ fontWeight: 500 }}>Reasoning Effort</span>
					</label>
					<DropdownContainer className="dropdown-container" zIndex={DROPDOWN_Z_INDEX - 100}>
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
							<VSCodeOption value="high">High</VSCodeOption>
							<VSCodeOption value="xhigh">X-High</VSCodeOption>
							<VSCodeOption value="max">Max</VSCodeOption>
						</VSCodeDropdown>
					</DropdownContainer>
					<p style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)", marginTop: 5 }}>
						Fugu Ultra defaults to X-High. Higher effort improves depth but uses more tokens.
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
