import { Mode } from "@shared/storage/types"
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { formatString } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import { DebouncedTextField } from "../common/DebouncedTextField"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"
import VercelModelPicker from "../VercelModelPicker"

/**
 * Props for the VercelAIGatewayProvider component
 */
interface VercelAIGatewayProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

/**
 * The Vercel AI Gateway provider configuration component
 */
export const VercelAIGatewayProvider = ({ showModelOptions, isPopup, currentMode }: VercelAIGatewayProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const tr = useTranslation("providers")
	const { handleFieldChange } = useApiConfigurationHandlers()

	return (
		<div>
			<div>
				<DebouncedTextField
					initialValue={apiConfiguration?.vercelAiGatewayApiKey || ""}
					onChange={(value) => handleFieldChange("vercelAiGatewayApiKey", value)}
					placeholder={tr("apiKeyPlaceholder")}
					style={{ width: "100%" }}
					type="password">
					<span style={{ fontWeight: 500 }}>{tr("vercelApiKeyLabel")}</span>
				</DebouncedTextField>
				<p
					style={{
						fontSize: "12px",
						marginTop: "5px",
						color: "var(--vscode-descriptionForeground)",
					}}>
					{tr("apiKeyHelp")}
					{!apiConfiguration?.vercelAiGatewayApiKey && (
						<>
							{" "}
							<VSCodeLink
								href="https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai"
								style={{ display: "inline", fontSize: "inherit" }}>
								{formatString(tr, "apiKeySignup", { provider: "Vercel AI Gateway" })}
							</VSCodeLink>
						</>
					)}
				</p>
			</div>

			{showModelOptions && <VercelModelPicker currentMode={currentMode} isPopup={isPopup} />}
		</div>
	)
}
