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
		// Request's explicit baseUrl / apiKey takes precedence (e.g. during custom
		// provider creation/editing in the settings form before it is saved).
		// Trailing slashes would produce "<baseUrl>//models", which many
		// servers reject even though chat completions still work (the AI SDK
		// normalizes the base URL for those).
		const rawBaseUrl = request.baseUrl?.trim() || providerConfig.baseUrl?.trim()
		const baseUrl = rawBaseUrl?.replace(/\/+$/, "")
		const apiKey = request.apiKey?.trim() || providerConfig.apiKey

		if (!baseUrl || !URL.canParse(baseUrl)) {
			writeLiveModelsCache(providerId, [])
			return StringArray.create({ values: [] })
		}

		// Attempt #1 is exactly the request this handler sent before fix.40:
		// the user's custom headers plus `Authorization: Bearer` — nothing
		// else. fix.40 forced an `x-api-key` header onto every request, which
		// gateways that validate that header against a different credential
		// table refuse outright — silently emptying the model list this call
		// feeds. The alternative spelling now only rides along as a retry
		// AFTER the key was refused the Bearer way (401/403), and a user's own
		// `x-api-key` custom header is never overwritten.
		const customHeaders = providerConfig.headers ?? {}
		const attempts: Array<Record<string, string>> = [
			{ ...customHeaders, ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
			...(apiKey ? [{ "x-api-key": apiKey, ...customHeaders, Authorization: `Bearer ${apiKey}` }] : []),
		]

		let payload: unknown
		for (let index = 0; index < attempts.length; index += 1) {
			const config: AxiosRequestConfig = {
				headers: attempts[index],
			}
			try {
				const response = await axios.get(`${baseUrl}/models`, { ...config, ...getAxiosSettings() })
				payload = response.data
				break
			} catch (error) {
				const status = axios.isAxiosError(error) ? error.response?.status : undefined
				if (index + 1 < attempts.length && (status === 401 || status === 403)) {
					continue
				}
				// Clear the cache (metadata must not linger past a dead endpoint)
				// and let the error travel up: the form shows the message, so
				// "the endpoint refused / is unreachable" stays distinguishable
				// from "the extension lost my models" (the silent empty list of
				// fix.40).
				writeLiveModelsCache(providerId, [])
				throw error
			}
		}

		// Full entries, not just ids: the ids feed the model dropdown, and the
		// per-model limits the endpoint declares are mirrored into the live
		// models cache above. Ids the extractor does not recognize still keep
		// the legacy scrape's behavior — this list must never hold fewer
		// models than the pre-fix.40 scraper returned.
		const entries = extractModelsFromPayload(payload, providerId.toString())
		const ids = new Set(entries.map((entry) => entry.id))
		const rawList = (payload as { data?: unknown } | null)?.data
		if (Array.isArray(rawList)) {
			for (const item of rawList) {
				const candidate =
					typeof item === "string"
						? item
						: item && typeof item === "object"
							? String(
									(item as { id?: unknown; name?: unknown; model?: unknown }).id ??
										(item as { name?: unknown }).name ??
										(item as { model?: unknown }).model ??
										"",
								)
							: ""
				const id = candidate.trim()
				if (id && !ids.has(id)) {
					ids.add(id)
					entries.push({ id })
				}
			}
		}
		writeLiveModelsCache(providerId, entries)

		return StringArray.create({ values: [...ids] })
	} catch (error) {
		Logger.error("Error fetching OpenAI models:", error)
		// Failures must be visible at the call site instead of masquerading as
		// an empty model list — the webview renders this message next to the
		// model dropdown.
		throw error
	}
}
