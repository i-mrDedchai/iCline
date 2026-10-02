/**
 * QuickModelPicker — iCline inline provider+model popover for the chat header.
 *
 * Built on the v4.0.0 SDK hooks (useProviderListings + useProviderModels +
 * ModelsServiceClient.commitModelSelection) so it supports every provider
 * in the SDK catalog — including Sakana, Jan, and ZenMux.
 *
 * Layout follows the locked redesign (`.icline/plans/quick-picker-redesign/PLAN.md`,
 * mock v11) and the binding `docs/icline/ui-guidelines.md`:
 *  - popover 320px wide; hover Options panel 232px to its right (top-aligned to the
 *    hovered row, shifted up only as far as it must be to stay inside the picker,
 *    max-height 320px with its own scrollbar);
 *  - models grouped Free then Standard, A–Z inside each group (the active model keeps
 *    its A–Z slot — pinning it to the top was explicitly withdrawn in fix.21);
 *  - capability icons with the guideline's accent colors, each with a balloon tooltip,
 *    rendered only for capabilities backed by real model metadata;
 *  - footer is icon-only with balloon tooltips; "Active · <model>" is green;
 *  - every string goes through the picker i18n map — native `title` is banned here.
 *
 * UX carried over from dev.4: click a provider header to expand/collapse freely (no
 * force-reopen), click a model to commit and close, optimistic provider echo after a
 * successful commit, cross-provider search over warm catalogs only (no RPC per
 * keystroke), and re-pinning the active row into view on open.
 *
 * Two UXUI rounds of 2026-09-20 are folded in here:
 *  - both menus (the model list and the composer's Options popover) follow the shared
 *    menu conventions of `@/icline/menuPopover`: the hand cursor over the whole menu
 *    rather than only its rows, the text caret in the search field, and the LEFT edge of
 *    the menu on the left edge of the button that opened it while the chat pane can hold
 *    it there. The right-edge anchoring is the fallback for a pane too squeezed for that
 *    — the 236px Options panel used to always open that way, which slid it far to the
 *    left of the icon that was clicked.
 */

import { ANTHROPIC_MIN_THINKING_BUDGET } from "@shared/api"
import { CLINE_RECOMMENDED_MODELS_FALLBACK } from "@shared/cline/recommended-models"
import { toLegacyApiProvider } from "@shared/model-catalog/provider-helpers"
import { CommitModelSelectionRequest } from "@shared/proto/cline/models"
import { Building2, Check, ChevronDown, Pencil, RefreshCw, Search } from "lucide-react"
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
	type ChatModelPreference,
	getChatModelPreference,
	getChatModelPreferenceKey,
	setChatModelPreference,
} from "@/components/chat/chatModelPreferences"
import { ModelOptionsPanel } from "@/components/chat/ModelOptionsPanel"
import { ModelStatusIcons } from "@/components/chat/ModelStatusIcons"
import {
	ACTIVE_MODEL_ATTR,
	computeOptionsPanelTop,
	filterModelsByQuery,
	type ModelEntry,
	type ModelInfoLike,
	modelsMatchQuery,
	OPTIONS_PANEL_GAP_PX,
	OPTIONS_PANEL_MAX_HEIGHT_PX,
	OPTIONS_PANEL_MIN_TOP_PX,
	OPTIONS_PANEL_WIDTH_PX,
	partitionFreeStandard,
	pickAutoExpandProvider,
	queryActivePickerScrollTarget,
} from "@/components/chat/quickModelPickerList"
import { OrgProviderPolicyNotice } from "@/components/common/OrgProviderPolicyNotice"
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
import { readReasoningEffortLevels, useReasoningEffortOutcome } from "@/hooks/useReasoningEffortOutcome"
import { formatPickerString, type PickerTranslator, usePickerStrings } from "@/i18n/picker"
import { BalloonTooltip } from "@/icline/BalloonTooltip"
import { MENU_SURFACE_CLASS, MENU_TEXT_FIELD_CLASS, useMenuPopoverAnchor } from "@/icline/menuPopover"
import { type OrgProviderBlock, orgProviderBlock } from "@/icline/orgProviderPolicy"
import { type ModelStatus, resolveModelStatus } from "@/icline/pickerCapabilities"
import { cn } from "@/lib/utils"
import { ModelsServiceClient } from "@/services/grpc-client"
import { firstOnEffortValue, resolveEffortLevels, withSupportedEfforts } from "@/utils/modelThinkingOptions"

interface QuickModelPickerProps {
	/** Display string shown in the chat header button. */
	modelDisplayName: string
	/** Whether the picker should be disabled (e.g. task running). */
	disabled?: boolean
}

/** Popover width from the locked mock (v11); the Options-panel geometry lives in quickModelPickerList. */
const PICKER_WIDTH_PX = 320
/** Closing the hover panel is delayed so the pointer can travel row → panel. */
const OPTIONS_PANEL_CLOSE_DELAY_MS = 260

/**
 * Single source of truth for the active provider+model lives in
 * useNormalizedApiConfiguration.getActiveProviderAndModelId (gRPC-resolved).
 * The picker used to keep a duplicate reader here that disagreed on
 * jan/sakana/zenmux vs generic apiModelId fallbacks — deleted.
 */

/**
 * Fetch models for the expanded provider only. Hook must be called unconditionally
 * so we pass a placeholder id when nothing is expanded.
 */
function useProviderModelsCache(providerId: string | null) {
	const { models, defaultModelId, isLoading, refresh } = useProviderModels(providerId ?? "__none__")
	return { models, defaultModelId, isLoading, refresh }
}

/** Group header: a bordered chip carrying the label and the model count. */
function ModelSectionHeader({ label, count, accent }: { label: string; count: number; accent: "free" | "standard" }) {
	return (
		<div className="px-7 pt-1.5 pb-0.5">
			<span
				className={cn(
					"inline-flex items-center gap-1 rounded-sm border px-1.5 text-[10px] uppercase tracking-wide",
					accent === "free"
						? "border-(--vscode-charts-green) text-(--vscode-charts-green)"
						: "border-(--vscode-editorGroup-border) text-(--vscode-descriptionForeground)",
				)}>
				<span>{label}</span>
				<span className="opacity-80">{count}</span>
			</span>
		</div>
	)
}

