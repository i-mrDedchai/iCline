import { UpdateApiConfigurationRequestNew } from "@shared/proto/index.cline"
import { Mode } from "@shared/storage/types"
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useStaticProviderSelection } from "@/hooks/useStaticProviderSelection"
import { useTranslation } from "@/i18n/useTranslation"
import { ModelsServiceClient } from "@/services/grpc-client"
import { ApiKeyField } from "../common/ApiKeyField"
import { ModelInfoView } from "../common/ModelInfoView"
import { DropdownContainer, ModelSelector } from "../common/ModelSelector"

/**
 * Props for the MoonshotProvider component
 */
/** Endpoint hostnames, not copy: they are the values the dropdown stores. */
const MOONSHOT_INTL_HOST = "api.moonshot.ai"
const MOONSHOT_CN_HOST = "api.moonshot.cn"

interface MoonshotProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

/**
 * The Moonshot AI Studio provider configuration component
 */
export const MoonshotProvider = ({ showModelOptions, isPopup, currentMode }: MoonshotProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const tr = useTranslation("providers")

	// Get the normalized configuration
	const { models, selectedModelId, selectedModelInfo, hideUsageCost } = useStaticProviderSelection(
		"moonshot",
		apiConfiguration,
		currentMode,
	)

	return (
		<div>
			<DropdownContainer className="dropdown-container" style={{ position: "inherit" }}>
				<label htmlFor="moonshot-entrypoint">
					<span style={{ fontWeight: 500, marginTop: 5 }}>{tr("moonshotEntrypointLabel")}</span>
				</label>
				<VSCodeDropdown
					id="moonshot-entrypoint"
					onChange={async (e) => {
						const value = (e.target as any).value
						await ModelsServiceClient.updateApiConfiguration(
							UpdateApiConfigurationRequestNew.create({
								updates: {
									options: {
										moonshotApiLine: value,
									},
								},
								updateMask: ["options.moonshotApiLine"],
							}),
						)
					}}
					style={{
						minWidth: 130,
						position: "relative",
					}}
					value={apiConfiguration?.moonshotApiLine || "international"}>
					<VSCodeOption value="international">{MOONSHOT_INTL_HOST}</VSCodeOption>
					<VSCodeOption value="china">{MOONSHOT_CN_HOST}</VSCodeOption>
				</VSCodeDropdown>
			</DropdownContainer>
			<ApiKeyField
				initialValue={apiConfiguration?.moonshotApiKey || ""}
				onChange={async (value) => {
					await ModelsServiceClient.updateApiConfiguration(
						UpdateApiConfigurationRequestNew.create({
							updates: {
								secrets: {
									moonshotApiKey: value,
								},
							},
							updateMask: ["secrets.moonshotApiKey"],
						}),
					)
				}}
				providerName="Moonshot"
				signupUrl={
					apiConfiguration?.moonshotApiLine === "china"
						? "https://platform.moonshot.cn/console/api-keys"
						: "https://platform.moonshot.ai/console/api-keys"
				}
			/>

			{showModelOptions && (
				<>
					<ModelSelector
						models={models}
						onChange={async (e: any) => {
							const value = e.target.value

							await ModelsServiceClient.updateApiConfiguration(
								UpdateApiConfigurationRequestNew.create(
									currentMode === "plan"
										? {
												updates: { options: { planModeApiModelId: value } },
												updateMask: ["options.planModeApiModelId"],
											}
										: {
												updates: { options: { actModeApiModelId: value } },
												updateMask: ["options.actModeApiModelId"],
											},
								),
							)
						}}
						selectedModelId={selectedModelId}
					/>

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
