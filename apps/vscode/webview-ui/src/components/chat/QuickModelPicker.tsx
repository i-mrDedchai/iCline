/**
 * QuickModelPicker — iCline inline provider+model popover for the chat header.
 *
 * Built on the v4.0.0 SDK hooks (useProviderListings + useProviderModels +
 * ModelsServiceClient.commitModelSelection) so it supports every provider
 * in the SDK catalog — including Sakana, Jan, and ZenMux.
 *
 * UX (aligned with pre-upstream dev.4 ChatModelPicker):
 *  - Click model button → popover opens; active provider expands once.
 *  - Click a provider header → toggle expand/collapse freely (no force-reopen).
 *  - Click a model → commitModelSelection switches provider+model and closes.
 *  - Reasoning effort chips for the active model when mode has effort set
 *    or the model id looks like a reasoning variant.
 *  - "Edit in Settings…" opens the full API config section.
 *
 * Set A: search providers + expanded models; active-first A–Z sort;
 * Free/Standard sections; empty states for no models / no search match.
 *
 * A.1: cross-provider model search reads warm `providerModelsByProvider` only
 * (no resolveProviderModels / RPC on keystroke). Unwarmed providers stay
 * invisible to model search until expand/Refresh.
 */

import { CommitModelSelectionRequest } from "@shared/proto/cline/models"
import { isOpenaiReasoningEffort, OPENAI_REASONING_EFFORT_OPTIONS, type OpenaiReasoningEffort } from "@shared/storage/types"
import { Check, ChevronDown, Pencil, RefreshCw, Search } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { getChatModelPreference, normalizePreferenceEffort, setChatModelPreference } from "@/components/chat/chatModelPreferences"
import {
	filterModelsByQuery,
	type ModelEntry,
	type ModelInfoLike,
	modelsMatchQuery,
	partitionFreeStandard,
	pickAutoExpandProvider,
} from "@/components/chat/quickModelPickerList"
import { getModeSpecificFields } from "@/components/settings/utils/providerUtils"
import { useApiConfigurationHandlers } from "@/components/settings/utils/useApiConfigurationHandlers"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useProviderListings } from "@/hooks/useProviderListings"
import { useProviderModels } from "@/hooks/useProviderModels"
import { cn } from "@/lib/utils"
import { ModelsServiceClient } from "@/services/grpc-client"

interface QuickModelPickerProps {
	/** Display string shown in the chat header button. */
	modelDisplayName: string
	/** Whether the picker should be disabled (e.g. task running). */
	disabled?: boolean
}

const EFFORT_LABELS: Record<OpenaiReasoningEffort, string> = {
	none: "Off",
	low: "Low",
	medium: "Med",
	high: "High",
	xhigh: "Max",
}

/** Efforts shown as chips (exclude pure "none" — Off is a separate clear action). */
const EFFORT_CHIPS = OPENAI_REASONING_EFFORT_OPTIONS.filter((e) => e !== "none") as OpenaiReasoningEffort[]

/**
 * Resolve the mode-specific model id for a provider. Generic plan/actModeApiModelId
 * is wrong for providers that store ids in dedicated fields (jan, zenmux, etc.).
 */
function getSelectedModelIdForProvider(
	providerId: string,
	apiConfiguration: ReturnType<typeof useExtensionState>["apiConfiguration"],
	mode: "plan" | "act",
): string | undefined {
	if (!apiConfiguration) {
		return undefined
	}
	const fields = getModeSpecificFields(apiConfiguration, mode)
	switch (providerId) {
		case "openrouter":
			return fields.openRouterModelId || fields.apiModelId
		case "openai":
			return fields.openAiModelId || fields.apiModelId
		case "ollama":
			return fields.ollamaModelId
		case "lmstudio":
			return fields.lmStudioModelId
		case "litellm":
			return fields.liteLlmModelId
		case "requesty":
			return fields.requestyModelId
		case "together":
			return fields.togetherModelId
		case "fireworks":
			return fields.fireworksModelId
		case "groq":
			return fields.groqModelId
		case "baseten":
			return fields.basetenModelId
		case "huggingface":
			return fields.huggingFaceModelId
		case "vercel-ai-gateway":
			return fields.vercelAiGatewayModelId
		case "zenmux":
			return fields.zenmuxModelId || fields.apiModelId
		case "sakana":
			return fields.sakanaModelId || fields.apiModelId
		case "jan":
			return fields.janModelId || fields.apiModelId
		case "cline":
			return fields.clineModelId || fields.apiModelId
		case "cline-pass":
			return fields.clinePassModelId || fields.apiModelId
		default:
			return fields.apiModelId
	}
}

