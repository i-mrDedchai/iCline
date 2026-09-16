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
 */
export function useNormalizedApiConfiguration(mode: Mode): NormalizedApiConfig {
	const { apiConfiguration, providerModelsByProvider } = useExtensionState()
	const { provider, modelId } = getActiveProviderAndModelId(apiConfiguration, mode)
	const liveCatalogInfo = lookupLiveCatalogInfo(providerModelsByProvider?.[provider]?.models, modelId)
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
			}
		}
		if (!rpcMatchesCurrent || !resolvedInfo?.modelInfo || resolvedInfo.source === "unknown") {
			return {
				selectedProvider: provider,
				selectedModelId: selectedModelId || resolvedInfo?.modelId || "",
				selectedModelInfo: unknownModelInfo,
			}
		}
		const resolvedModelId = selectedModelId || resolvedInfo.modelId || ""
		return {
			selectedProvider: provider,
			selectedModelId: resolvedModelId,
			selectedModelInfo: applyGrok46OfficialContextWindow(resolvedModelId, fromProtobufModelInfo(resolvedInfo.modelInfo)),
		}
	}, [liveCatalogInfo, provider, modelId, resolvedInfo])
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
