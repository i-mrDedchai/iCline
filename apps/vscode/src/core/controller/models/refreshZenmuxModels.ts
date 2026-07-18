import { ensureCacheDirectoryExists, GlobalFileNames } from "@core/storage/disk"
import { StateManager } from "@/core/storage/StateManager"
import { ModelInfo } from "@shared/api"
import { fileExistsAtPath } from "@utils/fs"
import axios from "axios"
import fs from "fs/promises"
import path from "path"
import { getAxiosSettings } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"
import { Controller } from ".."

interface ZenmuxPricingTier {
	value?: number
	unit?: string
}

interface ZenmuxRawModel {
	id: string
	display_name?: string
	input_modalities?: string[]
	output_modalities?: string[]
	capabilities?: { reasoning?: boolean }
	context_length?: number
	pricings?: {
		prompt?: ZenmuxPricingTier[]
		completion?: ZenmuxPricingTier[]
		input_cache_read?: ZenmuxPricingTier[]
		input_cache_write?: ZenmuxPricingTier[]
		input_cache_write_5_min?: ZenmuxPricingTier[]
		input_cache_write_1_h?: ZenmuxPricingTier[]
	}
}

function firstPerMTokensPrice(tiers?: ZenmuxPricingTier[]): number | undefined {
	const tier = tiers?.find((t) => t.unit === "perMTokens")
	return tier?.value
}

function deriveThinkingConfig(modelId: string, supportsReasoning?: boolean): ModelInfo["thinkingConfig"] {
	if (!supportsReasoning) {
		return undefined
	}
	if (modelId.startsWith("anthropic/claude")) {
		return { maxBudget: 8192 }
	}
	if (modelId.includes("gemini-3")) {
		return { maxBudget: 32767, supportsThinkingLevel: true, geminiThinkingLevel: "high" }
	}
	return { maxBudget: 32000 }
}

let pendingRefresh: Promise<Record<string, ModelInfo>> | null = null

export async function refreshZenmuxModels(_controller: Controller): Promise<Record<string, ModelInfo>> {
	const cache = StateManager.get().getModelsCache("zenmux")
	if (cache) {
		return cache
	}
	if (pendingRefresh) {
		return pendingRefresh
	}
	pendingRefresh = (async () => {
		try {
			return await fetchAndCacheModels()
		} finally {
			pendingRefresh = null
		}
	})()
	return pendingRefresh
}

async function fetchAndCacheModels(): Promise<Record<string, ModelInfo>> {
	const zenmuxModelsFilePath = path.join(await ensureCacheDirectoryExists(), GlobalFileNames.zenmuxModels)
	let models: Record<string, ModelInfo> = {}

	try {
		const response = await axios.get("https://zenmux.ai/api/v1/models", getAxiosSettings())
		if (response.data?.data) {
			for (const rawModel of response.data.data as ZenmuxRawModel[]) {
				if (rawModel.output_modalities?.includes("embeddings")) {
					continue
				}
				if (!rawModel.output_modalities?.includes("text")) {
					continue
				}
				const supportsReasoning = !!rawModel.capabilities?.reasoning
				models[rawModel.id] = {
					name: rawModel.display_name,
					maxTokens: 64_000,
					contextWindow: rawModel.context_length ?? 128_000,
					inputPrice: firstPerMTokensPrice(rawModel.pricings?.prompt) ?? 0,
					outputPrice: firstPerMTokensPrice(rawModel.pricings?.completion) ?? 0,
					cacheReadsPrice: firstPerMTokensPrice(rawModel.pricings?.input_cache_read) ?? 0,
					cacheWritesPrice:
						firstPerMTokensPrice(rawModel.pricings?.input_cache_write) ??
						firstPerMTokensPrice(rawModel.pricings?.input_cache_write_5_min) ??
						firstPerMTokensPrice(rawModel.pricings?.input_cache_write_1_h) ??
						0,
					supportsImages: rawModel.input_modalities?.includes("image") ?? false,
					supportsPromptCache: !!(
						rawModel.pricings?.input_cache_read?.length || rawModel.pricings?.input_cache_write?.length
					),
					supportsReasoning,
					thinkingConfig: deriveThinkingConfig(rawModel.id, supportsReasoning),
					description: rawModel.display_name ?? rawModel.id,
				}
			}
			await fs.writeFile(zenmuxModelsFilePath, JSON.stringify(models))
			Logger.log("ZenMux models fetched and saved")
		} else {
			throw new Error("Invalid response from ZenMux models API")
		}
	} catch (error) {
		Logger.error("Error fetching ZenMux models:", error)
		const cached = await readCachedZenmuxModels()
		if (cached) {
			models = cached
		}
	}

	StateManager.get().setModelsCache("zenmux", models)
	return models
}

async function readCachedZenmuxModels(): Promise<Record<string, ModelInfo> | undefined> {
	const zenmuxModelsFilePath = path.join(await ensureCacheDirectoryExists(), GlobalFileNames.zenmuxModels)
	if (!(await fileExistsAtPath(zenmuxModelsFilePath))) {
		return undefined
	}
	try {
		return JSON.parse(await fs.readFile(zenmuxModelsFilePath, "utf8"))
	} catch (error) {
		Logger.error("Error reading cached ZenMux models:", error)
		return undefined
	}
}
