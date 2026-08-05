import { getXaiModelsForAuth, type ModelInfo, openAiModelInfoSafeDefaults, xaiDefaultModelId } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { VSCodeButton, VSCodeCheckbox, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { useMemo, useState } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useProviderConfig } from "@/hooks/useProviderConfig"
import { useProviderModelSelection } from "@/hooks/useProviderModelSelection"
import { useStaticProviderSelection } from "@/hooks/useStaticProviderSelection"
import { AccountServiceClient } from "@/services/grpc-client"
import { DROPDOWN_Z_INDEX } from "../ApiOptions"
import { ApiKeyField } from "../common/ApiKeyField"
import { AuthConnectionBadge } from "../common/AuthConnectionBadge"
import { ModelInfoView } from "../common/ModelInfoView"
import { DropdownContainer, ModelSelector } from "../common/ModelSelector"
import { getModeSpecificFields } from "../utils/providerUtils"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"
import { useProviderApiKeyField } from "../utils/useProviderApiKeyField"

const PROVIDER_ID = "xai"

/**
 * Prefer the iCline default (Composer 2.5 Fast) when present in the auth-aware
 * catalog; otherwise first available id. Used when no legacy selection exists.
 */
function xaiDefaultFromCatalog(models: Record<string, ModelInfo>): string {
	if (xaiDefaultModelId in models) {
		return xaiDefaultModelId
	}
	const ids = Object.keys(models)
	return ids[0] || xaiDefaultModelId
}

// VSCodeDropdown's onChange supplies `Event | React.FormEvent<HTMLElement>`,
// so accept the same union here. We only read `target.value`, which is present
// on both, so no narrowing of the event itself is required.
function getEventValue(event: Event | React.FormEvent<HTMLElement>): string {
	const target = event.target
	if (target && "value" in target && typeof target.value === "string") {
		return target.value
	}
	return ""
}

/**
 * Props for the XaiProvider component
 */
interface XaiProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

