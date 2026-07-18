import { StringArray } from "@shared/proto/cline/common"
import { OpenAiModelsRequest } from "@shared/proto/cline/models"
import axios from "axios"
import { getJanApiBaseUrl } from "@/core/api/providers/jan"
import { getAxiosSettings } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"
import type { Controller } from ".."

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