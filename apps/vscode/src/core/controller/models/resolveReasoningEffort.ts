import { resolveReasoningEffortOutcome } from "@/sdk/reasoning-effort-decision"
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
 */
export async function resolveReasoningEffort(
	_controller: ProviderCatalogController,
	request: ResolveReasoningEffortRequest,
): Promise<ResolveReasoningEffortResponse> {
	const providerId = parseProviderIdRequest(request.providerId)
	const modelId = request.modelId?.trim() ?? ""
	const effort = request.effort?.trim() ?? ""

	const outcome = resolveReasoningEffortOutcome({
		providerId: providerId.toString(),
		modelId,
		effort,
		thinkingBudgetTokens: request.thinkingBudgetTokens,
	})

	if (!outcome) {
		// `none`/empty/unknown value: the app forwards no effort for it, so there is
		// no downgrade to report (`clamped` stays false and callers render nothing).
		return ResolveReasoningEffortResponse.create({
			providerId: providerId.toString(),
			modelId,
			requested: effort,
			reason: "not-applicable",
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
