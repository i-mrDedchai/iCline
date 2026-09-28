import { updateLocalProvider } from "@cline/core"
import type { CustomProviderMutationRequest, ProviderListingsResponse } from "@shared/proto/cline/models"
import { getProviderSettingsManager } from "@/sdk/provider-migration"
import type { Controller } from "../index"
import { assertListedCustomProvider, finishCustomProviderMutation, requireCustomProviderId } from "./customProviderShared"

/**
 * Update a user-created custom provider. Empty fields keep their stored
 * values (the API key is write-only: an empty key never clears the stored
 * one — pass an explicit new key to rotate it). `models_source_url` is the
 * exception: sending an empty string clears it.
 */
export async function updateCustomProvider(
	controller: Controller,
	request: CustomProviderMutationRequest,
): Promise<ProviderListingsResponse> {
	const providerId = requireCustomProviderId(request.providerId)
	await assertListedCustomProvider(controller, providerId)

	await updateLocalProvider(getProviderSettingsManager(), {
		providerId,
		name: request.name?.trim() || undefined,
		baseUrl: request.baseUrl?.trim() || undefined,
		apiKey: request.apiKey?.trim() || undefined,
		headers: Object.keys(request.headers ?? {}).length > 0 ? request.headers : undefined,
		timeoutMs: request.timeoutMs,
		models: request.models.length > 0 ? request.models : undefined,
		defaultModelId: request.defaultModelId?.trim() || undefined,
		modelsSourceUrl: request.modelsSourceUrl,
	})

	return finishCustomProviderMutation(controller, providerId)
}