function modelLikelySupportsEffort(
	modelId: string,
	modelInfo?: { supportsReasoning?: boolean; thinkingConfig?: unknown },
): boolean {
	if (modelInfo?.supportsReasoning || modelInfo?.thinkingConfig) {
		return true
	}
	const id = modelId.toLowerCase()
	return (
		id.includes("reason") ||
		id.includes("thinking") ||
		id.includes("o1") ||
		id.includes("o3") ||
		id.includes("o4") ||
		id.includes("opus") ||
		id.includes("sonnet-4") ||
		id.includes("grok-3-mini") ||
		id.includes("composer")
	)
}

/**
 * Fetch models for the expanded provider only. Hook must be called unconditionally
 * so we pass a placeholder id when nothing is expanded.
 */
function useProviderModelsCache(providerId: string | null) {
	const { models, defaultModelId, isLoading, refresh } = useProviderModels(providerId ?? "__none__")
	return { models, defaultModelId, isLoading, refresh }
}

function ModelSectionHeader({ label }: { label: string }) {
	return (
		<div className="px-7 pt-1.5 pb-0.5 text-[10px] uppercase tracking-wide text-(--vscode-descriptionForeground) opacity-80">
			{label}
		</div>
	)
}

function ModelRow({
	modelId,
	modelInfo,
	isCurrentModel,
	providerId,
	onSelect,
}: {
	modelId: string
	modelInfo: ModelInfoLike
	isCurrentModel: boolean
	providerId: string
	onSelect: (providerId: string, modelId: string) => void
}) {
	return (
		<button
			className={cn(
				"w-full flex items-center justify-between pl-7 pr-3 py-1 text-[11px] text-left",
				"hover:bg-(--vscode-list-hoverBackground) transition-colors",
				isCurrentModel ? "text-(--vscode-foreground) font-medium" : "text-(--vscode-descriptionForeground)",
			)}
			onClick={() => onSelect(providerId, modelId)}
			type="button">
			<span className="truncate flex-1">{modelInfo?.name || modelId}</span>
			{isCurrentModel && <Check className="text-(--vscode-terminal-ansiGreen) shrink-0 ml-2" size={12} />}
		</button>
	)
}

