import { TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip"
import { azureOpenAiDefaultApiVersion, type OpenAiCompatibleModelInfo, openAiModelInfoSafeDefaults } from "@shared/api"
import { ApiFormat, OpenAiModelsRequest } from "@shared/proto/cline/models"
import { fromProtobufModelInfo } from "@shared/proto-conversions/models/typeConversion"
import type { Mode } from "@shared/storage/types"
import { VSCodeButton, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react"
import { Tooltip } from "@/components/ui/tooltip"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useDynamicProviderSelection } from "@/hooks/useDynamicProviderSelection"
import { fromProtobufProviderModelOverrides, type ProviderModelOverrides, useProviderConfig } from "@/hooks/useProviderConfig"
import { formatString } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import { ModelsServiceClient } from "@/services/grpc-client"
import { OPENAI_COMPATIBLE_POLICY_ID, resolveModelThinkingOptions } from "@/utils/modelThinkingOptions"
import { getAsVar, VSC_DESCRIPTION_FOREGROUND } from "@/utils/vscStyles"
import { ApiKeyField } from "../common/ApiKeyField"
import { BaseUrlField } from "../common/BaseUrlField"
import { DebouncedTextField } from "../common/DebouncedTextField"
import { ModelInfoView } from "../common/ModelInfoView"
import ReasoningEffortSelector from "../ReasoningEffortSelector"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"
import { useProviderApiKeyField } from "../utils/useProviderApiKeyField"

/**
 * The model list below is a plain `<select>` (not a VS Code toolkit dropdown), so it
 * has to be themed by hand. Unstyled it renders in the browser default white, which
 * read as a broken control in the dark theme — the "jan Model ID หลุดดีไซน์" report.
 * Every token has a fallback because not all themes define the dropdown set.
 */
const MODEL_ID_SELECT_STYLE: CSSProperties = {
	width: "100%",
	background: "var(--vscode-dropdown-background, var(--vscode-input-background))",
	color: "var(--vscode-dropdown-foreground, var(--vscode-input-foreground))",
	border: "1px solid var(--vscode-dropdown-border, var(--vscode-input-border, var(--vscode-editorGroup-border)))",
	borderRadius: 2,
	padding: "4px 6px",
	fontFamily: "var(--vscode-font-family)",
	fontSize: 12,
	outline: "none",
}

/**
 * Props for the OpenAICompatibleProvider component
 */
interface OpenAICompatibleProviderProps {
	providerId: string
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

/**
 * The OpenAI Compatible provider configuration component
 */
export const OpenAICompatibleProvider = ({
	providerId,
	showModelOptions,
	isPopup,
	currentMode,
}: OpenAICompatibleProviderProps) => {
	const { apiConfiguration, remoteConfigSettings } = useExtensionState()
	const tr = useTranslation("providers")
	// The managed-by-organization sentence belongs to the Settings surface (the General
	// tab's telemetry switch and the Remote Config tab show the same one) and is read
	// from that table rather than copied here, so the wording cannot drift.
	const settingsTr = useTranslation("settings")
	const { handleFieldChange, handleModeFieldChange } = useApiConfigurationHandlers()
	const { config, write, commitSelection } = useProviderConfig(providerId)

	const [modelConfigurationSelected, setModelConfigurationSelected] = useState(false)
	const [isCustomOpenAiModelEntryVisible, setIsCustomOpenAiModelEntryVisible] = useState(false)
	const [availableOpenAiModels, setAvailableOpenAiModels] = useState<string[]>([])
	const [isRefreshingOpenAiModels, setIsRefreshingOpenAiModels] = useState(false)
	const [openAiModelsError, setOpenAiModelsError] = useState<string | undefined>(undefined)
	const [modelFieldErrors, setModelFieldErrors] = useState<Partial<Record<NumericModelOverrideKey, string>>>({})
	// Only the built-in "openai" provider stores its API key in the legacy
	// ApiConfiguration field; custom providers keep it in their per-provider
	// config (available only as a masked length), so there is no plaintext key
	// to seed the model-refresh request with.
	const legacyOpenAiApiKey = providerId === "openai" ? apiConfiguration?.openAiApiKey || "" : ""
	const latestOpenAiBaseUrlRef = useRef(config?.baseUrl || "")
	const latestOpenAiApiKeyRef = useRef(legacyOpenAiApiKey)
	const openAiModelsRequestRef = useRef(0)

	useEffect(() => {
		latestOpenAiBaseUrlRef.current = config?.baseUrl || ""
	}, [config?.baseUrl])

	useEffect(() => {
		latestOpenAiApiKeyRef.current = legacyOpenAiApiKey
	}, [legacyOpenAiApiKey])

	const handleProviderConfigWriteError = useCallback((fieldName: string, error: unknown) => {
		console.error(`Failed to update OpenAI Compatible ${fieldName}:`, error)
	}, [])

	// Built-in "openai" persists model selection to its legacy ApiConfiguration
	// fields; custom/unknown providers persist via their per-provider committed
	// selection. Prefer the committed selection and fall back to the legacy
	// fields so the built-in provider keeps working unchanged.
	const isOpenAiProvider = providerId === "openai" || providerId === "openai-compatible"
	const { selectedModelId: legacySelectedModelId, selectedModelInfo: legacySelectedModelInfo } = useDynamicProviderSelection(
		providerId,
		apiConfiguration,
		currentMode,
	)
	const committedSelection = currentMode === "plan" ? config?.planSelection : config?.actSelection
	const selectedModelId = committedSelection?.modelId ?? legacySelectedModelId
	const selectedModelInfo = committedSelection?.modelInfo
		? fromProtobufModelInfo(committedSelection.modelInfo)
		: legacySelectedModelInfo
	// The Model Configuration section reads/writes the resolved model info.
	// OpenAiCompatibleModelInfo only adds optional fields over ModelInfo, so a
	// resolved ModelInfo satisfies it structurally.
	const openAiModelInfo: OpenAiCompatibleModelInfo = selectedModelInfo ?? openAiModelInfoSafeDefaults
	const selectedModelOverrides = fromProtobufProviderModelOverrides(committedSelection?.overrides) ?? {}
	const selectedModelOverridesRef = useRef<{ modelId: string | undefined; overrides: ProviderModelOverrides }>({
		modelId: selectedModelId,
		overrides: selectedModelOverrides,
	})

	// Counts commits whose commit+read-back round-trip has not finished yet.
	const pendingCommitsRef = useRef(0)

	useEffect(() => {
		// Do not reseed the pending-override accumulator from server state
		// while commits are in flight: an earlier commit's read-back can land
		// after a later local edit, and reseeding from that stale snapshot
		// would silently drop the already-committed newer field.
		if (pendingCommitsRef.current > 0) {
			return
		}
		selectedModelOverridesRef.current = { modelId: selectedModelId, overrides: selectedModelOverrides }
	}, [committedSelection?.overrides, selectedModelId])

	const commitOpenAiSelection = useCallback(
		(modelId: string, overrides?: ProviderModelOverrides) => {
			if (!modelId.trim()) {
				return
			}

			pendingCommitsRef.current += 1
			void commitSelection(currentMode, {
				providerId,
				modelId,
				...(overrides !== undefined ? { overrides } : {}),
			})
				.catch((error) => handleProviderConfigWriteError("model selection", error))
				.finally(() => {
					pendingCommitsRef.current -= 1
				})
		},
		[commitSelection, currentMode, handleProviderConfigWriteError, providerId],
	)

	const updateModelOverride = useCallback(
		<K extends keyof ProviderModelOverrides>(key: K, value: ProviderModelOverrides[K] | undefined) => {
			const modelId = selectedModelId?.trim()
			if (!modelId) {
				return
			}

			const currentOverrides =
				selectedModelOverridesRef.current.modelId === modelId ? selectedModelOverridesRef.current.overrides : {}
			const nextOverrides = { ...currentOverrides }
			if (value === undefined) {
				delete nextOverrides[key]
			} else {
				Object.assign(nextOverrides, { [key]: value })
			}
			selectedModelOverridesRef.current = { modelId, overrides: nextOverrides }
			commitOpenAiSelection(modelId, nextOverrides)
		},
		[commitOpenAiSelection, selectedModelId],
	)

	const updateNumericModelOverride = useCallback(
		(key: NumericModelOverrideKey, label: string, value: string) => {
			const parsed = parseOptionalFiniteNumber(value)
			if (!parsed.valid) {
				setModelFieldErrors((current) => ({ ...current, [key]: formatString(tr, "numberFieldError", { label }) }))
				return
			}
			setModelFieldErrors((current) => {
				const next = { ...current }
				delete next[key]
				return next
			})
			// Debounced fields fire with their initial value on mount and on
			// model/mode switches; committing that echo would persist resolved
			// catalog values as user overrides. Only commit actual edits.
			// Compare against the pending override when one is in flight so a
			// quick revert during a commit round-trip is not mistaken for an
			// echo of the (stale) displayed value.
			const pendingOverrides =
				selectedModelOverridesRef.current.modelId === selectedModelId?.trim()
					? selectedModelOverridesRef.current.overrides
					: undefined
			const effectiveValue =
				pendingOverrides && Object.hasOwn(pendingOverrides, key)
					? displayedModelNumber(pendingOverrides[key] as number | undefined)
					: displayedModelNumber(openAiModelInfo?.[key])
			if (parsed.value === effectiveValue) {
				return
			}
			updateModelOverride(key, parsed.value)
		},
		[updateModelOverride, openAiModelInfo, selectedModelId, tr],
	)

	// Debounced function to refresh OpenAI models (prevents excessive API calls while typing)
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current)
			}
			openAiModelsRequestRef.current += 1
		}
	}, [])

	const refreshOpenAiModels = useCallback(
		async (baseUrl?: string, apiKey?: string) => {
			const trimmedBaseUrl = baseUrl?.trim()
			const requestId = openAiModelsRequestRef.current + 1
			openAiModelsRequestRef.current = requestId

			if (!trimmedBaseUrl) {
				setAvailableOpenAiModels([])
				setOpenAiModelsError(undefined)
				setIsRefreshingOpenAiModels(false)
				return
			}

			setIsRefreshingOpenAiModels(true)
			setOpenAiModelsError(undefined)

			try {
				// providerId lets the host back the request with this provider's
				// stored API key and headers — the webview only sees a masked key
				// for custom providers, so it can't send the credential itself.
				const response = await ModelsServiceClient.refreshOpenAiModels(
					OpenAiModelsRequest.create({
						providerId,
						baseUrl: trimmedBaseUrl,
						apiKey,
					}),
				)

				if (openAiModelsRequestRef.current === requestId) {
					setAvailableOpenAiModels(response.values)
				}
			} catch (error) {
				console.error("Failed to refresh OpenAI models:", error)
				if (openAiModelsRequestRef.current === requestId) {
					setAvailableOpenAiModels([])
					setOpenAiModelsError(error instanceof Error ? error.message : String(error))
				}
			} finally {
				if (openAiModelsRequestRef.current === requestId) {
					setIsRefreshingOpenAiModels(false)
				}
			}
		},
		[providerId],
	)

	const debouncedRefreshOpenAiModels = useCallback(
		(baseUrl?: string, apiKey?: string) => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current)
			}

			debounceTimerRef.current = setTimeout(() => {
				void refreshOpenAiModels(baseUrl, apiKey)
			}, 500)
		},
		[refreshOpenAiModels],
	)

	useEffect(() => {
		void refreshOpenAiModels(config?.baseUrl, latestOpenAiApiKeyRef.current)
	}, [config?.baseUrl, refreshOpenAiModels])

	const handleOpenAiModelSelection = useCallback(
		(modelId: string) => {
			if (isOpenAiProvider) {
				handleModeFieldChange({ plan: "planModeOpenAiModelId", act: "actModeOpenAiModelId" }, modelId, currentMode)
			}
			commitOpenAiSelection(modelId)
		},
		[commitOpenAiSelection, currentMode, handleModeFieldChange, isOpenAiProvider],
	)

	const { savedApiKeyMask, handleApiKeyChange, copySavedApiKey } = useProviderApiKeyField({
		providerId: providerId,
		apiKeyLength: config?.apiKeyLength,
		canWrite: config !== undefined,
		onApiKeyChange: (apiKey) => {
			latestOpenAiApiKeyRef.current = apiKey
			debouncedRefreshOpenAiModels(latestOpenAiBaseUrlRef.current, apiKey)
		},
		providerName: "OpenAI Compatible",
		write,
	})

	return (
		<div>
			<Tooltip>
				<TooltipTrigger>
					<div className="mb-2.5">
						<div className="flex items-center gap-2 mb-1">
							<span style={{ fontWeight: 500 }}>{tr("baseUrlLabel")}</span>
							{remoteConfigSettings?.openAiBaseUrl !== undefined && (
								<i className="codicon codicon-lock text-description text-sm" />
							)}
						</div>
						<DebouncedTextField
							disabled={remoteConfigSettings?.openAiBaseUrl !== undefined}
							initialValue={config?.baseUrl || ""}
							onChange={(value) => {
								if (!config) {
									return
								}

								latestOpenAiBaseUrlRef.current = value
								void write({ baseUrl: value }).catch((error) => handleProviderConfigWriteError("base URL", error))
								debouncedRefreshOpenAiModels(value, latestOpenAiApiKeyRef.current)
							}}
							placeholder={tr("baseUrlEntryPlaceholder")}
							style={{ width: "100%", marginBottom: 10 }}
							type="text"
						/>
					</div>
				</TooltipTrigger>
				<TooltipContent hidden={remoteConfigSettings?.openAiBaseUrl === undefined}>
					{settingsTr("managedByOrganization")}
				</TooltipContent>
			</Tooltip>

			<ApiKeyField
				initialValue={savedApiKeyMask}
				onChange={handleApiKeyChange}
				onCopySavedKey={savedApiKeyMask ? copySavedApiKey : undefined}
				providerName="OpenAI Compatible"
			/>

			<label htmlFor="openai-compatible-model-picker">
				<span style={{ fontWeight: 500 }}>{tr("modelIdLabel")}</span>
				{isRefreshingOpenAiModels && <span> {tr("modelListLoading")}</span>}
			</label>
			{openAiModelsError && <div role="alert">{openAiModelsError}</div>}
			{availableOpenAiModels.length > 0 ? (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 8,
						marginBottom: 10,
					}}>
					<select
						aria-label={tr("modelIdLabel")}
						id="openai-compatible-model-picker"
						onChange={(event) => {
							const modelId = event.target.value
							if (modelId === "__custom__") {
								setIsCustomOpenAiModelEntryVisible(true)
								return
							}

							setIsCustomOpenAiModelEntryVisible(false)
							handleOpenAiModelSelection(modelId)
						}}
						style={MODEL_ID_SELECT_STYLE}
						value={selectedModelId && availableOpenAiModels.includes(selectedModelId) ? selectedModelId : ""}>
						{selectedModelId && !availableOpenAiModels.includes(selectedModelId) && (
							<option value="">{formatString(tr, "modelNotInListOption", { model: selectedModelId })}</option>
						)}
						{availableOpenAiModels.map((modelId) => (
							<option key={modelId} value={modelId}>
								{modelId}
							</option>
						))}
						<option value="__custom__">{tr("modelUseCustomId")}</option>
					</select>

					{(isCustomOpenAiModelEntryVisible ||
						(selectedModelId && !availableOpenAiModels.includes(selectedModelId))) && (
						<DebouncedTextField
							initialValue={selectedModelId || ""}
							onChange={(value) => handleOpenAiModelSelection(value)}
							placeholder={tr("enterModelIdPlaceholder")}
							style={{ width: "100%" }}>
							<span style={{ fontWeight: 500 }}>{tr("customModelIdLabel")}</span>
						</DebouncedTextField>
					)}
				</div>
			) : (
				<DebouncedTextField
					initialValue={selectedModelId || ""}
					onChange={(value) => handleOpenAiModelSelection(value)}
					placeholder={tr("enterModelIdPlaceholder")}
					style={{ width: "100%", marginBottom: 10 }}
				/>
			)}

			{/* OpenAI Compatible Custom Headers */}
			{(() => {
				const headers = config?.headers ?? {}
				const headerEntries = Object.entries(headers)

				return (
					<div style={{ marginBottom: 10 }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}>
							<Tooltip>
								<TooltipTrigger>
									<div className="flex items-center gap-2">
										<span style={{ fontWeight: 500 }}>{tr("customHeadersLabel")}</span>
										{remoteConfigSettings?.openAiHeaders !== undefined && (
											<i className="codicon codicon-lock text-description text-sm" />
										)}
									</div>
								</TooltipTrigger>
								<TooltipContent hidden={remoteConfigSettings?.openAiHeaders === undefined}>
									{settingsTr("managedByOrganization")}
								</TooltipContent>
							</Tooltip>
							<VSCodeButton
								disabled={remoteConfigSettings?.openAiHeaders !== undefined}
								onClick={() => {
									const currentHeaders = { ...headers }
									const headerCount = Object.keys(currentHeaders).length
									const newKey = `header${headerCount + 1}`
									currentHeaders[newKey] = ""
									void write({ headers: currentHeaders }).catch((error) =>
										handleProviderConfigWriteError("headers", error),
									)
								}}>
								{tr("addHeader")}
							</VSCodeButton>
						</div>

						<div>
							{headerEntries.map(([key, value], index) => (
								<div key={index} style={{ display: "flex", gap: 5, marginTop: 5 }}>
									<DebouncedTextField
										disabled={remoteConfigSettings?.openAiHeaders !== undefined}
										initialValue={key}
										onChange={(newValue) => {
											const currentHeaders = config?.headers ?? {}
											if (newValue && newValue !== key) {
												const { [key]: _, ...rest } = currentHeaders
												void write({
													headers: {
														...rest,
														[newValue]: value,
													},
												}).catch((error) => handleProviderConfigWriteError("headers", error))
											}
										}}
										placeholder={tr("headerNamePlaceholder")}
										style={{ width: "40%" }}
									/>
									<DebouncedTextField
										disabled={remoteConfigSettings?.openAiHeaders !== undefined}
										initialValue={value}
										onChange={(newValue) => {
											void write({
												headers: {
													...(config?.headers ?? {}),
													[key]: newValue,
												},
											}).catch((error) => handleProviderConfigWriteError("headers", error))
										}}
										placeholder={tr("headerValuePlaceholder")}
										style={{ width: "40%" }}
									/>
									<VSCodeButton
										appearance="secondary"
										disabled={remoteConfigSettings?.openAiHeaders !== undefined}
										onClick={() => {
											const { [key]: _, ...rest } = config?.headers ?? {}
											void write({ headers: rest }).catch((error) =>
												handleProviderConfigWriteError("headers", error),
											)
										}}>
										{tr("removeButton")}
									</VSCodeButton>
								</div>
							))}
						</div>
					</div>
				)
			})()}

			{remoteConfigSettings?.azureApiVersion !== undefined ? (
				<Tooltip>
					<TooltipTrigger>
						<BaseUrlField
							disabled={true}
							initialValue={apiConfiguration?.azureApiVersion}
							label={tr("setAzureApiVersionLabel")}
							onChange={(value) => handleFieldChange("azureApiVersion", value)}
							placeholder={formatString(tr, "defaultValue", { value: azureOpenAiDefaultApiVersion })}
							showLockIcon={true}
						/>
					</TooltipTrigger>
					<TooltipContent>{settingsTr("managedByOrganization")}</TooltipContent>
				</Tooltip>
			) : (
				<BaseUrlField
					initialValue={apiConfiguration?.azureApiVersion}
					label={tr("setAzureApiVersionLabel")}
					onChange={(value) => handleFieldChange("azureApiVersion", value)}
					placeholder={formatString(tr, "defaultValue", { value: azureOpenAiDefaultApiVersion })}
				/>
			)}

			<VSCodeCheckbox
				checked={apiConfiguration?.azureIdentity || false}
				onChange={(e: any) => {
					const isChecked = e.target.checked === true
					return handleFieldChange("azureIdentity", isChecked)
				}}>
				{tr("useAzureIdentity")}
			</VSCodeCheckbox>

			<div
				onClick={() => setModelConfigurationSelected((val) => !val)}
				style={{
					color: getAsVar(VSC_DESCRIPTION_FOREGROUND),
					display: "flex",
					margin: "10px 0",
					cursor: "pointer",
					alignItems: "center",
				}}>
				<span
					className={`codicon ${modelConfigurationSelected ? "codicon-chevron-down" : "codicon-chevron-right"}`}
					style={{
						marginRight: "4px",
					}}
				/>
				<span
					style={{
						fontWeight: 700,
						textTransform: "uppercase",
					}}>
					{tr("modelConfiguration")}
				</span>
			</div>

			{modelConfigurationSelected && (
				<>
					<VSCodeCheckbox
						checked={!!openAiModelInfo?.supportsImages}
						onChange={(e: any) => updateModelOverride("supportsVision", e.target.checked === true)}>
						{tr("supportsImagesToggle")}
					</VSCodeCheckbox>

					<VSCodeCheckbox
						checked={selectedModelOverrides.isR1FormatRequired ?? openAiModelInfo.apiFormat === ApiFormat.R1_CHAT}
						onChange={(e: any) => updateModelOverride("isR1FormatRequired", e.target.checked === true)}>
						{tr("enableR1Format")}
					</VSCodeCheckbox>

					<div style={{ display: "flex", gap: 10, marginTop: "5px" }}>
						<div style={{ flex: 1 }}>
							<DebouncedTextField
								initialValue={formatOptionalModelNumber(openAiModelInfo?.contextWindow)}
								onChange={(value) =>
									updateNumericModelOverride("contextWindow", tr("contextWindowSizeLabel"), value)
								}>
								<span style={{ fontWeight: 500 }}>{tr("contextWindowSizeLabel")}</span>
							</DebouncedTextField>
							{modelFieldErrors.contextWindow && <div role="alert">{modelFieldErrors.contextWindow}</div>}
						</div>

						<div style={{ flex: 1 }}>
							<DebouncedTextField
								initialValue={formatOptionalModelNumber(openAiModelInfo?.maxTokens)}
								onChange={(value) => updateNumericModelOverride("maxTokens", tr("maxOutputTokensLabel"), value)}
								placeholder={tr("notSetPlaceholder")}>
								<span style={{ fontWeight: 500 }}>{tr("maxOutputTokensLabel")}</span>
							</DebouncedTextField>
							{modelFieldErrors.maxTokens && <div role="alert">{modelFieldErrors.maxTokens}</div>}
						</div>
					</div>

					<div style={{ display: "flex", gap: 10, marginTop: "5px" }}>
						<div style={{ flex: 1 }}>
							<DebouncedTextField
								initialValue={formatOptionalModelNumber(openAiModelInfo?.inputPrice)}
								onChange={(value) =>
									updateNumericModelOverride("inputPrice", tr("inputPricePerMillionLabel"), value)
								}>
								<span style={{ fontWeight: 500 }}>{tr("inputPricePerMillionLabel")}</span>
							</DebouncedTextField>
							{modelFieldErrors.inputPrice && <div role="alert">{modelFieldErrors.inputPrice}</div>}
						</div>

						<div style={{ flex: 1 }}>
							<DebouncedTextField
								initialValue={formatOptionalModelNumber(openAiModelInfo?.outputPrice)}
								onChange={(value) =>
									updateNumericModelOverride("outputPrice", tr("outputPricePerMillionLabel"), value)
								}>
								<span style={{ fontWeight: 500 }}>{tr("outputPricePerMillionLabel")}</span>
							</DebouncedTextField>
							{modelFieldErrors.outputPrice && <div role="alert">{modelFieldErrors.outputPrice}</div>}
						</div>
					</div>

					<div style={{ display: "flex", gap: 10, marginTop: "5px" }}>
						<div>
							<DebouncedTextField
								initialValue={formatOptionalModelNumber(openAiModelInfo?.temperature)}
								onChange={(value) => updateNumericModelOverride("temperature", tr("temperatureLabel"), value)}
								placeholder={tr("notSetPlaceholder")}>
								<span style={{ fontWeight: 500 }}>{tr("temperatureLabel")}</span>
							</DebouncedTextField>
							{modelFieldErrors.temperature && <div role="alert">{modelFieldErrors.temperature}</div>}
						</div>
					</div>
				</>
			)}

			<p
				style={{
					fontSize: "12px",
					marginTop: 3,
					color: "var(--vscode-descriptionForeground)",
				}}>
				<span style={{ color: "var(--vscode-errorForeground)" }}>
					(<span style={{ fontWeight: 500 }}>{tr("noteLabel")}</span> {tr("complexPromptNote")})
				</span>
			</p>

			{showModelOptions && (
				<>
					{/*
					 * This form serves user-configured endpoints, so the shared policy's
					 * `OPENAI_COMPATIBLE_POLICY_ID` rule is "always offer effort" — the app cannot
					 * know what an arbitrary endpoint supports. One policy table, no local rule.
					 */}
					{resolveModelThinkingOptions({
						providerId: OPENAI_COMPATIBLE_POLICY_ID,
						modelId: selectedModelId,
						modelInfo: selectedModelInfo,
					}).showEffort && (
						<ReasoningEffortSelector
							currentMode={currentMode}
							modelId={selectedModelId}
							modelInfo={selectedModelInfo}
							onEffortChange={(effort) => {
								void write({
									reasoning: {
										enabled: effort !== "none",
										effort: effort !== "none" ? effort : undefined,
									},
								}).catch((err) => console.error("Failed to update OpenAI Compatible reasoning effort:", err))
							}}
							providerId={OPENAI_COMPATIBLE_POLICY_ID}
						/>
					)}
					<ModelInfoView isPopup={isPopup} modelInfo={selectedModelInfo} selectedModelId={selectedModelId} />
				</>
			)}
		</div>
	)
}

type NumericModelOverrideKey = "contextWindow" | "maxTokens" | "inputPrice" | "outputPrice" | "temperature"

type ParsedOptionalNumber = { valid: true; value: number | undefined } | { valid: false }

// -1 is the legacy UI sentinel for "not set"; it renders (and compares) as unset.
function displayedModelNumber(value: number | undefined): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value !== -1 ? value : undefined
}

function formatOptionalModelNumber(value: number | undefined): string {
	return displayedModelNumber(value)?.toString() ?? ""
}

function parseOptionalFiniteNumber(value: string): ParsedOptionalNumber {
	const trimmed = value.trim()
	if (!trimmed) {
		return { valid: true, value: undefined }
	}
	const parsed = Number(trimmed)
	return Number.isFinite(parsed) ? { valid: true, value: parsed } : { valid: false }
}
