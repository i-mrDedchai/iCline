import VertexData from "@shared/providers/vertex.json"
import type { Mode } from "@shared/storage/types"
import { VSCodeDropdown, VSCodeLink, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { useMemo } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useProviderConfig } from "@/hooks/useProviderConfig"
import { useProviderModelSelection } from "@/hooks/useProviderModelSelection"
import { useProviderModels } from "@/hooks/useProviderModels"
import { useProviderUsageCostDisplay } from "@/hooks/useProviderUsageCostDisplay"
import { splitOnPlaceholder } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import { resolveModelThinkingOptions } from "@/utils/modelThinkingOptions"
import { DROPDOWN_Z_INDEX, DropdownContainer } from "../ApiOptions"
import { DebouncedTextField } from "../common/DebouncedTextField"
import { ModelInfoView } from "../common/ModelInfoView"
import { ModelSelector } from "../common/ModelSelector"
import { LockIcon, RemotelyConfiguredInputWrapper } from "../common/RemotelyConfiguredInputWrapper"
import ReasoningEffortSelector from "../ReasoningEffortSelector"
import ThinkingBudgetSlider from "../ThinkingBudgetSlider"

/**
 * Props for the VertexProvider component
 */
interface VertexProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

const REGIONS = VertexData.regions

/**
 * The GCP Vertex AI provider configuration component
 */