export function QuickModelPicker({ modelDisplayName, disabled }: QuickModelPickerProps) {
	const { providers, isLoading: providersLoading } = useProviderListings()
	const { mode, apiConfiguration, providerModelsByProvider } = useExtensionState()
	const { handleModeFieldChange } = useApiConfigurationHandlers()
	const [open, setOpen] = useState(false)
	/** null = nothing expanded; user may collapse the active provider freely. */
	const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
	const [search, setSearch] = useState("")
	const [effortBump, setEffortBump] = useState(0)

	const currentProvider =
		(mode === "plan" ? apiConfiguration?.planModeApiProvider : apiConfiguration?.actModeApiProvider) || "anthropic"

	const currentModelId = getSelectedModelIdForProvider(currentProvider, apiConfiguration, mode)

	const modeFields = getModeSpecificFields(apiConfiguration, mode)
	const activeEffort: OpenaiReasoningEffort | undefined = isOpenaiReasoningEffort(modeFields.reasoningEffort)
		? modeFields.reasoningEffort
		: undefined

	const { models, isLoading: modelsLoading, refresh } = useProviderModelsCache(expandedProvider)

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			setOpen(nextOpen)
			if (nextOpen) {
				// Seed expand once on open (dev.4: only active provider open).
				// Do NOT re-seed when user collapses — that was the force-expand bug.
				setExpandedProvider(currentProvider)
				setSearch("")
			} else {
				setSearch("")
			}
		},
		[currentProvider],
	)

	const handleToggleProvider = useCallback((providerId: string) => {
		setExpandedProvider((prev) => (prev === providerId ? null : providerId))
	}, [])

	const handleSelectModel = useCallback(
		async (providerId: string, modelId: string) => {
			try {
				const saved = getChatModelPreference(providerId, modelId)
				await ModelsServiceClient.commitModelSelection(
					CommitModelSelectionRequest.create({
						providerId,
						mode,
						modelId,
					}),
				)
				// Close before applying the effort preference: a thrown effort change must
				// not leave the popover stuck open over an already-committed selection.
				setOpen(false)
				// Apply saved reasoning effort preference if any
				if (saved?.reasoningEffort !== undefined) {
					await handleModeFieldChange(
						{ plan: "planModeReasoningEffort", act: "actModeReasoningEffort" },
						saved.reasoningEffort,
						mode,
					)
				}
			} catch (err) {
				console.error("QuickModelPicker: failed to commit model selection:", err)
			}
		},
		[mode, handleModeFieldChange],
	)

	const handleRefreshModels = useCallback(() => {
		if (expandedProvider) {
			void refresh()
		}
	}, [expandedProvider, refresh])

	const handleEffortChange = useCallback(
		async (effort: OpenaiReasoningEffort) => {
			if (!currentProvider || !currentModelId) {
				return
			}
			setChatModelPreference(currentProvider, currentModelId, { reasoningEffort: effort })
			setEffortBump((n) => n + 1)
			try {
				await handleModeFieldChange(
					{ plan: "planModeReasoningEffort", act: "actModeReasoningEffort" },
					effort === "none" ? "" : effort,
					mode,
				)
			} catch (err) {
				console.error("QuickModelPicker: failed to set reasoning effort:", err)
			}
		},
		[currentProvider, currentModelId, handleModeFieldChange, mode],
	)

	const searchTrimmed = search.trim()
	const searchLower = searchTrimmed.toLowerCase()

	const warmModelsFor = useCallback(
		(providerId: string | null | undefined) => {
			if (!providerId) {
				return {}
			}
			return providerModelsByProvider?.[providerId]?.models ?? {}
		},
		[providerModelsByProvider],
	)

	/** Prefer hook models when loaded; else warm map so search hits are clickable immediately. */
	const displayModels = useMemo(() => {
		if (!expandedProvider) {
			return {}
		}
		if (Object.keys(models).length > 0) {
			return models
		}
		return warmModelsFor(expandedProvider)
	}, [expandedProvider, models, warmModelsFor])

	const filteredModelEntries = useMemo(() => {
		return filterModelsByQuery(displayModels, searchTrimmed)
	}, [displayModels, searchTrimmed])

	const { free: freeModels, standard: standardModels } = useMemo(() => {
		const activeId = expandedProvider === currentProvider ? currentModelId : undefined
		return partitionFreeStandard(filteredModelEntries, activeId)
	}, [filteredModelEntries, expandedProvider, currentProvider, currentModelId])

	const providerNameMatches = useCallback(
		(p: { id: string; name?: string }) => {
			if (!searchLower) {
				return true
			}
			return p.name?.toLowerCase().includes(searchLower) || p.id.toLowerCase().includes(searchLower)
		},
		[searchLower],
	)

	const filteredProviders = useMemo(() => {
		const sorted = [...providers].sort((a, b) =>
			(a.name || a.id).localeCompare(b.name || b.id, undefined, { sensitivity: "base" }),
		)
		if (!searchTrimmed) {
			return sorted
		}
		return sorted.filter((p) => {
			if (providerNameMatches(p)) {
				return true
			}
			// A.1: include providers with warm model matches (no RPC on keystroke).
			if (modelsMatchQuery(warmModelsFor(p.id), searchTrimmed)) {
				return true
			}
			// Keep expanded provider visible when displayed models match the query.
			if (expandedProvider === p.id && filteredModelEntries.length > 0) {
				return true
			}
			return false
		})
	}, [providers, searchTrimmed, providerNameMatches, warmModelsFor, expandedProvider, filteredModelEntries])

	// A.1 auto-expand: if search non-empty and expanded has zero model matches
	// (hook ∪ warm), expand active-if-match else first A–Z warm model match else name match.
	useEffect(() => {
		if (!searchTrimmed) {
			return
		}
		const expandedHasModelMatch =
			!!expandedProvider &&
			(modelsMatchQuery(models, searchTrimmed) || modelsMatchQuery(warmModelsFor(expandedProvider), searchTrimmed))
		if (expandedHasModelMatch) {
			return
		}
		const next = pickAutoExpandProvider(providers, providerModelsByProvider, searchTrimmed, currentProvider)
		if (next && next !== expandedProvider) {
			setExpandedProvider(next)
		}
	}, [searchTrimmed, expandedProvider, models, warmModelsFor, providers, providerModelsByProvider, currentProvider])

	const showEffortBar = useMemo(() => {
		void effortBump
		if (!currentModelId) {
			return false
		}
		// Show if effort already set, preference exists, or model looks reasoning-capable.
		const pref = getChatModelPreference(currentProvider, currentModelId)
		if (activeEffort && activeEffort !== "none") {
			return true
		}
		if (pref?.reasoningEffort && pref.reasoningEffort !== "none") {
			return true
		}
		const info = expandedProvider === currentProvider ? models[currentModelId] : undefined
		return modelLikelySupportsEffort(currentModelId, info as { supportsReasoning?: boolean; thinkingConfig?: unknown })
	}, [currentModelId, currentProvider, activeEffort, expandedProvider, models, effortBump])

	const selectedEffortDisplay = normalizePreferenceEffort(activeEffort)

	const renderModelSections = (providerId: string, isCurrent: boolean) => {
		const renderRows = (entries: ModelEntry[]) =>
			entries.map(([modelId, modelInfo]) => (
				<ModelRow
					isCurrentModel={isCurrent && currentModelId === modelId}
					key={modelId}
					modelId={modelId}
					modelInfo={modelInfo}
					onSelect={(pid, mid) => void handleSelectModel(pid, mid)}
					providerId={providerId}
				/>
			))

		return (
			<>
				{freeModels.length > 0 && (
					<>
						<ModelSectionHeader label="Free" />
						{renderRows(freeModels)}
					</>
				)}
				{standardModels.length > 0 && (
					<>
						<ModelSectionHeader label="Standard" />
						{renderRows(standardModels)}
					</>
				)}
			</>
		)
	}

	return (
		<Popover onOpenChange={handleOpenChange} open={open}>
			<PopoverTrigger asChild>
				<button
					className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-sm text-(--vscode-descriptionForeground) hover:bg-(--vscode-list-hoverBackground) hover:text-(--vscode-foreground) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					disabled={disabled}
					title="Switch model"
					type="button">
					<span className="truncate max-w-[180px]">{modelDisplayName}</span>
					<ChevronDown className="shrink-0" size={12} />
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-[440px] max-w-[90vw] p-0 gap-0"
				onOpenAutoFocus={(e) => e.preventDefault()}
				side="top">
				<div className="flex flex-col max-h-[420px]">
					{/* Search bar */}
					<div className="flex items-center gap-2 px-3 py-2 border-b border-(--vscode-editorGroup-border)">
						<Search className="text-(--vscode-descriptionForeground) shrink-0" size={13} />
						<input
							autoFocus
							className="flex-1 bg-transparent border-none outline-none text-xs text-(--vscode-foreground) placeholder:text-(--vscode-descriptionForeground)"
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search providers or models…"
							type="text"
							value={search}
						/>
					</div>

					{/* Provider + model list */}
					<div className="flex-1 overflow-y-auto min-h-0">
						{providersLoading ? (
							<div className="px-3 py-4 text-xs text-(--vscode-descriptionForeground) text-center">
								Loading providers…
							</div>
						) : filteredProviders.length === 0 ? (
							<div className="px-3 py-4 text-xs text-(--vscode-descriptionForeground) text-center">
								No providers found.
							</div>
						) : (
							filteredProviders.map((provider) => {
								const isExpanded = expandedProvider === provider.id
								const isCurrent = currentProvider === provider.id
								const displayEmpty = Object.keys(displayModels).length === 0
								return (
									<div
										className="border-b border-(--vscode-editorGroup-border)/40 last:border-b-0"
										key={provider.id}>
										<button
											aria-expanded={isExpanded}
											className={cn(
												"w-full flex items-center justify-between px-3 py-1.5 text-xs text-left",
												"hover:bg-(--vscode-list-hoverBackground) transition-colors",
												isCurrent && "font-semibold text-(--vscode-foreground)",
												!isCurrent && "text-(--vscode-foreground)",
											)}
											onClick={() => handleToggleProvider(provider.id)}
											type="button">
											<span className="truncate flex-1">{provider.name || provider.id}</span>
											{isCurrent && (
												<Check className="text-(--vscode-terminal-ansiGreen) shrink-0 ml-2" size={13} />
											)}
											<ChevronDown
												className={cn(
													"text-(--vscode-descriptionForeground) shrink-0 ml-1 transition-transform",
													isExpanded && "rotate-180",
												)}
												size={13}
											/>
										</button>
										{isExpanded && (
											<div className="pb-1">
												{filteredModelEntries.length > 0 ? (
													renderModelSections(provider.id, isCurrent)
												) : modelsLoading && displayEmpty ? (
													<div className="px-3 py-1.5 text-[11px] text-(--vscode-descriptionForeground)">
														Loading models…
													</div>
												) : displayEmpty ? (
													<div className="px-3 py-1.5 text-[11px] text-(--vscode-descriptionForeground) italic">
														No models available. Try Refresh.
													</div>
												) : (
													<div className="px-3 py-1.5 text-[11px] text-(--vscode-descriptionForeground) italic">
														No models match.
													</div>
												)}
											</div>
										)}
									</div>
								)
							})
						)}
					</div>

					{/* Reasoning effort (active model) — dev.4 parity */}
					{showEffortBar && currentModelId && (
						<div className="shrink-0 px-3 py-2 border-t border-(--vscode-editorGroup-border) bg-(--vscode-sideBar-background)">
							<div className="flex items-center justify-between gap-2 mb-1.5">
								<span className="text-[11px] text-(--vscode-descriptionForeground)">Reasoning effort</span>
								<span className="text-[10px] text-(--vscode-descriptionForeground) truncate max-w-[200px]">
									{currentModelId}
								</span>
							</div>
							<div className="flex flex-wrap gap-1">
								{EFFORT_CHIPS.map((effort) => {
									const selected = selectedEffortDisplay === effort && activeEffort !== "none" && !!activeEffort
									return (
										<button
											className={cn(
												"px-2 py-0.5 rounded text-[11px] border transition-colors",
												selected
													? "border-(--vscode-focusBorder) bg-(--vscode-button-background) text-(--vscode-button-foreground)"
													: "border-(--vscode-editorGroup-border) text-(--vscode-descriptionForeground) hover:bg-(--vscode-list-hoverBackground)",
											)}
											key={effort}
											onClick={() => void handleEffortChange(effort)}
											type="button">
											{EFFORT_LABELS[effort]}
										</button>
									)
								})}
								<button
									className={cn(
										"px-2 py-0.5 rounded text-[11px] border transition-colors",
										!activeEffort || activeEffort === "none"
											? "border-(--vscode-focusBorder) bg-(--vscode-button-secondaryBackground) text-(--vscode-button-secondaryForeground)"
											: "border-(--vscode-editorGroup-border) text-(--vscode-descriptionForeground) hover:bg-(--vscode-list-hoverBackground)",
									)}
									onClick={() => void handleEffortChange("none")}
									type="button">
									{EFFORT_LABELS.none}
								</button>
							</div>
						</div>
					)}

					{/* Footer */}
					<div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-t border-(--vscode-editorGroup-border) bg-(--vscode-editor-background) text-[11px]">
						<div className="flex items-center gap-3">
							<button
								className="flex items-center gap-1 text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
								disabled={!expandedProvider || modelsLoading}
								onClick={handleRefreshModels}
								type="button">
								<RefreshCw className={modelsLoading ? "animate-spin" : ""} size={11} />
								Refresh
							</button>
							<button
								className="flex items-center gap-1 text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) transition-colors"
								onClick={() => {
									setOpen(false)
									window.dispatchEvent(new CustomEvent("icline:navigate-to-settings-model-picker"))
								}}
								type="button">
								<Pencil size={11} />
								Edit in Settings…
							</button>
						</div>
						<span className="text-(--vscode-descriptionForeground) truncate">Active · {modelDisplayName}</span>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	)
}
