import { Anthropic } from "@anthropic-ai/sdk"
import { ModelInfo } from "@shared/api"
import { normalizeOpenaiReasoningEffort } from "@shared/storage/types"
import { isClaudeOpusAdaptiveThinkingModel, resolveClaudeOpusAdaptiveThinking } from "@shared/utils/reasoning-support"
import {
	GEMINI_FLASH_MAX_OUTPUT_TOKENS,
	isGeminiFlashModel,
	shouldSkipReasoningForModel,
	supportsReasoningEffortForModel,
} from "@utils/model-utils"
import OpenAI from "openai"
import { ChatCompletionTool } from "openai/resources/chat/completions"
import { convertToOpenAiMessages, sanitizeGeminiMessages } from "./openai-format"
import { convertToR1Format } from "./r1-format"
import { getOpenAIToolParams } from "./tool-call-processor"

const zenmuxExplicitCacheControlModelIds = new Set([
	"deepseek/deepseek-v3.2",
	"qwen/qwen-plus",
	"qwen/qwen3-max",
	"qwen/qwen3.6-plus",
	"qwen/qwen3.7-max",
	"qwen/qwen3-coder-plus",
	"qwen/qwen3-coder-flash",
])

function needsExplicitCacheControl(modelId: string): boolean {
	return (
		modelId.startsWith("anthropic/") || modelId.startsWith("minimax/") || zenmuxExplicitCacheControlModelIds.has(modelId)
	)
}

/** ZenMux OpenAI Chat Completions stream — https://docs.zenmux.ai/guide/advanced/provider-routing */
export async function createZenmuxStream(
	client: OpenAI,
	systemPrompt: string,
	messages: Anthropic.Messages.MessageParam[],
	model: { id: string; info: ModelInfo },
	reasoningEffort?: string,
	thinkingBudgetTokens?: number,
	zenmuxProviderRouting?: string,
	tools?: Array<ChatCompletionTool>,
	enableParallelToolCalling?: boolean,
) {
	let openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
		{ role: "system", content: systemPrompt },
		...convertToOpenAiMessages(messages),
	]

	openAiMessages = sanitizeGeminiMessages(openAiMessages, model.id)

	const needsCacheControl = needsExplicitCacheControl(model.id)
	if (needsCacheControl) {
		openAiMessages[0] = {
			role: "system",
			content: [
				{
					type: "text",
					text: systemPrompt,
					// @ts-expect-error-next-line
					cache_control: { type: "ephemeral" },
				},
			],
		}
		const lastTwoUserMessages = openAiMessages.filter((msg) => msg.role === "user").slice(-2)
		lastTwoUserMessages.forEach((msg) => {
			if (typeof msg.content === "string") {
				msg.content = [{ type: "text", text: msg.content }]
			}
			if (Array.isArray(msg.content)) {
				let lastTextPart = msg.content.filter((part) => part.type === "text").pop()
				if (!lastTextPart) {
					lastTextPart = { type: "text", text: "..." }
					msg.content.push(lastTextPart)
				}
				// @ts-expect-error-next-line
				lastTextPart["cache_control"] = { type: "ephemeral" }
			}
		})
	}

	let temperature: number | undefined = 0
	let topP: number | undefined
	if (
		model.id.startsWith("deepseek/deepseek-r1") ||
		model.id === "perplexity/sonar-reasoning" ||
		model.id === "qwen/qwq-32b:free" ||
		model.id === "qwen/qwq-32b"
	) {
		temperature = 0.7
		topP = 0.95
		openAiMessages = convertToR1Format([{ role: "user", content: systemPrompt }, ...messages])
	}
	if (model.id.startsWith("google/gemini-3")) {
		temperature = 1.0
	}

	const supportsReasoningEffort = supportsReasoningEffortForModel(model.id)
	const isAdaptiveThinkingModel = isClaudeOpusAdaptiveThinkingModel(model.id)
	const adaptiveThinking = isAdaptiveThinkingModel
		? resolveClaudeOpusAdaptiveThinking(reasoningEffort, thinkingBudgetTokens)
		: undefined
	if (isAdaptiveThinkingModel) {
		temperature = undefined
		topP = undefined
	}

	let reasoning: Record<string, unknown> | undefined
	if (!isAdaptiveThinkingModel) {
		if (thinkingBudgetTokens && model.info?.thinkingConfig && thinkingBudgetTokens > 0 && !supportsReasoningEffort) {
			temperature = undefined
			reasoning = { max_tokens: thinkingBudgetTokens }
		}
	}

	const normalizedReasoningEffort = reasoningEffort !== undefined ? normalizeOpenaiReasoningEffort(reasoningEffort) : undefined
	const reasoningEffortValue = supportsReasoningEffort ? normalizedReasoningEffort : undefined
	const includeReasoning = isAdaptiveThinkingModel
		? !!adaptiveThinking?.enabled
		: !shouldSkipReasoningForModel(model.id) && reasoningEffortValue !== "none"
	const reasoningPayload = isAdaptiveThinkingModel
		? adaptiveThinking?.enabled
			? { enabled: true }
			: undefined
		: (reasoning ?? (reasoningEffortValue && reasoningEffortValue !== "none" ? { effort: reasoningEffortValue } : undefined))
	const maxTokens = isGeminiFlashModel(model.id)
		? Math.min(model.info.maxTokens || GEMINI_FLASH_MAX_OUTPUT_TOKENS, GEMINI_FLASH_MAX_OUTPUT_TOKENS)
		: undefined

	const routingFactor = zenmuxProviderRouting as "latency" | "price" | "throughput" | undefined
	const requestPayload: Record<string, unknown> = {
		model: model.id,
		...(maxTokens ? { max_tokens: maxTokens } : {}),
		temperature,
		top_p: topP,
		messages: openAiMessages,
		stream: true,
		stream_options: { include_usage: true },
		include_reasoning: includeReasoning,
		...(reasoningPayload ? { reasoning: reasoningPayload } : {}),
		...(isAdaptiveThinkingModel && adaptiveThinking?.effort ? { verbosity: adaptiveThinking.effort } : {}),
		...(routingFactor
			? { provider: { routing: { type: "priority", primary_factor: routingFactor } } }
			: {}),
		...getOpenAIToolParams(tools, !!enableParallelToolCalling),
	}

	// @ts-expect-error-next-line
	const stream = await client.chat.completions.create(requestPayload)
	return stream
}