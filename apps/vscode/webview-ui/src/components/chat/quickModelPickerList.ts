/**
 * Pure list helpers for QuickModelPicker (Set A + A.1): free/standard partition,
 * search filter, A–Z sort (active stays in place), and warm cross-provider model match.
 * Kept free of React for vitest.
 */

/**
 * Minimal shape for search/display — ModelInfo structurally satisfies this. The
 * capability fields are carried through (not just `name`) so the model row and the
 * Options panel can resolve real status without casting at every call site.
 */
export type ModelInfoLike = {
	name?: string
	supportsImages?: boolean
	supportsReasoning?: boolean
	thinkingConfig?: { supportsThinkingLevel?: boolean; maxBudget?: number } | null
	/** OCA publishes the Effort levels a model accepts — the panel lists them as published. */
	reasoningEffortOptions?: readonly string[]
}

export type ModelEntry = [string, ModelInfoLike]

export type ProviderLike = { id: string; name?: string }

/** Accepts `Record<string, ModelInfo>` / warm map slices without casts. */
export type ModelsById = { readonly [id: string]: ModelInfoLike | undefined }

/** Warm catalog slice: provider id → cached models (may be missing until expand/Refresh). */
export type WarmModelsByProvider = {
	readonly [providerId: string]: { readonly models?: ModelsById } | undefined
}

export const ACTIVE_PROVIDER_ATTR = "data-icline-provider"
export const ACTIVE_MODEL_ATTR = "data-icline-current-model"

/**
 * Options-panel geometry, locked in mock v11
 * (`.icline/plans/quick-picker-redesign/mock.v11-locked-2026-09-16.html`).
 * Kept here (React-free) so the clamp maths is unit-testable.
 */
export const OPTIONS_PANEL_WIDTH_PX = 236
export const OPTIONS_PANEL_GAP_PX = 4
export const OPTIONS_PANEL_MAX_HEIGHT_PX = 320
/** Never above this: keeps the panel clear of the picker's search row. */
export const OPTIONS_PANEL_MIN_TOP_PX = 38
/** Top-align nudge applied to the hovered row. */
export const OPTIONS_PANEL_ROW_NUDGE_PX = 6
/** Breathing room kept between the panel's bottom edge and the picker's. */
export const OPTIONS_PANEL_BOTTOM_MARGIN_PX = 10

/**
 * Panel top for the hovered row — the mock's exact rule:
 *
 *   desiredTop = rowTop - pickerTop - 6
 *   maxTop     = pickerHeight - panelHeight - 10
 *   top        = max(38, min(desiredTop, maxTop))
 *
 * `panelHeight` is the panel's REAL height, not its 320px max-height: content varies per
 * model (157–264px in mock v11), and clamping against the max-height pinned every row
 * past ~90px to a single top — so the panel only appeared to follow the first few rows
 * (fix.9 report). Using the real height is also what keeps the panel's `max-height` at a
 * flat 320px: the panel always FULLY FITS above the picker's bottom margin, so there is
 * nothing for a scrollbar to do.
 *
 * The caller's layout effect must then run on the ANCHOR alone. The panel's height is
 * content, and the Thinking switch changes content, so re-running this when the content
 * changed slid the panel up or down on every click, off its own row, under the cursor
 * (dev.6-fix.27: "the Options page jumps around and is not in line with its own model
 * row", several models).
 *
 * dev.6-fix.28 tried to make that safe from the other end — pinning `top` to the row and
 * bounding the panel's height by the room left under it — and the smoke report rejected
 * the trade outright: a low row then met a scrollbar instead of a whole panel ("take the
 * scrollbar out and let it expand fully"). So the panel grows to its content, and the
 * lift is what keeps it inside the picker. A content change after placement (the clamp
 * notice appearing on a toggle) moves nothing; it only grows or shrinks the panel from
 * the top the user is already reading.
 */
export function computeOptionsPanelTop(params: {
	rowTop: number
	pickerTop: number
	pickerHeight: number
	/** The panel's rendered height for this row, measured when it was placed. */
	panelHeight: number
}): number {
	const desiredTop = params.rowTop - params.pickerTop - OPTIONS_PANEL_ROW_NUDGE_PX
	const maxTop = params.pickerHeight - params.panelHeight - OPTIONS_PANEL_BOTTOM_MARGIN_PX
	return Math.max(OPTIONS_PANEL_MIN_TOP_PX, Math.min(desiredTop, maxTop))
}

/*
 * The pane-fitting anchoring rule that used to live here (`pickOptionsPopoverAlign`) moved
 * to `@/icline/menuPopover` once it became a convention for every iCline menu rather than a
 * property of this picker: see `pickMenuPopoverAlign` / `useMenuPopoverAnchor` there.
 */

function escapeAttrSelector(value: string): string {
	if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
		return CSS.escape(value)
	}
	return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

/** Prefer the current model row; else the active provider group. */
export function queryActivePickerScrollTarget(root: ParentNode, currentProvider?: string | null): HTMLElement | null {
	const model = root.querySelector(`[${ACTIVE_MODEL_ATTR}]`)
	if (model instanceof HTMLElement) {
		return model
	}
	if (!currentProvider) {
		return null
	}
	const provider = root.querySelector(`[${ACTIVE_PROVIDER_ATTR}="${escapeAttrSelector(currentProvider)}"]`)
	return provider instanceof HTMLElement ? provider : null
}

