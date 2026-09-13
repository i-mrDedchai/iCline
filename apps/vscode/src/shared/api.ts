import { ApiFormat } from "./proto/cline/models"
import type { ApiHandlerSettings } from "./storage/state-keys"

export type ApiProvider =
	| "anthropic"
	| "claude-code"
	| "openrouter"
	| "bedrock"
	| "vertex"
	| "openai"
	| "ollama"
	| "lmstudio"
	| "gemini"
	| "openai-native"
	| "openai-codex"
	| "requesty"
	| "together"
	| "deepseek"
	| "qwen"
	| "qwen-code"
	| "doubao"
	| "mistral"
	| "vscode-lm"
	| "cline"
	| "cline-pass"
	| "litellm"
	| "moonshot"
	| "nebius"
	| "fireworks"
	| "asksage"
	| "xai"
	| "sambanova"
	| "cerebras"
	| "sapaicore"
	| "groq"
	| "poolside"
	| "huggingface"
	| "huawei-cloud-maas"
	| "dify"
	| "baseten"
	| "vercel-ai-gateway"
	| "v0"
	| "zai"
	| "zai-coding-plan"
	| "oca"
	| "aihubmix"
	| "minimax"
	| "hicap"
	| "nousResearch"
	| "wandb"
	| "xiaomi"
	| "tencent-tokenhub"
	// iCline-specific providers
	| "zenmux"
	| "sakana"
	| "jan"

export const DEFAULT_API_PROVIDER = "openrouter" as ApiProvider

/** Jan Local API Server — https://www.jan.ai/docs/desktop/api-server */
export const JAN_DEFAULT_BASE_URL = "http://127.0.0.1:1337"

/** ZenMux API protocol — see https://docs.zenmux.ai/guide/quickstart */
export type ZenmuxApiProtocol = "openai" | "anthropic" | "openai-responses" | "gemini"

export const ZENMUX_API_BASE_URLS: Record<ZenmuxApiProtocol, string> = {
	openai: "https://zenmux.ai/api/v1",
	anthropic: "https://zenmux.ai/api/anthropic",
	"openai-responses": "https://zenmux.ai/api/v1",
	gemini: "https://zenmux.ai/api/vertex-ai",
}

/** Sakana Fugu API — https://console.sakana.ai/get-started */
export const SAKANA_API_BASE_URL = "https://api.sakana.ai/v1"

export type SakanaBillingMode = "pay_as_you_go" | "subscription"

export type SakanaApiProtocol = "chat_completions" | "responses"

// Sakana Fugu — https://console.sakana.ai/models
const sakanaFuguUltraModelInfo: ModelInfo = {
	name: "Fugu Ultra",
	maxTokens: 32_768,
	contextWindow: 1_000_000,
	supportsImages: true,
	supportsPromptCache: true,
	supportsReasoning: true,
	inputPrice: 5,
	outputPrice: 30,
	cacheReadsPrice: 0.5,
	description:
		"Fugu Ultra coordinates expert agents for hard, high-stakes problems. Higher cost, maximum quality. See https://console.sakana.ai/pricing",
}

export const sakanaModels = {
	fugu: {
		name: "Fugu",
		maxTokens: 32_768,
		contextWindow: 1_000_000,
		supportsImages: true,
		supportsPromptCache: true,
		supportsReasoning: true,
		inputPrice: 5,
		outputPrice: 30,
		description:
			"Default Fugu model — routes to the best agent for the task. Balanced performance and latency. See https://console.sakana.ai/models",
	},
	"fugu-ultra": sakanaFuguUltraModelInfo,
	"fugu-ultra-20260615": {
		...sakanaFuguUltraModelInfo,
		name: "Fugu Ultra (2026-06-15)",
		description: "Dated alias pinning a specific Fugu Ultra version.",
	},
} as const satisfies Record<string, ModelInfo>

export type SakanaModelId = keyof typeof sakanaModels

export const sakanaDefaultModelId: SakanaModelId = "fugu"
export const sakanaDefaultModelInfo: ModelInfo = sakanaModels[sakanaDefaultModelId]

export interface ApiHandlerOptions extends Partial<ApiHandlerSettings> {
	ulid?: string // Used to identify the task in API requests
	onRetryAttempt?: (attempt: number, maxRetries: number, delay: number, error: any) => void // Callback function
}

