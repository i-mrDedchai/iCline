import { openAiModelInfoSafeDefaults } from "@shared/api"
import type { Mode } from "@shared/storage/types"
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import UseCustomPromptCheckbox from "@/components/settings/UseCustomPromptCheckbox"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useProviderConfig } from "@/hooks/useProviderConfig"
import { useProviderModelSelection } from "@/hooks/useProviderModelSelection"
import { useStaticProviderSelection } from "@/hooks/useStaticProviderSelection"
import { ApiKeyField } from "../common/ApiKeyField"
import { BaseUrlField } from "../common/BaseUrlField"
import { ModelInfoView } from "../common/ModelInfoView"
import { DropdownContainer, ModelSelector } from "../common/ModelSelector"
import { getModeSpecificFields } from "../utils/providerUtils"
import { useProviderApiKeyField } from "../utils/useProviderApiKeyField"

const PROVIDER_ID = "jan"

/**
 * Props for the JanProvider component
 */
interface JanProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

/**
 * Jan provider settings — migrated to the v4.0.0 SDK hooks so that the
 * model list, base URL, and API key all flow through the unified SDK
 * provider config store (the same store the Quick picker reads from).
 *
 * Previously JanProvider used the old `apiConfiguration.janBaseUrl` +
 * `getJanModels` RPC polling, which created a duplicate Base URL field
 * (the SDK also rendered its own via GenericProviderSettings) and meant
 * models fetched here never appeared in the Quick picker.
 */
export const JanProvider = ({ showModelOptions, isPopup, currentMode }: JanProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const { config, write, commitSelection } = useProviderConfig(PROVIDER_ID)

	const modeFields = getModeSpecificFields(apiConfiguration, currentMode)

	// Get the normalized configuration from the SDK catalog. Pass the real
	// apiConfiguration (from ExtensionState) — not the SDK ProviderConfigResponse —
	// so that useStaticProviderSelection can read planModeJanModelId /
	// actModeJanModelId to determine the saved model id.
	const {
		models,
		defaultModelId,
		selectedModelId: legacySelectedModelId,
		selectedModelInfo: legacySelectedModelInfo,
		hideUsageCost,
	} = useStaticProviderSelection(PROVIDER_ID, apiConfiguration, currentMode)
	const { selectedModelId, selectedModelInfo, commitModelSelection } = useProviderModelSelection(
		PROVIDER_ID,
		currentMode,
		{
			models,
			defaultModelId: legacySelectedModelId,
			config,
			commitSelection,
			fallbackModelInfo: legacySelectedModelInfo,
		},
	)

	const { savedApiKeyMask, handleApiKeyChange } = useProviderApiKeyField({
		apiKeyLength: config?.apiKeyLength,
		providerName: "Jan",
		write,
	})

	const handleModelChange = (modelId: string) => {
		if (!modelId) {
			return
		}

		const fallbackModelId = defaultModelId || Object.keys(models)[0] || modelId
		const modelInfo = models[modelId] ?? models[fallbackModelId] ?? selectedModelInfo ?? openAiModelInfoSafeDefaults

		void commitModelSelection({
			modelId,
			modelInfo,
		}).catch((err) => console.error("Failed to commit Jan model selection:", err))
	}

	const handleBaseUrlChange = (value: string) => {
		void write({ baseUrl: value }).catch((err) =>
			console.error("Failed to update Jan base URL:", err),
		)
	}

	return (
		<div className="flex flex-col gap-2">
			<BaseUrlField
				initialValue={config?.baseUrl}
				label="Jan Local API Server URL"
				onChange={handleBaseUrlChange}
				placeholder="Default: http://127.0.0.1:1337"
			/>

			<ApiKeyField
				helpText="Optional API key if configured in Jan → Settings → Local API Server → Configuration."
				initialValue={savedApiKeyMask || ""}
				onChange={handleApiKeyChange}
				placeholder="Enter API Key (optional)..."
				providerName="Jan"
			/>

			{showModelOptions && (
				<>
					<div className="font-semibold">Model</div>
					{Object.keys(models).length > 0 ? (
						<DropdownContainer className="dropdown-container" zIndex={10}>
							<ModelSelector
								label=""
								models={models}
								onChange={(event: Event) => {
									const target = event.target
									const value = target && "value" in target ? (target as any).value : ""
									handleModelChange(value)
								}}
								selectedModelId={selectedModelId}
							/>
						</DropdownContainer>
					) : (
						<p className="text-sm mt-1 text-description italic">
							Unable to fetch models from Jan. Start the Local API Server in Jan (Settings →
							Local API Server → Start Server) and verify the URL, port, and API key.
						</p>
					)}

					<ModelInfoView
						hideUsageCost={hideUsageCost}
						isPopup={isPopup}
						modelInfo={selectedModelInfo}
						selectedModelId={selectedModelId}
					/>
				</>
			)}

			<UseCustomPromptCheckbox providerId="jan" />

			<div className="text-xs text-description">
				Jan runs models locally via llama.cpp and exposes an OpenAI-compatible API. See the{" "}
				<VSCodeLink
					href="https://www.jan.ai/docs/desktop/api-server"
					style={{ display: "inline", fontSize: "inherit" }}>
					Local API Server guide
				</VSCodeLink>
				. If you changed the default port (1337), set the matching URL above.
				<div className="text-error">
					<span className="font-semibold">Note:</span> Cline uses complex prompts and works best with capable
					models. Smaller local models may not follow tool-use instructions reliably.
				</div>
			</div>
		</div>
	)
}
