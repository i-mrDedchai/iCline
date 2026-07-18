import { StringArray } from "@shared/proto/cline/common"
import { OpenAiModelsRequest } from "@shared/proto/cline/models"
import { JAN_DEFAULT_BASE_URL } from "@shared/api"
import axios from "axios"
import { getAxiosSettings } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"
import type { Controller } from ".."

/** Normalize Jan base URL to include /v1 suffix for OpenAI-compatible endpoints. */
function getJanApiBaseUrl(baseUrl?: string): string {
	const raw = (baseUrl || JAN_DEFAULT_BASE_URL).replace(/\/+$/, "")
	return raw.endsWith("/v1") ? raw : `${raw}/v1`
}

/**
 * Fetches available models from Jan Local API Server (OpenAI-compatible /v1/models).
 */
export async function getJanModels(_controller: Controller, request: OpenAiModelsRequest): Promise<StringArray> {
	try {
		const baseUrl = getJanApiBaseUrl(request.baseUrl)
		if (!URL.canParse(baseUrl)) {
			return StringArray.create({ values: [] })
		}

		const headers: Record<string, string> = {}
		if (request.apiKey) {
			headers.Authorization = `Bearer ${request.apiKey}`
		}

		const response = await axios.get(`${baseUrl}/models`, {
			headers,
			...getAxiosSettings(),
		})
		const modelsArray = response.data?.data?.map((model: { id?: string }) => model.id).filter(Boolean) || []
		const models = [...new Set<string>(modelsArray)].sort()

		return StringArray.create({ values: models })
	} catch (error) {
		Logger.error("Failed to fetch Jan models:", error)
		return StringArray.create({ values: [] })
	}
}
