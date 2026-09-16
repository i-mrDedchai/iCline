/**
 * Settings Cline Usage-Billing list policy. Quick Picker must call this —
 * it is not allowed its own :free heuristic for provider id "cline".
 */
import { CLINE_RECOMMENDED_MODELS_FALLBACK } from "@shared/cline/recommended-models"
import { EmptyRequest } from "@shared/proto/cline/common"
import { type ClineRecommendedModel, ClineRecommendedModelsResponse } from "@shared/proto/cline/models"
import { filterOpenRouterModelIds } from "@shared/utils/model-filters"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { compareModelEntries, type ModelEntry, type ModelInfoLike } from "@/components/chat/quickModelPickerList"
import { ModelsServiceClient } from "@/services/grpc-client"

const CLINE_RECOMMENDED_MODELS_RETRY_DELAY_MS = 5000

const FALLBACK_FREE_IDS = CLINE_RECOMMENDED_MODELS_FALLBACK.free.map((model) => model.id)

/** Same filter Settings' Cline dropdown uses: drop :free except allowlist + exceptions. */
export function filterClineSettingsModelIds(modelIds: string[], freeAllowlist: string[]): string[] {
	return filterOpenRouterModelIds(modelIds, "cline", freeAllowlist)
}

export type ClineFeaturedModel = {
	id?: string
	name?: string
	tags?: string[]
}

export type ClinePickerRow = {
	id: string
	info: ModelInfoLike
	badge?: string
}

function featuredBadge(tags: string[] | undefined, fallback: string): string {
	const first = tags?.find((tag) => typeof tag === "string" && tag.trim().length > 0)
	return first ? first.toUpperCase() : fallback
}

function featuredRow(
	model: ClineFeaturedModel,
	catalog: Map<string, ModelInfoLike>,
	fallbackBadge: string,
): ClinePickerRow | null {
	const id = model.id?.trim()
	if (!id) {
		return null
	}
	const cat = catalog.get(id)
	return {
		id,
		info: { name: cat?.name || model.name || id },
		badge: featuredBadge(model.tags, fallbackBadge),
	}
}

/**
 * Settings Free/Recommended featured lists win over the picker's :free-name
 * heuristic. Featured free ids (RPC order) always land in Free even when the
 * catalog name has no `:free`. Featured recommended keep NEW/BEST badges.
 * Remaining catalog ids go to Standard. Featured ids missing from the catalog
 * are still shown — Settings cards work that way.
 */
export function partitionClinePickerSections(
	catalogEntries: ModelEntry[],
	featuredRecommended: readonly ClineFeaturedModel[],
	featuredFree: readonly ClineFeaturedModel[],
	activeModelId?: string | null,
): { recommended: ClinePickerRow[]; free: ClinePickerRow[]; standard: ClinePickerRow[] } {
	const catalog = new Map<string, ModelInfoLike>(catalogEntries)

	const freeIds = new Set<string>()
	const free: ClinePickerRow[] = []
	for (const model of featuredFree) {
		const row = featuredRow(model, catalog, "FREE")
		if (!row || freeIds.has(row.id) || !catalog.has(row.id)) {
			continue
		}
		freeIds.add(row.id)
		free.push(row)
	}

	const recommendedIds = new Set<string>()
	const recommended: ClinePickerRow[] = []
	for (const model of featuredRecommended) {
		const row = featuredRow(model, catalog, "NEW")
		if (!row || recommendedIds.has(row.id) || freeIds.has(row.id) || !catalog.has(row.id)) {
			continue
		}
		recommendedIds.add(row.id)
		recommended.push(row)
	}

	const used = new Set<string>([...freeIds, ...recommendedIds])
	const rest = catalogEntries.filter(([id]) => !used.has(id))
	rest.sort((a, b) => compareModelEntries({ id: a[0], name: a[1]?.name }, { id: b[0], name: b[1]?.name }, activeModelId))
	const standard = rest.map(([id, info]) => ({ id, info }))

	return { recommended, free, standard }
}

/**
 * Fetches the Cline recommended/free RPC (same as Settings) and exposes the
 * free-id allowlist used by `filterClineSettingsModelIds`. Falls back to
 * `CLINE_RECOMMENDED_MODELS_FALLBACK.free` when RPC free list is empty.
 */
export function useClineSettingsModelList(): {
	recommended: ClineRecommendedModel[]
	free: ClineRecommendedModel[]
	freeAllowlist: string[]
	refresh: () => Promise<boolean>
} {
	const [recommended, setRecommended] = useState<ClineRecommendedModel[]>([])
	const [free, setFree] = useState<ClineRecommendedModel[]>([])
	const hasSuccessfulFetchRef = useRef(false)
	const isFetchingRef = useRef(false)
	const retryTimeoutRef = useRef<number | null>(null)

	const refresh = useCallback(async (): Promise<boolean> => {
		try {
			const response = await ModelsServiceClient.makeUnaryRequest(
				"refreshClineRecommendedModelsRpc",
				EmptyRequest.create({}),
				EmptyRequest.toJSON,
				ClineRecommendedModelsResponse.fromJSON,
			)
			setRecommended(response.recommended ?? [])
			setFree(response.free ?? [])
			hasSuccessfulFetchRef.current = true
			return true
		} catch (error) {
			console.error("Failed to refresh Cline recommended models:", error)
			return false
		}
	}, [])

	const clearRetry = useCallback(() => {
		if (retryTimeoutRef.current !== null) {
			window.clearTimeout(retryTimeoutRef.current)
			retryTimeoutRef.current = null
		}
	}, [])

	const fetchOnce = useCallback(async () => {
		if (hasSuccessfulFetchRef.current || isFetchingRef.current) {
			return
		}
		isFetchingRef.current = true
		const succeeded = await refresh()
		isFetchingRef.current = false

		if (succeeded) {
			hasSuccessfulFetchRef.current = true
			clearRetry()
			return
		}

		if (retryTimeoutRef.current === null) {
			retryTimeoutRef.current = window.setTimeout(() => {
				retryTimeoutRef.current = null
				void fetchOnce()
			}, CLINE_RECOMMENDED_MODELS_RETRY_DELAY_MS)
		}
	}, [clearRetry, refresh])

	useEffect(() => {
		void fetchOnce()
		return () => {
			clearRetry()
		}
	}, [clearRetry, fetchOnce])

	const freeAllowlist = useMemo(() => {
		const ids = free.length > 0 ? free.map((model) => model.id).filter(Boolean) : FALLBACK_FREE_IDS
		return [...new Set(ids)]
	}, [free])

	return { recommended, free, freeAllowlist, refresh }
}
