import { toLegacyApiProvider } from "@/shared/model-catalog/provider-helpers"
import { Empty } from "@/shared/proto/cline/common"
import { CommitModelSelectionRequest } from "@/shared/proto/cline/models"
import { getProviderModelIdKey } from "@/shared/storage/provider-keys"
import type { GlobalStateAndSettings } from "@/shared/storage/state-keys"
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

	// Flip active provider+model through shadowing layers BEFORE store.commitSelection.
	// store.commitSelection writes model id (and info) via setGlobalStateBatch only —
	// if that runs first while task/session still pin the old provider, readers
	// briefly (or durably) see pairs like `xai` + `glm-5.3-flash` (shared apiModelId).
	if (hasProviderCatalogStateController(controller)) {
		const legacyProvider = toLegacyApiProvider(providerId.toString())
		// Mirror store.syncedModes: when plan/act share models, keep both
		// providers in sync so switching mode does not resurrect the old one.
		const separate = controller.stateManager.getGlobalSettingsKey?.("planActSeparateModelsSetting") === true
		const modes = separate ? [mode] : (["plan", "act"] as const)
		const updates: Partial<GlobalStateAndSettings> = {}
		for (const targetMode of modes) {
			// Object.assign avoids TS2322 on Partial<GlobalStateAndSettings> indexed
			// writes (SettingsKey values are a wide union; string is not assignable
			// to every member). Same computed-key pattern as setGlobalStateBatch.
			Object.assign(updates, {
				[`${targetMode}ModeApiProvider`]: legacyProvider,
				[getProviderModelIdKey(legacyProvider, targetMode)]: selection.modelId,
			})
		}

		const taskId = controller.task?.taskId
		if (typeof controller.stateManager.setSettingsWriteThrough === "function") {
			controller.stateManager.setSettingsWriteThrough(updates, taskId)
		} else {
			controller.stateManager.setGlobalStateBatch(updates)
		}
	}

	controller.getProviderConfigStore().commitSelection(providerId, mode, selection)

	if (hasProviderCatalogStateController(controller)) {
		await controller.stateManager.flushPendingState?.()
		const nextApiConfiguration = controller.stateManager.getApiConfiguration?.()
		if (nextApiConfiguration) {
			controller.handleApiConfigurationChanged?.(previousApiConfiguration ?? {}, nextApiConfiguration)
		}
		// Push so the chat header/footer re-render without waiting for another action.
		await controller.postStateToWebview?.()
	}

	return Empty.create()
}
