import { Empty } from "@shared/proto/cline/common"
import type { ProviderListing } from "@shared/proto/cline/models"
import { useCallback, useEffect, useState } from "react"
import { ModelsServiceClient } from "@/services/grpc-client"

/**
 * Module-level shared cache + subscribers. Every hook instance (Settings
 * provider dropdowns, the Custom providers card, the quick model picker, the
 * stats card) must see provider create/edit/delete immediately — per-instance
 * state kept showing a stale list after a mutation refreshed only the mutating
 * component's copy ("รายการไม่อัปเดตจนรีโหลด").
 */
let cachedProviders: ProviderListing[] = []
const listeners = new Set<(providers: ProviderListing[]) => void>()

async function fetchListings(): Promise<ProviderListing[]> {
	try {
		const response = await ModelsServiceClient.listProviders(Empty.create())
		cachedProviders = response.providers
	} catch (err) {
		// Keep the previous cache on a failed refresh so a flake cannot blank
		// every provider dropdown at once.
		console.error("Failed to list provider catalog entries:", err instanceof Error ? err : new Error(String(err)))
	}
	for (const listener of listeners) {
		listener(cachedProviders)
	}
	return cachedProviders
}

export function useProviderListings() {
	const [providers, setProviders] = useState<ProviderListing[]>(cachedProviders)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<Error | undefined>(undefined)

	const refresh = useCallback(async () => {
		setIsLoading(true)
		setError(undefined)
		try {
			return await fetchListings()
		} catch (err) {
			const normalizedError = err instanceof Error ? err : new Error(String(err))
			setError(normalizedError)
			return cachedProviders
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		const listener = (next: ProviderListing[]) => setProviders(next)
		listeners.add(listener)
		setProviders(cachedProviders)
		void refresh()
		return () => {
			listeners.delete(listener)
		}
	}, [refresh])

	return { providers, isLoading, error, refresh }
}
