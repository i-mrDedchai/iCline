import { openAiModelInfoSafeDefaults } from "@shared/api"
import type { Mode } from "@shared/storage/types"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useProviderConfig } from "@/hooks/useProviderConfig"
import { useProviderModelSelection } from "@/hooks/useProviderModelSelection"
import { useStaticProviderSelection } from "@/hooks/useStaticProviderSelection"
import { formatString } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import { resolveModelThinkingOptions } from "@/utils/modelThinkingOptions"
import { ApiKeyField } from "../common/ApiKeyField"
import { BaseUrlField } from "../common/BaseUrlField"
import { ModelInfoView } from "../common/ModelInfoView"
import { ModelSelector } from "../common/ModelSelector"
import { RemotelyConfiguredInputWrapper } from "../common/RemotelyConfiguredInputWrapper"
import ReasoningEffortSelector from "../ReasoningEffortSelector"
import ThinkingBudgetSlider from "../ThinkingBudgetSlider"
import { useProviderApiKeyField } from "../utils/useProviderApiKeyField"

const PROVIDER_ID = "anthropic"

/**
 * Props for the AnthropicProvider component
 */
interface AnthropicProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

/**
 * The Anthropic provider configuration component
 */
export const AnthropicProvider = ({ showModelOptions, isPopup, currentMode }: AnthropicProviderProps) => {
	const { apiConfiguration, remoteConfigSettings } = useExtensionState()
	const tr = useTranslation("providers")
	const { config, write, commitSelection } = useProviderConfig(PROVIDER_ID)

	// Get the normalized configuration
	const {
		models,
		defaultModelId,
		selectedModelId: legacySelectedModelId,
		selectedModelInfo: legacySelectedModelInfo,
		hideUsageCost,
	} = useStaticProviderSelection(PROVIDER_ID, apiConfiguration, currentMode)
	const { selectedModelId, selectedModelInfo, commitModelSelection } = useProviderModelSelection(PROVIDER_ID, currentMode, {
		models,
		defaultModelId: defaultModelId || legacySelectedModelId,
		config,
		commitSelection,
		fallbackModelInfo: legacySelectedModelInfo,
	})
	const { savedApiKeyMask, handleApiKeyChange } = useProviderApiKeyField({
		apiKeyLength: config?.apiKeyLength,
		providerName: "Anthropic",
		write,
	})
	// Which control this model gets is the shared policy's call
	// (`@/utils/modelThinkingOptions`) — the same one the Quick Picker and every other
	// provider form uses, so Settings and the picker cannot disagree. Its thinking-budget
	// list lives there as `ANTHROPIC_THINKING_BUDGET_MODELS`.
	const thinkingOptions = resolveModelThinkingOptions({
		providerId: PROVIDER_ID,
		modelId: selectedModelId ?? "",
		modelInfo: selectedModelInfo,
	})

	const handleBaseUrlChange = (value: string) => {
		void write({ baseUrl: value }).catch((err) => console.error("Failed to update Anthropic base URL:", err))
	}

	const handleModelChange = (modelId: string) => {
		if (!modelId) {
			return
		}

		const fallbackModelId = defaultModelId || Object.keys(models)[0] || modelId
		const modelInfo = models[modelId] ?? models[fallbackModelId] ?? selectedModelInfo ?? openAiModelInfoSafeDefaults

		void commitModelSelection({ modelId, modelInfo }).catch((err) =>
			console.error("Failed to commit Anthropic model selection:", err),
		)
	}

	const handleAdaptiveThinkingChange = (effort: string) => {
		void write({ reasoning: { enabled: effort !== "none", effort } }).catch((err) =>
			console.error("Failed to update Anthropic adaptive thinking:", err),
		)
	}

	return (
		<div>
			<ApiKeyField
				initialValue={savedApiKeyMask}
				onChange={handleApiKeyChange}
				providerName="Anthropic"
				signupUrl="https://console.anthropic.com/settings/keys"
			/>

			<RemotelyConfiguredInputWrapper hidden={remoteConfigSettings?.anthropicBaseUrl === undefined}>
				<BaseUrlField
					disabled={!!remoteConfigSettings?.anthropicBaseUrl}
					initialValue={config?.baseUrl}
					onChange={handleBaseUrlChange}
					placeholder={formatString(tr, "defaultValue", { value: "https://api.anthropic.com" })}
					showLockIcon={!!remoteConfigSettings?.anthropicBaseUrl}
				/>
			</RemotelyConfiguredInputWrapper>

			{showModelOptions && (
				<>
					<ModelSelector
						models={models}
						onChange={(e) => handleModelChange(e.target.value)}
						selectedModelId={selectedModelId}
					/>

					{thinkingOptions.showEffort ? (
						<ReasoningEffortSelector
							currentMode={currentMode}
							modelId={selectedModelId ?? ""}
							modelInfo={selectedModelInfo}
							onEffortChange={handleAdaptiveThinkingChange}
							providerId={PROVIDER_ID}
						/>
					) : thinkingOptions.showThinkingBudget ? (
						<ThinkingBudgetSlider currentMode={currentMode} maxBudget={selectedModelInfo.thinkingConfig?.maxBudget} />
					) : null}

					<ModelInfoView
						hideUsageCost={hideUsageCost}
						isPopup={isPopup}
						modelInfo={selectedModelInfo}
						selectedModelId={selectedModelId}
					/>
				</>
			)}
		</div>
	)
}
