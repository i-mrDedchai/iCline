import { ModelInfo } from "@shared/api"
import OpenAI from "openai"
import { ChatCompletionTool } from "openai/resources/chat/completions"
import { ClineStorageMessage } from "@/shared/messages/content"
import { convertToOpenAiMessages } from "./openai-format"
import { getOpenAIToolParams } from "./tool-call-processor"

/** Sakana Fugu Chat Completions stream — https://console.sakana.ai/models#chat-completions */
export async function createSakanaChatStream(
	client: OpenAI,
	systemPrompt: string,
	messages: ClineStorageMessage[],
	model: { id: string; info: ModelInfo },
	reasoningEffort: "high" | "xhigh" | "max",
	tools?: ChatCompletionTool[],
	enableParallelToolCalling?: boolean,
) {
	const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
		{ role: "system", content: systemPrompt },
		...convertToOpenAiMessages(messages),
	]

	const requestPayload: OpenAI.Chat.ChatCompletionCreateParamsStreaming = {
		model: model.id,
		messages: openAiMessages,
		stream: true,
		stream_options: { include_usage: true },
		max_completion_tokens: model.info.maxTokens,
		reasoning_effort: reasoningEffort as any,
		...getOpenAIToolParams(tools, !!enableParallelToolCalling),
	}

	return client.chat.completions.create(requestPayload)
}