import { setTimeout as setTimeoutPromise } from "node:timers/promises"
import { StateManager } from "@core/storage/StateManager"
import {
	ModelInfo,
	ZENMUX_API_BASE_URLS,
	zenmuxDefaultModelId,
	zenmuxDefaultModelInfo,
	type ZenmuxApiProtocol,
} from "@shared/api"
import { shouldSkipReasoningForModel } from "@utils/model-utils"
import axios from "axios"
import OpenAI from "openai"
import type { ChatCompletionTool as OpenAITool } from "openai/resources/chat/completions"
import { ClineStorageMessage } from "@/shared/messages/content"
import { createOpenAIClient, getAxiosSettings } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"
import { ApiHandler, CommonApiHandlerOptions } from "../"
import { AnthropicHandler } from "./anthropic"
import { GeminiHandler } from "./gemini"
import { withRetry } from "../retry"
import { createZenmuxStream } from "../transform/zenmux-stream"
import { ApiStream, ApiStreamUsageChunk } from "../transform/stream"
import { ToolCallProcessor } from "../transform/tool-call-processor"

interface ZenmuxHandlerOptions extends CommonApiHandlerOptions {
	zenmuxApiKey?: string
	zenmuxApiProtocol?: ZenmuxApiProtocol
	zenmuxProviderRouting?: string
	zenmuxModelId?: string
	zenmuxModelInfo?: ModelInfo
	reasoningEffort?: string
	thinkingBudgetTokens?: number
	enableParallelToolCalling?: boolean
}

export class ZenmuxHandler implements ApiHandler {
	private options: ZenmuxHandlerOptions
	private client: OpenAI | undefined
	lastGenerationId?: string

	constructor(options: ZenmuxHandlerOptions) {
		this.options = options
	}

	private getProtocol(): ZenmuxApiProtocol {
		return this.options.zenmuxApiProtocol || "openai"
	}

	private ensureOpenAiClient(): OpenAI {
		if (!this.client) {
			if (!this.options.zenmuxApiKey) {
				throw new Error("ZenMux API key is required")
			}
			const protocol = this.getProtocol()
			const baseURL =
				protocol === "openai-responses" || protocol === "openai"
					? ZENMUX_API_BASE_URLS.openai
					: ZENMUX_API_BASE_URLS.openai
			try {
				this.client = createOpenAIClient({
					baseURL,
					apiKey: this.options.zenmuxApiKey,
					defaultHeaders: {
						"HTTP-Referer": "https://icline.dev",
						"X-Title": "iCline",
					},
				})
			} catch (error: any) {
				throw new Error(`Error creating ZenMux client: ${error.message}`)
			}
		}
		return this.client
	}

