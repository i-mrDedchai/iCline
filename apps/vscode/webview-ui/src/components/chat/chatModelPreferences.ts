import type { OpenaiReasoningEffort } from "@shared/storage/types"
import { isOpenaiReasoningEffort, normalizeOpenaiReasoningEffort } from "@shared/storage/types"

const STORAGE_KEY = "icline-chat-model-preferences-v1"

export interface ChatModelPreference {
	/**
	 * Effort level remembered for this model. Deliberately `string` and not
	 * `OpenaiReasoningEffort`: a provider may use its own vocabulary (Sakana stores
	 * `max`), and which levels are valid is provider metadata — see
	 * `@/utils/modelThinkingOptions`.
	 */
	reasoningEffort?: string
	thinkingBudgetTokens?: number
}

type PreferenceMap = Record<string, ChatModelPreference>

function readMap(): PreferenceMap {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) {
			return {}
		}
		const parsed = JSON.parse(raw) as PreferenceMap
		return parsed && typeof parsed === "object" ? parsed : {}
	} catch {
		return {}
	}
}

function writeMap(map: PreferenceMap) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function getChatModelPreferenceKey(provider: string, modelId: string): string {
	return `${provider}::${modelId}`
}

export function parseChatModelPreferenceKey(key: string): { provider: string; modelId: string } {
	const separator = key.indexOf("::")
	if (separator === -1) {
		return { provider: key, modelId: "" }
	}
	return {
		provider: key.slice(0, separator),
		modelId: key.slice(separator + 2),
	}
}

export function getChatModelPreference(provider: string, modelId: string): ChatModelPreference | undefined {
	const map = readMap()
	return map[getChatModelPreferenceKey(provider, modelId)]
}

export function setChatModelPreference(
	provider: string,
	modelId: string,
	patch: Partial<ChatModelPreference>,
): ChatModelPreference {
	const map = readMap()
	const key = getChatModelPreferenceKey(provider, modelId)
	const next: ChatModelPreference = { ...map[key], ...patch }
	map[key] = next
	writeMap(map)
	return next
}

export function normalizePreferenceEffort(value?: string): OpenaiReasoningEffort {
	if (isOpenaiReasoningEffort(value)) {
		return value
	}
	return normalizeOpenaiReasoningEffort(value)
}
