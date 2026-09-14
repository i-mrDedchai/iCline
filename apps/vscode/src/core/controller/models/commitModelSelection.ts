import { toLegacyApiProvider } from "@/shared/model-catalog/provider-helpers"
import { Empty } from "@/shared/proto/cline/common"
import { CommitModelSelectionRequest } from "@/shared/proto/cline/models"
import { getProviderModelIdKey } from "@/shared/storage/provider-keys"
import {
	hasProviderCatalogStateController,
	type ProviderCatalogController,
	parseModeRequest,
	parseProviderIdRequest,
	toModelSelection,
} from "./providerCatalogShared"

export async function commitModelSelection(
	controller: ProviderCatalogController,
	request: CommitModelSelectionRequest,
): Promise<Empty> {
	const providerId = parseProviderIdRequest(request.providerId)
	const mode = parseModeRequest(request.mode)
	const selection = toModelSelection(request, providerId)
	const previousApiConfiguration = hasProviderCatalogStateController(controller)
		? controller.stateManager.getApiConfiguration?.()
		: undefined
	controller.getProviderConfigStore().commitSelection(providerId, mode, selection)

	if (hasProviderCatalogStateController(controller)) {
		controller.stateManager.setGlobalStateBatch({
			[`${mode}ModeApiProvider`]: toLegacyApiProvider(providerId.toString()),
			[getProviderModelIdKey(toLegacyApiProvider(providerId.toString()), mode)]: selection.modelId,
		})
		await controller.stateManager.flushPendingState?.()
		const nextApiConfiguration = controller.stateManager.getApiConfiguration?.()
		if (nextApiConfiguration) {
			controller.handleApiConfigurationChanged?.(previousApiConfiguration ?? {}, nextApiConfiguration)
		}
		// A picker commit changes state the chat view renders (active provider +
		// model label both read `apiConfiguration` from pushed state), so push
		// the updated state instead of waiting for an unrelated action (e.g.
		// sending a message) to refresh it. Regression from the v4.0.0 merge
		// (smoke 2026-09-14): without this push a picker click could look like
		// a no-op until something else pushed state.
		await controller.postStateToWebview?.()
	}

	return Empty.create()
}
