import type { ZenmuxApiProtocol } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { VSCodeButton, VSCodeDropdown, VSCodeLink, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { formatString, splitOnPlaceholder } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
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
	const tr = useTranslation("providers")

	if (isLoading || (!paygBalance && !subscription)) {
		return null
	}

	return (
		<div style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)", marginTop: 6 }}>
			{paygBalance && (
				<div> {formatString(tr, "zenmuxPaygBalance", { amount: `$${paygBalance.totalCredits?.toFixed(2) ?? "—"}` })}</div>
			)}
			{subscription && (
				<div>
					{formatString(tr, "zenmuxSubscriptionUsage", {
						max: subscription.maxFlows ?? "",
						remaining: subscription.remainingFlows?.toFixed(1) ?? "",
						tier: subscription.tier ?? "",
					})}
				</div>
			)}
		</div>
	)
}

export const ZenmuxProvider = ({ showModelOptions, isPopup, currentMode }: ZenmuxProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const tr = useTranslation("providers")
	const { handleFieldChange } = useApiConfigurationHandlers()
	const hasZenmuxApiKey = !!apiConfiguration?.zenmuxApiKey?.trim()

	// The intro sentence names both key prefixes inline, so it is split twice and the
	// `<code>` elements land wherever the translation put their placeholders.
	const [introBeforePayg, introAfterPayg] = splitOnPlaceholder(tr("zenmuxIntro"), "payg")
	const [introBetweenPrefixes, introAfterSubscription] = splitOnPlaceholder(introAfterPayg, "sub")

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
							? tr("zenmuxDetailSubscription")
							: tr("zenmuxDetailPayg")
						: tr("zenmuxDetailNoKey")
				}
				label={hasZenmuxApiKey ? tr("zenmuxBadgeConnected") : tr("zenmuxBadgeDisconnected")}
				variant={hasZenmuxApiKey ? "oauth" : "disconnected"}
			/>
			<p
				style={{
					fontSize: "12px",
					color: "var(--vscode-descriptionForeground)",
					marginBottom: 10,
				}}>
				{introBeforePayg}
				<code>sk-ai-v1-</code>
				{introBetweenPrefixes}
				<code>sk-ss-v1-</code>
				{introAfterSubscription}{" "}
				<VSCodeLink href="https://docs.zenmux.ai/guide/quickstart">{tr("zenmuxDocsLink")}</VSCodeLink>
			</p>

			<div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
				<VSCodeButton appearance="secondary" onClick={() => openZenmux("login")}>
					{tr("zenmuxSignIn")}
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={() => openZenmux("payg")}>
					{tr("zenmuxPaygKey")}
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={() => openZenmux("subscription")}>
					{tr("zenmuxSubscriptionKey")}
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={() => openZenmux("management")}>
					{tr("zenmuxManagementKey")}
				</VSCodeButton>
			</div>

			<DebouncedTextField
				initialValue={apiConfiguration?.zenmuxApiKey || ""}
				onChange={(value) => handleFieldChange("zenmuxApiKey", value)}
				placeholder={tr("zenmuxApiKeyPlaceholder")}
				style={{ width: "100%" }}
				type="password">
				<span style={{ fontWeight: 500 }}>{tr("zenmuxApiKeyLabel")}</span>
			</DebouncedTextField>

			<DebouncedTextField
				initialValue={apiConfiguration?.zenmuxManagementApiKey || ""}
				onChange={(value) => handleFieldChange("zenmuxManagementApiKey", value)}
				placeholder={tr("zenmuxManagementKeyPlaceholder")}
				style={{ width: "100%", marginTop: 10 }}
				type="password">
				<span style={{ fontWeight: 500 }}>{tr("zenmuxManagementKeyLabel")}</span>
			</DebouncedTextField>

			{(apiConfiguration?.zenmuxApiKey || apiConfiguration?.zenmuxManagementApiKey) && (
				<ZenmuxAccountDisplay
					apiKey={apiConfiguration?.zenmuxApiKey}
					managementApiKey={apiConfiguration?.zenmuxManagementApiKey}
				/>
			)}

			<div style={{ marginTop: 12 }}>
				<label>
					<span style={{ fontWeight: 500 }}>{tr("zenmuxApiProtocolLabel")}</span>
				</label>
				<DropdownContainer className="dropdown-container" zIndex={formDropdownZIndex(0)}>
					<VSCodeDropdown
						onChange={(e: any) => handleFieldChange("zenmuxApiProtocol", e.target.value as ZenmuxApiProtocol)}
						style={{ width: "100%", marginTop: 3 }}
						value={apiConfiguration?.zenmuxApiProtocol || "openai"}>
						<VSCodeOption value="openai">{tr("zenmuxProtocolOpenAi")}</VSCodeOption>
						<VSCodeOption value="anthropic">{tr("zenmuxProtocolAnthropic")}</VSCodeOption>
						<VSCodeOption value="openai-responses">{tr("zenmuxProtocolOpenAiResponses")}</VSCodeOption>
						<VSCodeOption value="gemini">{tr("zenmuxProtocolGemini")}</VSCodeOption>
					</VSCodeDropdown>
				</DropdownContainer>
				<p style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)", marginTop: 5 }}>
					{tr("zenmuxApiProtocolHint")}
				</p>
			</div>

			<div style={{ marginTop: 8 }}>
				<label>
					<span style={{ fontWeight: 500 }}>{tr("zenmuxRoutingLabel")}</span>
				</label>
				<DropdownContainer className="dropdown-container" zIndex={formDropdownZIndex(1)}>
					<VSCodeDropdown
						onChange={(e: any) =>
							handleFieldChange("zenmuxProviderRouting", e.target.value === "default" ? "" : e.target.value)
						}
						style={{ width: "100%", marginTop: 3 }}
						value={apiConfiguration?.zenmuxProviderRouting || "default"}>
						<VSCodeOption value="default">{tr("zenmuxRoutingDefault")}</VSCodeOption>
						<VSCodeOption value="latency">{tr("zenmuxRoutingLatency")}</VSCodeOption>
						<VSCodeOption value="price">{tr("zenmuxRoutingPrice")}</VSCodeOption>
						<VSCodeOption value="throughput">{tr("zenmuxRoutingThroughput")}</VSCodeOption>
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
