// Host-side answer to "what will this Effort selection really send?".
//
// Effort is stored once per MODE (`planModeReasoningEffort` /
// `actModeReasoningEffort`), not per model, and every Settings/Quick Picker
// dropdown deliberately offers the app's full stored vocabulary. A level can
// therefore be in force for a model that does not accept it: the SDK gateway
// clamps it (`max` on a model whose top level is `xhigh` reaches the provider as
// `xhigh`; a model with no effort control gets no effort at all) and, until this
// module, nothing told the user.
//
// The answer is not a second opinion: it calls `decideReasoningEffort` — the very
// function `normalizeReasoningRequest` calls for every request — with the model's
// controls read from the same registry the gateway resolves the model from. A UI
// built on it can be wrong only if the gateway is wrong.
//
// The webview cannot import `@cline/llms` (no workspace alias, node-only build),
// so this boundary exists to hand it a plain, serializable answer.

import { decideReasoningEffort, getProviderCollectionSync, type ReasoningEffort, type ReasoningEffortDecision } from "@cline/llms"
import type { ModelReasoningOption } from "@cline/shared"
import { isReasoningEffortValue } from "@shared/storage/types"
import { toSdkProviderId } from "./model-catalog/sdk-provider-id"

/** Where the model's reasoning controls came from. */
export type ReasoningEffortControlSource = "sdk-registry" | "registry-missing-model"

export interface ReasoningEffortOutcome extends ReasoningEffortDecision {
	/** Provider id the caller asked about (the app's spelling). */
	providerId: string
	/** Model id the caller asked about. */
	modelId: string
	/** SDK spelling of the provider used for the registry lookup. */
	sdkProviderId: string
	/** Registry entry the controls came from, when one was found. */
	registryModelId?: string
	source: ReasoningEffortControlSource
	/**
	 * The app sends a thinking BUDGET instead of an effort when one is set (both
	 * would be rejected by providers such as Anthropic/OpenRouter), so the effort
	 * this object describes never leaves the host. The UI must stay quiet in that
	 * case rather than claiming a level is in force.
	 */
	suppressedByBudget: boolean
}

interface RegistryModelControls {
	id: string
	reasoningOptions?: readonly ModelReasoningOption[]
}

/**
 * The model entry the gateway resolves for this id.
 *
 * The lookup is deliberately EXACT and nothing more. The gateway resolves a model
 * with `provider.models.find((entry) => entry.id === modelId)` and falls back to
 * an option-less definition, so any friendlier matching here (last-segment aliases
 * — `deepseek/deepseek-flash-latest` against the registry's
 * `~deepseek/deepseek-flash-latest`, for instance) would report levels the request
 * never uses. Unknown ids stay unknown: they get the SDK's conservative mapping.
 */
function findRegistryModel(sdkProviderId: string, modelId: string): RegistryModelControls | undefined {
	const model = getProviderCollectionSync(sdkProviderId)?.models[modelId]
	return model ? { id: modelId, reasoningOptions: model.reasoningOptions } : undefined
}

/**
 * The Effort levels one model really accepts, straight from the registry entry the
 * gateway resolves — the answer a control can offer as "levels this model takes".
 *
 * Empty when the catalog carries no entry for the id or advertises no levels (a
 * toggle-only model), which is itself worth saying: the UI must not offer six levels
 * to a model whose wire format has one.
 *
 * The levels come from `decideReasoningEffort` — the same function the request path
 * calls — so a control built on them can be wrong only if the wire is.
 */
export function resolveReasoningModelLevels(input: { providerId: string; modelId: string }): ReasoningModelLevels {
	const model = findRegistryModel(toSdkProviderId(input.providerId), input.modelId)
	return {
		...(model ? { registryModelId: model.id } : {}),
		source: model ? "sdk-registry" : "registry-missing-model",
		// The requested level does not affect `supportedEfforts`; any probe answers the
		// model's advertised set identically.
		supportedEfforts: decideReasoningEffort({
			effort: "medium",
			reasoningOptions: model?.reasoningOptions,
		}).supportedEfforts,
	}
}

export interface ReasoningModelLevels {
	/** Levels the model advertises, ascending (empty when it has no level control). */
	supportedEfforts: readonly ReasoningEffort[]
	/** Registry entry the levels came from, when the catalog has one. */
	registryModelId?: string
	source: ReasoningEffortControlSource
}

/**
 * Resolve what a stored Effort value sends for one model — or `undefined` when
 * there is nothing to report (`none`/empty, or a value the app cannot forward).
 */
export function resolveReasoningEffortOutcome(input: {
	providerId: string
	modelId: string
	effort?: string | null
	/** Thinking budget in force for this provider+mode, when one is set. */
	thinkingBudgetTokens?: number | null
}): ReasoningEffortOutcome | undefined {
	const effort = input.effort?.trim()
	// `none` means "send no reasoning field at all" and is handled by the app
	// itself — there is no level to downgrade.
	if (!effort || !isReasoningEffortValue(effort)) {
		return undefined
	}

	const sdkProviderId = toSdkProviderId(input.providerId)
	const model = findRegistryModel(sdkProviderId, input.modelId)
	return {
		providerId: input.providerId,
		modelId: input.modelId,
		sdkProviderId,
		...(model ? { registryModelId: model.id } : {}),
		source: model ? "sdk-registry" : "registry-missing-model",
		suppressedByBudget: typeof input.thinkingBudgetTokens === "number" && input.thinkingBudgetTokens > 0,
		...decideReasoningEffort({ effort, reasoningOptions: model?.reasoningOptions }),
	}
}
