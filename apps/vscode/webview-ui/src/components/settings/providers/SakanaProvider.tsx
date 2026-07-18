import type { SakanaApiProtocol, SakanaBillingMode } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { VSCodeButton, VSCodeDropdown, VSCodeLink, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { AccountServiceClient } from "@/services/grpc-client"
import { DROPDOWN_Z_INDEX } from "../ApiOptions"
import { AuthConnectionBadge } from "../common/AuthConnectionBadge"
import { DebouncedTextField } from "../common/DebouncedTextField"
import SakanaModelPicker from "../SakanaModelPicker"
import { DropdownContainer } from "../common/ModelSelector"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

interface SakanaProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

export const SakanaProvider = ({ showModelOptions, currentMode }: SakanaProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const { handleFieldChange } = useApiConfigurationHandlers()
	const hasApiKey = !!apiConfiguration?.sakanaApiKey?.trim()
	const billingMode = apiConfiguration?.sakanaBillingMode || "pay_as_you_go"

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
							? "Subscription plan API key"
							: "Pay-as-you-go API key"
						: "Create an API key at console.sakana.ai"
				}
				label={hasApiKey ? "Connected — Sakana API key" : "Not connected — Sakana API key required"}
				variant={hasApiKey ? "oauth" : "disconnected"}
			/>
			<p
				style={{
					fontSize: "12px",
					color: "var(--vscode-descriptionForeground)",
					marginBottom: 10,
				}}>
				Sakana Fugu uses the OpenAI-compatible API at <code>https://api.sakana.ai/v1</code>. Sign in with Google or
				email, then create an API key for{" "}
				<VSCodeLink href="https://console.sakana.ai/pricing">Pay-as-you-go</VSCodeLink> (consumption billing) or a{" "}
				<VSCodeLink href="https://console.sakana.ai/pricing">Subscription plan</VSCodeLink> (Standard / Pro / Max).{" "}
				<VSCodeLink href="https://console.sakana.ai/get-started">Docs</VSCodeLink>
			</p>

			<div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
				<VSCodeButton appearance="secondary" onClick={() => openSakana("login")}>
					Sign in to Sakana
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={() => openSakana("keys")}>
					API Keys
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={() => openSakana("payg")}>
					Pay-as-you-go
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={() => openSakana("subscription")}>
					Subscription
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={() => openSakana("models")}>
					Models
				</VSCodeButton>
			</div>

			<div style={{ marginBottom: 10 }}>
				<label>
					<span style={{ fontWeight: 500 }}>Billing mode</span>
				</label>
				<DropdownContainer className="dropdown-container" zIndex={DROPDOWN_Z_INDEX - 100}>
					<VSCodeDropdown
						onChange={(e: any) => handleFieldChange("sakanaBillingMode", e.target.value as SakanaBillingMode)}
						style={{ width: "100%", marginTop: 3 }}
						value={billingMode}>
						<VSCodeOption value="pay_as_you_go">Pay-as-you-go</VSCodeOption>
						<VSCodeOption value="subscription">Subscription plan</VSCodeOption>
					</VSCodeDropdown>
				</DropdownContainer>
				<p style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)", marginTop: 5 }}>
					{billingMode === "subscription"
						? "Subscription plans include monthly Fugu usage (Standard $20, Pro $100, Max $200). Use the API key from your subscribed account."
						: "Pay-as-you-go bills per token with higher serving priority for production workloads."}
				</p>
			</div>

			<DebouncedTextField
				initialValue={apiConfiguration?.sakanaApiKey || ""}
				onChange={(value) => handleFieldChange("sakanaApiKey", value)}
				placeholder="Sakana API key"
				style={{ width: "100%" }}
				type="password">
				<span style={{ fontWeight: 500 }}>Sakana API Key</span>
			</DebouncedTextField>

			<div style={{ marginTop: 12 }}>
				<label>
					<span style={{ fontWeight: 500 }}>API protocol</span>
				</label>
				<DropdownContainer className="dropdown-container" zIndex={DROPDOWN_Z_INDEX - 100}>
					<VSCodeDropdown
						onChange={(e: any) => handleFieldChange("sakanaApiProtocol", e.target.value as SakanaApiProtocol)}
						style={{ width: "100%", marginTop: 3 }}
						value={apiConfiguration?.sakanaApiProtocol || "responses"}>
						<VSCodeOption value="responses">Responses API (recommended)</VSCodeOption>
						<VSCodeOption value="chat_completions">Chat Completions</VSCodeOption>
					</VSCodeDropdown>
				</DropdownContainer>
				<p style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)", marginTop: 5 }}>
					Sakana recommends the Responses API for tool use and multimodal input. Chat Completions is also supported.
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