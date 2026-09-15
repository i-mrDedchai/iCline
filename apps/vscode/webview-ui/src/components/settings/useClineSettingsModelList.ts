/**
 * Settings Cline Usage-Billing list policy. Quick Picker must call this —
 * it is not allowed its own :free heuristic for provider id "cline".
 */
import { CLINE_RECOMMENDED_MODELS_FALLBACK } from "@shared/cline/recommended-models"
import { EmptyRequest } from "@shared/proto/cline/common"
import { type ClineRecommendedModel, ClineRecommendedModelsResponse } from "@shared/proto/cline/models"
import { filterOpenRouterModelIds } from "@shared/utils/model-filters"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ModelsServiceClient } from "@/services/grpc-client"

const CLINE_RECOMMENDED_MODELS_RETRY_DELAY_MS = 5000

const FALLBACK_FREE_IDS = CLINE_RECOMMENDED_MODELS_FALLBACK.free.map((model) => model.id)

/** Same filter Settings' Cline dropdown uses: drop :free except allowlist + exceptions. */
export function filterClineSettingsModelIds(modelIds: string[], freeAllowlist: string[]): string[] {
	return filterOpenRouterModelIds(modelIds, "cline", freeAllowlist)
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

	return { recommended, free, freeAllowlist }
}
