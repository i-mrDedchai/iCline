import { extractModelsFromPayload, type ModelSourceEntry } from "@cline/core"
import type { ModelInfo } from "@shared/api"
import { StringArray } from "@shared/proto/cline/common"
import { OpenAiModelsRequest } from "@shared/proto/cline/models"
import type { AxiosRequestConfig } from "axios"
import axios from "axios"
import { StateManager } from "@/core/storage/StateManager"
import { parseProviderId } from "@/sdk/model-catalog/provider-id"
import { toSdkProviderId } from "@/sdk/model-catalog/sdk-provider-id"
import { getAxiosSettings } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"
import { Controller } from ".."

/**
 * Mirror the endpoint's `/models` payload into the StateManager live models
 * cache — the fixed `openAiCompatible` slot for the openai-compatible
 * provider family (the `openai-compatible` and legacy `openai` spellings
 * share one cache — they resolve to the same stored provider), and the
 * per-id bucket for every other provider id (user-created custom gateways
 * included: their ids are arbitrary, so no fixed slot can name them).
 *
 * Model-info resolution reads this cache as authoritative base metadata
 * (`readBaseModelInfoForProvider`), so a gateway's own declared limits
 * (context window etc.) reach the Settings "Context:" row instead of a blank
 * or a cross-catalog guess. Only what the endpoint declared is recorded —
 * unknown fields stay unknown. Fetch failures clear the cache so metadata
 * from a previous endpoint cannot linger after a baseUrl change.
 */
function writeLiveModelsCache(providerId: ReturnType<typeof parseProviderId>, entries: ModelSourceEntry[]): void {
	const models: Record<string, ModelInfo> = {}
	for (const entry of entries) {
		models[entry.id] = {
			name: entry.name ?? entry.id,
			...(entry.contextWindow !== undefined ? { contextWindow: entry.contextWindow } : {}),
			...(entry.maxInputTokens !== undefined ? { maxInputTokens: entry.maxInputTokens } : {}),
			...(entry.maxTokens !== undefined ? { maxTokens: entry.maxTokens } : {}),
			supportsPromptCache: false,
		}
	}
	const sdkProviderId = toSdkProviderId(providerId)
	if (sdkProviderId === "openai-compatible") {
		StateManager.get().setModelsCache("openAiCompatible", models)
		return
	}
	StateManager.get().setCustomProviderModelsCache(sdkProviderId, models)
}

/**
 * Fetches available models from the OpenAI API
 * @param controller The controller instance
 * @param request Request containing the base URL and API key
 * @returns Array of model names
 */
export async function refreshOpenAiModels(controller: Controller, request: OpenAiModelsRequest): Promise<StringArray> {
	const providerId = parseProviderId(request.providerId || "openai")
	try {
		const providerConfig = controller.getProviderConfigStore().read(providerId)
		// Trailing slashes would produce "<baseUrl>//models", which many
		// servers reject even though chat completions still work (the AI SDK
		// normalizes the base URL for those).
		const baseUrl = providerConfig.baseUrl?.trim().replace(/\/+$/, "")
		const apiKey = providerConfig.apiKey

		if (!baseUrl) {
			writeLiveModelsCache(providerId, [])
			return StringArray.create({ values: [] })
		}

		if (!URL.canParse(baseUrl)) {
			writeLiveModelsCache(providerId, [])
			return StringArray.create({ values: [] })
		}

		const config: AxiosRequestConfig = {
			headers: {
				...(providerConfig.headers ?? {}),
				// Custom gateways (resellers, proxies like Cleanapis) commonly
				// require the key to READ /models, not just to chat — send both
				// spellings, matching the SDK's model-source fetcher.
				...(apiKey ? { Authorization: `Bearer ${apiKey}`, "x-api-key": apiKey } : {}),
			},
		}

		const response = await axios.get(`${baseUrl}/models`, { ...config, ...getAxiosSettings() })
		// Full entries, not just ids: the ids feed the model dropdown, and the
		// per-model limits the endpoint declares (context window etc.) are
		// mirrored into the live models cache above.
		const entries = extractModelsFromPayload(response.data, providerId.toString())
		writeLiveModelsCache(providerId, entries)
		const models = [...new Set<string>(entries.map((entry) => entry.id))]

		return StringArray.create({ values: models })
	} catch (error) {
		Logger.error("Error fetching OpenAI models:", error)
		writeLiveModelsCache(providerId, [])
		return StringArray.create({ values: [] })
	}
}
