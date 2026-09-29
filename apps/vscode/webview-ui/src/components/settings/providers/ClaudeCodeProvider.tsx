import { openAiModelInfoSafeDefaults } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useProviderConfig } from "@/hooks/useProviderConfig"
import { useProviderModelSelection } from "@/hooks/useProviderModelSelection"
import { useProviderModels } from "@/hooks/useProviderModels"
import { formatString } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import { resolveModelThinkingOptions } from "@/utils/modelThinkingOptions"
import { DebouncedTextField } from "../common/DebouncedTextField"
import { ModelInfoView } from "../common/ModelInfoView"
import { ModelSelector } from "../common/ModelSelector"
import ThinkingBudgetSlider from "../ThinkingBudgetSlider"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

/**
 * Props for the ClaudeCodeProvider component
 */
interface ClaudeCodeProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

/**
 * The Claude Code provider configuration component
 */
export const ClaudeCodeProvider = ({ showModelOptions, isPopup, currentMode }: ClaudeCodeProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const tr = useTranslation("providers")
	const { handleFieldChange } = useApiConfigurationHandlers()
	const providerId = "claude-code"
	const { models, defaultModelId } = useProviderModels(providerId)
	const { config, commitSelection } = useProviderConfig(providerId)
	const { selectedModelId, selectedModelInfo, commitModelSelection } = useProviderModelSelection(providerId, currentMode, {
		models,
		defaultModelId,
		config,
		commitSelection,
	})
	const thinkingOptions = resolveModelThinkingOptions({ providerId, modelId: selectedModelId, modelInfo: selectedModelInfo })

	const handleModelSelect = (event: {
		target?: { value?: unknown }
		currentTarget?: { value?: unknown }
		detail?: { value?: unknown }
	}) => {
		const modelId = event.target?.value ?? event.currentTarget?.value ?? event.detail?.value
		if (typeof modelId !== "string" || modelId.length === 0) {
			return
		}
		void commitModelSelection({
			modelId,
			modelInfo: models[modelId] ?? selectedModelInfo ?? openAiModelInfoSafeDefaults,
		}).catch((err) => console.error("Failed to commit Claude Code model selection:", err))
	}

	return (
		<div>
			<DebouncedTextField
				initialValue={apiConfiguration?.claudeCodePath || ""}
				onChange={(value) => handleFieldChange("claudeCodePath", value)}
				placeholder={formatString(tr, "defaultValue", { value: "claude" })}
				style={{ width: "100%", marginTop: 3 }}
				type="text">
				<span style={{ fontWeight: 500 }}>{tr("claudeCodePathLabel")}</span>
			</DebouncedTextField>

			<p
				style={{
					fontSize: "12px",
					marginTop: 3,
					color: "var(--vscode-descriptionForeground)",
				}}>
				{tr("claudeCodePathHint")}
			</p>

			{showModelOptions && (
				<>
					<ModelSelector models={models} onChange={handleModelSelect} selectedModelId={selectedModelId} />

					{(selectedModelId === "sonnet" || selectedModelId === "opus") && (
						<p
							style={{
								fontSize: "12px",
								marginBottom: 2,
								marginTop: 2,
								color: "var(--vscode-descriptionForeground)",
							}}>
							{formatString(tr, "claudeCodeModelDefault", { model: selectedModelId })}
						</p>
					)}

					{thinkingOptions.showThinkingBudget && (
						<ThinkingBudgetSlider currentMode={currentMode} maxBudget={selectedModelInfo.thinkingConfig?.maxBudget} />
					)}

					<ModelInfoView isPopup={isPopup} modelInfo={selectedModelInfo} selectedModelId={selectedModelId} />
				</>
			)}
		</div>
	)
}
