/**
 * Pure list helpers for QuickModelPicker (Set A + A.1): free/standard partition,
 * search filter, active-first A–Z sort, and warm cross-provider model match.
 * Kept free of React for vitest.
 */

/** Minimal shape for search/display — ModelInfo structurally satisfies this. */
export type ModelInfoLike = { name?: string }

export type ModelEntry = [string, ModelInfoLike]

export type ProviderLike = { id: string; name?: string }

/** Accepts `Record<string, ModelInfo>` / warm map slices without casts. */
export type ModelsById = { readonly [id: string]: { name?: string } | undefined }

/** Warm catalog slice: provider id → cached models (may be missing until expand/Refresh). */
export type WarmModelsByProvider = {
	readonly [providerId: string]: { readonly models?: ModelsById } | undefined
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
 * Sort comparator: active model first, then A–Z by display name (name||id)
 * with localeCompare base sensitivity.
 */
export function compareModelEntries(
	a: { id: string; name?: string },
	b: { id: string; name?: string },
	activeModelId?: string | null,
): number {
	const aActive = !!activeModelId && a.id === activeModelId
	const bActive = !!activeModelId && b.id === activeModelId
	if (aActive && !bActive) {
		return -1
	}
	if (bActive && !aActive) {
		return 1
	}
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
 * Sort entries (active first, then A–Z), then partition into Free then Standard.
 * Does not mutate the input array.
 */
export function partitionFreeStandard(
	entries: ModelEntry[],
	activeModelId?: string | null,
): { free: ModelEntry[]; standard: ModelEntry[] } {
	const sorted = [...entries].sort((a, b) =>
		compareModelEntries({ id: a[0], name: a[1]?.name }, { id: b[0], name: b[1]?.name }, activeModelId),
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
