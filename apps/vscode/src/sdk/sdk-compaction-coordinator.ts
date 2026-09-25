// Replaces classic manual-condense handling from src/core/task (see origin/main)
//
// Coordinates a manual "/compact" (alias "/smol") request triggered from the
// VSCode compact button or slash command. This mirrors the CLI's
// `compactCurrentSession` (apps/cli/src/runtime/interactive/session-runtime.ts):
//
//   1. Read the active session's transcript.
//   2. Run a manual SDK compaction over it (sdk-compaction.ts).
//   3. Persist the SDK compaction sidecar so the next turn and resumes keep
//      using the compacted working context.
//
// Before this, the VSCode button sent the literal text "/compact" to the model,
// which the SDK does not treat as a runtime command, so the model improvised a
// fake "Conversation Summary" instead of compacting (CLINE-2503).

import { CORE_BUILD_VERSION } from "@cline/core"
import type { Message as SdkMessage } from "@cline/llms"
import { resolveProviderRequestHeaders } from "@cline/llms"
import type { ClineMessage } from "@shared/ExtensionMessage"
import { getLastApiReqTotalTokens } from "@shared/getApiMetrics"
import type { Mode } from "@shared/storage/types"
import type { StateManager } from "@/core/storage/StateManager"
import { Logger } from "@/shared/services/Logger"
import { buildPostCompactUsageMessage, estimatePostCompactTokens } from "./post-compact-usage"
import { compactSessionMessages } from "./sdk-compaction"
import type { SdkMessageCoordinator } from "./sdk-message-coordinator"
import type { SdkSessionConfigBuilder } from "./sdk-session-config-builder"
import type { SdkSessionLifecycle } from "./sdk-session-lifecycle"
import type { SdkSessionHost } from "./session-host"

const COMPACTION_FAILURE_MESSAGE = "Couldn't compact the conversation. Please try again."
const COMPACTION_UNSUPPORTED_MESSAGE = "Compaction is not supported by this runtime yet. Please update Cline and try again."

export interface SdkCompactionCoordinatorOptions {
	stateManager: StateManager
	sessions: SdkSessionLifecycle
	messages: SdkMessageCoordinator
	sessionConfigBuilder: SdkSessionConfigBuilder
	getWorkspaceRoot: () => Promise<string>
	postStateToWebview: () => Promise<void>
}

export class SdkCompactionCoordinator {
	private compactInFlight = false

	constructor(private readonly options: SdkCompactionCoordinatorOptions) {}

	/**
	 * Compact the active session's conversation. Mirrors the CLI's `/compact`
	 * (alias `/smol`) local command. No-ops with a status message when there is
	 * no active session or nothing to compact.
	 */
	async compactTask(): Promise<void> {
		if (this.compactInFlight) {
			Logger.warn("[SdkController] compactTask: a compaction is already in progress; ignoring")
			return
		}

		const activeSession = this.options.sessions.getActiveSession()
		if (!activeSession) {
			Logger.warn("[SdkController] compactTask: No active session to compact")
			this.emitInfo("There is no active task to compact.")
			await this.options.postStateToWebview()
			return
		}

		// A turn is still running; compacting mid-turn would race the live agent
		// loop's own message persistence. Ask the user to wait until it finishes.
		if (activeSession.isRunning) {
			this.emitInfo(
				"Cannot compact while a response is in progress. Try again once the current turn finishes.",
				activeSession.sessionId,
			)
			await this.options.postStateToWebview()
			return
		}

		this.compactInFlight = true
		try {
			await this.runCompaction(activeSession.sdkHost, activeSession.sessionId)
		} catch (error) {
			Logger.error("[SdkController] compactTask failed:", error)
			const detail = error instanceof Error && error.message.trim() ? error.message.trim() : String(error)
			this.emitInfo(`${COMPACTION_FAILURE_MESSAGE} (${detail})`, activeSession.sessionId)
			await this.options.postStateToWebview()
		} finally {
			this.compactInFlight = false
		}
	}