export const XaiProvider = ({ showModelOptions, isPopup, currentMode }: XaiProviderProps) => {
	const { apiConfiguration, xaiOAuthIsAuthenticated, xaiGrokCliIsAuthenticated, xaiSubscriptionModels } = useExtensionState()

	const { handleModeFieldChange } = useApiConfigurationHandlers()
	const { config, write, commitSelection } = useProviderConfig(PROVIDER_ID)

	const modeFields = getModeSpecificFields(apiConfiguration, currentMode)

	// SDK catalog alone only has PAYG models. Merge iCline auth-aware list
	// (CLI subscription models + live subscription fetch + API key models).
	const {
		models: sdkModels,
		defaultModelId,
		selectedModelId: legacySelectedModelId,
		selectedModelInfo: legacySelectedModelInfo,
		hideUsageCost,
	} = useStaticProviderSelection(PROVIDER_ID, apiConfiguration, currentMode)

	const hasApiKey = !!apiConfiguration?.xaiApiKey?.trim()
	const oauthConnected = !!xaiOAuthIsAuthenticated
	const cliOnlyConnected = !!xaiGrokCliIsAuthenticated && !oauthConnected
	const subscriptionAuthenticated = oauthConnected || !!xaiGrokCliIsAuthenticated

	const models = useMemo(
		() =>
			getXaiModelsForAuth({
				subscriptionAuthenticated,
				hasApiKey,
				xaiSubscriptionModels,
			}),
		[subscriptionAuthenticated, hasApiKey, xaiSubscriptionModels],
	)

	// Prefer auth-aware catalog; fall back to SDK models if auth list is empty.
	const effectiveModels = Object.keys(models).length > 0 ? models : sdkModels

	// When on OAuth/CLI subscription, prefer catalog model info (correct context +
	// included pricing) over any stale committed selection that may still carry
	// PAYG prices or the generic 128K safe-default.
	const catalogSelectedInfo = (id: string | undefined) => (id ? effectiveModels[id] : undefined)

	const {
		selectedModelId,
		selectedModelInfo: rawSelectedModelInfo,
		commitModelSelection,
	} = useProviderModelSelection(PROVIDER_ID, currentMode, {
		models: effectiveModels,
		defaultModelId: legacySelectedModelId || xaiDefaultFromCatalog(effectiveModels),
		config,
		commitSelection,
		fallbackModelInfo: catalogSelectedInfo(legacySelectedModelId) ?? legacySelectedModelInfo,
	})

	const selectedModelInfo = catalogSelectedInfo(selectedModelId) ?? rawSelectedModelInfo

	// Local state for reasoning effort toggle
	const [reasoningEffortSelected, setReasoningEffortSelected] = useState(!!modeFields.reasoningEffort)
	const { savedApiKeyMask, handleApiKeyChange } = useProviderApiKeyField({
		apiKeyLength: config?.apiKeyLength,
		providerName: "Grok",
		write,
	})

	const handleModelChange = (modelId: string) => {
		if (!modelId) {
			return
		}

		const fallbackModelId = defaultModelId || Object.keys(effectiveModels)[0] || modelId
		const modelInfo =
			effectiveModels[modelId] ?? effectiveModels[fallbackModelId] ?? selectedModelInfo ?? openAiModelInfoSafeDefaults

		void commitModelSelection({
			modelId,
			modelInfo,
		}).catch((err) => console.error("Failed to commit Grok model selection:", err))
	}

	const handleReasoningEffortChange = (effort: string) => {
		void write({ reasoning: { enabled: true, effort } }).catch((err) =>
			console.error("Failed to update Grok reasoning effort:", err),
		)
		handleModeFieldChange({ plan: "planModeReasoningEffort", act: "actModeReasoningEffort" }, effort, currentMode)
	}

	const handleReasoningEffortDisabled = () => {
		void write({ reasoning: { enabled: false, effort: "none" } }).catch((err) =>
			console.error("Failed to disable Grok reasoning effort:", err),
		)
		handleModeFieldChange({ plan: "planModeReasoningEffort", act: "actModeReasoningEffort" }, "", currentMode)
	}

	const handleSignIn = async () => {
		try {
			await AccountServiceClient.xaiOauthSignIn({})
		} catch (error) {
			console.error("Failed to sign in to Grok:", error)
		}
	}

	const handleSignOut = async () => {
		try {
			await AccountServiceClient.xaiOauthSignOut({})
		} catch (error) {
			console.error("Failed to sign out of Grok:", error)
		}
	}

	const connectionVariant = oauthConnected ? "oauth" : cliOnlyConnected ? "cli" : "disconnected"
	const connectionLabel = oauthConnected
		? "Connected — Grok (OAuth & Subscription)"
		: cliOnlyConnected
			? "Connected — Grok CLI auth only"
			: "Not connected"
	const connectionDetail = oauthConnected
		? `${Object.keys(effectiveModels).length} models (CLI + subscription)`
		: cliOnlyConnected
			? "OAuth signed out. Session from ~/.grok/auth.json is still active."
			: hasApiKey
				? "Pay-as-you-go API key — console.x.ai models"
				: undefined

	return (
		<div>
			<div style={{ marginBottom: "15px" }}>
				{oauthConnected ? (
					<div>
						<AuthConnectionBadge detail={connectionDetail} label={connectionLabel} variant={connectionVariant} />
						<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
							<VSCodeButton appearance="secondary" onClick={handleSignOut}>
								Sign Out OAuth
							</VSCodeButton>
						</div>
					</div>
				) : cliOnlyConnected ? (
					<div>
						<AuthConnectionBadge detail={connectionDetail} label={connectionLabel} variant={connectionVariant} />
						<p
							style={{
								fontSize: 12,
								color: "var(--vscode-descriptionForeground)",
								marginTop: 8,
							}}>
							⚠️ OAuth was signed out, but Grok CLI login at <code>~/.grok/auth.json</code> is still detected. Sign
							out of Grok CLI separately to fully disconnect.
						</p>
						<VSCodeButton onClick={handleSignIn}>Sign in to Grok (OAuth)</VSCodeButton>
					</div>
				) : (
					<div>
						<AuthConnectionBadge label="Not connected to Grok" variant="disconnected" />
						<p
							style={{
								fontSize: "12px",
								color: "var(--vscode-descriptionForeground)",
								marginBottom: "10px",
								marginTop: 10,
							}}>
							🔐 Sign in with SuperGrok or X Premium for Composer 2.5 Fast, Grok Build, Grok 4.3 and more. Add an
							API key for extra pay-as-you-go models.
						</p>
						<VSCodeButton onClick={handleSignIn}>Sign in to Grok (OAuth)</VSCodeButton>
					</div>
				)}
			</div>

			<div>
				<ApiKeyField
					initialValue={savedApiKeyMask || apiConfiguration?.xaiApiKey || ""}
					onChange={handleApiKeyChange}
					providerName="Grok"
					signupUrl="https://x.ai"
				/>
				<p
					style={{
						fontSize: "12px",
						marginTop: -10,
						color: "var(--vscode-descriptionForeground)",
					}}>
					Optional: pay-as-you-go API key from console.x.ai for additional models beyond your subscription.
				</p>
			</div>

			{showModelOptions && (
				<>
					<ModelSelector
						label="Model"
						models={effectiveModels}
						onChange={(event: Event) => handleModelChange(getEventValue(event))}
						selectedModelId={selectedModelId}
					/>

					{selectedModelId && selectedModelId.includes("3-mini") && (
						<>
							<VSCodeCheckbox
								checked={reasoningEffortSelected}
								onChange={(e: any) => {
									const isChecked = e.target.checked === true
									setReasoningEffortSelected(isChecked)
									if (!isChecked) {
										handleReasoningEffortDisabled()
									}
								}}
								style={{ marginTop: 0 }}>
								Modify reasoning effort
							</VSCodeCheckbox>

							{reasoningEffortSelected && (
								<div>
									<label htmlFor="reasoning-effort-dropdown">
										<span style={{}}>Reasoning Effort</span>
									</label>
									<DropdownContainer className="dropdown-container" zIndex={DROPDOWN_Z_INDEX - 100}>
										<VSCodeDropdown
											id="reasoning-effort-dropdown"
											onChange={(event) => handleReasoningEffortChange(getEventValue(event))}
											style={{ width: "100%", marginTop: 3 }}
											value={modeFields.reasoningEffort || "high"}>
											<VSCodeOption value="low">low</VSCodeOption>
											<VSCodeOption value="high">high</VSCodeOption>
										</VSCodeDropdown>
									</DropdownContainer>
									<p
										style={{
											fontSize: "12px",
											marginTop: 3,
											marginBottom: 0,
											color: "var(--vscode-descriptionForeground)",
										}}>
										High effort may produce more thorough analysis but takes longer and uses more tokens.
									</p>
								</div>
							)}
						</>
					)}

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
