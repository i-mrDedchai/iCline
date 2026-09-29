import { type ModelInfo, openAiModelInfoSafeDefaults } from "@shared/api"
import type { Mode } from "@shared/storage/types"
import { VSCodeDropdown, VSCodeLink, VSCodeOption, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import UseCustomPromptCheckbox from "@/components/settings/UseCustomPromptCheckbox"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useProviderConfig } from "@/hooks/useProviderConfig"
import { useProviderModelSelection } from "@/hooks/useProviderModelSelection"
import { formatString, splitOnPlaceholder } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import { ModelsServiceClient } from "@/services/grpc-client"
import { BaseUrlField } from "../common/BaseUrlField"
import { DebouncedTextField } from "../common/DebouncedTextField"
import { DropdownContainer } from "../common/ModelSelector"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

/**
 * Props for the LMStudioProvider component
 */
/**
 * The shell command the setup note tells the user to run. A command is not copy — it
 * has to stay byte-identical in every language — so it is a constant rather than a key.
 */
const LM_STUDIO_SERVER_COMMAND = "lms server start"

interface LMStudioProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

interface LMStudioApiModel {
	id: string
	object?: "model"
	type?: string
	publisher?: string
	arch?: string
	compatibility_type?: string
	quantization?: string
	state?: string
	max_context_length?: number
	loaded_context_length?: number
}

/**
 * The LM Studio provider configuration component
 */
