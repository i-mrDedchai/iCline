import { type ModelInfo, openAiModelInfoSaneDefaults } from "@shared/api"
import OpenAI from "openai"
import type { ChatCompletionTool as OpenAITool } from "openai/resources/chat/completions"
import { ClineStorageMessage } from "@/shared/messages/content"
import { createOpenAIClient } from "@/shared/net"
import type { ApiHandler, CommonApiHandlerOptions } from "../"
import { withRetry } from "../retry"
import { convertToOpenAiMessages } from "../transform/openai-format"
import type { ApiStream } from "../transform/stream"
import { getOpenAIToolParams, ToolCallProcessor } from "../transform/tool-call-processor"

export const JAN_DEFAULT_BASE_URL = "http://127.0.0.1:1337"

/** Normalize Jan base URL to OpenAI-compatible `/v1` endpoint. */
export function getJanApiBaseUrl(baseUrl?: string): string {
	const base = (baseUrl || JAN_DEFAULT_BASE_URL).replace(/\/$/, "")
	return base.endsWith("/v1") ? base : `${base}/v1`
}

interface JanHandlerOptions extends CommonApiHandlerOptions {
	janBaseUrl?: string
	janApiKey?: string
	janModelId?: string
}

export class JanHandler implements ApiHandler {
	private options: JanHandlerOptions
	private client: OpenAI | undefined

	constructor(options: JanHandlerOptions) {
		this.options = options
	}

	private ensureClient(): OpenAI {
		if (!this.client) {
			try {
				this.client = createOpenAIClient({
					baseURL: getJanApiBaseUrl(this.options.janBaseUrl),
					apiKey: this.options.janApiKey || "noop",
				})
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error)
				throw new Error(`Error creating Jan client: ${msg}`)
			}
		}
		return this.client
	}

	@withRetry()
	async *createMessage(systemPrompt: string, messages: ClineStorageMessage[], tools?: OpenAITool[]): ApiStream {
		const client = this.ensureClient()
		const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...convertToOpenAiMessages(messages),
		]

		try {
			const stream = await client.chat.completions.create({
				model: this.getModel().id,
				messages: openAiMessages,
				stream: true,
				stream_options: { include_usage: true },
				...getOpenAIToolParams(tools),
			})

			const toolCallProcessor = new ToolCallProcessor()

			for await (const chunk of stream) {
				const choice = chunk.choices?.[0]
				const delta = choice?.delta
				if (delta?.content) {
					yield {
						type: "text",
						text: delta.content,
					}
				}
				if (delta && "reasoning_content" in delta && delta.reasoning_content) {
					yield {
						type: "reasoning",
						reasoning: (delta.reasoning_content as string | undefined) || "",
					}
				}

				if (delta?.tool_calls) {
					yield* toolCallProcessor.processToolCallDeltas(delta.tool_calls)
				}

				if (chunk.usage) {
					yield {
						type: "usage",
						inputTokens: chunk.usage.prompt_tokens || 0,
						outputTokens: chunk.usage.completion_tokens || 0,
						cacheReadTokens: chunk.usage.prompt_tokens_details?.cached_tokens || 0,
					}
				}
			}
		} catch (error) {
			let contextMsg = error instanceof Error ? error.message : String(error)
			// Preserve HTTP status for programmatic handling
			if (error instanceof OpenAI.APIError) {
				contextMsg = `[${error.status}] ${contextMsg}`
			}
			throw new Error(
				`Failed to reach Jan Local API Server. Open Jan → Settings → Local API Server, start the server, and verify the base URL, port, and API key match your Jan configuration.\nCaused by: ${contextMsg}`,
			)
		}
	}

	getModel(): { id: string; info: ModelInfo } {
		return {
			id: this.options.janModelId || "jan-default",
			info: { ...openAiModelInfoSaneDefaults },
		}
	}
}