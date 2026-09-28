import { ProviderListingsResponse } from "@shared/proto/cline/models"
import { StateManager } from "@/core/storage/StateManager"
import type { ProviderCatalogController } from "./providerCatalogShared"
import { toProviderListingProto } from "./providerCatalogShared"

/**
 * Custom provider ids are permanent slugs: they key models.json entries,
 * providers.json settings, model selections and the live models cache, so
 * they stay lowercase and filesystem/URL-friendly, and are immutable once
 * created (only the display name can change).
 */
export const CUSTOM_PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/

export function requireCustomProviderId(raw: string): string {
	const providerId = raw.trim().toLowerCase()
	if (!CUSTOM_PROVIDER_ID_PATTERN.test(providerId)) {
		throw new Error(
			`invalid custom provider id "${raw}" — use lowercase letters, digits, ".", "_" or "-" and start with a letter or digit`,
		)
	}
	return providerId
}

export function requireCustomProviderName(raw: string | undefined): string {
	const name = raw?.trim() ?? ""
	if (!name) {
		throw new Error("name is required")
	}
	return name
}

/**
 * Rebuild the provider listings from the live catalog. Call after
 * {@link finishCustomProviderMutation} so the response reflects the mutation.
 */
export async function readProviderListingsResponse(controller: ProviderCatalogController): Promise<ProviderListingsResponse> {
	const providers = await controller.getProviderCatalog().listProviders()
	return ProviderListingsResponse.create({ providers: providers.map(toProviderListingProto) })
}

/**
 * Guard for update/delete: only user-created custom providers (registry
 * source "file") may be mutated. Built-in catalog entries are protected at
 * the host, not just by the UI not offering the buttons.
 */
export async function assertListedCustomProvider(controller: ProviderCatalogController, providerId: string): Promise<void> {
	const providers = await controller.getProviderCatalog().listProviders()
	const listing = providers.find((provider) => provider.id === providerId)
	if (!listing) {
		throw new Error(`provider "${providerId}" does not exist`)
	}
	if (!listing.isCustom) {
		throw new Error(`provider "${providerId}" is built-in and cannot be modified`)
	}
}

/**
 * Post-mutation bookkeeping shared by create/update/delete:
 * - invalidate the cached provider listings so every dropdown sees the change;
 * - drop the live models cache for the id so /models metadata from the
 *   previous endpoint story cannot linger (same contract as the refresh
 *   handlers: caches clear whenever the endpoint's answer may have changed).
 */
export async function finishCustomProviderMutation(
	controller: ProviderCatalogController,
	providerId: string,
): Promise<ProviderListingsResponse> {
	controller.getProviderCatalog().invalidateProviderListings()
	try {
		StateManager.get().setCustomProviderModelsCache(providerId, {})
	} catch {
		// Best-effort cache hygiene: a cache problem must not fail the
		// mutation after the fact.
	}
	return readProviderListingsResponse(controller)
}