/** True if id or name contains `:free`, `-free`, or `(free)` (case-insensitive). */
export function isFreeModel(modelId: string, name?: string): boolean {
	const matches = (s: string) => {
		const lower = s.toLowerCase()
		return lower.includes(":free") || lower.includes("-free") || lower.includes("(free)")
	}
	if (matches(modelId)) {
		return true
	}
	if (name && matches(name)) {
		return true
	}
	return false
}

/**
 * Sort comparator: A–Z by display name (name||id) with localeCompare base
 * sensitivity. The active model keeps this position (checkmark + scroll);
 * it is not pinned to the top of the group.
 */
export function compareModelEntries(a: { id: string; name?: string }, b: { id: string; name?: string }): number {
	const aLabel = a.name || a.id
	const bLabel = b.name || b.id
	return aLabel.localeCompare(bLabel, undefined, { sensitivity: "base" })
}

/** Filter model entries by query against id or name (case-insensitive). Empty query → all. */
export function filterModelsByQuery(models: ModelsById, query: string): ModelEntry[] {
	const entries = Object.entries(models).map(([id, info]) => [id, info ?? {}] as ModelEntry)
	const q = query.trim().toLowerCase()
	if (!q) {
		return entries
	}
	return entries.filter(([id, info]) => {
		const name = info?.name
		return id.toLowerCase().includes(q) || (!!name && name.toLowerCase().includes(q))
	})
}

/**
 * Sort entries A–Z, then partition into Free then Standard.
 * Does not mutate the input array. Active stays in A–Z order.
 */
export function partitionFreeStandard(entries: ModelEntry[]): { free: ModelEntry[]; standard: ModelEntry[] } {
	const sorted = [...entries].sort((a, b) =>
		compareModelEntries({ id: a[0], name: a[1]?.name }, { id: b[0], name: b[1]?.name }),
	)
	const free: ModelEntry[] = []
	const standard: ModelEntry[] = []
	for (const entry of sorted) {
		const [id, info] = entry
		if (isFreeModel(id, info?.name)) {
			free.push(entry)
		} else {
			standard.push(entry)
		}
	}
	return { free, standard }
}

/** Whether any model entry matches the query (name or id). */
export function modelsMatchQuery(models: ModelsById, query: string): boolean {
	return filterModelsByQuery(models, query).length > 0
}

function providerDisplaySort(a: ProviderLike, b: ProviderLike): number {
	return (a.name || a.id).localeCompare(b.name || b.id, undefined, { sensitivity: "base" })
}

function providerNameOrIdMatches(p: ProviderLike, qLower: string): boolean {
	return (!!p.name && p.name.toLowerCase().includes(qLower)) || p.id.toLowerCase().includes(qLower)
}

function warmModelsForProvider(warmByProvider: WarmModelsByProvider | undefined | null, providerId: string): ModelsById {
	return warmByProvider?.[providerId]?.models ?? {}
}

/**
 * Providers that match a non-empty search via provider name/id OR warm model
 * name/id (A.1 — no RPC). Sorted A–Z by display name. Empty query → [].
 *
 * Limitation: providers never warmed this session won't match on model search.
 */
export function providersMatchingModelQuery(
	providers: readonly ProviderLike[],
	warmByProvider: WarmModelsByProvider | undefined | null,
	query: string,
): ProviderLike[] {
	const q = query.trim().toLowerCase()
	if (!q) {
		return []
	}
	return [...providers].sort(providerDisplaySort).filter((p) => {
		if (providerNameOrIdMatches(p, q)) {
			return true
		}
		return modelsMatchQuery(warmModelsForProvider(warmByProvider, p.id), query)
	})
}

/**
 * Auto-expand target when search is non-empty and the current expanded group
 * has no model matches (hook ∪ warm).
 *
 * Prefer: active provider if name/id or warm models match; else first A–Z with
 * warm model match; else first A–Z provider name/id match; else null.
 */
export function pickAutoExpandProvider(
	providers: readonly ProviderLike[],
	warmByProvider: WarmModelsByProvider | undefined | null,
	query: string,
	activeProviderId?: string | null,
): string | null {
	const q = query.trim().toLowerCase()
	if (!q) {
		return null
	}

	const warmMatches = (p: ProviderLike) => modelsMatchQuery(warmModelsForProvider(warmByProvider, p.id), query)
	const nameMatches = (p: ProviderLike) => providerNameOrIdMatches(p, q)

	if (activeProviderId) {
		const active = providers.find((p) => p.id === activeProviderId)
		if (active && (nameMatches(active) || warmMatches(active))) {
			return active.id
		}
	}

	const sorted = [...providers].sort(providerDisplaySort)
	const warmHit = sorted.find(warmMatches)
	if (warmHit) {
		return warmHit.id
	}
	const nameHit = sorted.find(nameMatches)
	return nameHit?.id ?? null
}
