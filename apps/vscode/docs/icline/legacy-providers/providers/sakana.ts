import {
	ModelInfo,
	SAKANA_API_BASE_URL,
	type SakanaApiProtocol,
	type SakanaModelId,
	sakanaDefaultModelId,
	sakanaDefaultModelInfo,
	sakanaModels,
} from "@shared/api"
import { calculateApiCostOpenAI } from "@utils/cost"
import OpenAI from "openai"
import type { ChatCompletionTool as OpenAITool } from "openai/resources/chat/completions"
import { buildExternalBasicHeaders } from "@/services/EnvUtils"
import { ClineStorageMessage } from "@/shared/messages/content"
import { createOpenAIClient } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"
import { ApiHandler, CommonApiHandlerOptions } from "../"
import { withRetry } from "../retry"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { convertToOpenAIResponsesInput } from "../transform/openai-response-format"
import { createSakanaChatStream } from "../transform/sakana-stream"
import { ApiStream, ApiStreamChunk, ApiStreamUsageChunk } from "../transform/stream"
import { ToolCallProcessor } from "../transform/tool-call-processor"

interface SakanaHandlerOptions extends CommonApiHandlerOptions {
	sakanaApiKey?: string
	sakanaApiProtocol?: SakanaApiProtocol
	sakanaModelId?: string
	sakanaModelInfo?: ModelInfo
	reasoningEffort?: string
	enableParallelToolCalling?: boolean
}

interface SakanaUsageDetails {
	cached_tokens?: number
	orchestration_input_tokens?: number
	orchestration_input_cached_tokens?: number
	orchestration_output_tokens?: number
}

interface SakanaUsage {
	prompt_tokens?: number
	completion_tokens?: number
	input_tokens?: number
	output_tokens?: number
	input_tokens_details?: SakanaUsageDetails
	output_tokens_details?: SakanaUsageDetails
	prompt_tokens_details?: SakanaUsageDetails
}

function mapSakanaReasoningEffort(reasoningEffort?: string, modelId?: string): "high" | "xhigh" | "max" {
	const normalized = reasoningEffort?.toLowerCase()
	if (normalized === "xhigh" || normalized === "max") {
		return normalized
	}
	if (normalized === "high") {
		return "high"
	}
	if (modelId === "fugu-ultra" || modelId?.startsWith("fugu-ultra")) {
		return "xhigh"
	}
	return "high"
}

function calculateSakanaUsageCost(modelInfo: ModelInfo, usage: SakanaUsage | undefined): ApiStreamUsageChunk {
	const inputTokens = usage?.prompt_tokens || usage?.input_tokens || 0
	const outputTokens = usage?.completion_tokens || usage?.output_tokens || 0
	const details = usage?.input_tokens_details ?? usage?.prompt_tokens_details
	const outputDetails = usage?.output_tokens_details
	const cacheReadTokens = details?.cached_tokens ?? details?.orchestration_input_cached_tokens ?? 0
	const orchestrationInput = details?.orchestration_input_tokens ?? 0
	const orchestrationOutput = outputDetails?.orchestration_output_tokens ?? 0
	const cacheWriteTokens = 0

	const billableInput = inputTokens + orchestrationInput
	const billableOutput = outputTokens + orchestrationOutput
	const totalCost = calculateApiCostOpenAI(modelInfo, billableInput, billableOutput, cacheWriteTokens, cacheReadTokens)

	return {
		type: "usage",
		inputTokens: Math.max(0, billableInput - cacheReadTokens),
		outputTokens: billableOutput,
		cacheWriteTokens,
		cacheReadTokens,
		totalCost,
	}
}

export class SakanaHandler implements ApiHandler {
	private options: SakanaHandlerOptions
	private client: OpenAI | undefined

	constructor(options: SakanaHandlerOptions) {
		this.options = options
	}

	private getProtocol(): SakanaApiProtocol {
		return this.options.sakanaApiProtocol || "responses"
	}

