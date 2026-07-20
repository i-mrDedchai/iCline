import { ANTHROPIC_MIN_THINKING_BUDGET, type ApiProvider } from "@shared/api"
import { EmptyRequest } from "@shared/proto/cline/common"
import { isOpenaiReasoningEffort, OPENAI_REASONING_EFFORT_OPTIONS, type OpenaiReasoningEffort } from "@shared/storage/types"
import { resolveClaudeOpusAdaptiveThinking } from "@shared/utils/reasoning-support"
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import Fuse from "fuse.js"
import { CheckIcon, ChevronDown, ChevronRight, ChevronUp, Pencil, RefreshCw } from "lucide-react"
import type React from "react"
import { useCallback, useMemo, useState } from "react"
import {
	getChatModelPreference,
	getChatModelPreferenceKey,
	normalizePreferenceEffort,
	parseChatModelPreferenceKey,
	setChatModelPreference,
} from "@/components/chat/chatModelPreferences"
import { getModeSpecificFields, normalizeApiConfiguration } from "@/components/settings/utils/providerUtils"
import { useApiConfigurationHandlers } from "@/components/settings/utils/useApiConfigurationHandlers"
import { PLATFORM_CONFIG } from "@/config/platform.config"
import { CLINE_PASS_FEATURE_FLAG } from "@/constants/featureFlags"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useHasFeatureFlag } from "@/hooks/useFeatureFlag"
import { cn } from "@/lib/utils"
import { ModelsServiceClient } from "@/services/grpc-client"
import { fromProtobufModels } from "@shared/proto-conversions/models/typeConversion"
import {
	buildChatModelSelectionUpdates,
	buildChatProviderGroups,
	getModelOptionSupport,
	getModelThinkingStatus,
	getRefreshModelsHandler,
	getSelectedModelForProvider,
	refreshAllChatPickerModels,
	type ChatModelEntry,
	type ChatProviderGroup,
} from "./chatModelPickerUtils"
import { ModelThinkingStatusIcons } from "./ModelThinkingStatusIcons"

const EFFORT_LABELS: Record<OpenaiReasoningEffort, string> = {
	none: "Minimal",
	low: "Low",
	medium: "Medium",
	high: "High",
	xhigh: "Max",
}

const CHAT_MODEL_PICKER_Z_INDEX = 1100


interface ChatModelPickerProps {
	children: React.ReactNode
	modelDisplayName: string
}