function ModelRow({
	modelId,
	modelInfo,
	isCurrentModel,
	providerId,
	onSelect,
	registerRow,
	badge,
	status,
	tr,
}: {
	modelId: string
	modelInfo: ModelInfoLike
	isCurrentModel: boolean
	providerId: string
	onSelect: (providerId: string, modelId: string) => void
	/** Callback ref: publishes the row element for the list's delegated hover tracking. */
	registerRow: (el: HTMLElement | null, meta: { providerId: string; modelId: string }) => void
	badge?: string
	/** Real status for this model — the same object the Options panel renders from. */
	status: ModelStatus
	tr: PickerTranslator
}) {
	const setRowRef = useCallback(
		(el: HTMLButtonElement | null) => {
			registerRow(el, { providerId, modelId })
		},
		[registerRow, providerId, modelId],
	)
	return (
		<button
			className={cn(
				"w-full flex items-center gap-1.5 pl-7 pr-3 py-1 text-[11px] text-left group/model cursor-pointer",
				"hover:bg-(--vscode-list-hoverBackground) transition-colors",
				isCurrentModel ? "text-(--vscode-foreground) font-medium" : "text-(--vscode-descriptionForeground)",
			)}
			data-icline-model-id={modelId}
			data-icline-model-row=""
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
			ref={setRowRef}
			{...(isCurrentModel ? { "data-icline-current-model": "" } : {})}
			type="button">
			{/* Round 11: the model name gets a subtle zoom instead of a tooltip —
			    a balloon here duplicated the visible name and covered the row above. */}
			<span className="truncate flex-1 origin-left transition-transform duration-100 group-hover/model:scale-[1.07]">
				{modelInfo?.name || modelId}
			</span>
			{/* The row and the composer's model chip render the same readout. */}
			<ModelStatusIcons status={status} tr={tr} />
			{badge ? (
				<span className="shrink-0 text-[10px] uppercase tracking-wide text-(--vscode-textLink-foreground)">{badge}</span>
			) : null}
			{isCurrentModel && <Check className="text-(--vscode-terminal-ansiGreen) shrink-0" size={12} />}
		</button>
	)
}

