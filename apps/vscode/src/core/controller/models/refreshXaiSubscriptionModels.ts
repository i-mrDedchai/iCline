import { ensureCacheDirectoryExists, GlobalFileNames } from "@core/storage/disk"
import { ModelInfo, xaiModels } from "@shared/api"
import { fileExistsAtPath } from "@utils/fs"
import axios from "axios"
import fs from "fs/promises"
import path from "path"
import { StateManager } from "@/core/storage/StateManager"
import { resolveXaiAuth } from "@/integrations/xai/auth-mode"
import { isXaiCliModel, XAI_DEFAULT_BASE_URL } from "@/integrations/xai/constants"
import { getAxiosSettings } from "@/shared/net"
import { ApiFormat } from "@/shared/proto/cline/models"
import { Logger } from "@/shared/services/Logger"
import { Controller } from ".."

/** Known subscription chat models when the live API list is unavailable. */
export const XAI_SUBSCRIPTION_API_FALLBACK_IDS = [
	"grok-4.5",
	"grok-build-0.1",
	"grok-4.3",
	"grok-4.20-0309-reasoning",
	"grok-4.20-0309-non-reasoning",
	"grok-4.20-multi-agent-0309",
	"grok-4-1-fast-reasoning",
	"grok-4-1-fast-non-reasoning",
	"grok-4-fast-reasoning",
	"grok-code-fast-1",
] as const

const EXCLUDED_MODEL_PATTERNS = [/imagine/i, /vision/i, /tts/i, /embed/i, /audio/i, /video/i, /beta$/i]

function isSubscriptionChatModel(modelId: string): boolean {
	if (isXaiCliModel(modelId)) {
		return false
	}
	if (!modelId.startsWith("grok")) {
		return false
	}
	return !EXCLUDED_MODEL_PATTERNS.some((pattern) => pattern.test(modelId))
}

export function buildXaiSubscriptionModelInfo(modelId: string): ModelInfo {
	const base: ModelInfo | undefined =
		modelId in xaiModels ? (xaiModels[modelId as keyof typeof xaiModels] as ModelInfo) : undefined
	const description = base?.description
		? `${base.description} (included in subscription)`
		: `${modelId} — included in SuperGrok / X Premium subscription`
	return {
		name: base?.name ?? modelId,
		maxTokens: base?.maxTokens ?? 32_768,
		contextWindow: base?.contextWindow ?? 1_000_000,
		supportsImages: base?.supportsImages ?? true,
		supportsPromptCache: base?.supportsPromptCache ?? true,
		supportsReasoning: base?.supportsReasoning,
		thinkingConfig: base?.thinkingConfig,
		inputPrice: 0,
		outputPrice: 0,
		cacheReadsPrice: 0,
		cacheWritesPrice: 0,
		description,
		apiFormat: ApiFormat.OPENAI_RESPONSES,
	}
}

function buildFallbackSubscriptionModels(): Record<string, ModelInfo> {
	const models: Record<string, ModelInfo> = {}
	for (const id of XAI_SUBSCRIPTION_API_FALLBACK_IDS) {
		models[id] = buildXaiSubscriptionModelInfo(id)
	}
	return models
}

let pendingRefresh: Promise<Record<string, ModelInfo>> | null = null

export async function refreshXaiSubscriptionModels(_controller: Controller): Promise<Record<string, ModelInfo>> {
	const cache = StateManager.get().getModelsCache("xaiSubscription")
	if (cache && Object.keys(cache).length > 0) {
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
	const cachePath = path.join(await ensureCacheDirectoryExists(), GlobalFileNames.xaiSubscriptionModels)
	let models: Record<string, ModelInfo> = {}

	try {
		const auth = await resolveXaiAuth()
		if (auth.mode !== "subscription") {
			throw new Error("xAI subscription auth required to fetch subscription models")
		}

		const response = await axios.get(`${XAI_DEFAULT_BASE_URL}/models`, {
			...getAxiosSettings(),
			headers: {
				Authorization: `Bearer ${auth.token}`,
				Accept: "application/json",
			},
		})

		const rawModels = (response.data?.data ?? []) as Array<{ id?: string }>
		for (const raw of rawModels) {
			const modelId = raw.id?.trim()
			if (!modelId || !isSubscriptionChatModel(modelId)) {
				continue
			}
			models[modelId] = buildXaiSubscriptionModelInfo(modelId)
		}

		if (Object.keys(models).length === 0) {
			throw new Error("No subscription chat models returned from xAI API")
		}

		await fs.writeFile(cachePath, JSON.stringify(models))
		Logger.log(`xAI subscription models fetched (${Object.keys(models).length})`)
	} catch (error) {
		Logger.error("Error fetching xAI subscription models:", error)
		const cached = await readCachedModels()
		models = cached ?? buildFallbackSubscriptionModels()
	}

	StateManager.get().setModelsCache("xaiSubscription", models)
	return models
}

async function readCachedModels(): Promise<Record<string, ModelInfo> | undefined> {
	const cachePath = path.join(await ensureCacheDirectoryExists(), GlobalFileNames.xaiSubscriptionModels)
	if (!(await fileExistsAtPath(cachePath))) {
		return undefined
	}
	try {
		return JSON.parse(await fs.readFile(cachePath, "utf8"))
	} catch (error) {
		Logger.error("Error reading cached xAI subscription models:", error)
		return undefined
	}
}
