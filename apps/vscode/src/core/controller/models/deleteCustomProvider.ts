import { deleteLocalProvider } from "@cline/core"
import type { ApiConfiguration, ApiProvider } from "@shared/api"
import type { StringRequest } from "@shared/proto/cline/common"
import type { ProviderListingsResponse } from "@shared/proto/cline/models"
import { getProviderSettingsManager } from "@/sdk/provider-migration"
import type { Controller } from "../index"
import { assertListedCustomProvider, finishCustomProviderMutation, requireCustomProviderId } from "./customProviderShared"
import { normalizeProviderSwitchModel } from "./providerSwitchNormalization"

/**
 * Delete a user-created custom provider. Refuses built-in providers, cleans
 * every layer (models.json, providers.json, registry, live models cache) and
 * keeps the workspace usable when the deleted provider was the active one:
 * the affected mode(s) fall back to the other mode's provider when it is
 * still valid, else to the settings form's own fallback convention
 * ("anthropic"), with the model slots re-resolved for the new provider.
 */
export async function deleteCustomProvider(controller: Controller, request: StringRequest): Promise<ProviderListingsResponse> {
	const providerId = requireCustomProviderId(request.value)
	await assertListedCustomProvider(controller, providerId)

	await deleteLocalProvider(getProviderSettingsManager(), { providerId })

	const config = controller.stateManager.getApiConfiguration()
	if (config && (config.planModeApiProvider === providerId || config.actModeApiProvider === providerId)) {
		const fallback = resolveFallbackProviderId(config, providerId)
		const next: ApiConfiguration = { ...config }
		if (next.planModeApiProvider === providerId) {
			next.planModeApiProvider = fallback
			next.planModeApiModelId = undefined
			next.planModeThinkingBudgetTokens = undefined
			next.planModeReasoningEffort = undefined
		}
		if (next.actModeApiProvider === providerId) {
			next.actModeApiProvider = fallback
			next.actModeApiModelId = undefined
			next.actModeThinkingBudgetTokens = undefined
			next.actModeReasoningEffort = undefined
		}
		const normalized = normalizeProviderSwitchModel(controller.getProviderConfigStore(), config, next)
		controller.stateManager.setApiConfiguration(normalized)
		controller.handleApiConfigurationChanged(config, normalized)
		await controller.postStateToWebview()
	}

	return finishCustomProviderMutation(controller, providerId)
}

function resolveFallbackProviderId(config: ApiConfiguration, deletedId: string): ApiProvider {
	const planProvider = config.planModeApiProvider
	const actProvider = config.actModeApiProvider
	// Prefer the other mode's provider when it survives the delete; otherwise
	// the ApiOptions display fallback convention.
	const other = planProvider === deletedId ? actProvider : planProvider
	if (other && other !== deletedId) {
		return other
	}
	return "anthropic"
}
