import { type ApiProvider, applyGrok46OfficialContextWindow, type ModelInfo } from "@shared/api"
import { ResolveModelInfoRequest } from "@shared/proto/cline/models"
import { fromProtobufModelInfo } from "@shared/proto-conversions/models/typeConversion"
import type { Mode } from "@shared/storage/types"
import { useEffect, useMemo, useState } from "react"
import { getModeSpecificFields, type NormalizedApiConfig } from "@/components/settings/utils/providerUtils"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ModelsServiceClient } from "@/services/grpc-client"

/**
 * Neutral placeholder returned while the catalog has not yet produced a
 * concrete `ModelInfo`. Callers that gate behavior on capabilities
 * (TaskHeader cost display, context-window meter, prompt-cache reasoning
 * surfaces) read these defaults as "we don't know yet" — see the field
 * comments at consumers.
 */
const unknownModelInfo: ModelInfo = {
	supportsPromptCache: false,
}

/**
 * Map a provider id to the `ApiConfiguration.{plan,act}Mode<…>ModelId`
 * field that stores its selected model id. For dynamic-list providers
 * (openrouter, openai-compatible, ollama, …) each one maintains its own
 * per-provider field; static-list providers share the common
 * `apiModelId` field.
 *
 * This mapping mirrors the writers in each provider component / picker
 * and the schema documented in `@/shared/storage/state-keys.ts`. When
 * adding a provider that needs its own model-id field, extend the map
 * here and the corresponding writer.
 */
export function getActiveProviderAndModelId(
	apiConfiguration: ReturnType<typeof useExtensionState>["apiConfiguration"],
	mode: Mode,
) {
	const provider = ((mode === "plan" ? apiConfiguration?.planModeApiProvider : apiConfiguration?.actModeApiProvider) ||
		"anthropic") as ApiProvider
	const modeFields = getModeSpecificFields(apiConfiguration, mode)

	const providerSpecificModelIds: Partial<Record<string, string | undefined>> = {
		cline: modeFields.clineModelId,
		"cline-pass": modeFields.clinePassModelId,
		deepseek: modeFields.apiModelId,
		openai: modeFields.openAiModelId,
		openrouter: modeFields.openRouterModelId,
		requesty: modeFields.requestyModelId,
		litellm: modeFields.liteLlmModelId,
		"vercel-ai-gateway": modeFields.vercelAiGatewayModelId,
		ollama: modeFields.ollamaModelId,
		lmstudio: modeFields.lmStudioModelId,
		groq: modeFields.groqModelId,
		baseten: modeFields.basetenModelId,
		huggingface: modeFields.huggingFaceModelId,
		hicap: modeFields.hicapModelId,
		aihubmix: modeFields.aihubmixModelId,
		nousResearch: modeFields.nousResearchModelId,
		zenmux: modeFields.zenmuxModelId,
		sakana: modeFields.sakanaModelId,
		jan: modeFields.janModelId,
		oca: modeFields.ocaModelId,
		"huawei-cloud-maas": modeFields.huaweiCloudMaasModelId,
		together: modeFields.togetherModelId,
		fireworks: modeFields.fireworksModelId,
		sapaicore: modeFields.apiModelId,
		"vscode-lm": modeFields.vsCodeLmModelSelector
			? `${modeFields.vsCodeLmModelSelector.vendor}/${modeFields.vsCodeLmModelSelector.family}`
			: undefined,
	}

	return {
		provider,
		modelId: Object.hasOwn(providerSpecificModelIds, provider) ? providerSpecificModelIds[provider] : modeFields.apiModelId,
	}
}

/**
 * How long a webview-side provider-catalog entry is trusted over the
 * host-resolved RPC answer. Mirrors the host catalog TTL so both layers
 * go stale together — a stale webview entry must never shadow a fresh
 * authoritative resolution (dev.5-fix.1: chat stuck at 128K while
 * Settings showed 1M because the chat read a stale warm cache first).
 */
export const PROVIDER_MODELS_FRESHNESS_MS = 5 * 60 * 1000

/**
 * Reads the warm catalog models for a provider only when the entry is
 * fresh. An entry with no usable `fetchedAt` (or an expired one) is
 * treated as stale: callers fall through to the host RPC instead of
 * presenting outdated numbers as the model's supported context.
 * `catalogStale` is true when a warm entry exists but can no longer be
 * trusted — the UI should show a refreshing affordance, not the old value.
 */