const ChatModelPicker = ({ children, modelDisplayName }: ChatModelPickerProps) => {
	const {
		mode,
		apiConfiguration,
		remoteConfigSettings,
		planActSeparateModelsSetting,
		xaiOAuthIsAuthenticated,
		xaiGrokCliIsAuthenticated,
		xaiSubscriptionModels,
		openRouterModels,
		clineModels,
		zenmuxModels,
		requestyModels,
		vercelAiGatewayModels,
		groqModels,
		basetenModels,
		huggingFaceModels,
		hicapModels,
		liteLlmModels,
		refreshXaiSubscriptionModels,
		refreshZenmuxModels,
		refreshOpenRouterModels,
		refreshClineModels,
		refreshVercelAiGatewayModels,
		refreshHicapModels,
		refreshLiteLlmModels,
		setRequestyModels,
		setGroqModels,
		setHuggingFaceModels,
		setBasetenModels,
		navigateToSettingsModelPicker,
	} = useExtensionState()

	const isClinePassEnabled = useHasFeatureFlag(CLINE_PASS_FEATURE_FLAG)
	const { handleFieldsChange, handleModeFieldChange } = useApiConfigurationHandlers()
	const [open, setOpen] = useState(false)
	const [searchQuery, setSearchQuery] = useState("")
	const [hoveredModelKey, setHoveredModelKey] = useState<string | null>(null)
	const [preferenceVersion, setPreferenceVersion] = useState(0)
	const [collapsedProviders, setCollapsedProviders] = useState<Set<ApiProvider>>(() => new Set())

	const pickerContext = useMemo(
		() => ({
			apiConfiguration,
			mode,
			platformType: PLATFORM_CONFIG.type,
			isClinePassEnabled,
			remoteConfigSettings,
			xaiOAuthIsAuthenticated,
			xaiGrokCliIsAuthenticated,
			xaiSubscriptionModels,
			openRouterModels,
			clineModels,
			zenmuxModels,
			requestyModels,
			vercelAiGatewayModels,
			groqModels,
			basetenModels,
			huggingFaceModels,
			hicapModels,
			liteLlmModels,
		}),
		[
			apiConfiguration,
			mode,
			isClinePassEnabled,
			remoteConfigSettings,
			xaiOAuthIsAuthenticated,
			xaiGrokCliIsAuthenticated,
			xaiSubscriptionModels,
			openRouterModels,
			clineModels,
			zenmuxModels,
			requestyModels,
			vercelAiGatewayModels,
			groqModels,
			basetenModels,
			huggingFaceModels,
			hicapModels,
			liteLlmModels,
		],
	)

	const providerGroups = useMemo(() => buildChatProviderGroups(pickerContext), [pickerContext])

	const { selectedProvider, selectedModelId } = normalizeApiConfiguration(apiConfiguration, mode)
	const modeFields = getModeSpecificFields(apiConfiguration, mode)

	const hoveredTarget = useMemo(() => {
		if (!hoveredModelKey) {
			return null
		}
		const { provider, modelId } = parseChatModelPreferenceKey(hoveredModelKey)
		let modelInfo: ChatModelEntry["modelInfo"]
		for (const group of providerGroups) {
			if (group.provider !== provider) continue
			modelInfo = group.models.find((entry) => entry.id === modelId)?.modelInfo
			break
		}
		return { provider: provider as ApiProvider, modelId, modelInfo }
	}, [hoveredModelKey, providerGroups])

	const hoveredIsActive =
		!!hoveredTarget &&
		hoveredTarget.provider === selectedProvider &&
		hoveredTarget.modelId === selectedModelId

	const hoveredPreference = useMemo(() => {
		if (!hoveredTarget) {
			return null
		}
		const saved = getChatModelPreference(hoveredTarget.provider, hoveredTarget.modelId)
		if (saved) {
			return saved
		}
		if (hoveredIsActive) {
			return {
				reasoningEffort: isOpenaiReasoningEffort(modeFields.reasoningEffort)
					? modeFields.reasoningEffort
					: undefined,
				thinkingBudgetTokens: modeFields.thinkingBudgetTokens,
			}
		}
		return {}
	}, [hoveredTarget, hoveredIsActive, modeFields.reasoningEffort, modeFields.thinkingBudgetTokens, preferenceVersion])

	const optionSupport = useMemo(() => {
		if (!hoveredTarget) {
			return null
		}
		return getModelOptionSupport(hoveredTarget.provider, hoveredTarget.modelId, hoveredTarget.modelInfo)
	}, [hoveredTarget])

	const thinkingEnabled = useMemo(() => {
		if (!optionSupport || !hoveredPreference) {
			return false
		}
		if (optionSupport.showReasoningEffort) {
			const effort = hoveredPreference.reasoningEffort
			if (effort) {
				return effort !== "none"
			}
			if (hoveredIsActive) {
				const resolved = resolveClaudeOpusAdaptiveThinking(
					modeFields.reasoningEffort,
					modeFields.thinkingBudgetTokens,
				).effort
				return !!resolved && resolved !== "none"
			}
			return false
		}
		return (hoveredPreference.thinkingBudgetTokens ?? 0) > 0
	}, [optionSupport, hoveredPreference, hoveredIsActive, modeFields.reasoningEffort, modeFields.thinkingBudgetTokens])

	const selectedEffort = useMemo(() => {
		if (!hoveredPreference) {
			return "medium" as OpenaiReasoningEffort
		}
		if (isOpenaiReasoningEffort(hoveredPreference.reasoningEffort)) {
			return hoveredPreference.reasoningEffort === "none" ? "medium" : hoveredPreference.reasoningEffort
		}
		if (hoveredIsActive) {
			const resolved = resolveClaudeOpusAdaptiveThinking(
				modeFields.reasoningEffort,
				modeFields.thinkingBudgetTokens,
			).effort
			if (resolved && resolved !== "none") {
				return resolved
			}
		}
		return "medium"
	}, [hoveredPreference, hoveredIsActive, modeFields.reasoningEffort, modeFields.thinkingBudgetTokens])

	const filteredGroups = useMemo(() => {
		if (!searchQuery.trim()) return providerGroups

		const searchable = providerGroups.flatMap((group) =>
			group.models.map((model) => ({
				group,
				model,
				searchText: `${group.label} ${group.subtitle ?? ""} ${model.displayName} ${model.id}`,
			})),
		)

		const fuse = new Fuse(searchable, {
			keys: ["searchText"],
			threshold: 0.35,
			shouldSort: true,
			isCaseSensitive: false,
		})

		const results = fuse.search(searchQuery.trim())
		const groupMap = new Map<string, ChatProviderGroup>()

		for (const result of results) {
			const { group, model } = result.item
			const existing = groupMap.get(group.provider)
			if (existing) {
				existing.models.push(model)
			} else {
				groupMap.set(group.provider, { ...group, models: [model], isLoading: false })
			}
		}

		return Array.from(groupMap.values())
	}, [providerGroups, searchQuery])

	const refreshHandlers = useMemo(
		() => ({
			refreshXaiSubscriptionModels,
			refreshZenmuxModels,
			refreshOpenRouterModels,
			refreshClineModels,
			refreshVercelAiGatewayModels,
			refreshHicapModels,
			refreshLiteLlmModels,
			refreshBasetenModels: () => {
				ModelsServiceClient.refreshBasetenModelsRpc(EmptyRequest.create({}))
					.then((response) => setBasetenModels({ ...fromProtobufModels(response.models) }))
					.catch((err) => console.error("Failed to refresh Baseten models:", err))
			},
		}),
		[
			refreshXaiSubscriptionModels,
			refreshZenmuxModels,
			refreshOpenRouterModels,
			refreshClineModels,
			refreshVercelAiGatewayModels,
			refreshHicapModels,
			refreshLiteLlmModels,
			setBasetenModels,
		],
	)

	const refreshDynamicProviderExtras = useCallback(() => {
		ModelsServiceClient.refreshRequestyModels(EmptyRequest.create({}))
			.then((response) => setRequestyModels({ ...fromProtobufModels(response.models) }))
			.catch(() => undefined)
		ModelsServiceClient.refreshGroqModelsRpc(EmptyRequest.create({}))
			.then((response) => setGroqModels({ ...fromProtobufModels(response.models) }))
			.catch(() => undefined)
		ModelsServiceClient.refreshHuggingFaceModels(EmptyRequest.create({}))
			.then((response) => setHuggingFaceModels({ ...fromProtobufModels(response.models) }))
			.catch(() => undefined)
	}, [setRequestyModels, setGroqModels, setHuggingFaceModels])

	const refreshHandler = getRefreshModelsHandler(
		hoveredTarget?.provider ?? selectedProvider,
		refreshHandlers,
	)

	const bumpPreferences = useCallback(() => setPreferenceVersion((v) => v + 1), [])

	const applyPreferenceToActiveConfig = useCallback(
		async (provider: ApiProvider, modelId: string, preference: ReturnType<typeof getChatModelPreference>) => {
			if (provider !== selectedProvider || modelId !== selectedModelId || !preference) {
				return
			}
			if (preference.reasoningEffort !== undefined) {
				await handleModeFieldChange(
					{ plan: "planModeReasoningEffort", act: "actModeReasoningEffort" },
					preference.reasoningEffort,
					mode,
				)
			}
			if (preference.thinkingBudgetTokens !== undefined) {
				await handleModeFieldChange(
					{ plan: "planModeThinkingBudgetTokens", act: "actModeThinkingBudgetTokens" },
					preference.thinkingBudgetTokens,
					mode,
				)
			}
		},
		[handleModeFieldChange, mode, selectedModelId, selectedProvider],
	)

	const buildInitialCollapsedProviders = useCallback(() => {
		const collapsed = new Set<ApiProvider>()
		for (const group of providerGroups) {
			if (group.provider !== selectedProvider) {
				collapsed.add(group.provider)
			}
		}
		return collapsed
	}, [providerGroups, selectedProvider])

	const toggleProviderCollapsed = useCallback((provider: ApiProvider) => {
		setCollapsedProviders((prev) => {
			const next = new Set(prev)
			if (next.has(provider)) {
				next.delete(provider)
			} else {
				next.add(provider)
			}
			return next
		})
	}, [])

	const isProviderCollapsed = useCallback(
		(provider: ApiProvider) => {
			if (searchQuery.trim()) {
				return false
			}
			return collapsedProviders.has(provider)
		},
		[collapsedProviders, searchQuery],
	)

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			setOpen(nextOpen)
			if (nextOpen) {
				setSearchQuery("")
				setHoveredModelKey(null)
				setCollapsedProviders(buildInitialCollapsedProviders())
				refreshAllChatPickerModels(refreshHandlers)
				refreshDynamicProviderExtras()
			}
		},
		[buildInitialCollapsedProviders, refreshHandlers, refreshDynamicProviderExtras],
	)

	const handleSelectModel = useCallback(
		async (provider: ApiProvider, model: ChatModelEntry) => {
			const saved = getChatModelPreference(provider, model.id)
			const updates = buildChatModelSelectionUpdates(
				provider,
				model.id,
				model.modelInfo,
				mode,
				planActSeparateModelsSetting,
				saved
					? {
							reasoningEffort: saved.reasoningEffort,
							thinkingBudgetTokens: saved.thinkingBudgetTokens,
						}
					: undefined,
			)
			await handleFieldsChange(updates)
			setOpen(false)
		},
		[handleFieldsChange, mode, planActSeparateModelsSetting],
	)

	const handleThinkingToggle = useCallback(
		async (enabled: boolean) => {
			if (!hoveredTarget || !optionSupport) {
				return
			}
			const { provider, modelId } = hoveredTarget
			let preference
			if (optionSupport.showReasoningEffort) {
				preference = setChatModelPreference(provider, modelId, {
					reasoningEffort: enabled ? normalizePreferenceEffort(selectedEffort) : "none",
				})
			} else {
				preference = setChatModelPreference(provider, modelId, {
					thinkingBudgetTokens: enabled ? ANTHROPIC_MIN_THINKING_BUDGET : 0,
				})
			}
			bumpPreferences()
			await applyPreferenceToActiveConfig(provider, modelId, preference)
		},
		[hoveredTarget, optionSupport, selectedEffort, bumpPreferences, applyPreferenceToActiveConfig],
	)

	const handleEffortChange = useCallback(
		async (effort: OpenaiReasoningEffort) => {
			if (!hoveredTarget) {
				return
			}
			const preference = setChatModelPreference(hoveredTarget.provider, hoveredTarget.modelId, {
				reasoningEffort: effort,
			})
			bumpPreferences()
			await applyPreferenceToActiveConfig(hoveredTarget.provider, hoveredTarget.modelId, preference)
		},
		[hoveredTarget, bumpPreferences, applyPreferenceToActiveConfig],
	)

	const handleEditModels = useCallback(() => {
		setOpen(false)
		navigateToSettingsModelPicker({ targetSection: "api-config" })
	}, [navigateToSettingsModelPicker])

	const isModelSelected = useCallback(
		(provider: ApiProvider, modelId: string) => {
			const selected = getSelectedModelForProvider(provider, pickerContext)
			return selected.modelId === modelId
		},
		[pickerContext],
	)

	const showOptionsPanel = !!hoveredTarget

	return (
		<Popover onOpenChange={handleOpenChange} open={open}>
			<PopoverTrigger asChild>{children}</PopoverTrigger>
			<PopoverContent
				align="start"
				className={cn(
					"p-0 border border-(--vscode-editorGroup-border)",
					"bg-(--vscode-dropdown-background) text-(--vscode-foreground)",
					"shadow-md rounded-xs",
					showOptionsPanel ? "w-[min(528px,calc(100vw-24px))]" : "w-[min(380px,calc(100vw-24px))]",
				)}
				side="top"
				sideOffset={8}
				style={{ zIndex: CHAT_MODEL_PICKER_Z_INDEX }}>
				<div className="flex flex-col max-h-[min(440px,52vh)] overflow-hidden">
					<div className="shrink-0 flex items-start gap-2 px-3 py-2 border-b border-(--vscode-editorGroup-border)">
						<div className="flex-1 min-w-0">
							<div className="text-[11px] text-(--vscode-descriptionForeground) mb-1">Search models</div>
							<VSCodeTextField
								onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
								placeholder="Search models..."
								style={{ width: "100%" }}
								value={searchQuery}
							/>
						</div>
						<button
							aria-label="Close model picker"
							className="mt-5 p-1 rounded-xs text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) hover:bg-(--vscode-toolbar-hoverBackground)"
							onClick={() => setOpen(false)}
							type="button">
							<ChevronUp size={14} />
						</button>
					</div>

					<div
						className={cn(
							"flex-1 min-h-0 grid",
							showOptionsPanel ? "grid-cols-[minmax(0,380px)_148px]" : "grid-cols-1",
						)}>
						<div className="flex flex-col min-h-0 min-w-0 border-r border-(--vscode-editorGroup-border)">
							<div
								className="flex-1 min-h-0 overflow-y-scroll overflow-x-hidden py-1"
								style={{ scrollbarGutter: "stable" }}>
								{filteredGroups.length === 0 ? (
									<div className="px-3 py-4 text-xs text-(--vscode-descriptionForeground)">No models found</div>
								) : (
									filteredGroups.map((group) => {
										const collapsed = isProviderCollapsed(group.provider)
										return (
										<div className="border-t border-(--vscode-editorGroup-border) first:border-t-0" key={group.provider}>
											<button
												aria-expanded={!collapsed}
												className={cn(
													"w-full flex items-center gap-1.5 px-3 py-2 text-left",
													"text-xs font-semibold text-(--vscode-foreground)",
													"hover:bg-(--vscode-list-hoverBackground)",
												)}
												onClick={() => toggleProviderCollapsed(group.provider)}
												type="button">
												{collapsed ? (
													<ChevronRight className="shrink-0 opacity-80" size={13} strokeWidth={2.25} />
												) : (
													<ChevronDown className="shrink-0 opacity-80" size={13} strokeWidth={2.25} />
												)}
												<span className="truncate flex-1 min-w-0">
													{group.label}
													{group.subtitle ? (
														<span className="ml-1 font-normal text-(--vscode-descriptionForeground)">
															· {group.subtitle}
														</span>
													) : null}
												</span>
												<span className="shrink-0 text-[10px] font-medium text-(--vscode-descriptionForeground) tabular-nums">
													{group.models.length}
												</span>
											</button>
											{group.isLoading && group.models.length === 0 ? (
												<div className="pl-7 pr-3 py-1.5 text-[11px] text-(--vscode-descriptionForeground)">
													Loading models…
												</div>
											) : null}
											{!collapsed
												? group.models.map((model) => {
												const modelKey = getChatModelPreferenceKey(group.provider, model.id)
												const selected = isModelSelected(group.provider, model.id)
												const hovered = hoveredModelKey === modelKey
												const isActive =
													group.provider === selectedProvider && model.id === selectedModelId
												const thinkingStatus = getModelThinkingStatus(
													group.provider,
													model.id,
													model.modelInfo,
													isActive,
													modeFields.reasoningEffort,
													modeFields.thinkingBudgetTokens,
												)
												return (
													<button
														className={cn(
															"w-full flex items-center gap-2 pl-7 pr-3 py-1 text-left text-[11px]",
															hovered
																? "bg-(--vscode-list-activeSelectionBackground) text-(--vscode-list-activeSelectionForeground)"
																: selected
																	? "bg-(--vscode-list-inactiveSelectionBackground) text-(--vscode-foreground)"
																	: "text-(--vscode-descriptionForeground) hover:bg-(--vscode-list-hoverBackground) hover:text-(--vscode-foreground)",
														)}
														key={modelKey}
														onClick={() => void handleSelectModel(group.provider, model)}
														onMouseEnter={() => setHoveredModelKey(modelKey)}
														type="button">
														<span className="truncate flex-1 min-w-0" title={model.displayName}>
															{model.displayName}
														</span>
														<ModelThinkingStatusIcons status={thinkingStatus} />
														{selected ? (
															<CheckIcon className="shrink-0" size={14} strokeWidth={2.5} />
														) : null}
													</button>
												)
											})
												: null}
										</div>
									)})
								)}
							</div>

							<div className="shrink-0 border-t border-(--vscode-editorGroup-border) bg-(--vscode-dropdown-background)">
								<button
									className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-(--vscode-foreground) hover:bg-(--vscode-list-hoverBackground) disabled:opacity-45 disabled:cursor-not-allowed"
									disabled={!refreshHandler}
									onClick={() => refreshHandler?.()}
									type="button">
									<RefreshCw size={13} />
									Refresh models
								</button>
								<button
									className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-(--vscode-foreground) hover:bg-(--vscode-list-hoverBackground)"
									onClick={handleEditModels}
									type="button">
									<Pencil size={13} />
									Edit models in Settings…
								</button>
							</div>
						</div>

						{showOptionsPanel && hoveredTarget && optionSupport ? (
							<div className="min-h-0 overflow-y-auto px-2.5 py-2">
								<div className="text-[10px] font-semibold tracking-wide text-(--vscode-descriptionForeground) mb-2">
									Options
								</div>
								<div className="text-[11px] text-(--vscode-descriptionForeground) mb-3 line-clamp-2">
									{hoveredTarget.modelId}
								</div>

								{optionSupport.hint ? (
									<p className="text-[11px] leading-snug text-(--vscode-descriptionForeground) m-0">
										{optionSupport.hint}
									</p>
								) : null}

								{optionSupport.showReasoningEffort || optionSupport.showThinkingBudget ? (
									<div className="flex items-center justify-between gap-2 mb-3">
										<span className="text-xs text-(--vscode-foreground)">Thinking</span>
										<Switch checked={thinkingEnabled} onCheckedChange={(v) => void handleThinkingToggle(v)} size="lg" />
									</div>
								) : null}

								{optionSupport.showReasoningEffort ? (
									<div className="flex flex-col gap-0.5">
										<div className="text-[10px] font-semibold tracking-wide text-(--vscode-descriptionForeground) mb-1">
											Effort
										</div>
										{OPENAI_REASONING_EFFORT_OPTIONS.filter((effort) => effort !== "none").map((effort) => (
											<button
												className={cn(
													"w-full flex items-center justify-between px-1 py-1 text-xs rounded-xs",
													"text-(--vscode-foreground) hover:bg-(--vscode-list-hoverBackground)",
													!thinkingEnabled && "opacity-50 pointer-events-none",
												)}
												key={effort}
												onClick={() => thinkingEnabled && void handleEffortChange(effort)}
												type="button">
												<span>{EFFORT_LABELS[effort]}</span>
												{thinkingEnabled && selectedEffort === effort ? (
													<CheckIcon size={14} strokeWidth={2.5} />
												) : null}
											</button>
										))}
									</div>
								) : null}

								{!optionSupport.showReasoningEffort &&
								!optionSupport.showThinkingBudget &&
								!optionSupport.hint ? (
									<p className="text-[11px] text-(--vscode-descriptionForeground) m-0">
										No extra options for this model.
									</p>
								) : null}
							</div>
						) : null}
					</div>

					<div className="shrink-0 px-3 py-1.5 border-t border-(--vscode-editorGroup-border) bg-(--vscode-editor-background) text-[11px] text-(--vscode-descriptionForeground) truncate">
						<span className="opacity-70">Active · </span>
						{modelDisplayName}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	)
}

export default ChatModelPicker