export type ApiConfiguration = ApiHandlerOptions

// Models

interface PriceTier {
	tokenLimit: number // Upper limit (inclusive) of *input* tokens for this price. Use Infinity for the highest tier.
	price: number // Price per million tokens for this tier.
}

export interface ModelInfo {
	name?: string
	maxTokens?: number
	contextWindow?: number
	supportsImages?: boolean
	supportsPromptCache: boolean // this value is hardcoded for now
	supportsReasoning?: boolean // Whether the model supports reasoning/thinking mode
	inputPrice?: number // Keep for non-tiered input models
	outputPrice?: number // Keep for non-tiered output models
	thinkingConfig?: {
		maxBudget?: number // Max allowed thinking budget tokens
		outputPrice?: number // Output price per million tokens when budget > 0
		outputPriceTiers?: PriceTier[] // Optional: Tiered output price when budget > 0
		geminiThinkingLevel?: "low" | "high" // Optional: preset thinking level
		supportsThinkingLevel?: boolean // Whether the model supports thinking level (low/high)
	}
	supportsGlobalEndpoint?: boolean // Whether the model supports a global endpoint with Vertex AI
	cacheWritesPrice?: number
	cacheReadsPrice?: number
	description?: string
	tiers?: {
		contextWindow: number
		inputPrice?: number
		outputPrice?: number
		cacheWritesPrice?: number
		cacheReadsPrice?: number
	}[]
	temperature?: number
	apiFormat?: ApiFormat // The API format used by this model
}

export interface OpenAiCompatibleModelInfo extends ModelInfo {
	temperature?: number
	isR1FormatRequired?: boolean
	systemRole?: "developer" | "system"
	supportsReasoningEffort?: boolean
	supportsTools?: boolean
	supportsStreaming?: boolean
}

export interface OcaModelInfo extends OpenAiCompatibleModelInfo {
	modelName: string
	surveyId?: string
	banner?: string
	surveyContent?: string
	supportsReasoning?: boolean
	reasoningEffortOptions: string[]
}

// Anthropic
// https://docs.anthropic.com/en/docs/about-claude/models // prices updated 2025-01-02
export type AnthropicModelId = string
export const ANTHROPIC_MIN_THINKING_BUDGET = 1_024
export const ANTHROPIC_MAX_THINKING_BUDGET = 6_000

// AWS Bedrock
// https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html
export type BedrockModelId = string

// OpenRouter
// https://openrouter.ai/models?order=newest&supported_parameters=tools
export const openRouterDefaultModelId = "anthropic/claude-sonnet-4.5" // will always exist in openRouterModels
export const openRouterDefaultModelInfo: ModelInfo = {
	maxTokens: 64_000,
	contextWindow: 200_000,
	supportsImages: true,
	supportsPromptCache: true,
	inputPrice: 3.0,
	outputPrice: 15.0,
	cacheWritesPrice: 3.75,
	cacheReadsPrice: 0.3,
	description:
		"Claude Sonnet 4.5 is an Anthropic model for coding, agentic search, and AI agent workflows. It supports planning and implementation tasks across the software development lifecycle.\n\nRead more in the [blog post here](https://www.anthropic.com/claude/sonnet)",
}

// ZenMux — https://zenmux.ai/models
export const zenmuxDefaultModelId = "anthropic/claude-sonnet-4"
export const zenmuxDefaultModelInfo: ModelInfo = openRouterDefaultModelInfo

export const clinePassDefaultModelId = "cline-pass/glm-5.2"
export const clinePassModelInfoSaneDefaults: ModelInfo = {
	maxTokens: 8_192,
	contextWindow: 128_000,
	supportsImages: false,
	supportsPromptCache: false,
	supportsReasoning: true,
	inputPrice: 0,
	outputPrice: 0,
	cacheReadsPrice: 0,
	cacheWritesPrice: 0,
	description: "",
}

export function getModelSlug(modelId: string): string {
	return modelId.split("/").at(-1) ?? modelId
}