function readFreshCatalogModels(
	providerModelsByProvider: ReturnType<typeof useExtensionState>["providerModelsByProvider"],
	provider: ApiProvider,
): { models: Record<string, ModelInfo> | undefined; catalogStale: boolean } {
	const entry = providerModelsByProvider?.[provider]
	const models = entry?.models
	if (!models || Object.keys(models).length === 0) {
		return { models: undefined, catalogStale: false }
	}
	const fetchedAt = entry?.fetchedAt ?? 0
	const fresh = fetchedAt > 0 && Date.now() - fetchedAt <= PROVIDER_MODELS_FRESHNESS_MS
	return { models: fresh ? models : undefined, catalogStale: !fresh }
}

/**
 * Webview's universal handle on "what model is currently selected, with
 * what capabilities". Sources its answer from the extension over gRPC
 * (`ResolveModelInfo`), which combines the SDK catalog with the user's
 * committed selection.
 *
 * The returned `selectedModelInfo` may be `unknownModelInfo` for a few
 * render frames while the gRPC call is in flight, especially the first
 * time a provider is selected after a config change. UI callers must
 * treat `unknownModelInfo` as "no data yet" — render placeholders, do
 * not assume features are unsupported.
 *
 * `catalogStale` reports that the warm catalog for the active provider is
 * missing or expired. A stale warm entry never wins over an authoritative
 * RPC answer; callers should render a refreshing affordance while it
 * revalidates rather than trusting the previous number.
 */
export function useNormalizedApiConfiguration(mode: Mode): NormalizedApiConfig {
	const { apiConfiguration, providerModelsByProvider } = useExtensionState()
	const { provider, modelId } = getActiveProviderAndModelId(apiConfiguration, mode)
	const { models: freshCatalogModels, catalogStale } = readFreshCatalogModels(providerModelsByProvider, provider)
	const liveCatalogInfo = lookupLiveCatalogInfo(freshCatalogModels, modelId)
	const [resolvedInfo, setResolvedInfo] = useState<
		Awaited<ReturnType<typeof ModelsServiceClient.resolveModelInfo>> | undefined
	>(undefined)

	useEffect(() => {
		setResolvedInfo(undefined)
		let cancelled = false
		// The host-side handler awaits the catalog on a cache miss, so a
		// single round-trip yields authoritative data. We do not retry
		// or warm; if the response is `unknown`, the catalog truly has no
		// data and the UI renders a placeholder.
		void ModelsServiceClient.resolveModelInfo(
			ResolveModelInfoRequest.create({ providerId: provider, modelId: modelId || undefined }),
		)
			.then((response) => {
				if (!cancelled) {
					setResolvedInfo(response)
				}
			})
			.catch(() => {
				// The handler does not throw in production paths; a host-side
				// error here is logged at the gRPC layer. Leave resolvedInfo
				// undefined so the hook returns the neutral loading state.
			})
		return () => {
			cancelled = true
		}
	}, [provider, modelId])

	return useMemo(() => {
		const selectedModelId = modelId || ""
		const rpcMatchesCurrent =
			resolvedInfo != null &&
			Boolean(resolvedInfo.modelInfo) &&
			resolvedInfo.source !== "unknown" &&
			(!resolvedInfo.providerId || resolvedInfo.providerId === provider) &&
			(selectedModelId ? resolvedInfo.modelId === selectedModelId : true)

		if (liveCatalogInfo && selectedModelId) {
			return {
				selectedProvider: provider,
				selectedModelId,
				selectedModelInfo: applyGrok46OfficialContextWindow(selectedModelId, liveCatalogInfo),
				catalogStale,
			}
		}
		if (!rpcMatchesCurrent || !resolvedInfo?.modelInfo || resolvedInfo.source === "unknown") {
			return {
				selectedProvider: provider,
				selectedModelId: selectedModelId || resolvedInfo?.modelId || "",
				selectedModelInfo: unknownModelInfo,
				catalogStale,
			}
		}
		const resolvedModelId = selectedModelId || resolvedInfo.modelId || ""
		return {
			selectedProvider: provider,
			selectedModelId: resolvedModelId,
			selectedModelInfo: applyGrok46OfficialContextWindow(resolvedModelId, fromProtobufModelInfo(resolvedInfo.modelInfo)),
			catalogStale,
		}
	}, [liveCatalogInfo, catalogStale, provider, modelId, resolvedInfo])
}

function modelIdSlug(modelId: string): string {
	return modelId.split("/").at(-1) ?? modelId
}

function lookupLiveCatalogInfo(
	models: Record<string, ModelInfo> | undefined,
	modelId: string | undefined,
): ModelInfo | undefined {
	if (!models || !modelId) {
		return undefined
	}
	const exact = models[modelId]
	if (exact) {
		return exact
	}
	if (!modelId.includes("/")) {
		return undefined
	}
	const slug = modelIdSlug(modelId)
	const matches = Object.keys(models).filter((id) => modelIdSlug(id) === slug)
	return matches.length === 1 ? models[matches[0]] : undefined
}
