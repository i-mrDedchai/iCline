import { addLocalProvider, deriveEndpointModelsUrl } from "@cline/core"
import type { CustomProviderMutationRequest, ProviderListingsResponse } from "@shared/proto/cline/models"
import { getProviderSettingsManager } from "@/sdk/provider-migration"
import type { Controller } from "../index"
import { finishCustomProviderMutation, requireCustomProviderId, requireCustomProviderName } from "./customProviderShared"

/**
 * Create a user-owned custom provider (multi-provider management). The
 * provider is written to models.json + providers.json and registered live.
 *
 * Failures reject with the reason — never a silent empty success (the
 * fix.40 lesson: an error must not masquerade as an empty result).
 */
export async function createCustomProvider(
	controller: Controller,
	request: CustomProviderMutationRequest,
): Promise<ProviderListingsResponse> {
	const providerId = requireCustomProviderId(request.providerId)
	const name = requireCustomProviderName(request.name)
	const baseUrl = request.baseUrl?.trim() ?? ""
	const apiKey = request.apiKey?.trim() ?? ""

	// core's addLocalProvider treats an empty baseUrl+apiKey pair as a
	// delete request (legacy compat) — a create must never reach that path,
	// and a custom provider needs an endpoint anyway.
	if (!baseUrl) {
		throw new Error("baseUrl is required")
	}

	// Auto-derive modelsSourceUrl from baseUrl if not explicitly provided
	const derivedModelsSourceUrl = request.modelsSourceUrl?.trim() || deriveEndpointModelsUrl(baseUrl)

	if (request.models.length === 0 && !derivedModelsSourceUrl) {
		throw new Error("at least one model id (or a models source URL) is required")
	}

	await addLocalProvider(getProviderSettingsManager(), {
		providerId,
		name,
		baseUrl,
		apiKey: apiKey || undefined,
		headers: Object.keys(request.headers ?? {}).length > 0 ? request.headers : undefined,
		timeoutMs: request.timeoutMs,
		models: request.models.length > 0 ? request.models : undefined,
		defaultModelId: request.defaultModelId?.trim() || undefined,
		modelsSourceUrl: derivedModelsSourceUrl,
	})

	return finishCustomProviderMutation(controller, providerId)
}