export function buildModelInfoNameMap(models: Record<string, ModelInfo>): Record<string, ModelInfo> {
	const nameMap: Record<string, ModelInfo> = {}

	for (const [id, info] of Object.entries(models)) {
		nameMap[getModelSlug(id)] = info
	}

	return nameMap
}

export function resolveClinePassModelInfo(modelId: string, modelInfoByName?: Record<string, ModelInfo>): ModelInfo {
	return modelInfoByName?.[getModelSlug(modelId)] ?? clinePassModelInfoSaneDefaults
}

export const openAiModelInfoSafeDefaults: OpenAiCompatibleModelInfo = {
	maxTokens: -1,
	contextWindow: 128_000,
	supportsImages: true,
	supportsPromptCache: false,
	isR1FormatRequired: false,
	inputPrice: 0,
	outputPrice: 0,
	temperature: 0,
}

// OpenAI Codex (ChatGPT Plus/Pro subscription)
// Uses OAuth authentication via ChatGPT, routes to chatgpt.com/backend-api/codex/responses
// Subscription-based pricing (all costs are $0).
//
// The Codex catalog and default model id are sourced from the `@cline/llms`
// SDK.
// Azure OpenAI
// https://learn.microsoft.com/en-us/azure/ai-services/openai/api-version-deprecation
// https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#api-specs
export const azureOpenAiDefaultApiVersion = "2024-08-01-preview"

// Qwen
// https://bailian.console.aliyun.com/
// The first model in the list is used as the default model for each region

export enum QwenApiRegions {
	CHINA = "china",
	INTERNATIONAL = "international",
}
export const liteLlmDefaultModelId = "anthropic/claude-3-7-sonnet-20250219"
export interface LiteLLMModelInfo extends ModelInfo {
	temperature?: number
}

// Requesty
// https://requesty.ai/models
export const requestyDefaultModelId = "anthropic/claude-3-7-sonnet-latest"
export const requestyDefaultModelInfo: ModelInfo = {
	maxTokens: 8192,
	contextWindow: 200_000,
	supportsImages: true,

	supportsPromptCache: true,
	inputPrice: 3.0,
	outputPrice: 15.0,
	cacheWritesPrice: 3.75,
	cacheReadsPrice: 0.3,
	description: "Anthropic's most intelligent model. Highest level of intelligence and capability.",
}

