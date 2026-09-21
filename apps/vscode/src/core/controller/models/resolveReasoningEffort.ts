import { resolveReasoningEffortOutcome, resolveReasoningModelLevels } from "@/sdk/reasoning-effort-decision"
import { ResolveReasoningEffortRequest, ResolveReasoningEffortResponse } from "@/shared/proto/cline/models"
import { type ProviderCatalogController, parseProviderIdRequest } from "./providerCatalogShared"

/**
 * What a stored Effort level really sends for a provider+model.
 *
 * Effort is stored per mode, so a level can be in force for a model that does not
 * accept it; the SDK gateway then clamps it on the way to the provider. The answer
 * comes from `@/sdk/reasoning-effort-decision`, which calls the SDK's own decision
 * function — this handler only marshals it. Nothing here reaches the network, so
 * the webview can ask on every hover without a loading state.
 *
 * A model with NO effort stored is answered too, with `supportedEfforts` filled in
 * and nothing to report about a downgrade: that is the question a control asks
 * ("which levels does this model take?") when it is drawing its list, and it must
 * not depend on a level already being set.
 */
export async function resolveReasoningEffort(
	_controller: ProviderCatalogController,
	request: ResolveReasoningEffortRequest,
): Promise<ResolveReasoningEffortResponse> {
	const providerId = parseProviderIdRequest(request.providerId)
	const modelId = request.modelId?.trim() ?? ""
	const effort = request.effort?.trim() ?? ""
	const provider = providerId.toString()

	const outcome = resolveReasoningEffortOutcome({
		providerId: provider,
		modelId,
		effort,
		thinkingBudgetTokens: request.thinkingBudgetTokens,
	})

	if (!outcome) {
		// `none`/empty/unknown value: the app forwards no effort for it, so there is
		// no downgrade to report (`clamped` stays false and callers render nothing).
		// The model's own levels are still the answer to the list question.
		const levels = resolveReasoningModelLevels({ providerId: provider, modelId })
		// "no-effort-control" only when the registry KNOWS the model and it advertises
		// no levels — a toggle-only model. A model the registry does not carry gets
		// "catalog-unknown": the app must keep offering its provider's levels rather
		// than claim the model has none.
		const reason =
			levels.supportedEfforts.length > 0
				? "not-applicable"
				: levels.source === "sdk-registry"
					? "no-effort-control"
					: "catalog-unknown"
		return ResolveReasoningEffortResponse.create({
			providerId: provider,
			modelId,
			requested: effort,
			supportedEfforts: [...levels.supportedEfforts],
			reason,
			registryModelId: levels.registryModelId,
			source: levels.source,
		})
	}

	return ResolveReasoningEffortResponse.create({
		providerId: outcome.providerId,
		modelId: outcome.modelId,
		requested: outcome.requested,
		applied: outcome.applied,
		supportedEfforts: [...outcome.supportedEfforts],
		reason: outcome.reason,
		clamped: outcome.clamped,
		suppressedByBudget: outcome.suppressedByBudget,
		registryModelId: outcome.registryModelId,
		source: outcome.source,
	})
}
