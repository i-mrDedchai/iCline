import axios from "axios"
import { getAxiosSettings } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"

/**
 * Fetch model ids from an OpenAI-compatible `{baseUrl}/models` endpoint.
 *
 * Fallback data source for dynamic-list providers (Jan — and any future
 * provider whose base URL, and therefore port, is user-configured and whose
 * model list cannot ship in a static/generated catalog). The Settings page
 * already uses this same endpoint via the refreshOpenAiModels RPC; this
 * helper lets the picker/catalog path reach parity with it.
 */
export async function fetchServerModels(input: { providerId: string; baseUrl?: string; apiKey?: string }): Promise<string[]> {
	const baseUrl = input.baseUrl?.trim().replace(/\/+$/, "")
	if (!baseUrl || !URL.canParse(baseUrl)) {
		return []
	}
	try {
		const response = await axios.get(`${baseUrl}/models`, {
			headers: {
				...(input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {}),
			},
			...getAxiosSettings(),
			timeout: 8_000,
		})
		const entries: unknown[] = response.data?.data ?? []
		const ids = entries
			.map((model) => (typeof model === "object" && model !== null ? (model as { id?: unknown }).id : model))
			.filter((id): id is string => typeof id === "string" && id.length > 0)
		return [...new Set(ids)]
	} catch (error) {
		Logger.warn(`[model-catalog] server model fetch failed for ${input.providerId}:`, error)
		return []
	}
}