// xAI models (iCline OAuth / CLI subscription support)
export type XAIModelId = keyof typeof xaiModels
export const xaiDefaultModelId: XAIModelId = "grok-composer-2.5-fast"
export const xaiModels = {
	"grok-composer-2.5-fast": {
		name: "Composer 2.5 Fast",
		maxTokens: 30_000,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		cacheReadsPrice: 0,
		cacheWritesPrice: 0,
		description: "Composer 2.5 Fast — agentic coding model via Grok Build CLI (OAuth / subscription).",
		apiFormat: ApiFormat.OPENAI_RESPONSES,
	},
	"grok-build": {
		name: "Grok Build",
		maxTokens: 30_000,
		contextWindow: 512_000,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		cacheReadsPrice: 0,
		cacheWritesPrice: 0,
		description: "Grok Build — latest xAI coding model via Grok Build CLI (OAuth / subscription).",
		apiFormat: ApiFormat.OPENAI_RESPONSES,
	},
	// Live SuperGrok / Grok CLI proxy model (observed 2026-08). Keep CLI defaults above for
	// users who still have Composer/Grok Build available on their account.
	"grok-4.5": {
		name: "Grok 4.5",
		maxTokens: 32_768,
		contextWindow: 500_000,
		supportsImages: true,
		supportsPromptCache: true,
		supportsReasoning: true,
		inputPrice: 2.0,
		outputPrice: 6.0,
		description: "Grok 4.5 — xAI frontier model (subscription via OAuth / CLI; PAYG when using API key).",
		apiFormat: ApiFormat.OPENAI_RESPONSES,
	},
	"grok-4.3": {
		name: "Grok 4.3",
		maxTokens: 32_768,
		contextWindow: 1_000_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 3.0,
		outputPrice: 15.0,
		description: "Latest flagship Grok model.",
	},
	"grok-build-0.1": {
		maxTokens: 16_384,
		contextWindow: 256_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0.2,
		outputPrice: 1.5,
		description: "Grok Build 0.1 — agentic coding model on the public xAI API.",
	},
	"grok-4.20-0309-reasoning": {
		maxTokens: 32_768,
		contextWindow: 1_000_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 3.0,
		outputPrice: 15.0,
		description: "Grok 4.20 reasoning variant.",
	},
	"grok-4.20-0309-non-reasoning": {
		maxTokens: 32_768,
		contextWindow: 1_000_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0.2,
		outputPrice: 0.5,
		description: "Grok 4.20 fast non-reasoning variant.",
	},
	"grok-4.20-multi-agent-0309": {
		maxTokens: 32_768,
		contextWindow: 1_000_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 3.0,
		outputPrice: 15.0,
		description: "Grok 4.20 multi-agent variant.",
	},
	"grok-4-1-fast-reasoning": {
		contextWindow: 2_000_000,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.2,
		cacheReadsPrice: 0.05,
		outputPrice: 0.5,
		description: "xAI's Grok 4.1 Reasoning Fast - multimodal model with 2M context.",
	},
	"grok-4-1-fast-non-reasoning": {
		contextWindow: 2_000_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0.2,
		cacheReadsPrice: 0.05,
		outputPrice: 0.5,
		description: "xAI's Grok 4.1 Non-Reasoning Fast - multimodal model with 2M context.",
	},
	"grok-code-fast-1": {
		contextWindow: 256_000,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.2,
		cacheReadsPrice: 0.02,
		outputPrice: 1.5,
		description: "xAI's Grok Coding model.",
	},
	"grok-4-fast-reasoning": {
		maxTokens: 30000,
		contextWindow: 2000000,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0.2,
		cacheReadsPrice: 0.05,
		outputPrice: 0.5,
		description: "xAI's Grok 4 Fast (free) multimodal model with 2M context.",
	},
	"grok-4": {
		maxTokens: 8192,
		contextWindow: 262144,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 3.0, // will have different pricing for long context vs short context
		cacheReadsPrice: 0.75,
		outputPrice: 15.0,
	},
	"grok-3-beta": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 3.0,
		outputPrice: 15.0,
		description: "X AI's Grok-3 beta model with 131K context window",
	},
	"grok-3-fast-beta": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 5.0,
		outputPrice: 25.0,
		description: "X AI's Grok-3 fast beta model with 131K context window",
	},
	"grok-3-mini-beta": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.3,
		outputPrice: 0.5,
		description: "X AI's Grok-3 mini beta model with 131K context window",
	},
	"grok-3-mini-fast-beta": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.6,
		outputPrice: 4.0,
		description: "X AI's Grok-3 mini fast beta model with 131K context window",
	},
	"grok-3": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 3.0,
		outputPrice: 15.0,
		description: "X AI's Grok-3 model with 131K context window",
	},
	"grok-3-fast": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 5.0,
		outputPrice: 25.0,
		description: "X AI's Grok-3 fast model with 131K context window",
	},
	"grok-3-mini": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.3,
		outputPrice: 0.5,
		description: "X AI's Grok-3 mini model with 131K context window",
	},
	"grok-3-mini-fast": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.6,
		outputPrice: 4.0,
		description: "X AI's Grok-3 mini fast model with 131K context window",
	},
	"grok-2-latest": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 2.0,
		outputPrice: 10.0,
		description: "X AI's Grok-2 model - latest version with 131K context window",
	},
	"grok-2": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 2.0,
		outputPrice: 10.0,
		description: "X AI's Grok-2 model with 131K context window",
	},
	"grok-2-1212": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 2.0,
		outputPrice: 10.0,
		description: "X AI's Grok-2 model (version 1212) with 131K context window",
	},
	"grok-2-vision-latest": {
		maxTokens: 8192,
		contextWindow: 32768,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 2.0,
		outputPrice: 10.0,
		description: "X AI's Grok-2 Vision model - latest version with image support and 32K context window",
	},
	"grok-2-vision": {
		maxTokens: 8192,
		contextWindow: 32768,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 2.0,
		outputPrice: 10.0,
		description: "X AI's Grok-2 Vision model with image support and 32K context window",
	},
	"grok-2-vision-1212": {
		maxTokens: 8192,
		contextWindow: 32768,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 2.0,
		outputPrice: 10.0,
		description: "X AI's Grok-2 Vision model (version 1212) with image support and 32K context window",
	},
	"grok-vision-beta": {
		maxTokens: 8192,
		contextWindow: 8192,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 5.0,
		outputPrice: 15.0,
		description: "X AI's Grok Vision Beta model with image support and 8K context window",
	},
	"grok-beta": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 5.0,
		outputPrice: 15.0,
		description: "X AI's Grok Beta model (legacy) with 131K context window",
	},
} as const satisfies Record<string, ModelInfo>

