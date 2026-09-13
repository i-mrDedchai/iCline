/**
 * Applies the `ModelInfo` fields the extension owns locally, on top of
 * an adapted SDK `ModelInfo`. Today this is Vertex's
 * `supportsGlobalEndpoint` allowlist (see `./vertex-global-endpoint.ts`)
 * and Ollama's effective context window.
 *
 * Both the model-list resolution path (`resolveSdkModels`) and the
 * single-model lookup path (`resolveModelInfo`) pass adapted
 * `ModelInfo` through this function so the same UX guard rails apply
 * regardless of which RPC the webview uses. When the SDK adopts these
 * flags upstream, the override and this file can be removed together.
 */

import { OLLAMA_DEFAULT_CONTEXT_WINDOW } from "@cline/llms"
import type { ModelInfo } from "@shared/api"
import { ApiFormat } from "@shared/proto/cline/models"
import { StateManager } from "@/core/storage/StateManager"
import { getProviderSettingsManager } from "../provider-migration"
import type { ProviderId } from "./contracts"
import { vertexModelSupportsGlobalEndpoint } from "./vertex-global-endpoint"

/**
 * The context window Ollama actually applies is the requested `num_ctx`,
 * not the model's native maximum — Ollama truncates the prompt to it
 * server-side. Surface the user's "Model Context Window" setting (or the
 * request default) instead of catalog/safe-default values so the chat
 * indicator and context management match reality.
 */
function resolveOllamaContextWindow(): number {
	// providers.json (`contextWindow`) is the source of truth; the legacy
	// StateManager string is a migration fallback (the config store mirrors
	// writes to both).
	try {
		const value = getProviderSettingsManager().getProviderSettings("ollama")?.contextWindow
		if (typeof value === "number" && Number.isFinite(value) && value > 0) {
			return Math.floor(value)
		}
	} catch {
		// providers.json unavailable — fall through to the legacy state key.
	}
	try {
		const raw = StateManager.get().getApiConfiguration().ollamaApiOptionsCtxNum?.trim()
		if (raw) {
			const value = Number(raw)
			if (Number.isFinite(value) && value > 0) {
				return Math.floor(value)
			}
		}
	} catch {
		// StateManager unavailable (e.g. tests) — fall through to the default.
	}
	return OLLAMA_DEFAULT_CONTEXT_WINDOW
}

/**
 * Sakana's API protocol setting is stored (`sakanaApiProtocol`) but the SDK
 * builtin hardcodes `openai-responses`. Map the user's choice onto the model's
 * apiFormat so the dropdown actually changes the wire format for both the
 * model list and the session config (smoke 2026-09: dropdown was inert).
 */
function resolveSakanaApiFormat(): ModelInfo["apiFormat"] {
	try {
		const protocol = StateManager.get().getApiConfiguration().sakanaApiProtocol
		if (protocol === "chat_completions") {
			return ApiFormat.OPENAI_CHAT
		}
		if (protocol === "responses") {
			return ApiFormat.OPENAI_RESPONSES
		}
	} catch {
		// StateManager unavailable (e.g. tests) — keep the SDK default.
	}
	return undefined
}

export function applyHostModelInfoOverrides(providerId: ProviderId, modelId: string, modelInfo: ModelInfo): ModelInfo {
	if (providerId === "vertex" && vertexModelSupportsGlobalEndpoint(providerId, modelId)) {
		return { ...modelInfo, supportsGlobalEndpoint: true }
	}
	if (providerId === "ollama") {
		return { ...modelInfo, contextWindow: resolveOllamaContextWindow() }
	}
	if (providerId === "sakana") {
		const apiFormat = resolveSakanaApiFormat()
		return apiFormat ? { ...modelInfo, apiFormat } : modelInfo
	}
	return modelInfo
}