export function QuickModelPicker({ modelDisplayName, disabled }: QuickModelPickerProps) {
	const tr = usePickerStrings()
	const { providers, isLoading: providersLoading } = useProviderListings()
	const {
		mode,
		apiConfiguration,
		providerModelsByProvider,
		planActSeparateModelsSetting,
		applyApiConfigurationPatch,
		remoteConfigSettings,
	} = useExtensionState()
	const {
		selectedProvider: currentProvider,
		selectedModelId: currentModelId,
		selectedModelInfo,
	} = useNormalizedApiConfiguration(mode)
	const {
		recommended: clineRecommendedFeatured,
		free: clineFreeFeatured,
		freeAllowlist: clineFreeAllowlist,
		refresh: refreshClineFeatured,
	} = useClineSettingsModelList()
	const { handleModeFieldChange, handleModeFieldsChange } = useApiConfigurationHandlers()
	const [open, setOpen] = useState(false)
	/**
	 * The composer's own Options popover (opened by the status icons next to the model
	 * name). Separate from `open` so the two surfaces never fight over one flag.
	 */
	const [statusOptionsOpen, setStatusOptionsOpen] = useState(false)
	/** null = nothing expanded; user may collapse the active provider freely. */
	const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
	const [search, setSearch] = useState("")
	const [commitError, setCommitError] = useState<string | null>(null)
	/**
	 * A provider the organization does not allow, captured at the click that tried it.
	 * Kept in state (not derived from the config) because the click's intent is gone
	 * the moment the host's remote layer wins — see icline/orgProviderPolicy.
	 */
	const [orgBlock, setOrgBlock] = useState<OrgProviderBlock | null>(null)
	/**
	 * Thinking/effort values the user changed in THIS session, keyed provider::model.
	 * The config write is async and the state push lands later, so without this the
	 * row icons and the panel would keep showing the old value after a click — the
	 * "setting and status icon disagree" report. Cleared when the picker reopens, at
	 * which point the configuration is authoritative again.
	 */
	const [sessionThinking, setSessionThinking] = useState<Record<string, ChatModelPreference>>({})
	/** Last effort level picked per model, so re-enabling Thinking restores it. */
	const lastEffortRef = useRef(new Map<string, string>())
	/** Guards pointerdown+click double-commit (pointerdown commits, keyboard click re-commits). */
	const committingRef = useRef(false)
	const listRef = useRef<HTMLDivElement>(null)
	const contentRef = useRef<HTMLDivElement>(null)
	/** The model-name button the picker hangs off (`useMenuPopoverAnchor` measures it). */
	const modelTriggerRef = useRef<HTMLButtonElement>(null)
	/** The status button the composer's Options popover is anchored to. */
	const statusTriggerRef = useRef<HTMLButtonElement>(null)
	const userScrolledThisOpenRef = useRef(false)
	const programmaticScrollRef = useRef(false)

	// Hover-driven Options panel state.
	const [hoveredModel, setHoveredModel] = useState<{ providerId: string; modelId: string } | null>(null)
	const [optionsTop, setOptionsTop] = useState(OPTIONS_PANEL_MIN_TOP_PX)
	const [optionsSide, setOptionsSide] = useState<"right" | "left">("right")
	const optionsRef = useRef<HTMLDivElement>(null)
	/** Row the panel is anchored to — re-measured live when the panel is placed. */
	const hoveredRowRef = useRef<HTMLElement | null>(null)
	const optionsCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	/** Latest hover metadata per model row, so pointermove can re-anchor without per-row handlers. */
	const rowMetaRef = useRef(new Map<HTMLElement, { providerId: string; modelId: string }>())

	// NOTE: currentProvider/currentModelId come from useNormalizedApiConfiguration

	const modeFields = getModeSpecificFields(apiConfiguration, mode)

	const { models, isLoading: modelsLoading, refresh } = useProviderModelsCache(expandedProvider)

	const cancelOptionsClose = useCallback(() => {
		if (optionsCloseTimerRef.current) {
			clearTimeout(optionsCloseTimerRef.current)
			optionsCloseTimerRef.current = null
		}
	}, [])

	const closeOptionsNow = useCallback(() => {
		cancelOptionsClose()
		setHoveredModel(null)
	}, [cancelOptionsClose])

	const scheduleOptionsClose = useCallback(() => {
		cancelOptionsClose()
		optionsCloseTimerRef.current = setTimeout(() => {
			optionsCloseTimerRef.current = null
			setHoveredModel(null)
		}, OPTIONS_PANEL_CLOSE_DELAY_MS)
	}, [cancelOptionsClose])

	useEffect(() => () => cancelOptionsClose(), [cancelOptionsClose])

	/**
	 * Anchor side for the MODEL LIST. Its own menu width is what has to fit beside the chip,
	 * so the shared hook is called once per menu rather than once per component.
	 */
	const { align: modelPickerAlign, onOpenChange: handleModelPickerOpenChange } = useMenuPopoverAnchor({
		open,
		setOpen,
		panelWidth: PICKER_WIDTH_PX,
		triggerRef: modelTriggerRef,
	})

	/**
	 * …and for the composer's Options popover, which is a narrower menu (236px) hanging off
	 * a much smaller button: the two can disagree about which edge fits, which is exactly
	 * why the decision is per menu and not per component.
	 */
	const { align: statusOptionsAlign, onOpenChange: handleStatusOptionsOpenChange } = useMenuPopoverAnchor({
		open: statusOptionsOpen,
		setOpen: setStatusOptionsOpen,
		panelWidth: OPTIONS_PANEL_WIDTH_PX,
		triggerRef: statusTriggerRef,
	})

	/**
	 * Record the hovered row; the placement itself happens in the layout effect
	 * below, where the panel's real height is known. The side flip mirrors the
	 * mock's "outside, to the right": right unless it truly does not fit AND the
	 * left side has room (a narrow sidebar must not push the panel off-screen).
	 */
	const handleModelHover = useCallback(
		(providerId: string, modelId: string, row: HTMLElement) => {
			cancelOptionsClose()
			hoveredRowRef.current = row
			setHoveredModel({ providerId, modelId })
			const content = contentRef.current
			if (!content) {
				return
			}
			// The panel's containing block is the popover element (`relative`), so
			// measure THAT, not the inner column.
			const pickerEl = content.closest<HTMLElement>("[data-icline-quick-picker]") ?? content
			const pickerRect = pickerEl.getBoundingClientRect()
			const viewportWidth = window.innerWidth || Number.MAX_SAFE_INTEGER
			const fitsRight = pickerRect.right + OPTIONS_PANEL_GAP_PX + OPTIONS_PANEL_WIDTH_PX <= viewportWidth
			const fitsLeft = pickerRect.left - OPTIONS_PANEL_GAP_PX - OPTIONS_PANEL_WIDTH_PX >= 0
			setOptionsSide(!fitsRight && fitsLeft ? "left" : "right")
		},
		[cancelOptionsClose],
	)

	// The panel's placement effect lives below ("Place the panel beside its own row"),
	// where it can key on the host's settled level list as well as the hover anchor.

	/**
	 * Delegated hover: ONE move handler on the list re-anchors the panel to
	 * whichever model row is under the cursor. Per-row pointerenter/leave pairs
	 * proved lossy inside the VS Code webview (the panel stuck on the first row
	 * and never followed the hovered model — mock v11 round 10 hit the same
	 * failure until it moved to a single move handler).
	 *
	 * It is a React prop, NOT a native listener added in a useEffect: Radix
	 * `Presence` mounts the popover body one commit AFTER `open` flips (its
	 * layout effect sends `MOUNT`), so an effect keyed on `open` ran while
	 * `listRef.current` was still null, early-returned, and — because its deps
	 * never changed again — never attached. The panel then never appeared in
	 * the real webview (fix.8 report). A prop is wired during render, so it
	 * cannot miss the mount.
	 */
	const handleListPointerMove = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-icline-model-row]") : null
			if (target) {
				const meta = rowMetaRef.current.get(target)
				if (meta) {
					handleModelHover(meta.providerId, meta.modelId, target)
					return
				}
			}
			// The cursor left the row area entirely (header, gap, search…): let the
			// close delay run so a short trip through the gap doesn't kill the panel.
			scheduleOptionsClose()
		},
		[handleModelHover, scheduleOptionsClose],
	)

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			// The shared anchor decides the edge and controls the flag; everything below is
			// this picker's own open/close bookkeeping.
			handleModelPickerOpenChange(nextOpen)
			if (nextOpen) {
				// Seed expand once on open (dev.4: only active provider open).
				// Do NOT re-seed when user collapses — that was the force-expand bug.
				setExpandedProvider(currentProvider)
				setSearch("")
				setCommitError(null)
				// Re-read the real configuration on every open.
				setSessionThinking({})
				userScrolledThisOpenRef.current = false
				void refreshClineFeatured()
			} else {
				setSearch("")
				closeOptionsNow()
			}
		},
		[currentProvider, refreshClineFeatured, closeOptionsNow, handleModelPickerOpenChange],
	)

	const handleToggleProvider = useCallback(
		(providerId: string) => {
			closeOptionsNow()
			setExpandedProvider((prev) => {
				const next = prev === providerId ? null : providerId
				if (next === "cline") {
					void refreshClineFeatured()
				}
				return next
			})
		},
		[refreshClineFeatured, closeOptionsNow],
	)

	/**
	 * Write a model's stored thinking preference into the running configuration in a
	 * SINGLE update. Two awaited writes would race the state push: the second is built
	 * from a snapshot taken before the host echoed the first, so it wholesale-reverts
	 * it (the fix.9-class stale write-back). `handleModeFieldsChange` sends both fields
	 * atomically, which is why it is used whenever there are two of them.
	 */
	const applyStoredThinking = useCallback(
		async (saved: ChatModelPreference | undefined) => {
			const effort = saved?.reasoningEffort
			const budget = saved?.thinkingBudgetTokens
			if (effort === undefined && budget === undefined) {
				return
			}
			if (effort !== undefined && budget !== undefined) {
				await handleModeFieldsChange(
					{
						reasoningEffort: { plan: "planModeReasoningEffort", act: "actModeReasoningEffort" },
						thinkingBudgetTokens: { plan: "planModeThinkingBudgetTokens", act: "actModeThinkingBudgetTokens" },
					},
					{ reasoningEffort: effort, thinkingBudgetTokens: budget },
					mode,
				)
				return
			}
			if (effort !== undefined) {
				await handleModeFieldChange({ plan: "planModeReasoningEffort", act: "actModeReasoningEffort" }, effort, mode)
				return
			}
			await handleModeFieldChange(
				{ plan: "planModeThinkingBudgetTokens", act: "actModeThinkingBudgetTokens" },
				budget ?? 0,
				mode,
			)
		},
		[handleModeFieldChange, handleModeFieldsChange, mode],
	)

	const handleSelectModel = useCallback(
		async (providerId: string, modelId: string) => {
			if (committingRef.current) {
				return
			}
			committingRef.current = true
			setCommitError(null)
			setOrgBlock(null)
			const legacySelectionProvider = toLegacyApiProvider(providerId)
			// Organization policy outranks every local write, so this selection cannot
			// take effect. Say so where the click happened and stop: committing would
			// only write a model the pinned provider can never use, and the optimistic
			// provider echo below would claim a switch that the next state push undoes.
			const blocked = orgProviderBlock(remoteConfigSettings, legacySelectionProvider)
			if (blocked) {
				setOrgBlock(blocked)
				committingRef.current = false
				return
			}
			try {
				const saved = getChatModelPreference(providerId, modelId)
				// Apply the saved reasoning effort BEFORE the commit, not after:
				// the effort write sends the full api configuration, and doing it
				// post-commit raced the incoming state push with a pre-click
				// snapshot — wholesale-reverting the fresh selection (fix.9-class
				// stale write-back; the trigger — saved thinking settings — is
				// now common via the shared providers.json). Best-effort: a failed
				// write must not block the selection itself.
				//
				// The stored THINKING BUDGET is restored here too: the panel writes it
				// for models that are not active yet, and without this the picker would
				// remember a switch that the running configuration never received.
				try {
					await applyStoredThinking(saved)
				} catch (preferenceError) {
					console.error("QuickModelPicker: failed to apply saved thinking settings:", preferenceError)
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
				const providerField = mode === "plan" ? "planModeApiProvider" : "actModeApiProvider"
				applyApiConfigurationPatch(
					planActSeparateModelsSetting
						? { [providerField]: legacySelectionProvider }
						: { planModeApiProvider: legacySelectionProvider, actModeApiProvider: legacySelectionProvider },
				)
				setOpen(false)
			} catch (err) {
				console.error("QuickModelPicker: failed to commit model selection:", err)
				setCommitError(err instanceof Error ? err.message : tr("commitFailed"))
			} finally {
				committingRef.current = false
			}
		},
		[applyStoredThinking, planActSeparateModelsSetting, applyApiConfigurationPatch, remoteConfigSettings, mode, tr],
	)

	const handleRefreshModels = useCallback(() => {
		if (expandedProvider) {
			void refresh()
		}
		void refreshClineFeatured()
	}, [expandedProvider, refresh, refreshClineFeatured])

	/**
	 * Effort applies to the model the user is looking at: the active one is written
	 * through to the running configuration, any other one is stored as that model's
	 * preference and applied the next time it is selected.
	 */
	/** Whether a model is the one currently driving the chat. */
	const isActiveModel = useCallback(
		(providerId: string, modelId: string) => providerId === currentProvider && modelId === currentModelId,
		[currentProvider, currentModelId],
	)

	/**
	 * Values really in force for a model — this session's change first (instant
	 * feedback), then the live configuration for the active model, then that model's
	 * stored preference. Row icons and the Options panel both read this.
	 */
	const thinkingForModel = useCallback(
		(providerId: string, modelId: string): { reasoningEffort?: string; thinkingBudgetTokens: number } => {
			const session = sessionThinking[getChatModelPreferenceKey(providerId, modelId)]
			if (session) {
				return { reasoningEffort: session.reasoningEffort, thinkingBudgetTokens: session.thinkingBudgetTokens ?? 0 }
			}
			if (isActiveModel(providerId, modelId)) {
				return {
					reasoningEffort: modeFields.reasoningEffort,
					thinkingBudgetTokens: modeFields.thinkingBudgetTokens ?? 0,
				}
			}
			const stored = getChatModelPreference(providerId, modelId)
			return { reasoningEffort: stored?.reasoningEffort, thinkingBudgetTokens: stored?.thinkingBudgetTokens ?? 0 }
		},
		[isActiveModel, modeFields.reasoningEffort, modeFields.thinkingBudgetTokens, sessionThinking],
	)

	/** Real status for one model — the single object the row and the panel render from. */
	const statusForModel = useCallback(
		(providerId: string, modelId: string, modelInfo?: ModelInfoLike | null): ModelStatus => {
			const effective = thinkingForModel(providerId, modelId)
			return resolveModelStatus({
				providerId,
				modelId,
				modelInfo,
				reasoningEffort: effective.reasoningEffort,
				thinkingBudgetTokens: effective.thinkingBudgetTokens,
				// A non-active model of the current provider inherits the ambient
				// effort the moment it is selected (the Settings-level default),
				// so its row/panel keep the control reachable instead of claiming
				// "No capability data". Reachable, not on: enabled/badge still
				// require a value in force for THIS model (dev.4-fix.2).
				providerDefaultEffortIsSet:
					!isActiveModel(providerId, modelId) &&
					providerId === currentProvider &&
					!!modeFields.reasoningEffort &&
					modeFields.reasoningEffort !== "none",
			})
		},
		[thinkingForModel, isActiveModel, currentProvider, modeFields.reasoningEffort],
	)

	/** Persist a thinking/effort change and remember it for this session. */
	const rememberThinking = useCallback((providerId: string, modelId: string, patch: ChatModelPreference) => {
		setChatModelPreference(providerId, modelId, patch)
		const key = getChatModelPreferenceKey(providerId, modelId)
		// Session state alone carries the change to the row icons and the panel: this
		// re-render is also what used to re-measure the panel's height, which is the
		// height-driven jump the anchor-only effect above is written to avoid.
		setSessionThinking((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
	}, [])

	/**
	 * Effort level picked in the panel. Written through to the running configuration
	 * when this is the active model — exactly as Settings writes it — and stored as
	 * that model's preference otherwise (applied when it is next selected).
	 */
	const handleEffortChange = useCallback(
		async (providerId: string, modelId: string, effort: string) => {
			if (effort !== "none") {
				lastEffortRef.current.set(getChatModelPreferenceKey(providerId, modelId), effort)
			}
			rememberThinking(providerId, modelId, { reasoningEffort: effort })
			if (!isActiveModel(providerId, modelId)) {
				return
			}
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
		[isActiveModel, rememberThinking, handleModeFieldChange, mode],
	)

	/**
	 * The mock's Thinking switch, wired to what the model can really do: an effort
	 * model goes back to its last level (default `medium`) or off (`none`), a budget
	 * model goes to the provider minimum or zero — the same writes the Settings
	 * pickers perform (ThinkingBudgetSlider / the legacy chat picker).
	 */
	const handleThinkingToggle = useCallback(
		async (providerId: string, modelId: string, modelInfo: ModelInfoLike | undefined, nextEnabled: boolean) => {
			const status = statusForModel(providerId, modelId, modelInfo)
			if (status.support.showEffort) {
				const key = getChatModelPreferenceKey(providerId, modelId)
				/*
				 * Re-enabling restores what the model last used; with nothing remembered it
				 * starts at the model's OWN first level. The levels come from the model's
				 * answer (`readReasoningEffortLevels`, keyed by the model rather than by the
				 * level in force, so it is still there while this very toggle is changing
				 * that level), because a vocabulary's first level is often one the model does
				 * not take — `z-ai/glm-5.3-flash` takes Low/High/Max, so writing the generic
				 * `minimal` was only ever clamped back to `low` by the SDK after reaching the
				 * wire.
				 */
				const levels = withSupportedEfforts(
					resolveEffortLevels({ providerId, modelId, modelInfo }),
					readReasoningEffortLevels({ providerId, modelId })?.supportedEfforts,
					status.effort,
				)
				const effort: string = nextEnabled
					? (status.effort ?? lastEffortRef.current.get(key) ?? firstOnEffortValue(levels))
					: "none"
				await handleEffortChange(providerId, modelId, effort)
				return
			}
			if (!status.support.showThinkingBudget) {
				// Built-in reasoning (or nothing to configure): the switch is inert.
				return
			}
			const budget = nextEnabled ? ANTHROPIC_MIN_THINKING_BUDGET : 0
			rememberThinking(providerId, modelId, { thinkingBudgetTokens: budget })
			if (!isActiveModel(providerId, modelId)) {
				return
			}
			try {
				await handleModeFieldChange(
					{ plan: "planModeThinkingBudgetTokens", act: "actModeThinkingBudgetTokens" },
					budget,
					mode,
				)
			} catch (err) {
				console.error("QuickModelPicker: failed to set thinking budget:", err)
			}
		},
		[isActiveModel, handleEffortChange, rememberThinking, statusForModel, handleModeFieldChange, mode],
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

	/**
	 * Model info for the hovered row — the same lookup the Options panel renders from,
	 * hoisted so the effort answer below and the panel cannot describe different models.
	 */
	const hoveredModelInfo = hoveredModel
		? hoveredModel.providerId === expandedProvider
			? displayModels[hoveredModel.modelId]
			: warmModelsFor(hoveredModel.providerId)[hoveredModel.modelId]
		: undefined
	const hoveredStatus = hoveredModel
		? statusForModel(hoveredModel.providerId, hoveredModel.modelId, hoveredModelInfo)
		: undefined

	/**
	 * What the level marked in the Options panel will really send for the hovered
	 * model. The host answers from the SDK's own clamp decision, so a level this model
	 * cannot take is visible where it was picked rather than only in the reply.
	 *
	 * Called at the top level (never inside `renderOptionsPanel`), because the panel's
	 * presence changes between renders and hooks inside it would reorder.
	 */
	const hoveredEffortOutcome = useReasoningEffortOutcome({
		providerId: hoveredModel?.providerId,
		modelId: hoveredModel?.modelId,
		effort: hoveredStatus?.effort,
		thinkingBudgetTokens: hoveredStatus?.thinkingBudgetTokens,
	})

	/**
	 * Place the panel beside its own row (`computeOptionsPanelTop`) — as a layout effect
	 * so it lands on the first paint.
	 *
	 * The panel is lifted when the row is too low for its height, so it always fits above
	 * the picker's bottom margin and its `max-height` can stay the mock's flat 320px —
	 * nothing to scroll.
	 *
	 * The dep array is the hover anchor plus the SETTLED level list, and every edge is
	 * load-bearing:
	 *
	 *  - the anchor re-measures per hovered row, so a row near the bottom still gets its
	 *    own lift;
	 *  - the level list re-measures once when the host's answer lands: the answer narrows
	 *    the first paint's provider vocabulary to the model's own (`aion-labs/aion-3.5-mini`
	 *    takes three of the six), and a lift computed for the taller first paint leaves the
	 *    shrunk panel hanging above its row instead of beside it. The key is a STRING so
	 *    the same answer arriving again — every Thinking toggle re-asks the question —
	 *    cannot re-run this; and
	 *  - it does NOT re-measure on thinking/effort writes. It used to re-run on a counter
	 *    bumped by every write, and since the lift reads the panel's own height, clicking
	 *    Thinking (which adds or drops the clamp notice, and used to swap the level list)
	 *    slid the panel off its row under the cursor — dev.6-fix.27. A content change
	 *    after the click only grows or shrinks the panel from the top it was given.
	 */
	const hoveredLevelsKey = hoveredEffortOutcome?.supportedEfforts.join("|") ?? ""
	useLayoutEffect(() => {
		if (!hoveredModel) {
			return
		}
		const panel = optionsRef.current
		const row = hoveredRowRef.current
		const content = contentRef.current
		if (!panel || !row || !content) {
			return
		}
		const pickerEl = content.closest<HTMLElement>("[data-icline-quick-picker]") ?? content
		const pickerRect = pickerEl.getBoundingClientRect()
		const rowRect = row.getBoundingClientRect()
		setOptionsTop(
			computeOptionsPanelTop({
				rowTop: rowRect.top,
				pickerTop: pickerRect.top,
				pickerHeight: pickerRect.height,
				panelHeight: panel.getBoundingClientRect().height,
			}),
		)
	}, [hoveredLevelsKey, hoveredModel])

	/**
	 * The active model's own readout.
	 *
	 * The warm catalog first, and — when it does not carry this exact id — the
	 * host-resolved info the composer already asked for (`useNormalizedApiConfiguration`,
	 * which also resolves a catalog alias like the free route's `z-ai/glm-5.3-flash`).
	 * Without the second source the composer's Options popover drew the ACTIVE model from
	 * no metadata at all: no capability icons, and a Thinking switch that existed only
	 * while a level was set — so turning Thinking off disabled the switch for good
	 * (smoke 2026-09-21).
	 */
	const currentModelInfo = warmModelsFor(currentProvider)[currentModelId] ?? (selectedModelInfo as ModelInfoLike | undefined)
	const currentStatus = statusForModel(currentProvider, currentModelId, currentModelInfo)
	/**
	 * The same clamp answer the hover panel shows, for the active model — the composer's
	 * Options popover must not claim a level this model will not be sent.
	 */
	const currentEffortOutcome = useReasoningEffortOutcome({
		providerId: currentProvider,
		modelId: currentModelId,
		effort: currentStatus.effort,
		thinkingBudgetTokens: currentStatus.thinkingBudgetTokens,
	})
	/** A status button with nothing to show is not a click target. */
	const showStatusTrigger = currentStatus.caps.length > 0 || Boolean(currentStatus.effortShort)

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
			// Scroll the picker's own list only. scrollIntoView() walks up to every
			// scrollable ancestor — including the chat view's scroller / the webview
			// document — which made the whole page jump down and snap back when the
			// picker was clicked. Computing the offset and bumping list.scrollTop
			// keeps the effect contained to the popover.
			const listRect = list.getBoundingClientRect()
			const targetRect = target.getBoundingClientRect()
			const blockOffset = target.hasAttribute(ACTIVE_MODEL_ATTR)
				? targetRect.top - listRect.top - list.clientHeight / 2 + targetRect.height / 2
				: targetRect.top - listRect.top
			programmaticScrollRef.current = true
			list.scrollTop += blockOffset
			window.requestAnimationFrame(() => {
				programmaticScrollRef.current = false
			})
		})
		return () => window.cancelAnimationFrame(frame)
		// biome-ignore lint/correctness/useExhaustiveDependencies: re-pinning intentionally follows the loader/entry counters, not every referenced value
	}, [open, searchTrimmed, currentProvider, currentModelId, expandedProvider, modelsLoading, filteredModelEntries.length])

	/** Callback-ref registry feeding the list's delegated pointermove hover tracking. */
	const registerModelRow = useCallback((el: HTMLElement | null, meta: { providerId: string; modelId: string }) => {
		if (el) {
			rowMetaRef.current.set(el, meta)
			return
		}
		// Row unmounted (provider collapsed): drop its stale entry so the
		// delegated pointermove never re-anchors to a detached node.
		for (const [node, nodeMeta] of rowMetaRef.current) {
			if (nodeMeta.providerId === meta.providerId && nodeMeta.modelId === meta.modelId) {
				rowMetaRef.current.delete(node)
			}
		}
	}, [])

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
						registerRow={registerModelRow}
						status={statusForModel(providerId, modelId, modelInfo)}
						tr={tr}
					/>
				)
			})

		if (clineSections) {
			return (
				<>
					{clineSections.recommended.length > 0 && (
						<>
							<ModelSectionHeader
								accent="standard"
								count={clineSections.recommended.length}
								label={tr("sectionRecommended")}
							/>
							{renderRows(clineSections.recommended)}
						</>
					)}
					{clineSections.free.length > 0 && (
						<>
							<ModelSectionHeader accent="free" count={clineSections.free.length} label={tr("sectionFree")} />
							{renderRows(clineSections.free)}
						</>
					)}
					{clineSections.standard.length > 0 && (
						<>
							<ModelSectionHeader
								accent="standard"
								count={clineSections.standard.length}
								label={tr("sectionStandard")}
							/>
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
						<ModelSectionHeader accent="free" count={freeModels.length} label={tr("sectionFree")} />
						{renderRows(freeModels)}
					</>
				)}
				{standardModels.length > 0 && (
					<>
						<ModelSectionHeader accent="standard" count={standardModels.length} label={tr("sectionStandard")} />
						{renderRows(standardModels)}
					</>
				)}
			</>
		)
	}

	/**
	 * The hover Options panel, structured exactly like mock v11: title, model id,
	 * Thinking switch, Effort levels, then the capability readout. Every value comes
	 * from `statusForModel` — the very object the row renders — so the controls and
	 * the row icons always describe the same real state.
	 */
	const renderOptionsPanel = () => {
		if (!hoveredModel) {
			return null
		}
		const { providerId, modelId } = hoveredModel
		const info = hoveredModelInfo
		const status = statusForModel(providerId, modelId, info)

		return (
			/*
			 * `overflow-x-hidden` on purpose: the panel only ever needs to scroll DOWN (a tall
			 * model meets the 320px max-height). Leaving the sideways axis at the implicit
			 * `auto` — which is what a bare `overflow-y-auto` computes to — let the browser
			 * draw a horizontal scrollbar along the panel's bottom edge the moment any child
			 * reached past its right side, and a grey strip under the capability readout
			 * reads as a broken panel (smoke report, dev.6-fix.25).
			 */
			<div
				className="absolute z-40 overflow-y-auto overflow-x-hidden rounded border border-(--vscode-editorGroup-border) bg-(--vscode-editorWidget-background) px-3 py-2.5 shadow-lg"
				data-icline-picker-options=""
				onPointerEnter={cancelOptionsClose}
				onPointerLeave={scheduleOptionsClose}
				ref={optionsRef}
				style={{
					top: optionsTop,
					maxHeight: OPTIONS_PANEL_MAX_HEIGHT_PX,
					width: OPTIONS_PANEL_WIDTH_PX,
					...(optionsSide === "right"
						? { left: `calc(100% + ${OPTIONS_PANEL_GAP_PX}px)` }
						: { right: `calc(100% + ${OPTIONS_PANEL_GAP_PX}px)` }),
				}}>
				{/*
				 * The panel body is shared with the composer's status popover
				 * (ModelOptionsPanel), so the hover panel and the "raise Effort of the model
				 * I am already using" popover cannot drift apart.
				 */}
				<ModelOptionsPanel
					effortOutcome={hoveredEffortOutcome}
					modelId={modelId}
					modelInfo={info}
					onEffortChange={(targetProviderId, targetModelId, effort) =>
						void handleEffortChange(targetProviderId, targetModelId, effort)
					}
					onThinkingToggle={(targetProviderId, targetModelId, targetInfo, next) =>
						void handleThinkingToggle(targetProviderId, targetModelId, targetInfo, next)
					}
					providerId={providerId}
					status={status}
					tr={tr}
				/>
			</div>
		)
	}

	return (
		<Popover onOpenChange={handleOpenChange} open={open}>
			<PopoverTrigger asChild>
				{/* The tooltip anchors to the button's own content: `asChild` needs the real
				    <button> as its direct child, so the balloon cannot wrap it from outside. */}
				{/* No aria-label: the model name IS the accessible name (the balloon explains it). */}
				<button
					className="inline-flex items-center text-xs px-1.5 py-0.5 rounded-sm text-(--vscode-descriptionForeground) hover:bg-(--vscode-list-hoverBackground) hover:text-(--vscode-foreground) disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
					data-icline-model-trigger=""
					disabled={disabled}
					ref={modelTriggerRef}
					type="button">
					{/* The name keeps its own balloon; the status icons are a button of their own
					    (below) and carry theirs, so one tooltip around both would nest them. */}
					<BalloonTooltip className="inline-flex items-center min-w-0" label={tr("triggerTooltip")}>
						<span className="truncate max-w-[180px]">{modelDisplayName}</span>
					</BalloonTooltip>
					{/* This button switches the MODEL only. */}
					<ChevronDown className="ml-1 shrink-0" size={12} />
				</button>
			</PopoverTrigger>
			<PopoverContent
				align={modelPickerAlign}
				className={cn("relative p-0 gap-0", MENU_SURFACE_CLASS)}
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
				side="top"
				style={{ width: PICKER_WIDTH_PX }}>
				<div className="flex flex-col max-h-[420px]" ref={contentRef}>
					{/* Search bar */}
					<div className="flex items-center gap-2 px-3 py-2 border-b border-(--vscode-editorGroup-border)">
						<Search className="text-(--vscode-descriptionForeground) shrink-0" size={13} />
						{/* biome-ignore lint/a11y/noAutofocus: focusing the search field on popover open is the intended picker UX */}
						<input
							autoFocus
							className={cn(
								"flex-1 bg-transparent border-none outline-none text-xs text-(--vscode-foreground) placeholder:text-(--vscode-descriptionForeground)",
								MENU_TEXT_FIELD_CLASS,
							)}
							onChange={(e) => setSearch(e.target.value)}
							placeholder={tr("searchPlaceholder")}
							type="text"
							value={search}
						/>
					</div>

					{/* Provider + model list */}
					{/* Scrolling is vertical only: rows truncate instead of running wide, and the
					    hovered row's name zooms by 7%, which is enough to reach past the row's
					    right padding and let a bare `overflow-y-auto` grow a scrollbar. */}
					<div
						className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
						data-icline-picker-list=""
						onPointerMove={handleListPointerMove}
						onScroll={() => {
							if (open && !programmaticScrollRef.current) {
								userScrolledThisOpenRef.current = true
							}
							// The Options panel is anchored to a row's position; once the
							// list moves, that anchor is stale.
							closeOptionsNow()
						}}
						ref={listRef}>
						{providersLoading ? (
							<div className="px-3 py-4 text-xs text-(--vscode-descriptionForeground) text-center">
								{tr("loadingProviders")}
							</div>
						) : filteredProviders.length === 0 ? (
							<div className="px-3 py-4 text-xs text-(--vscode-descriptionForeground) text-center">
								{tr("noProvidersFound")}
							</div>
						) : (
							filteredProviders.map((provider) => {
								const isExpanded = expandedProvider === provider.id
								const isCurrent = currentProvider === provider.id
								const displayEmpty = Object.keys(displayModels).length === 0
								const providerLabel = provider.name || provider.id
								// Organization policy: the Settings dropdown hides these providers,
								// so the picker has to mark them (clicking one is answered below).
								const blockedByOrg = orgProviderBlock(remoteConfigSettings, provider.id) !== undefined
								return (
									<div
										className="border-b border-(--vscode-editorGroup-border)/40 last:border-b-0"
										data-icline-provider={provider.id}
										key={provider.id}>
										<button
											aria-expanded={isExpanded}
											aria-label={providerLabel}
											className={cn(
												"w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-left cursor-pointer",
												"hover:bg-(--vscode-list-hoverBackground) transition-colors",
												"text-(--vscode-foreground)",
												isCurrent && "font-semibold",
											)}
											onClick={() => handleToggleProvider(provider.id)}
											type="button">
											{/* Guideline round 8: a single stroke chevron, in front of the
											    name, rotating around its own centre. */}
											<ChevronDown
												className={cn(
													"shrink-0 text-(--vscode-descriptionForeground) transition-transform",
													!isExpanded && "-rotate-90",
												)}
												size={15}
												style={{ transformOrigin: "center" }}
											/>
											<span className="truncate flex-1">{providerLabel}</span>
											{blockedByOrg && (
												<BalloonTooltip
													label={formatPickerString(tr, "orgProviderBlockedHint", {
														provider: providerLabel,
													})}>
													<Building2
														aria-hidden
														className="shrink-0 text-(--vscode-descriptionForeground)"
														data-icline-org-blocked={provider.id}
														size={12}
													/>
												</BalloonTooltip>
											)}
											{isCurrent && (
												<Check className="text-(--vscode-terminal-ansiGreen) shrink-0" size={13} />
											)}
										</button>
										{isExpanded && (
											<div className="pb-1">
												{filteredModelEntries.length > 0 ? (
													renderModelSections(provider.id, isCurrent)
												) : modelsLoading && displayEmpty ? (
													<div className="px-3 py-1.5 text-[11px] text-(--vscode-descriptionForeground)">
														{tr("loadingModels")}
													</div>
												) : displayEmpty ? (
													<div className="px-3 py-1.5 text-[11px] text-(--vscode-descriptionForeground) italic">
														{tr("noModelsLoaded")}
													</div>
												) : (
													<div className="px-3 py-1.5 text-[11px] text-(--vscode-descriptionForeground) italic">
														{tr("noModelsMatch")}
													</div>
												)}
											</div>
										)}
									</div>
								)
							})
						)}
					</div>

					{orgBlock && (
						<OrgProviderPolicyNotice
							block={orgBlock}
							providerLabel={
								providers.find((provider) => provider.id === orgBlock.requested)?.name || orgBlock.requested
							}
							tr={tr}
						/>
					)}

					{commitError && (
						<div
							className="shrink-0 px-3 py-1.5 text-[11px] text-(--vscode-errorForeground) border-t border-(--vscode-editorGroup-border)"
							role="alert">
							{commitError}
						</div>
					)}

					{/* Footer — icons only, each with a balloon tooltip. */}
					<div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-t border-(--vscode-editorGroup-border) bg-(--vscode-editor-background) text-[11px]">
						<div className="flex items-center gap-2">
							<BalloonTooltip label={tr("footerRefreshTooltip")}>
								<button
									aria-label={tr("footerRefreshTooltip")}
									className="flex items-center text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
									disabled={!expandedProvider || modelsLoading}
									onClick={handleRefreshModels}
									type="button">
									<RefreshCw className={modelsLoading ? "animate-spin" : ""} size={12} />
								</button>
							</BalloonTooltip>
							<BalloonTooltip label={tr("footerEditTooltip")}>
								<button
									aria-label={tr("footerEditTooltip")}
									className="flex items-center text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) transition-colors cursor-pointer"
									onClick={() => {
										setOpen(false)
										window.dispatchEvent(new CustomEvent("icline:navigate-to-settings-model-picker"))
									}}
									type="button">
									<Pencil size={12} />
								</button>
							</BalloonTooltip>
						</div>
						<span className="truncate text-(--vscode-charts-green)">
							{tr("activePrefix")} · {modelDisplayName}
						</span>
					</div>
				</div>

				{/* Anchored outside the picker; the list above stays scrollable. */}
				{renderOptionsPanel()}
			</PopoverContent>

			{/*
			 * The active model's status, split out of the model-name button (smoke 2026-09-20:
			 * the icons were glued to the picker trigger, so raising the Effort of the model in
			 * use meant opening the model list and finding its row). Clicking it opens the SAME
			 * Options surface the picker's rows show, for the ACTIVE model — Thinking/Effort can
			 * be changed without switching models.
			 */}
			{showStatusTrigger && (
				<Popover onOpenChange={handleStatusOptionsOpenChange} open={statusOptionsOpen}>
					<PopoverTrigger asChild>
						<button
							aria-label={tr("statusOptionsTooltip")}
							className="ml-0.5 inline-flex items-center text-xs px-1 py-0.5 rounded-sm text-(--vscode-descriptionForeground) hover:bg-(--vscode-list-hoverBackground) hover:text-(--vscode-foreground) disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
							data-icline-model-status-button=""
							disabled={disabled}
							ref={statusTriggerRef}
							type="button">
							{/* The icons keep their own balloons; the button's own name is its a11y label. */}
							<ModelStatusIcons status={currentStatus} tr={tr} />
						</button>
					</PopoverTrigger>
					{/*
					 * Both menus follow the shared anchoring rule (`@/icline/menuPopover`): the
					 * LEFT edge of the panel on the left edge of the button that opened it while
					 * the pane can hold it there — the ~930px working pane — and the older
					 * right-edge anchoring once it cannot, so a squeezed sidebar still shows the
					 * whole panel instead of losing it off the side of the pane. Radix keeps
					 * nudging either one back into view; that collision shift is intended, and
					 * disabling it would let the panel be clipped by the webview edge instead.
					 */}
					<PopoverContent
						align={statusOptionsAlign}
						className={cn("relative p-0 gap-0", MENU_SURFACE_CLASS)}
						data-icline-status-options=""
						side="top"
						style={{ width: OPTIONS_PANEL_WIDTH_PX }}>
						<div className="overflow-y-auto px-3 py-2.5" style={{ maxHeight: OPTIONS_PANEL_MAX_HEIGHT_PX }}>
							<ModelOptionsPanel
								effortOutcome={currentEffortOutcome}
								modelId={currentModelId}
								modelInfo={currentModelInfo}
								onEffortChange={(targetProviderId, targetModelId, effort) =>
									void handleEffortChange(targetProviderId, targetModelId, effort)
								}
								onThinkingToggle={(targetProviderId, targetModelId, targetInfo, next) =>
									void handleThinkingToggle(targetProviderId, targetModelId, targetInfo, next)
								}
								providerId={currentProvider}
								status={currentStatus}
								tr={tr}
							/>
						</div>
					</PopoverContent>
				</Popover>
			)}
		</Popover>
	)
}
