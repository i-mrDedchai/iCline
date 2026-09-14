/**
 * Pure list helpers for QuickModelPicker (Set A): free/standard partition,
 * search filter, and active-first A–Z sort. Kept free of React for vitest.
 */

export type ModelInfoLike = { name?: string } & Record<string, unknown>

export type ModelEntry = [string, ModelInfoLike]

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
export function filterModelsByQuery(models: Record<string, ModelInfoLike | undefined>, query: string): ModelEntry[] {
	const entries = Object.entries(models).map(([id, info]) => [id, (info ?? {}) as ModelInfoLike] as ModelEntry)
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
export function modelsMatchQuery(models: Record<string, ModelInfoLike | undefined>, query: string): boolean {
	return filterModelsByQuery(models, query).length > 0
}
