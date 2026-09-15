import type { Mode, ProviderId } from "@/sdk/model-catalog/contracts"
import type { ApiConfiguration } from "@/shared/api"
import { toLegacyApiProvider } from "@/shared/model-catalog/provider-helpers"
import { Empty } from "@/shared/proto/cline/common"
import { CommitModelSelectionRequest } from "@/shared/proto/cline/models"
import { getProviderDefaultModelId, getProviderModelIdKey } from "@/shared/storage/provider-keys"
import type { GlobalStateAndSettings, SettingsKey } from "@/shared/storage/state-keys"
import {
	hasProviderCatalogStateController,
	type ProviderCatalogController,
	parseModeRequest,
	parseProviderIdRequest,
	toModelSelection,
} from "./providerCatalogShared"

function readConfigString(config: ApiConfiguration | undefined, key: SettingsKey): string {
	const value = config?.[key as keyof ApiConfiguration]
	return typeof value === "string" ? value.trim() : ""
}

/**
 * Empty/omitted modelId (Settings provider switch without a model click) must
 * resolve against the TARGET provider's dedicated slot or that provider's
 * default. Never copy leftover *ModeApiModelId (e.g. grok-composer-2.5-fast)
 * into cline/jan/openrouter.
 */
function resolveCommitModelId(
	request: CommitModelSelectionRequest,
	providerId: ProviderId,
	mode: Mode,
	controller: ProviderCatalogController,
	apiConfig: ApiConfiguration | undefined,
): string {
	const requested = request.modelId?.trim()
	if (requested) {
		return requested
	}

	const legacyProvider = toLegacyApiProvider(providerId.toString())
	const dedicatedKey = getProviderModelIdKey(legacyProvider, mode)
	const genericKey = `${mode}ModeApiModelId` as SettingsKey

	if (dedicatedKey !== genericKey) {
		const dedicatedId = readConfigString(apiConfig, dedicatedKey)
		if (dedicatedId) {
			return dedicatedId
		}
	}

	const remembered = controller.getProviderConfigStore().readSelection(providerId, mode)?.modelId?.trim()
	if (remembered) {
		return remembered
	}

	if (dedicatedKey === genericKey) {
		const slotId = readConfigString(apiConfig, dedicatedKey)
		if (slotId) {
			return slotId
		}
	}

	const fallback = getProviderDefaultModelId(legacyProvider)?.trim()
	if (fallback) {
		return fallback
	}

	throw new Error("model_id is required")
}

export async function commitModelSelection(
	controller: ProviderCatalogController,
	request: CommitModelSelectionRequest,
): Promise<Empty> {
	const providerId = parseProviderIdRequest(request.providerId)
	// Empty/omitted mode (webview race) falls back to the host's current mode
	// rather than throwing — a throw here looks like a dead picker click.
	const requestedMode = request.mode?.trim()
	const modeFromState =
		hasProviderCatalogStateController(controller) && controller.stateManager.getGlobalSettingsKey?.("mode") === "plan"
			? "plan"
			: "act"
	const mode = parseModeRequest(requestedMode || modeFromState)
	const previousApiConfiguration = hasProviderCatalogStateController(controller)
		? controller.stateManager.getApiConfiguration?.()
		: undefined
	const modelId = resolveCommitModelId(request, providerId, mode, controller, previousApiConfiguration)
	const selection = toModelSelection({ ...request, modelId }, providerId)

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
			// Dedicated key only. When it equals *ModeApiModelId (xai/anthropic/
			// deepseek) that single write updates the shared slot; do not also
			// assign genericKey — that would copy jan/sakana/zenmux ids into
			// xAI's leftover slot.
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