	@withRetry()
	async *createMessage(systemPrompt: string, messages: ClineStorageMessage[], tools?: OpenAITool[]): ApiStream {
		const protocol = this.getProtocol()

		if (protocol === "anthropic") {
			const handler = new AnthropicHandler({
				onRetryAttempt: this.options.onRetryAttempt,
				apiKey: this.options.zenmuxApiKey,
				anthropicBaseUrl: ZENMUX_API_BASE_URLS.anthropic,
				apiModelId: this.getModel().id,
				reasoningEffort: this.options.reasoningEffort,
				thinkingBudgetTokens: this.options.thinkingBudgetTokens,
			})
			yield* handler.createMessage(systemPrompt, messages)
			return
		}

		if (protocol === "gemini") {
			const handler = new GeminiHandler({
				onRetryAttempt: this.options.onRetryAttempt,
				geminiApiKey: this.options.zenmuxApiKey,
				geminiBaseUrl: ZENMUX_API_BASE_URLS.gemini,
				apiModelId: this.getModel().id,
				thinkingBudgetTokens: this.options.thinkingBudgetTokens,
			})
			yield* handler.createMessage(systemPrompt, messages)
			return
		}

		const client = this.ensureOpenAiClient()
		this.lastGenerationId = undefined

		const stream = await createZenmuxStream(
			client,
			systemPrompt,
			messages,
			this.getModel(),
			this.options.reasoningEffort,
			this.options.thinkingBudgetTokens,
			this.options.zenmuxProviderRouting,
			tools,
			this.options.enableParallelToolCalling,
		)

		let didOutputUsage = false
		const toolCallProcessor = new ToolCallProcessor()

		for await (const chunk of stream) {
			if ("error" in chunk) {
				const error = (chunk as any).error
				throw new Error(`ZenMux API Error: ${error?.message || JSON.stringify(error)}`)
			}

			if (!this.lastGenerationId && chunk.id) {
				this.lastGenerationId = chunk.id
			}

			const delta = chunk.choices?.[0]?.delta
			if (delta?.content) {
				yield { type: "text", text: delta.content }
			}

			if (delta?.tool_calls) {
				yield* toolCallProcessor.processToolCallDeltas(delta.tool_calls)
			}

			if (
				delta &&
				"reasoning" in delta &&
				delta.reasoning &&
				!shouldSkipReasoningForModel(this.options.zenmuxModelId)
			) {
				yield {
					type: "reasoning",
					reasoning: typeof delta.reasoning === "string" ? delta.reasoning : JSON.stringify(delta.reasoning),
				}
			}

			if (
				delta &&
				"reasoning_details" in delta &&
				delta.reasoning_details &&
				// @ts-expect-error-next-line
				delta.reasoning_details.length &&
				!shouldSkipReasoningForModel(this.options.zenmuxModelId)
			) {
				yield { type: "reasoning", reasoning: "", details: delta.reasoning_details }
			}

			if (!didOutputUsage && chunk.usage) {
				// @ts-expect-error-next-line
				const cacheWriteTokens = chunk.usage.prompt_tokens_details?.cache_write_tokens || 0
				yield {
					type: "usage",
					cacheWriteTokens,
					cacheReadTokens: chunk.usage.prompt_tokens_details?.cached_tokens || 0,
					inputTokens:
						(chunk.usage.prompt_tokens || 0) -
						(chunk.usage.prompt_tokens_details?.cached_tokens || 0) -
						(cacheWriteTokens || 0),
					outputTokens: chunk.usage.completion_tokens || 0,
					// @ts-expect-error-next-line
					totalCost: chunk.usage.cost || 0,
				}
				didOutputUsage = true
			}
		}

		if (!didOutputUsage) {
			const apiStreamUsage = await this.getApiStreamUsage()
			if (apiStreamUsage) {
				yield apiStreamUsage
			}
		}
	}

	async getApiStreamUsage(): Promise<ApiStreamUsageChunk | undefined> {
		if (!this.lastGenerationId || !this.options.zenmuxApiKey) {
			return undefined
		}
		await setTimeoutPromise(500)
		try {
			const response = await axios.get(
				`https://zenmux.ai/api/v1/management/generation?id=${this.lastGenerationId}`,
				{
					headers: { Authorization: `Bearer ${this.options.zenmuxApiKey}` },
					timeout: 15_000,
					...getAxiosSettings(),
				},
			)
			const generation = response.data?.data ?? response.data
			return {
				type: "usage",
				cacheWriteTokens: 0,
				cacheReadTokens: 0,
				inputTokens: (generation?.nativeTokens?.prompt_tokens || 0) - (generation?.nativeTokens?.cached_tokens || 0),
				outputTokens: generation?.nativeTokens?.completion_tokens || 0,
				totalCost: generation?.usage || 0,
			}
		} catch (error) {
			Logger.error("Error fetching ZenMux generation details:", error)
			return undefined
		}
	}

	getModel(): { id: string; info: ModelInfo } {
		const modelId = this.options.zenmuxModelId
		const modelInfo = this.options.zenmuxModelInfo
		if (modelId && modelInfo) {
			return { id: modelId, info: modelInfo }
		}
		if (modelId) {
			const cached = StateManager.get().getModelInfo("zenmux", modelId)
			return { id: modelId, info: cached || zenmuxDefaultModelInfo }
		}
		return { id: zenmuxDefaultModelId, info: zenmuxDefaultModelInfo }
	}
}