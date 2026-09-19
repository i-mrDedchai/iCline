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
 * Set A: search providers + expanded models; A–Z sort (active stays in place);
 * Free/Standard sections; empty states for no models / no search match.
 *
 * A.1: cross-provider model search reads warm `providerModelsByProvider` only
 * (no resolveProviderModels / RPC on keystroke). Unwarmed providers stay
 * invisible to model search until expand/Refresh.
 */

import { CLINE_RECOMMENDED_MODELS_FALLBACK } from "@shared/cline/recommended-models"
import { toLegacyApiProvider } from "@shared/model-catalog/provider-helpers"
import { CommitModelSelectionRequest } from "@shared/proto/cline/models"
import { isOpenaiReasoningEffort, OPENAI_REASONING_EFFORT_OPTIONS, type OpenaiReasoningEffort } from "@shared/storage/types"
import { Check, ChevronDown, Pencil, RefreshCw, Search } from "lucide-react"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { getChatModelPreference, normalizePreferenceEffort, setChatModelPreference } from "@/components/chat/chatModelPreferences"
import {
	ACTIVE_MODEL_ATTR,
	filterModelsByQuery,
	type ModelEntry,
	type ModelInfoLike,
	modelsMatchQuery,
	partitionFreeStandard,
	pickAutoExpandProvider,
	queryActivePickerScrollTarget,
} from "@/components/chat/quickModelPickerList"
import {
	filterClineSettingsModelIds,
	partitionClinePickerSections,
	useClineSettingsModelList,
} from "@/components/settings/useClineSettingsModelList"
import { getModeSpecificFields } from "@/components/settings/utils/providerUtils"
import { useApiConfigurationHandlers } from "@/components/settings/utils/useApiConfigurationHandlers"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useNormalizedApiConfiguration } from "@/hooks/useNormalizedApiConfiguration"
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
 * Single source of truth for the active provider+model lives in
 * useNormalizedApiConfiguration.getActiveProviderAndModelId (gRPC-resolved).
 * The picker used to keep a duplicate reader here that disagreed on
 * jan/sakana/zenmux vs generic apiModelId fallbacks — deleted.
 */

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
	badge,
}: {
	modelId: string
	modelInfo: ModelInfoLike
	isCurrentModel: boolean
	providerId: string
	onSelect: (providerId: string, modelId: string) => void
	badge?: string
}) {
	return (
		<button
			className={cn(
				"w-full flex items-center justify-between pl-7 pr-3 py-1 text-[11px] text-left",
				"hover:bg-(--vscode-list-hoverBackground) transition-colors",
				isCurrentModel ? "text-(--vscode-foreground) font-medium" : "text-(--vscode-descriptionForeground)",
			)}
			onClick={(event) => {
				// Keyboard activation (Enter/Space) does not fire pointerdown with a button.
				if (event.detail === 0) {
					onSelect(providerId, modelId)
				}
				event.preventDefault()
			}}
			onPointerDown={(event) => {
				if (event.button !== 0) {
					return
				}
				// Commit on pointerdown so Radix/VS Code webview cannot unmount the
				// row (dismiss-as-outside) before the click event fires.
				// stopPropagation keeps the gesture from being classified as outside.
				event.preventDefault()
				event.stopPropagation()
				onSelect(providerId, modelId)
			}}
			{...(isCurrentModel ? { "data-icline-current-model": "" } : {})}
			type="button">
			<span className="truncate flex-1">{modelInfo?.name || modelId}</span>
			{badge ? (
				<span className="shrink-0 ml-2 text-[10px] uppercase tracking-wide text-(--vscode-textLink-foreground)">
					{badge}
				</span>
			) : null}
			{isCurrentModel && <Check className="text-(--vscode-terminal-ansiGreen) shrink-0 ml-2" size={12} />}
		</button>
	)
}