	private async runCompaction(sdkHost: SdkSessionHost, sessionId: string): Promise<void> {
		if (!sdkHost.updateSessionCompactionState) {
			this.emitInfo(COMPACTION_UNSUPPORTED_MESSAGE, sessionId)
			await this.options.postStateToWebview()
			return
		}
		const messages = (await sdkHost.readMessages(sessionId)) as SdkMessage[]
		const messagesBefore = messages.length
		if (messagesBefore === 0) {
			this.emitInfo("No messages to compact.", sessionId)
			await this.options.postStateToWebview()
			return
		}

		const cwd = await this.options.getWorkspaceRoot()
		const mode = this.getCurrentMode()
		const config = await this.options.sessionConfigBuilder.build({ cwd, mode })

		// The agentic summarizer builds its LLM handler from this provider config
		// alone, so it must carry the same Cline client identity headers the
		// bootstrap attaches for chat turns — api.cline.bot rejects cline-free
		// models on headerless requests (403 "only available via Cline product
		// surfaces"). Chat's exact values already pass the gate; do not invent
		// different ones.
		const identityHeaders = resolveProviderRequestHeaders({
			providerId: config.providerId,
			sessionId,
			defaultSource: "vscode",
			client: {
				name: config.extensionContext?.client?.name,
				version: config.extensionContext?.client?.version,
				platform: config.extensionContext?.client?.platform,
				platformVersion: config.extensionContext?.client?.platformVersion,
				isMultiRoot: config.extensionContext?.client?.isMultiRoot,
			},
			coreVersion: CORE_BUILD_VERSION,
			headers: { session: config.providerConfig?.headers },
		})
		if (identityHeaders && config.providerConfig) {
			config.providerConfig.headers = identityHeaders
		}

		const result = await compactSessionMessages({
			config: {
				providerConfig: config.providerConfig,
				providerId: config.providerId,
				modelId: config.modelId,
				knownModels: config.knownModels,
				compaction: config.compaction,
				logger: config.logger,
				telemetry: config.telemetry,
				systemPrompt: config.systemPrompt,
				extraTools: config.extraTools,
			},
			sessionId,
			messages,
		})

		if (!result.compacted) {
			this.emitInfo("No compaction needed.", sessionId)
			await this.options.postStateToWebview()
			return
		}

		if (!result.compactionState) {
			throw new Error("Compaction did not return durable state.")
		}
		const persisted = await sdkHost.updateSessionCompactionState(sessionId, result.compactionState)
		if (!persisted.updated) {
			throw new Error("Compaction sidecar could not be persisted.")
		}

		// Refresh the context-window progress bar immediately. The bar reads
		// `getLastApiReqTotalTokens` from the last `api_req_started` usage
		// snapshot — which still reflects pre-compact size until the next
		// live turn. Prefer the measured post-compaction request size; fall back
		// to scaling the previous usage by the message-count ratio when no
		// measured value is available, so the bar never stays stuck at 100%+/400k.
		this.emitPostCompactUsageEstimate(sessionId, result.compactionState.context_usage?.tokens_after, {
			messagesBefore,
			messagesAfter: result.messages.length,
		})

		this.emitInfo(this.formatCompactionStatus(messagesBefore, result.messages.length), sessionId)
		await this.options.postStateToWebview()

		Logger.log(`[SdkController] Compacted session ${sessionId}: ${messagesBefore} -> ${result.messages.length} messages`)
	}

	/**
	 * Emit a synthetic api_req_started usage row so ContextWindow.tsx updates
	 * before the next model turn. Prefers the measured post-compaction request
	 * size and falls back to scaling the last real usage by the message-count
	 * ratio; emits nothing when neither is available.
	 */
	private emitPostCompactUsageEstimate(
		sessionId: string,
		measuredTokensAfter: number | undefined,
		counts: { messagesBefore: number; messagesAfter: number },
	): void {
		const activeSessionId = this.options.sessions.getActiveSession()?.sessionId
		if (activeSessionId !== sessionId) {
			return
		}
		let tokensAfter = measuredTokensAfter
		if (tokensAfter === undefined) {
			const lastTotal = getLastApiReqTotalTokens(this.readClineMessages())
			if (lastTotal <= 0) {
				return
			}
			tokensAfter = estimatePostCompactTokens(lastTotal, counts.messagesBefore, counts.messagesAfter)
		}
		if (tokensAfter <= 0) {
			return
		}
		this.options.messages.appendAndEmit([buildPostCompactUsageMessage(tokensAfter)], {
			type: "status",
			payload: { sessionId, status: "running" },
		})
	}

	private readClineMessages(): ClineMessage[] {
		return this.options.messages.getClineMessages()
	}

	private getCurrentMode(): Mode {
		const m = this.options.stateManager.getGlobalSettingsKey("mode")
		return m === "plan" ? m : "act"
	}

	private formatCompactionStatus(messagesBefore: number, messagesAfter: number): string {
		// Mirrors apps/cli/src/tui/utils/compaction-status.ts wording.
		if (messagesBefore === messagesAfter) {
			return `Compacted context; message count stayed at ${messagesAfter}.`
		}
		return `Compacted ${messagesBefore} messages to ${messagesAfter}.`
	}

	private emitInfo(text: string, sessionId?: string): void {
		const activeSessionId = this.options.sessions.getActiveSession()?.sessionId
		if (sessionId && activeSessionId !== sessionId) {
			Logger.warn(`[SdkController] compactTask: skipped info for inactive session ${sessionId}`)
			return
		}
		const targetSessionId = sessionId ?? activeSessionId ?? ""
		const infoMessage: ClineMessage = {
			ts: Date.now(),
			type: "say",
			say: "info",
			text,
			partial: false,
		}
		this.options.messages.appendAndEmit([infoMessage], {
			type: "status",
			payload: { sessionId: targetSessionId, status: "running" },
		})
	}
}
