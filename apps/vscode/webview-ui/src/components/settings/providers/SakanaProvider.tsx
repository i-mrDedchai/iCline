import type { SakanaApiProtocol, SakanaBillingMode } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { VSCodeButton, VSCodeDropdown, VSCodeLink, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { splitOnPlaceholder } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import { AccountServiceClient } from "@/services/grpc-client"
import { AuthConnectionBadge } from "../common/AuthConnectionBadge"
import { DebouncedTextField } from "../common/DebouncedTextField"
import { DropdownContainer, formDropdownZIndex } from "../common/ModelSelector"
import SakanaModelPicker from "../SakanaModelPicker"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

interface SakanaProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

export const SakanaProvider = ({ showModelOptions, currentMode }: SakanaProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const tr = useTranslation("providers")
	const { handleFieldChange } = useApiConfigurationHandlers()
	const hasApiKey = !!apiConfiguration?.sakanaApiKey?.trim()
	const billingMode = apiConfiguration?.sakanaBillingMode || "pay_as_you_go"

	// The endpoint URL is a value, not prose: a translator never has to retype it.
	const [introBeforeEndpoint, introAfterEndpoint] = splitOnPlaceholder(tr("sakanaIntro"), "endpoint")

	const openSakana = async (page: string) => {
		try {
			await AccountServiceClient.sakanaAuthClicked({ value: page })
		} catch (error) {
			console.error("Failed to open Sakana page:", error)
		}
	}

	return (
		<div>
			<AuthConnectionBadge
				detail={
					hasApiKey
						? billingMode === "subscription"
							? tr("sakanaDetailSubscription")
							: tr("sakanaDetailPayg")
						: tr("sakanaDetailNoKey")
				}
				label={hasApiKey ? tr("sakanaBadgeConnected") : tr("sakanaBadgeDisconnected")}
				variant={hasApiKey ? "oauth" : "disconnected"}
			/>
			<p
				style={{
					fontSize: "12px",
					color: "var(--vscode-descriptionForeground)",
					marginBottom: 10,
				}}>
				{introBeforeEndpoint}
				<code>https://api.sakana.ai/v1</code>
				{introAfterEndpoint} <VSCodeLink href="https://console.sakana.ai/get-started">{tr("sakanaDocsLink")}</VSCodeLink>
				{/* The pricing links that used to sit here pointed at the same /pricing page twice and
				    duplicated the Pay-as-you-go / Subscription buttons below — one action, one control. */}
			</p>

			<div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
				<VSCodeButton appearance="secondary" onClick={() => openSakana("login")}>
					{tr("sakanaSignIn")}
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={() => openSakana("keys")}>
					{tr("sakanaApiKeys")}
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={() => openSakana("payg")}>
					{tr("sakanaPayg")}
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={() => openSakana("subscription")}>
					{tr("sakanaSubscription")}
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={() => openSakana("models")}>
					{tr("sakanaModels")}
				</VSCodeButton>
			</div>

			<div style={{ marginBottom: 10 }}>
				<label>
					<span style={{ fontWeight: 500 }}>{tr("sakanaBillingModeLabel")}</span>
				</label>
				{/* Sakana form ladder: billing 0, protocol 1 — model 2, effort 3 (SakanaModelPicker). */}
				<DropdownContainer className="dropdown-container" zIndex={formDropdownZIndex(0)}>
					<VSCodeDropdown
						onChange={(e: any) => handleFieldChange("sakanaBillingMode", e.target.value as SakanaBillingMode)}
						style={{ width: "100%", marginTop: 3 }}
						value={billingMode}>
						<VSCodeOption value="pay_as_you_go">{tr("sakanaBillingPayg")}</VSCodeOption>
						<VSCodeOption value="subscription">{tr("sakanaBillingSubscription")}</VSCodeOption>
					</VSCodeDropdown>
				</DropdownContainer>
				<p style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)", marginTop: 5 }}>
					{billingMode === "subscription" ? tr("sakanaBillingSubscriptionHint") : tr("sakanaBillingPaygHint")}
				</p>
			</div>

			<DebouncedTextField
				initialValue={apiConfiguration?.sakanaApiKey || ""}
				onChange={(value) => handleFieldChange("sakanaApiKey", value)}
				placeholder={tr("sakanaApiKeyPlaceholder")}
				style={{ width: "100%" }}
				type="password">
				<span style={{ fontWeight: 500 }}>{tr("sakanaApiKeyLabel")}</span>
			</DebouncedTextField>

			<div style={{ marginTop: 12 }}>
				<label>
					<span style={{ fontWeight: 500 }}>{tr("sakanaApiProtocolLabel")}</span>
				</label>
				<DropdownContainer className="dropdown-container" zIndex={formDropdownZIndex(1)}>
					<VSCodeDropdown
						onChange={(e: any) => handleFieldChange("sakanaApiProtocol", e.target.value as SakanaApiProtocol)}
						style={{ width: "100%", marginTop: 3 }}
						value={apiConfiguration?.sakanaApiProtocol || "responses"}>
						<VSCodeOption value="responses">{tr("sakanaProtocolResponses")}</VSCodeOption>
						<VSCodeOption value="chat_completions">{tr("sakanaProtocolChatCompletions")}</VSCodeOption>
					</VSCodeDropdown>
				</DropdownContainer>
				<p style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)", marginTop: 5 }}>
					{tr("sakanaApiProtocolHint")}
				</p>
			</div>

			{showModelOptions && (
				<div style={{ marginTop: 12 }}>
					<SakanaModelPicker currentMode={currentMode} />
				</div>
			)}
		</div>
	)
}