/** Grok Build CLI proxy models (Composer / Grok Build). Always free via OAuth/CLI. */
export const xaiCliModelIds = ["grok-composer-2.5-fast", "grok-build"] as const

export function isXaiCliModelId(modelId: string): boolean {
	return (xaiCliModelIds as readonly string[]).includes(modelId)
}

/** @deprecated Use isXaiCliModelId */
export function isXaiSubscriptionModel(modelId: string): boolean {
	return isXaiCliModelId(modelId)
}

/**
 * Zero out per-token pricing for subscription-included models so the UI shows
 * "Included in subscription" instead of PAYG rates (e.g. Grok 4.5 $2/$6).
 */
export function asXaiSubscriptionIncludedModelInfo(modelId: string, info: ModelInfo): ModelInfo {
	const base = modelId in xaiModels ? (xaiModels[modelId as keyof typeof xaiModels] as ModelInfo) : undefined
	const description =
		info.description?.includes("subscription") || info.description?.includes("Included")
			? info.description
			: info.description
				? `${info.description} (included in subscription)`
				: base?.description
					? `${base.description} (included in subscription)`
					: `${modelId} — included in SuperGrok / X Premium subscription`

	return {
		...info,
		name: info.name ?? base?.name ?? modelId,
		// Prefer known catalog context over generic SDK/safe defaults (128K).
		contextWindow:
			info.contextWindow && info.contextWindow !== 128_000
				? info.contextWindow
				: (base?.contextWindow ?? info.contextWindow),
		maxTokens: info.maxTokens && info.maxTokens > 0 ? info.maxTokens : (base?.maxTokens ?? info.maxTokens),
		inputPrice: 0,
		outputPrice: 0,
		cacheReadsPrice: 0,
		cacheWritesPrice: 0,
		description,
	}
}

function getXaiCliModels(): Record<string, ModelInfo> {
	return Object.fromEntries(
		Object.entries(xaiModels)
			.filter(([id]) => isXaiCliModelId(id))
			.map(([id, info]) => [id, asXaiSubscriptionIncludedModelInfo(id, info as ModelInfo)]),
	)
}

function getXaiApiKeyModels(): Record<string, ModelInfo> {
	return Object.fromEntries(Object.entries(xaiModels).filter(([id]) => !isXaiCliModelId(id)))
}

function normalizeSubscriptionModels(models: Record<string, ModelInfo>): Record<string, ModelInfo> {
	return Object.fromEntries(Object.entries(models).map(([id, info]) => [id, asXaiSubscriptionIncludedModelInfo(id, info)]))
}

/** Filter xAI models by active credentials (subscription OAuth/CLI vs API key). */
export function getXaiModelsForAuth(options: {
	subscriptionAuthenticated: boolean
	hasApiKey: boolean
	xaiSubscriptionModels?: Record<string, ModelInfo>
}): Record<string, ModelInfo> {
	const { subscriptionAuthenticated, hasApiKey, xaiSubscriptionModels = {} } = options
	const cliModels = getXaiCliModels()
	// Always force subscription-included pricing on the live subscription fetch,
	// even if the cache was written with PAYG prices from an older build.
	const subscriptionModels = normalizeSubscriptionModels(xaiSubscriptionModels)
	const apiKeyModels = getXaiApiKeyModels()

	if (subscriptionAuthenticated && hasApiKey) {
		// Subscription pricing wins for shared ids; API-key-only models keep PAYG.
		return { ...apiKeyModels, ...cliModels, ...subscriptionModels }
	}
	if (subscriptionAuthenticated) {
		return { ...cliModels, ...subscriptionModels }
	}
	if (hasApiKey) {
		return apiKeyModels
	}
	return cliModels
}
