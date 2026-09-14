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
	controller.getProviderConfigStore().commitSelection(providerId, mode, selection)

	if (hasProviderCatalogStateController(controller)) {
		const legacyProvider = toLegacyApiProvider(providerId.toString())
		// Mirror store.syncedModes: when plan/act share models, keep both
		// providers in sync so switching mode does not resurrect the old one.
		const separate = controller.stateManager.getGlobalSettingsKey?.("planActSeparateModelsSetting") === true
		const modes = separate ? [mode] : (["plan", "act"] as const)
		const updates: Partial<GlobalStateAndSettings> = {}
		for (const targetMode of modes) {
			updates[`${targetMode}ModeApiProvider`] = legacyProvider
			updates[getProviderModelIdKey(legacyProvider, targetMode)] = selection.modelId
		}

		// Critical: getApiConfiguration reads remote > session > task > global.
		// Writing only global (setGlobalStateBatch) is shadowed by task/session
		// overrides — smoke 2026-09-14 showed cross-provider picker clicks leave
		// actModeApiProvider stuck (e.g. "cline") while actModeApiModelId updates,
		// producing badges like "Cline · claude-opus-5" and a stale picker check.
		const taskId = controller.task?.taskId
		if (typeof controller.stateManager.setSettingsWriteThrough === "function") {
			controller.stateManager.setSettingsWriteThrough(updates, taskId)
		} else {
			controller.stateManager.setGlobalStateBatch(updates)
		}

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
