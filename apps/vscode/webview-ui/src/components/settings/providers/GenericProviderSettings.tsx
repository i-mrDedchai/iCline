import { Mode } from "@shared/storage/types"
import { useCallback } from "react"
import { type ProviderId } from "@/context/ExtensionStateContext"
import { useProviderConfig } from "@/hooks/useProviderConfig"
import { useProviderModelSelection } from "@/hooks/useProviderModelSelection"
import { useProviderModels } from "@/hooks/useProviderModels"
import { useTranslation } from "@/i18n/useTranslation"
import { resolveModelThinkingOptions } from "@/utils/modelThinkingOptions"
import { ApiKeyField } from "../common/ApiKeyField"
import { BaseUrlField } from "../common/BaseUrlField"
import { ModelInfoView } from "../common/ModelInfoView"
import ReasoningEffortSelector from "../ReasoningEffortSelector"
import { useProviderApiKeyField } from "../utils/useProviderApiKeyField"
import { type ModelPickerSelection, ModelPickerWithManualEntry } from "./ModelPickerWithManualEntry"

interface GenericProviderBaseUrlFieldConfig {
	label?: string
	placeholder?: string
}

export interface GenericProviderSettingsProps {
	providerId: ProviderId
	providerName: string
	signupUrl?: string
	baseUrlField?: GenericProviderBaseUrlFieldConfig
	allowsCustomIds: boolean
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

/**
 * Shared settings shell for providers whose configuration is the common
 * catalog-backed shape: API key, optional base URL, model picker, and model
 * info. Provider-specific wrappers should pass metadata while custom providers
 * keep their own components.
 */
export const GenericProviderSettings = ({
	providerId,
	providerName,
	signupUrl,
	baseUrlField,
	allowsCustomIds,
	showModelOptions,
	isPopup,
	currentMode,
}: GenericProviderSettingsProps) => {
	const { models, defaultModelId, isLoading, isStale, error, refresh } = useProviderModels(providerId)
	const { config, write, commitSelection } = useProviderConfig(providerId)
	// Credential/endpoint writes change what the model list resolves to (a
	// saved key unlocks the live endpoint list), so re-resolve after the
	// host persists — otherwise the picker stays on the pre-save list until
	// the next mount or manual expand (NaraRouter dev.4-fix.1). Reasoning
	// writes keep the plain path: they never affect the list.
	const writeAndRefresh = useCallback(
		async (patch: Parameters<typeof write>[0]) => {
			await write(patch)
			await refresh()
		},
		[write, refresh],
	)
	const { selectedModel, commitModelSelection } = useProviderModelSelection(providerId, currentMode, {
		models,
		defaultModelId,
		config,
		commitSelection,
	})

	const handleModelSelect = (selection: ModelPickerSelection) => {
		void commitModelSelection(selection).catch((err) =>
			console.error(`Failed to commit ${providerName} model selection:`, err),
		)
	}

	const { savedApiKeyMask, handleApiKeyChange } = useProviderApiKeyField({
		apiKeyLength: config?.apiKeyLength,
		providerName,
		write: writeAndRefresh,
	})
	const tr = useTranslation("providers")
	const handleBaseUrlChange = (value: string) => {
		void writeAndRefresh({ baseUrl: value }).catch((err) => console.error(`Failed to update ${providerName} base URL:`, err))
	}

	return (
		<div>
			<ApiKeyField
				initialValue={savedApiKeyMask}
				onChange={handleApiKeyChange}
				placeholder={tr("apiKeyPlaceholder")}
				providerName={providerName}
				signupUrl={signupUrl}
			/>

			{baseUrlField && (
				<BaseUrlField
					initialValue={config?.baseUrl}
					label={baseUrlField.label}
					onChange={handleBaseUrlChange}
					placeholder={baseUrlField.placeholder}
				/>
			)}

			{showModelOptions && (
				<>
					<ModelPickerWithManualEntry
						allowsCustomIds={allowsCustomIds}
						error={error}
						isLoading={isLoading}
						isStale={isStale}
						models={models}
						onSelect={handleModelSelect}
						selectedModel={selectedModel}
					/>

					{resolveModelThinkingOptions({
						providerId,
						modelId: selectedModel.modelId,
						modelInfo: selectedModel.modelInfo,
					}).showEffort && (
						<ReasoningEffortSelector
							currentMode={currentMode}
							modelId={selectedModel.modelId}
							modelInfo={selectedModel.modelInfo}
							onEffortChange={(effort) => {
								void write({
									reasoning: {
										enabled: effort !== "none",
										effort: effort !== "none" ? effort : undefined,
									},
								}).catch((err) => console.error(`Failed to update ${providerName} reasoning effort:`, err))
							}}
							providerId={providerId}
						/>
					)}

					<ModelInfoView
						isPopup={isPopup}
						modelInfo={selectedModel.modelInfo}
						selectedModelId={selectedModel.modelId}
					/>
				</>
			)}
		</div>
	)
}
