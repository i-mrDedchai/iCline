import { sakanaDefaultModelId, sakanaModels, type SakanaModelId } from "@shared/api"
import type { Mode } from "@shared/storage/types"
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import React, { useMemo } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ModelInfoView } from "./common/ModelInfoView"
import { DROPDOWN_Z_INDEX } from "./ApiOptions"
import { DropdownContainer } from "./common/ModelSelector"
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

	const modelIds = useMemo(() => Object.keys(sakanaModels) as SakanaModelId[], [])
	const selectedModelId = modeFields.sakanaModelId || sakanaDefaultModelId
	const selectedModelInfo = modeFields.sakanaModelInfo || sakanaModels[selectedModelId as SakanaModelId]
	const selectedReasoningEffort = normalizeSakanaReasoningEffort(modeFields.reasoningEffort, selectedModelId)

	const handleModelChange = (newModelId: string) => {
		const modelInfo = sakanaModels[newModelId as SakanaModelId]
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
			<label>
				<span style={{ fontWeight: 500 }}>Model</span>
			</label>
			<DropdownContainer className="dropdown-container" zIndex={DROPDOWN_Z_INDEX - 100}>
				<VSCodeDropdown
					onChange={(e: any) => handleModelChange(e.target.value)}
					style={{ width: "100%", marginTop: 3 }}
					value={selectedModelId}>
					{modelIds.map((id) => (
						<VSCodeOption key={id} value={id}>
							{sakanaModels[id].name ? `${id} — ${sakanaModels[id].name}` : id}
						</VSCodeOption>
					))}
				</VSCodeDropdown>
			</DropdownContainer>

			{selectedModelInfo?.supportsReasoning && (
				<div style={{ marginTop: 10 }}>
					<label>
						<span style={{ fontWeight: 500 }}>Reasoning Effort</span>
					</label>
					<DropdownContainer className="dropdown-container" zIndex={DROPDOWN_Z_INDEX - 100}>
						<VSCodeDropdown
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