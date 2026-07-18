import type { Mode } from "@shared/storage/types"
import { VSCodeDropdown, VSCodeLink, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { useCallback, useEffect, useState } from "react"
import { useInterval } from "react-use"
import UseCustomPromptCheckbox from "@/components/settings/UseCustomPromptCheckbox"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ModelsServiceClient } from "@/services/grpc-client"
import { ApiKeyField } from "../common/ApiKeyField"
import { BaseUrlField } from "../common/BaseUrlField"
import { DebouncedTextField } from "../common/DebouncedTextField"
import { DropdownContainer } from "../common/ModelSelector"
import { getModeSpecificFields } from "../utils/providerUtils"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

interface JanProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

export const JanProvider = ({ currentMode }: JanProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const { handleFieldChange, handleModeFieldChange } = useApiConfigurationHandlers()

	const { janModelId } = getModeSpecificFields(apiConfiguration, currentMode)
	const [janModels, setJanModels] = useState<string[]>([])

	const requestJanModels = useCallback(async () => {
		try {
			const response = await ModelsServiceClient.getJanModels({
				baseUrl: apiConfiguration?.janBaseUrl || "http://127.0.0.1:1337",
				apiKey: apiConfiguration?.janApiKey || "",
			})
			if (response?.values) {
				setJanModels(response.values)
			}
		} catch (error) {
			console.error("Failed to fetch Jan models:", error)
			setJanModels([])
		}
	}, [apiConfiguration?.janBaseUrl, apiConfiguration?.janApiKey])

	useEffect(() => {
		requestJanModels()
	}, [requestJanModels])

	useInterval(requestJanModels, 6000)

	return (
		<div className="flex flex-col gap-2">
			<BaseUrlField
				initialValue={apiConfiguration?.janBaseUrl}
				label="Jan Local API Server URL"
				onChange={(value) => handleFieldChange("janBaseUrl", value)}
				placeholder="Default: http://127.0.0.1:1337"
			/>

			<ApiKeyField
				helpText="Optional API key if configured in Jan → Settings → Local API Server → Configuration."
				initialValue={apiConfiguration?.janApiKey || ""}
				onChange={(value) => handleFieldChange("janApiKey", value)}
				placeholder="Enter API Key (optional)..."
				providerName="Jan"
			/>

			<div className="font-semibold">Model</div>
			{janModels.length > 0 ? (
				<DropdownContainer className="dropdown-container" zIndex={10}>
					<VSCodeDropdown
						className="w-full mb-3"
						onChange={(e: any) => {
							const value = e?.target?.value
							handleModeFieldChange(
								{
									plan: "planModeJanModelId",
									act: "actModeJanModelId",
								},
								value,
								currentMode,
							)
						}}
						value={janModelId}>
						{janModels.map((model) => (
							<VSCodeOption className="w-full" key={model} value={model}>
								{model}
							</VSCodeOption>
						))}
					</VSCodeDropdown>
				</DropdownContainer>
			) : (
				<DebouncedTextField
					initialValue={janModelId || ""}
					onChange={(value) =>
						handleModeFieldChange(
							{
								plan: "planModeJanModelId",
								act: "actModeJanModelId",
							},
							value,
							currentMode,
						)
					}
					placeholder={"e.g. janhq\\Jan-code-4b-Q4_K_M"}
					style={{ width: "100%" }}
				/>
			)}

			{janModels.length === 0 && (
				<p className="text-sm mt-1 text-description italic">
					Unable to fetch models from Jan. Start the Local API Server in Jan (Settings → Local API Server → Start
					Server) and verify the URL, port, and API key.
				</p>
			)}

			<UseCustomPromptCheckbox providerId="jan" />

			<div className="text-xs text-description">
				Jan runs models locally via llama.cpp and exposes an OpenAI-compatible API. See the{" "}
				<VSCodeLink href="https://www.jan.ai/docs/desktop/api-server" style={{ display: "inline", fontSize: "inherit" }}>
					Local API Server guide
				</VSCodeLink>
				. If you changed the default port (1337), set the matching URL above.
				<div className="text-error">
					<span className="font-semibold">Note:</span> Cline uses complex prompts and works best with capable models.
					Smaller local models may not follow tool-use instructions reliably.
				</div>
			</div>
		</div>
	)
}