	private ensureClient(): OpenAI {
		if (!this.client) {
			if (!this.options.sakanaApiKey) {
				throw new Error("Sakana API key is required")
			}
			try {
				this.client = createOpenAIClient({
					baseURL: SAKANA_API_BASE_URL,
					apiKey: this.options.sakanaApiKey,
					defaultHeaders: buildExternalBasicHeaders(),
				})
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error)
				throw new Error(`Error creating Sakana client: ${message}`)
			}
		}
		return this.client
	}

	getModel(): { id: string; info: ModelInfo } {
		const id = this.options.sakanaModelId || sakanaDefaultModelId
		const info = this.options.sakanaModelInfo || sakanaModels[id as SakanaModelId] || sakanaDefaultModelInfo
		return { id, info }
	}

	@withRetry()
	async *createMessage(systemPrompt: string, messages: ClineStorageMessage[], tools?: OpenAITool[]): ApiStream {
		if (this.getProtocol() === "responses") {
			if (!tools?.length) {
				throw new Error("Native tool calling must be enabled to use Sakana Responses API.")
			}
			yield* this.createResponseStream(systemPrompt, messages, tools)
			return
		}
		yield* this.createChatCompletionStream(systemPrompt, messages, tools)
	}

	private async *createChatCompletionStream(
		systemPrompt: string,
		messages: ClineStorageMessage[],
		tools?: OpenAITool[],
	): ApiStream {
		const client = this.ensureClient()
		const model = this.getModel()
		const reasoningEffort = mapSakanaReasoningEffort(this.options.reasoningEffort, model.id)
		const stream = await createSakanaChatStream(
			client,
			systemPrompt,
			messages,
			model,
			reasoningEffort,
			tools,
			this.options.enableParallelToolCalling,
		)
		const toolCallProcessor = new ToolCallProcessor()

		for await (const chunk of stream) {
			const delta = chunk.choices?.[0]?.delta
			if (delta?.content) {
				yield { type: "text", text: delta.content }
			}
			if (delta?.tool_calls) {
				yield* toolCallProcessor.processToolCallDeltas(delta.tool_calls)
			}
			if (delta && "reasoning_content" in delta && (delta as { reasoning_content?: string }).reasoning_content) {
				yield {
					type: "reasoning",
					reasoning: (delta as { reasoning_content: string }).reasoning_content,
				}
			}
			if (chunk.usage) {
				yield calculateSakanaUsageCost(model.info, chunk.usage as SakanaUsage)
			}
		}
	}

	private mapResponseTools(tools: OpenAITool[]): OpenAI.Responses.Tool[] {
		return tools
			.filter((tool): tool is OpenAI.Chat.Completions.ChatCompletionFunctionTool => tool?.type === "function")
			.map((tool) => ({
				type: "function" as const,
				name: tool.function.name,
				description: tool.function.description,
				parameters: tool.function.parameters ?? null,
				strict: tool.function.strict ?? true,
			}))
	}

	private async *createResponseStream(systemPrompt: string, messages: ClineStorageMessage[], tools: OpenAITool[]): ApiStream {
		const client = this.ensureClient()
		const model = this.getModel()
		const reasoningEffort = mapSakanaReasoningEffort(this.options.reasoningEffort, model.id)
		const { input } = convertToOpenAIResponsesInput(messages)
		const params: OpenAI.Responses.ResponseCreateParamsStreaming = {
			model: model.id,
			instructions: systemPrompt,
			input,
			stream: true,
			tools: this.mapResponseTools(tools),
			store: false,
			reasoning: { effort: reasoningEffort as any },
			max_output_tokens: model.info.maxTokens,
		}

		const stream = await client.responses.create(params)
		const functionCallByItemId = new Map<string, { call_id?: string; name?: string; id?: string }>()
		const yieldToolCall = function* (
			itemId: string,
			argumentsDelta: string,
			fallbackName?: string,
		): Generator<ApiStreamChunk> {
			const meta = functionCallByItemId.get(itemId)
			const name = fallbackName ?? meta?.name
			if (!name) {
				return
			}
			yield {
				type: "tool_calls",
				id: itemId,
				tool_call: {
					call_id: meta?.call_id,
					function: {
						id: meta?.id ?? itemId,
						name,
						arguments: argumentsDelta,
					},
				},
			}
		}

		for await (const chunk of stream) {
			if (chunk.type === "response.output_text.delta") {
				yield { type: "text", text: chunk.delta }
			}
			if (chunk.type === "response.reasoning_text.delta") {
				yield { type: "reasoning", reasoning: chunk.delta }
			}
			if (chunk.type === "response.output_item.added") {
				const item = chunk.item
				if (item.type === "function_call" && item.id) {
					functionCallByItemId.set(item.id, { call_id: item.call_id, name: item.name, id: item.id })
					if (item.arguments) {
						yield {
							type: "tool_calls",
							id: item.id,
							tool_call: {
								call_id: item.call_id,
								function: {
									id: item.id,
									name: item.name,
									arguments: item.arguments,
								},
							},
						}
					}
				}
			}
			if (chunk.type === "response.function_call_arguments.delta") {
				yield* yieldToolCall(chunk.item_id, chunk.delta)
			}
			if (chunk.type === "response.function_call_arguments.done") {
				yield* yieldToolCall(chunk.item_id, chunk.arguments, chunk.name)
			}
			if (chunk.type === "response.completed") {
				const usage = chunk.response.usage as SakanaUsage | undefined
				if (usage) {
					yield calculateSakanaUsageCost(model.info, usage)
				}
			}
		}
	}

	async completePrompt(prompt: string): Promise<string> {
		const client = this.ensureClient()
		const model = this.getModel()
		const reasoningEffort = mapSakanaReasoningEffort(this.options.reasoningEffort, model.id)
		try {
			if (this.getProtocol() === "responses") {
				const response = await client.responses.create({
					model: model.id,
					input: prompt,
					reasoning: { effort: reasoningEffort as any },
					max_output_tokens: model.info.maxTokens,
				})
				return response.output_text || ""
			}
			const response = await client.chat.completions.create({
				model: model.id,
				messages: convertToOpenAiMessages([{ role: "user", content: prompt }]),
				max_completion_tokens: model.info.maxTokens,
				reasoning_effort: reasoningEffort as any,
			})
			return response.choices[0]?.message?.content || ""
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			Logger.error(`[SakanaHandler] completePrompt error: ${message}`)
			throw error
		}
	}
}
