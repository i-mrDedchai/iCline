import type { ZenmuxApiProtocol } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { VSCodeButton, VSCodeDropdown, VSCodeLink, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { AccountServiceClient } from "@/services/grpc-client"
import { useZenmuxAccountInfo } from "../../ui/hooks/useZenmuxAccountInfo"
import { AuthConnectionBadge } from "../common/AuthConnectionBadge"
import { DebouncedTextField } from "../common/DebouncedTextField"
import { DropdownContainer, formDropdownZIndex } from "../common/ModelSelector"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"
import ZenmuxModelPicker from "../ZenmuxModelPicker"

interface ZenmuxProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

const ZenmuxAccountDisplay = ({ apiKey, managementApiKey }: { apiKey?: string; managementApiKey?: string }) => {
	const { paygBalance, subscription, isLoading } = useZenmuxAccountInfo(apiKey, managementApiKey)

	if (isLoading || (!paygBalance && !subscription)) {
		return null
	}

	return (
		<div style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)", marginTop: 6 }}>
			{paygBalance && <div>PAYG balance: ${paygBalance.totalCredits?.toFixed(2) ?? "—"} USD</div>}
			{subscription && (
				<div>
					Subscription ({subscription.tier}): {subscription.remainingFlows?.toFixed(1)} / {subscription.maxFlows} Flows
					remaining (5h)
				</div>
			)}
		</div>
	)
}

export const ZenmuxProvider = ({ showModelOptions, isPopup, currentMode }: ZenmuxProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const { handleFieldChange } = useApiConfigurationHandlers()
	const hasZenmuxApiKey = !!apiConfiguration?.zenmuxApiKey?.trim()

	const openZenmux = async (page: string) => {
		try {
			await AccountServiceClient.zenmuxAuthClicked({ value: page })
		} catch (error) {
			console.error("Failed to open ZenMux page:", error)
		}
	}

	return (
		<div>
			<AuthConnectionBadge
				detail={
					hasZenmuxApiKey
						? apiConfiguration?.zenmuxApiKey?.startsWith("sk-ss-v1-")
							? "Builder Subscription key"
							: "Pay As You Go key"
						: "Create a key on zenmux.ai after signing in"
				}
				label={hasZenmuxApiKey ? "Connected — ZenMux API key" : "Not connected — ZenMux API key required"}
				variant={hasZenmuxApiKey ? "oauth" : "disconnected"}
			/>
			<p
				style={{
					fontSize: "12px",
					color: "var(--vscode-descriptionForeground)",
					marginBottom: 10,
				}}>
				Sign in with Email, GitHub, or Google on ZenMux, then create an API key for Pay As You Go (<code>sk-ai-v1-</code>)
				or Builder subscription (<code>sk-ss-v1-</code>).{" "}
				<VSCodeLink href="https://docs.zenmux.ai/guide/quickstart">Docs</VSCodeLink>
			</p>

			<div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
				<VSCodeButton appearance="secondary" onClick={() => openZenmux("login")}>
					Sign in to ZenMux
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={() => openZenmux("payg")}>
					PAYG API Key
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={() => openZenmux("subscription")}>
					Subscription API Key
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={() => openZenmux("management")}>
					Management API Key
				</VSCodeButton>
			</div>

			<DebouncedTextField
				initialValue={apiConfiguration?.zenmuxApiKey || ""}
				onChange={(value) => handleFieldChange("zenmuxApiKey", value)}
				placeholder="sk-ai-v1-... or sk-ss-v1-..."
				style={{ width: "100%" }}
				type="password">
				<span style={{ fontWeight: 500 }}>ZenMux API Key</span>
			</DebouncedTextField>

			<DebouncedTextField
				initialValue={apiConfiguration?.zenmuxManagementApiKey || ""}
				onChange={(value) => handleFieldChange("zenmuxManagementApiKey", value)}
				placeholder="Optional — for balance & subscription info"
				style={{ width: "100%", marginTop: 10 }}
				type="password">
				<span style={{ fontWeight: 500 }}>Management API Key (optional)</span>
			</DebouncedTextField>

			{(apiConfiguration?.zenmuxApiKey || apiConfiguration?.zenmuxManagementApiKey) && (
				<ZenmuxAccountDisplay
					apiKey={apiConfiguration?.zenmuxApiKey}
					managementApiKey={apiConfiguration?.zenmuxManagementApiKey}
				/>
			)}

			<div style={{ marginTop: 12 }}>
				<label>
					<span style={{ fontWeight: 500 }}>API Protocol</span>
				</label>
				<DropdownContainer className="dropdown-container" zIndex={formDropdownZIndex(0)}>
					<VSCodeDropdown
						onChange={(e: any) => handleFieldChange("zenmuxApiProtocol", e.target.value as ZenmuxApiProtocol)}
						style={{ width: "100%", marginTop: 3 }}
						value={apiConfiguration?.zenmuxApiProtocol || "openai"}>
						<VSCodeOption value="openai">OpenAI Chat Completions (recommended)</VSCodeOption>
						<VSCodeOption value="anthropic">Anthropic Messages</VSCodeOption>
						<VSCodeOption value="openai-responses">OpenAI Responses</VSCodeOption>
						<VSCodeOption value="gemini">Google Gemini / Vertex</VSCodeOption>
					</VSCodeDropdown>
				</DropdownContainer>
				<p style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)", marginTop: 5 }}>
					ZenMux supports cross-protocol routing — OpenAI protocol can call any model. Use Anthropic/Gemini native
					protocols when your tool chain requires them.
				</p>
			</div>

			<div style={{ marginTop: 8 }}>
				<label>
					<span style={{ fontWeight: 500 }}>Provider routing</span>
				</label>
				<DropdownContainer className="dropdown-container" zIndex={formDropdownZIndex(1)}>
					<VSCodeDropdown
						onChange={(e: any) =>
							handleFieldChange("zenmuxProviderRouting", e.target.value === "default" ? "" : e.target.value)
						}
						style={{ width: "100%", marginTop: 3 }}
						value={apiConfiguration?.zenmuxProviderRouting || "default"}>
						<VSCodeOption value="default">Default (ZenMux intelligent routing)</VSCodeOption>
						<VSCodeOption value="latency">Lowest latency</VSCodeOption>
						<VSCodeOption value="price">Lowest price</VSCodeOption>
						<VSCodeOption value="throughput">Highest throughput</VSCodeOption>
					</VSCodeDropdown>
				</DropdownContainer>
			</div>

			{showModelOptions && (
				<div style={{ marginTop: 12 }}>
					<ZenmuxModelPicker currentMode={currentMode} isPopup={isPopup} />
				</div>
			)}
		</div>
	)
}
