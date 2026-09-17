import type { ModelInfo } from "@shared/api"
import type { ProviderModelsResult } from "@/sdk/model-catalog/contracts"
import { applyHostModelInfoOverrides } from "@/sdk/model-catalog/host-overrides"
import { ResolveModelInfoRequest, ResolveModelInfoResponse } from "@/shared/proto/cline/models"
import { toProtobufModelInfo } from "@/shared/proto-conversions/models/typeConversion"
import { type ProviderCatalogController, parseProviderIdRequest } from "./providerCatalogShared"

function toHostModelInfo(providerId: Parameters<typeof applyHostModelInfoOverrides>[0], modelId: string, modelInfo: ModelInfo) {
	return toProtobufModelInfo(applyHostModelInfoOverrides(providerId, modelId, modelInfo))
}

/**
 * Resolve a single (provider, model) pair for the webview's status /
 * summary surfaces (`useNormalizedApiConfiguration`, TaskHeader,
 * context-window indicator, etc.).
 *
 * Resolution order:
 *
 *   1. Catalog peek / resolve for the *requested* id (exact key, then a
 *      unique last-segment alias so Cline `cline-free/solar-pro4` can use
 *      OpenRouter `upstage/solar-pro4` specs). Specs must not come from a
 *      stale committed snapshot when the catalog has that id or alias.
 *
 *   2. Committed selection — used when the catalog does not yet know the
 *      requested id (live-only models before the list is warm). For Cline,
 *      a warm OpenRouter-shaped catalog miss does *not* reuse leftover
 *      snapshot windows (1M / 500k). Fallback-grade fabrication is last
 *      resort before "unknown".
 *
 * A non-empty requested id is never replaced with catalog defaultModelId
 * (that snap-back was the Quick Picker activate bug).
 */
export async function resolveModelInfo(
	controller: ProviderCatalogController,
	request: ResolveModelInfoRequest,
): Promise<ResolveModelInfoResponse> {
	const providerId = parseProviderIdRequest(request.providerId)
	const requestedModelId = request.modelId?.trim() || ""

	const store = controller.getProviderConfigStore()
	let fallbackSelection: ReturnType<typeof store.readSelection>
	let committedSelection: ReturnType<typeof store.readSelection>
	if (requestedModelId) {
		for (const mode of ["act", "plan"] as const) {
			const selection = store.readSelection(providerId, mode)
			if (selection?.modelId !== requestedModelId) {
				continue
			}
			if (selection.modelInfoSource === "fallback" && !selection.overrides) {
				fallbackSelection ??= selection
				continue
			}
			committedSelection ??= selection
			break
		}
	}

	const catalog = controller.getProviderCatalog()
	const cached = catalog.peekModels(providerId)
	let populatedCatalogMiss = false
	if (cached?.ok) {
		const hit = pickFromCatalog(cached, requestedModelId)
		if (hit?.matchedRequested) {
			return ResolveModelInfoResponse.create({
				providerId,
				modelId: hit.modelId,
				modelInfo: toHostModelInfo(providerId, hit.modelId, hit.modelInfo),
				source: "sdk-known-models",
			})
		}
		if (hit && !committedSelection && !fallbackSelection) {
			return ResolveModelInfoResponse.create({
				providerId,
				modelId: hit.modelId,
				modelInfo: toHostModelInfo(providerId, hit.modelId, hit.modelInfo),
				source: "sdk-default",
			})
		}
		if (requestedModelId && cached.models.size > 0 && providerId.toString() === "cline") {
			populatedCatalogMiss = true
		} else if (committedSelection) {
			return ResolveModelInfoResponse.create({
				providerId,
				modelId: committedSelection.modelId,
				modelInfo: toHostModelInfo(providerId, committedSelection.modelId, committedSelection.modelInfo),
				source: "committed-selection",
			})
		}
	}

	const resolved = await catalog.resolveModels(providerId).catch(() => undefined)
	if (resolved?.ok) {
		const hit = pickFromCatalog(resolved, requestedModelId)
		if (hit?.matchedRequested) {
			return ResolveModelInfoResponse.create({
				providerId,
				modelId: hit.modelId,
				modelInfo: toHostModelInfo(providerId, hit.modelId, hit.modelInfo),
				source: "sdk-known-models",
			})
		}
		if (hit && !committedSelection && !fallbackSelection) {
			return ResolveModelInfoResponse.create({
				providerId,
				modelId: hit.modelId,
				modelInfo: toHostModelInfo(providerId, hit.modelId, hit.modelInfo),
				source: "sdk-default",
			})
		}
		if (requestedModelId && resolved.models.size > 0 && providerId.toString() === "cline") {
			populatedCatalogMiss = true
		}
	}

	// Cline featured ids (`cline-free/solar-pro4`) are not OpenRouter catalog
	// keys. A warm OpenRouter-shaped peek plus a leftover snapshot was returning
	// DeepSeek 1M / Grok 500k for the new id. Other providers still use
	// committed on miss (xAI live-only grok-4.6).
	const suppressCommittedLeftover = populatedCatalogMiss && providerId.toString() === "cline"
	if (committedSelection && !suppressCommittedLeftover) {
		return ResolveModelInfoResponse.create({
			providerId,
			modelId: committedSelection.modelId,
			modelInfo: toHostModelInfo(providerId, committedSelection.modelId, committedSelection.modelInfo),
			source: "committed-selection",
		})
	}

	if (fallbackSelection) {
		return ResolveModelInfoResponse.create({
			providerId,
			modelId: fallbackSelection.modelId,
			modelInfo: toHostModelInfo(providerId, fallbackSelection.modelId, fallbackSelection.modelInfo),
			source: "committed-selection",
		})
	}

	return ResolveModelInfoResponse.create({
		providerId,
		modelId: requestedModelId,
		source: "unknown",
	})
}

function modelIdSlug(modelId: string): string {
	return modelId.split("/").at(-1) ?? modelId
}

function findUniqueSlugAlias(models: ReadonlyMap<string, ModelInfo>, requestedModelId: string): string | undefined {
	if (!requestedModelId.includes("/")) {
		return undefined
	}
	const slug = modelIdSlug(requestedModelId)
	if (!slug) {
		return undefined
	}
	const matches: string[] = []
	for (const id of models.keys()) {
		if (modelIdSlug(id) === slug) {
			matches.push(id)
		}
	}
	return matches.length === 1 ? matches[0] : undefined
}

function pickFromCatalog(result: Extract<ProviderModelsResult, { ok: true }>, requestedModelId: string) {
	const matchedRequested = Boolean(requestedModelId) && result.models.has(requestedModelId)

	// A non-empty requested id is authoritative for every provider. Substituting
	// catalog defaultModelId (e.g. xAI grok-composer-2.5-fast) made Quick Picker
	// / chat-header labels snap after a live or cross-provider click.
	if (requestedModelId && !matchedRequested) {
		const aliasId = findUniqueSlugAlias(result.models, requestedModelId)
		const aliased = aliasId ? result.models.get(aliasId) : undefined
		if (aliased) {
			return { modelId: requestedModelId, modelInfo: aliased, matchedRequested: true }
		}
		return undefined
	}

	const modelId = matchedRequested ? requestedModelId : result.defaultModelId
	const modelInfo = modelId ? result.models.get(modelId) : undefined
	if (!modelId || !modelInfo) {
		return undefined
	}
	return { modelId, modelInfo, matchedRequested: requestedModelId === modelId }
}