export const LMStudioProvider = ({ currentMode }: LMStudioProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const tr = useTranslation("providers")

	// Both reference paragraphs weave links (and the `lms server start` command) into
	// their sentences, so they are split on their placeholders instead of concatenated.
	const [introBeforeQuickstart] = splitOnPlaceholder(tr("lmStudioIntro"), "quickstart")
	const [serverIntroBeforeLink, serverIntroAfterLink] = splitOnPlaceholder(tr("lmStudioServerIntro"), "server")
	const [serverIntroBetween, serverIntroAfterCommand] = splitOnPlaceholder(serverIntroAfterLink, "command")
	const { handleFieldChange } = useApiConfigurationHandlers()
	const { config, write, commitSelection } = useProviderConfig("lmstudio")

	const [lmStudioModels, setLmStudioModels] = useState<LMStudioApiModel[]>([])
	const [pendingSelectedModelId, setPendingSelectedModelId] = useState<string | undefined>(undefined)

	const toLmStudioModelInfo = useCallback((model: LMStudioApiModel | undefined, modelId: string): ModelInfo => {
		const contextWindow = model?.loaded_context_length ?? model?.max_context_length
		return {
			...openAiModelInfoSafeDefaults,
			name: modelId,
			...(contextWindow !== undefined && contextWindow > 0 ? { contextWindow } : {}),
			...(model?.max_context_length !== undefined && model.max_context_length > 0
				? { maxTokens: model.max_context_length }
				: {}),
		}
	}, [])
	const lmStudioModelInfoById = useMemo(
		() => Object.fromEntries(lmStudioModels.map((model) => [model.id, toLmStudioModelInfo(model, model.id)])),
		[lmStudioModels, toLmStudioModelInfo],
	)
	const { selectedModel, commitModelSelection } = useProviderModelSelection("lmstudio", currentMode, {
		models: lmStudioModelInfoById,
		config,
		commitSelection,
		fallbackModelInfo: openAiModelInfoSafeDefaults,
		customModelInfo: (modelId) => toLmStudioModelInfo(undefined, modelId),
	})
	const displayedSelectedModelId = pendingSelectedModelId ?? selectedModel.modelId
	const currentLMStudioModel = useMemo(
		() => lmStudioModels.find((model) => model.id === displayedSelectedModelId),
		[displayedSelectedModelId, lmStudioModels],
	)
	const endpoint = useMemo(
		() => config?.baseUrl ?? apiConfiguration?.lmStudioBaseUrl ?? "http://localhost:1234",
		[apiConfiguration?.lmStudioBaseUrl, config?.baseUrl],
	)

	const handleBaseUrlChange = useCallback(
		(value: string) => {
			void write({ baseUrl: value }).catch((error) => console.error("Failed to update LM Studio base URL:", error))
		},
		[write],
	)

	const handleModelChange = useCallback(
		(modelId: string) => {
			const trimmedModelId = modelId.trim()
			if (!trimmedModelId) {
				return
			}
			setPendingSelectedModelId(trimmedModelId)
			const model = lmStudioModels.find((candidate) => candidate.id === trimmedModelId)
			void commitModelSelection({
				modelId: trimmedModelId,
				modelInfo: toLmStudioModelInfo(model, trimmedModelId),
			}).catch((error) => {
				console.error("Failed to update LM Studio model selection:", error)
				setPendingSelectedModelId(undefined)
			})
		},
		[commitModelSelection, lmStudioModels, toLmStudioModelInfo],
	)

	// Fetch LM Studio models on mount, whenever the endpoint changes, and when
	// the model control gains focus (no interval polling — the endpoint is
	// user-configurable, see ENG-2344), so a server started after mount is
	// still discovered.
	const requestLmStudioModels = useCallback(async () => {
		await ModelsServiceClient.getLmStudioModels({
			value: endpoint,
		})
			.then((response) => {
				if (response?.values) {
					const models = response.values.map((v) => JSON.parse(v) as LMStudioApiModel)
					setLmStudioModels(models)
				}
			})
			.catch((error) => {
				console.error("Failed to parse LM Studio models:", error)
			})
	}, [endpoint])

	useEffect(() => {
		requestLmStudioModels()
	}, [requestLmStudioModels])

	const lmStudioMaxTokens = currentLMStudioModel?.max_context_length?.toString()
	const currentLoadedContext = currentLMStudioModel?.loaded_context_length?.toString()

	useEffect(() => {
		if (pendingSelectedModelId && selectedModel.modelId === pendingSelectedModelId) {
			setPendingSelectedModelId(undefined)
		}
	}, [pendingSelectedModelId, selectedModel.modelId])

	useEffect(() => {
		const curr = currentLMStudioModel?.loaded_context_length?.toString()
		const max = currentLMStudioModel?.max_context_length?.toString()
		const choice = apiConfiguration?.lmStudioMaxTokens ?? max
		if (curr && curr !== choice) {
			handleFieldChange("lmStudioMaxTokens", curr)
		}
	}, [
		currentLMStudioModel?.loaded_context_length,
		currentLMStudioModel?.max_context_length,
		apiConfiguration?.lmStudioMaxTokens,
		handleFieldChange,
	])

	return (
		<div className="flex flex-col gap-2">
			<BaseUrlField
				initialValue={config?.baseUrl ?? apiConfiguration?.lmStudioBaseUrl}
				label={tr("baseUrlToggle")}
				onChange={handleBaseUrlChange}
				placeholder={formatString(tr, "defaultValue", { value: "http://localhost:1234" })}
			/>

			<div className="font-semibold">{tr("modelLabel")}</div>
			{lmStudioModels.length > 0 ? (
				<DropdownContainer className="dropdown-container" onFocusCapture={() => void requestLmStudioModels()} zIndex={10}>
					<VSCodeDropdown
						className="w-full mb-3"
						onChange={(e: any) => {
							const value = e?.target?.value
							if (typeof value === "string") {
								handleModelChange(value)
							}
						}}
						value={displayedSelectedModelId}>
						{lmStudioModels.map((model) => (
							<VSCodeOption className="w-full" key={model.id} value={model.id}>
								{model.id}
							</VSCodeOption>
						))}
					</VSCodeDropdown>
				</DropdownContainer>
			) : (
				<div onFocusCapture={() => void requestLmStudioModels()}>
					<DebouncedTextField
						initialValue={displayedSelectedModelId || ""}
						onChange={handleModelChange}
						placeholder={tr("lmStudioModelPlaceholder")}
						style={{ width: "100%" }}
					/>
				</div>
			)}

			<div className="font-semibold">{tr("lmStudioContextWindowLabel")}</div>
			<VSCodeTextField
				className="w-full pointer-events-none"
				disabled={true}
				title={tr("lmStudioContextWindowTitle")}
				value={String(currentLoadedContext ?? lmStudioMaxTokens ?? "0")}
			/>

			<UseCustomPromptCheckbox providerId="lmstudio" />

			<div className="text-xs text-description">
				{introBeforeQuickstart}
				<VSCodeLink href="https://lmstudio.ai/docs" style={{ display: "inline", fontSize: "inherit" }}>
					{tr("lmStudioQuickstartLink")}
				</VSCodeLink>{" "}
				{serverIntroBeforeLink}
				<VSCodeLink className="inline" href="https://lmstudio.ai/docs/basics/server">
					{tr("lmStudioLocalServerLink")}
				</VSCodeLink>
				{serverIntroBetween}
				<code>{LM_STUDIO_SERVER_COMMAND}</code>
				{serverIntroAfterCommand}{" "}
				<div className="text-error">
					<span className="font-semibold">{tr("noteLabel")}</span> {tr("complexPromptNote")}
				</div>
			</div>
		</div>
	)
}
