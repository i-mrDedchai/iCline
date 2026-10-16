import { ModelInfo, openAiModelInfoSafeDefaults } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { RefreshCwIcon } from "lucide-react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useProviderConfig } from "@/hooks/useProviderConfig"
import { useProviderModelSelection } from "@/hooks/useProviderModelSelection"
import { useProviderModels } from "@/hooks/useProviderModels"
import { formatString, splitOnPlaceholder } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import { resolveModelThinkingOptions } from "@/utils/modelThinkingOptions"
import { DebouncedTextField } from "../common/DebouncedTextField"
import { ModelAutocomplete } from "../common/ModelAutocomplete"
import { ModelInfoView } from "../common/ModelInfoView"
import { LockIcon, RemotelyConfiguredInputWrapper } from "../common/RemotelyConfiguredInputWrapper"
import { SavedApiKeyCopyButton } from "../common/SavedApiKeyCopyButton"
import ThinkingBudgetSlider from "../ThinkingBudgetSlider"
import { useProviderApiKeyField } from "../utils/useProviderApiKeyField"

const LITELLM_PROVIDER_ID = "litellm"

function customModelInfo(modelId: string): ModelInfo {
	return {
		...openAiModelInfoSafeDefaults,
		name: modelId,
	}
}

/**
 * Props for the LiteLlmProvider component
 */
interface LiteLlmProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

export const LiteLlmProvider = ({ showModelOptions, isPopup, currentMode }: LiteLlmProviderProps) => {
	const { remoteConfigSettings } = useExtensionState()
	const tr = useTranslation("providers")

	// Both notes end in a link; splitting on the placeholder keeps each language's link
	// position and punctuation.
	const [thinkingIntroBefore, thinkingIntroAfter] = splitOnPlaceholder(tr("liteLlmThinkingIntro"), "link")
	const [introBefore, introAfter] = splitOnPlaceholder(tr("liteLlmIntro"), "quickstart")
	const { models, defaultModelId, isLoading, isStale, error, refresh } = useProviderModels(LITELLM_PROVIDER_ID)
	const { config, write, commitSelection } = useProviderConfig(LITELLM_PROVIDER_ID)
	const { selectedModelId, selectedModelInfo, commitModelSelection } = useProviderModelSelection(
		LITELLM_PROVIDER_ID,
		currentMode,
		{
			models,
			defaultModelId,
			config,
			commitSelection,
			customModelInfo,
		},
	)
	const thinkingOptions = resolveModelThinkingOptions({
		providerId: LITELLM_PROVIDER_ID,
		modelId: selectedModelId,
		modelInfo: selectedModelInfo,
	})
	const { savedApiKeyMask, handleApiKeyChange, copySavedApiKey } = useProviderApiKeyField({
		providerId: LITELLM_PROVIDER_ID,
		apiKeyLength: config?.apiKeyLength,
		canWrite: config !== undefined,
		providerName: "LiteLLM",
		write,
	})
	// This form owns its text field instead of using `ApiKeyField`, so the copy
	// control is wired here explicitly — a masked key must be copyable wherever it shows.
	const hasSavedApiKey = Boolean(config?.apiKeyLength)

	const handleModelChange = (newModelId: string, modelInfo: ModelInfo | undefined) => {
		void commitModelSelection({
			modelId: newModelId,
			modelInfo: modelInfo ?? customModelInfo(newModelId),
		}).catch((err) => console.error("Failed to commit LiteLLM model selection:", err))
	}

	const onRefreshModels = async () => {
		await refresh()
	}

	const handleBaseUrlChange = (value: string) => {
		if (!config) {
			return
		}

		void write({ baseUrl: value }).catch((err) => console.error("Failed to update LiteLLM base URL:", err))
	}

	return (
		<div>
			<RemotelyConfiguredInputWrapper hidden={remoteConfigSettings?.liteLlmBaseUrl === undefined}>
				<DebouncedTextField
					disabled={remoteConfigSettings?.liteLlmBaseUrl !== undefined}
					initialValue={config?.baseUrl || ""}
					onChange={handleBaseUrlChange}
					placeholder={formatString(tr, "defaultValue", { value: "http://localhost:4000" })}
					style={{ width: "100%" }}
					type="text">
					<div className="flex items-center gap-2 mb-1">
						<span style={{ fontWeight: 500 }}>{tr("liteLlmBaseUrlLabel")}</span>
						{remoteConfigSettings?.liteLlmBaseUrl !== undefined && <LockIcon />}
					</div>
				</DebouncedTextField>
			</RemotelyConfiguredInputWrapper>
			<RemotelyConfiguredInputWrapper hidden={!remoteConfigSettings?.configuredApiKeys?.litellm}>
				<div style={{ display: "flex", alignItems: "stretch", gap: 4 }}>
					<DebouncedTextField
						disabled={remoteConfigSettings?.configuredApiKeys?.litellm}
						initialValue={savedApiKeyMask}
						onChange={handleApiKeyChange}
						placeholder={formatString(tr, "defaultValue", { value: "noop" })}
						style={{ flex: 1, minWidth: 0, width: "100%" }}
						type="password">
						<div className="flex items-center gap-2 mb-1">
							<span style={{ fontWeight: 500 }}>{tr("liteLlmApiKeyLabel")}</span>
							{remoteConfigSettings?.configuredApiKeys?.litellm && <LockIcon />}
						</div>
					</DebouncedTextField>
					{hasSavedApiKey && (
						<SavedApiKeyCopyButton
							onCopy={copySavedApiKey}
							providerName="LiteLLM"
							testId="litellm-api-key-copy-saved"
						/>
					)}
				</div>
			</RemotelyConfiguredInputWrapper>
			{showModelOptions && (
				<>
					{isStale && <div role="status">{tr("liteLlmListStale")}</div>}
					{error && <div role="alert">{error}</div>}
					<ModelAutocomplete
						models={models}
						onChange={handleModelChange}
						placeholder={tr("liteLlmModelPlaceholder")}
						selectedModelId={selectedModelId}
					/>
					<VSCodeButton
						className={`my-2 ${isLoading ? "animate-pulse" : ""}`}
						disabled={isLoading}
						onClick={onRefreshModels}>
						{isLoading ? (
							tr("loading")
						) : (
							<>
								{tr("liteLlmRefreshModels")} <RefreshCwIcon className="ml-1" />
							</>
						)}
					</VSCodeButton>

					{thinkingOptions.showThinkingBudget && <ThinkingBudgetSlider currentMode={currentMode} />}

					<ModelInfoView isPopup={isPopup} modelInfo={selectedModelInfo} selectedModelId={selectedModelId} />
				</>
			)}
			<p
				style={{
					fontSize: "12px",
					marginTop: "5px",
					color: "var(--vscode-descriptionForeground)",
				}}>
				{thinkingIntroBefore}
				<VSCodeLink
					href="https://docs.litellm.ai/docs/reasoning_content"
					style={{ display: "inline", fontSize: "inherit" }}>
					{tr("liteLlmThinkingLink")}
				</VSCodeLink>
				{thinkingIntroAfter}
			</p>

			<p
				style={{
					fontSize: "12px",
					marginTop: "5px",
					color: "var(--vscode-descriptionForeground)",
				}}>
				{introBefore}
				<VSCodeLink href="https://docs.litellm.ai/docs/" style={{ display: "inline", fontSize: "inherit" }}>
					{tr("liteLlmQuickstartLink")}
				</VSCodeLink>
				{introAfter}
			</p>
		</div>
	)
}