export function QuickModelPicker({ modelDisplayName, disabled }: QuickModelPickerProps) {
	const { providers, isLoading: providersLoading } = useProviderListings()
	const { mode, apiConfiguration, providerModelsByProvider, planActSeparateModelsSetting, applyApiConfigurationPatch } =
		useExtensionState()
	const { selectedProvider: currentProvider, selectedModelId: currentModelId } = useNormalizedApiConfiguration(mode)
	const {
		recommended: clineRecommendedFeatured,
		free: clineFreeFeatured,
		freeAllowlist: clineFreeAllowlist,
		refresh: refreshClineFeatured,
	} = useClineSettingsModelList()
	const { handleModeFieldChange } = useApiConfigurationHandlers()
	const [open, setOpen] = useState(false)
	/** null = nothing expanded; user may collapse the active provider freely. */
	const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
	const [search, setSearch] = useState("")
	const [effortBump, setEffortBump] = useState(0)
	const [commitError, setCommitError] = useState<string | null>(null)
	/** Guards pointerdown+click double-commit (pointerdown commits, keyboard click re-commits). */
	const committingRef = useRef(false)
	const listRef = useRef<HTMLDivElement>(null)
	const userScrolledThisOpenRef = useRef(false)
	const programmaticScrollRef = useRef(false)

	// NOTE: currentProvider/currentModelId come from useNormalizedApiConfiguration

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
				setCommitError(null)
				userScrolledThisOpenRef.current = false
				void refreshClineFeatured()
			} else {
				setSearch("")
			}
		},
		[currentProvider, refreshClineFeatured],
	)

	const handleToggleProvider = useCallback(
		(providerId: string) => {
			setExpandedProvider((prev) => {
				const next = prev === providerId ? null : providerId
				if (next === "cline") {
					void refreshClineFeatured()
				}
				return next
			})
		},
		[refreshClineFeatured],
	)

	const handleSelectModel = useCallback(
		async (providerId: string, modelId: string) => {
			if (committingRef.current) {
				return
			}
			committingRef.current = true
			setCommitError(null)
			try {
				const saved = getChatModelPreference(providerId, modelId)
				// Apply the saved reasoning effort BEFORE the commit, not after:
				// the effort write sends the full api configuration, and doing it
				// post-commit raced the incoming state push with a pre-click
				// snapshot — wholesale-reverting the fresh selection (fix.9-class
				// stale write-back; the trigger — saved reasoning settings — is
				// now common via the shared providers.json). Best-effort: a thrown
				// effort change must not block the selection itself.
				if (saved?.reasoningEffort !== undefined) {
					try {
						await handleModeFieldChange(
							{ plan: "planModeReasoningEffort", act: "actModeReasoningEffort" },
							saved.reasoningEffort,
							mode,
						)
					} catch (effortError) {
						console.error("QuickModelPicker: failed to apply saved reasoning effort:", effortError)
					}
				}
				await ModelsServiceClient.commitModelSelection(
					CommitModelSelectionRequest.create({
						providerId,
						mode,
						modelId,
					}),
				)
				// Optimistic provider echo: reflect the committed selection
				// immediately instead of waiting for the state push (the display
				// freeze class). The next push carries the authoritative copy.
				const legacyProviderId = toLegacyApiProvider(providerId)
				const providerField = mode === "plan" ? "planModeApiProvider" : "actModeApiProvider"
				applyApiConfigurationPatch(
					planActSeparateModelsSetting
						? { [providerField]: legacyProviderId }
						: { planModeApiProvider: legacyProviderId, actModeApiProvider: legacyProviderId },
				)
				setOpen(false)
			} catch (err) {
				console.error("QuickModelPicker: failed to commit model selection:", err)
				setCommitError(err instanceof Error ? err.message : "Could not activate this model.")
			} finally {
				committingRef.current = false
			}
		},
		[mode, handleModeFieldChange],
	)

	const handleRefreshModels = useCallback(() => {
		if (expandedProvider) {
			void refresh()
		}
		void refreshClineFeatured()
	}, [expandedProvider, refresh, refreshClineFeatured])

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

	const applyClineSettingsFilter = useCallback(
		(providerId: string | null | undefined, modelsById: Record<string, ModelInfoLike | undefined>) => {
			if (providerId !== "cline") {
				return modelsById
			}
			const allowed = new Set(filterClineSettingsModelIds(Object.keys(modelsById), clineFreeAllowlist))
			return Object.fromEntries(Object.entries(modelsById).filter(([id]) => allowed.has(id)))
		},
		[clineFreeAllowlist],
	)

	const warmModelsFor = useCallback(
		(providerId: string | null | undefined) => {
			if (!providerId) {
				return {}
			}
			const warm = providerModelsByProvider?.[providerId]?.models ?? {}
			return applyClineSettingsFilter(providerId, warm)
		},
		[applyClineSettingsFilter, providerModelsByProvider],
	)

	const clineFeaturedRecommended =
		clineRecommendedFeatured.length > 0 ? clineRecommendedFeatured : CLINE_RECOMMENDED_MODELS_FALLBACK.recommended
	const clineFeaturedFree = clineFreeFeatured.length > 0 ? clineFreeFeatured : CLINE_RECOMMENDED_MODELS_FALLBACK.free

	/** Prefer hook models when loaded; else warm map so search hits are clickable immediately. */
	const displayModels = useMemo(() => {
		if (!expandedProvider) {
			return {}
		}
		const raw = Object.keys(models).length > 0 ? models : warmModelsFor(expandedProvider)
		const filtered = applyClineSettingsFilter(expandedProvider, raw)
		if (expandedProvider !== "cline") {
			return filtered
		}
		// Settings featured cards can list ids that are not in the SDK catalog yet.
		const withFeatured = { ...filtered }
		for (const model of [...clineFeaturedFree, ...clineFeaturedRecommended]) {
			if (model.id && !withFeatured[model.id]) {
				withFeatured[model.id] = { name: model.name || model.id }
			}
		}
		return withFeatured
	}, [applyClineSettingsFilter, clineFeaturedFree, clineFeaturedRecommended, expandedProvider, models, warmModelsFor])

	const filteredModelEntries = useMemo(() => {
		return filterModelsByQuery(displayModels, searchTrimmed)
	}, [displayModels, searchTrimmed])

	const clineSections = useMemo(() => {
		if (expandedProvider !== "cline") {
			return null
		}
		return partitionClinePickerSections(filteredModelEntries, clineFeaturedRecommended, clineFeaturedFree)
	}, [clineFeaturedFree, clineFeaturedRecommended, expandedProvider, filteredModelEntries])

	const { free: freeModels, standard: standardModels } = useMemo(() => {
		if (clineSections) {
			return { free: [] as ModelEntry[], standard: [] as ModelEntry[] }
		}
		return partitionFreeStandard(filteredModelEntries)
	}, [clineSections, filteredModelEntries])

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

	// On open (and when the active model's rows finish loading), bring the
	// current provider/model into the scroll viewport. Do not re-pin if the
	// user has already scrolled this open, and do not jump while searching.
	useLayoutEffect(() => {
		if (!open || searchTrimmed || userScrolledThisOpenRef.current) {
			return
		}
		const frame = window.requestAnimationFrame(() => {
			const list = listRef.current
			if (!list) {
				return
			}
			const target = queryActivePickerScrollTarget(list, currentProvider)
			if (!target) {
				return
			}
			const block: ScrollLogicalPosition = target.hasAttribute(ACTIVE_MODEL_ATTR) ? "center" : "start"
			programmaticScrollRef.current = true
			target.scrollIntoView({ block, inline: "nearest" })
			window.requestAnimationFrame(() => {
				programmaticScrollRef.current = false
			})
		})
		return () => window.cancelAnimationFrame(frame)
		// biome-ignore lint/correctness/useExhaustiveDependencies: re-pinning intentionally follows the loader/entry counters, not every referenced value
	}, [open, searchTrimmed, currentProvider, currentModelId, expandedProvider, modelsLoading, filteredModelEntries.length])

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
		const renderRows = (entries: Array<{ id: string; info: ModelInfoLike; badge?: string } | ModelEntry>) =>
			entries.map((entry) => {
				const modelId = Array.isArray(entry) ? entry[0] : entry.id
				const modelInfo = Array.isArray(entry) ? entry[1] : entry.info
				const badge = Array.isArray(entry) ? undefined : entry.badge
				return (
					<ModelRow
						badge={badge}
						isCurrentModel={isCurrent && currentModelId === modelId}
						key={modelId}
						modelId={modelId}
						modelInfo={modelInfo}
						onSelect={(pid, mid) => void handleSelectModel(pid, mid)}
						providerId={providerId}
					/>
				)
			})

		if (clineSections) {
			return (
				<>
					{clineSections.recommended.length > 0 && (
						<>
							<ModelSectionHeader label="Recommended" />
							{renderRows(clineSections.recommended)}
						</>
					)}
					{clineSections.free.length > 0 && (
						<>
							<ModelSectionHeader label="Free" />
							{renderRows(clineSections.free)}
						</>
					)}
					{clineSections.standard.length > 0 && (
						<>
							<ModelSectionHeader label="Standard" />
							{renderRows(clineSections.standard)}
						</>
					)}
				</>
			)
		}

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
				data-icline-quick-picker=""
				disablePortal
				onInteractOutside={(e) => {
					// Belt-and-braces with disablePortal: a pointerdown that starts
					// inside the picker must never dismiss it. True outside clicks
					// still close via the default Radix behavior.
					if ((e.target as HTMLElement | null)?.closest?.("[data-icline-quick-picker]")) {
						e.preventDefault()
					}
				}}
				onOpenAutoFocus={(e) => e.preventDefault()}
				onPointerDownOutside={(e) => {
					if ((e.target as HTMLElement | null)?.closest?.("[data-icline-quick-picker]")) {
						e.preventDefault()
					}
				}}
				side="top">
				<div className="flex flex-col max-h-[420px]">
					{/* Search bar */}
					<div className="flex items-center gap-2 px-3 py-2 border-b border-(--vscode-editorGroup-border)">
						<Search className="text-(--vscode-descriptionForeground) shrink-0" size={13} />
						{/* biome-ignore lint/a11y/noAutofocus: focusing the search field on popover open is the intended picker UX */}
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
					<div
						className="flex-1 overflow-y-auto min-h-0"
						onScroll={() => {
							if (open && !programmaticScrollRef.current) {
								userScrolledThisOpenRef.current = true
							}
						}}
						ref={listRef}>
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
										data-icline-provider={provider.id}
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

					{commitError && (
						<div
							className="shrink-0 px-3 py-1.5 text-[11px] text-(--vscode-errorForeground) border-t border-(--vscode-editorGroup-border)"
							role="alert">
							{commitError}
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