export const VertexProvider = ({ showModelOptions, isPopup, currentMode }: VertexProviderProps) => {
	const { apiConfiguration, remoteConfigSettings } = useExtensionState()
	const tr = useTranslation("providers")

	// The setup sentence IS two links, so it is split on their placeholders and each
	// language keeps its own order (and its own wording for the two steps).
	const [setupIntroBefore, setupIntroAfterStep1] = splitOnPlaceholder(tr("vertexSetupIntro"), "step1")
	const [setupIntroBetween, setupIntroAfter] = splitOnPlaceholder(setupIntroAfterStep1, "step2")
	const { models: allVertexModels, defaultModelId } = useProviderModels("vertex")
	const { config, write, commitSelection } = useProviderConfig("vertex")
	const { selectedModel, selectedModelId, selectedModelInfo, commitModelSelection } = useProviderModelSelection(
		"vertex",
		currentMode,
		{
			models: allVertexModels,
			defaultModelId,
			config,
			commitSelection,
		},
	)
	const hideUsageCost = useProviderUsageCostDisplay("vertex") === "hide"
	const vertexProjectId = config?.gcp?.projectId ?? apiConfiguration?.vertexProjectId ?? ""
	const vertexRegion = config?.gcp?.region ?? config?.region ?? apiConfiguration?.vertexRegion ?? ""

	const writeProviderConfig = (patch: Parameters<typeof write>[0], label: string) => {
		void write(patch).catch((err) => console.error(`Failed to update Vertex ${label}:`, err))
	}
	const writeGcp = (gcp: NonNullable<Parameters<typeof write>[0]["gcp"]>, label: string) => {
		writeProviderConfig({ gcp }, label)
	}

	const handleProjectIdChange = (value: string) => {
		writeGcp({ projectId: value }, "project ID")
	}

	const handleRegionChange = (value: string) => {
		writeProviderConfig({ region: value, gcp: { region: value } }, "region")
	}

	// Catalog and selection come from the SDK via gRPC. Vertex carries a
	// per-model `supportsGlobalEndpoint` flag (populated host-side from
	// the allowlist in
	// `apps/vscode/src/sdk/model-catalog/vertex-global-endpoint.ts`).
	// When the user selects `vertexRegion === "global"` the picker is
	// filtered to only models known to work with that endpoint so the
	// runtime cannot produce a `model not available in region: global`
	// error from a user-pickable combination.
	const modelsToUse = useMemo(() => {
		if (vertexRegion !== "global") {
			return allVertexModels
		}
		return Object.fromEntries(Object.entries(allVertexModels).filter(([, info]) => info.supportsGlobalEndpoint === true))
	}, [allVertexModels, vertexRegion])
	// Vertex's control choice is the shared policy's
	// (`@/utils/modelThinkingOptions`), the same one the Quick Picker uses. `effortSource`
	// still tells the two EFFORT variants apart: adaptive-thinking models keep the
	// labelled selector with None, thinking-level models keep the plain one.
	const thinkingOptions = resolveModelThinkingOptions({
		providerId: "vertex",
		modelId: selectedModelId ?? "",
		modelInfo: selectedModelInfo,
	})
	const isAdaptiveThinkingModel = thinkingOptions.effortSource === "adaptive-thinking"

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 5,
			}}>
			<RemotelyConfiguredInputWrapper hidden={remoteConfigSettings?.vertexProjectId === undefined}>
				<DebouncedTextField
					disabled={remoteConfigSettings?.vertexProjectId !== undefined}
					initialValue={vertexProjectId}
					onChange={handleProjectIdChange}
					placeholder={tr("vertexProjectIdPlaceholder")}
					style={{ width: "100%" }}>
					<div className="flex items-center gap-2 mb-1">
						<span style={{ fontWeight: 500 }}>{tr("vertexProjectIdLabel")}</span>
						{remoteConfigSettings?.vertexProjectId !== undefined && <LockIcon />}
					</div>
				</DebouncedTextField>
			</RemotelyConfiguredInputWrapper>

			<RemotelyConfiguredInputWrapper hidden={remoteConfigSettings?.vertexRegion === undefined}>
				<DropdownContainer className="dropdown-container" zIndex={DROPDOWN_Z_INDEX - 1}>
					<div
						className="flex items-center gap-2 mb-1"
						style={{ opacity: remoteConfigSettings?.vertexRegion !== undefined ? 0.4 : 1 }}>
						<label htmlFor="vertex-region-dropdown">
							<span className="font-medium">{tr("vertexRegionLabel")}</span>
						</label>
						{remoteConfigSettings?.vertexRegion !== undefined && <LockIcon />}
					</div>
					<VSCodeDropdown
						disabled={remoteConfigSettings?.vertexRegion !== undefined}
						id="vertex-region-dropdown"
						onChange={(e: any) => handleRegionChange(e.target.value)}
						style={{ width: "100%" }}
						value={vertexRegion}>
						<VSCodeOption value="">{tr("vertexRegionPlaceholder")}</VSCodeOption>
						{REGIONS.map((region) => (
							<VSCodeOption key={region} value={region}>
								{region}
							</VSCodeOption>
						))}
					</VSCodeDropdown>
				</DropdownContainer>
			</RemotelyConfiguredInputWrapper>

			<p
				style={{
					fontSize: "12px",
					marginTop: "5px",
					color: "var(--vscode-descriptionForeground)",
				}}>
				{setupIntroBefore}
				<VSCodeLink
					href="https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/use-claude#before_you_begin"
					style={{ display: "inline", fontSize: "inherit" }}>
					{tr("vertexSetupStep1")}
				</VSCodeLink>
				{setupIntroBetween}
				<VSCodeLink
					href="https://cloud.google.com/docs/authentication/provide-credentials-adc#google-idp"
					style={{ display: "inline", fontSize: "inherit" }}>
					{tr("vertexSetupStep2")}
				</VSCodeLink>
				{setupIntroAfter}
			</p>

			{showModelOptions && (
				<>
					<ModelSelector
						models={modelsToUse}
						onChange={(e: any) => {
							const modelId = e.target.value
							void commitModelSelection({
								modelId,
								modelInfo: modelsToUse[modelId] ?? selectedModel.modelInfo,
							}).catch((err) => console.error("Failed to commit Vertex model selection:", err))
						}}
						selectedModelId={selectedModelId}
						zIndex={DROPDOWN_Z_INDEX - 2}
					/>

					{isAdaptiveThinkingModel ? (
						<ReasoningEffortSelector
							currentMode={currentMode}
							modelId={selectedModelId ?? ""}
							modelInfo={selectedModelInfo}
							providerId="vertex"
						/>
					) : thinkingOptions.showThinkingBudget ? (
						<ThinkingBudgetSlider currentMode={currentMode} maxBudget={selectedModelInfo.thinkingConfig?.maxBudget} />
					) : null}

					{thinkingOptions.effortSource === "thinking-level" && (
						<ReasoningEffortSelector
							currentMode={currentMode}
							modelId={selectedModelId ?? ""}
							modelInfo={selectedModelInfo}
							providerId="vertex"
						/>
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
