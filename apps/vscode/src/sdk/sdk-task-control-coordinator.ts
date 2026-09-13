import type { ClineMessage, TurnPhase } from "@shared/ExtensionMessage"
import { Logger } from "@/shared/services/Logger"
import type { SdkInteractionCoordinator } from "./sdk-interaction-coordinator"
import type { SdkMessageCoordinator } from "./sdk-message-coordinator"
import { isAbortError, type SdkSessionLifecycle } from "./sdk-session-lifecycle"
import type { SdkTaskHistory } from "./sdk-task-history"
import { createTaskProxy, type TaskProxy } from "./task-proxy"

function isHistoryBookkeepingMessage(message: ClineMessage): boolean {
	return message.say === "api_req_started" || message.say === "deleted_api_reqs" || message.say === "subagent_usage"
}

/**
 * Classify a reopened history transcript the same way the live session-event
 * coordinator classifies a finished turn: completed (completion tool),
 * resumable (interrupted / unmatched tool), or awaiting_followup.
 */
export function classifyReopenedHistory(messages: ClineMessage[]): {
	phase: TurnPhase
	appendResumeTask: boolean
} {
	const cleaned = messages.filter((m) => m.ask !== "resume_task" && m.ask !== "resume_completed_task")
	if (cleaned.length === 0) {
		return { phase: "idle", appendResumeTask: false }
	}

	let lastUserIdx = -1
	for (let i = cleaned.length - 1; i >= 0; i--) {
		if (cleaned[i].say === "task" || cleaned[i].say === "user_feedback") {
			lastUserIdx = i
			break
		}
	}
	const lastTurn = cleaned.slice(lastUserIdx + 1).filter((m) => !isHistoryBookkeepingMessage(m))

	if (lastTurn.some((m) => m.ask === "completion_result" || m.say === "completion_result")) {
		return { phase: "completed", appendResumeTask: false }
	}
	if (lastTurn.some((m) => m.partial === true)) {
		return { phase: "resumable", appendResumeTask: true }
	}
	// User sent something and the agent never answered — Resume, not a finished follow-up.
	if (lastTurn.length === 0 && lastUserIdx >= 0) {
		return { phase: "resumable", appendResumeTask: true }
	}
	return { phase: "awaiting_followup", appendResumeTask: false }
}

export interface SdkTaskControlCoordinatorOptions {
	sessions: SdkSessionLifecycle
	interactions: SdkInteractionCoordinator
	messages: SdkMessageCoordinator
	taskHistory: SdkTaskHistory
	getTask: () => TaskProxy | undefined
	setTask: (task: TaskProxy | undefined) => void
	onAskResponse: (text?: string, images?: string[], files?: string[]) => Promise<void>
	resetMessageTranslator: () => void
	setTurnPhase?: (phase: TurnPhase, anchorTs?: number) => void
	postStateToWebview: () => Promise<void>
	/**
	 * Raise the cancel fence SYNCHRONOUSLY before aborting the SDK session: bump the epoch so any
	 * straggler events the SDK emits after the abort request carry the old epoch (and are dropped
	 * by the webview), and mark the active turn cancelled so the session-event coordinator
	 * suppresses its remaining DISPLAY output (usage is still accounted).
	 */
	raiseCancelFence?: () => void
}

export class SdkTaskControlCoordinator {
	constructor(private readonly options: SdkTaskControlCoordinatorOptions) {}

	async cancelTask(): Promise<void> {
		this.options.interactions.clearPending("Task cancelled")

		const activeSession = this.options.sessions.getActiveSession()
		if (!activeSession) {
			Logger.warn("[SdkController] cancelTask: No active session")
			return
		}

		const { sdkHost, sessionId } = activeSession

		// FENCE FIRST: raise the cancel fence synchronously BEFORE awaiting the abort. Any event
		// the SDK emits after this point carries the old epoch (dropped by the webview) and is
		// marked cancelled (display suppressed by the session-event coordinator; usage still
		// accounted). Order matters — aborting first would leave a window where a straggler gets
		// the new epoch.
		this.options.raiseCancelFence?.()

		try {
			await sdkHost.abort(sessionId)
		} catch (error) {
			if (!isAbortError(error)) {
				Logger.error("[SdkController] Failed to abort session:", error)
			} else {
				Logger.debug(`[SdkController] AbortError during cancelTask (expected): ${sessionId}`)
			}
		}

		this.options.sessions.setRunning(false)

		const resumeMessage: ClineMessage = {
			ts: Date.now(),
			type: "ask",
			ask: "resume_task",
			text: "",
			partial: false,
		}
		this.options.messages.appendAndEmit([resumeMessage], { type: "status", payload: { sessionId, status: "cancelled" } })

		await this.options.postStateToWebview()
		Logger.log(`[SdkController] Task cancelled: ${sessionId}`)
	}

	async clearTask(): Promise<void> {
		this.options.interactions.clearPending("Task cleared")

		await this.options.sessions.endActiveSession("clearTask")

		const task = this.options.getTask()
		if (task) {
			// SDK session persistence owns conversation history. Do not write classic
			// ui_messages.json here; history viewing reloads from SDK readMessages().
			this.options.messages.cancelPendingSave()
			task.messageStateHandler.clear()
			this.options.setTask(undefined)
		}

		this.options.resetMessageTranslator()
	}

	async showTaskWithId(taskId: string, options: { skipHistoryLookup?: boolean } = {}): Promise<void> {
		try {
			if (!options.skipHistoryLookup) {
				const historyItem = await this.options.taskHistory.findHistoryItem(taskId)
				if (!historyItem) {
					Logger.error(`[SdkController] Task not found in history: ${taskId}`)
					return
				}
			}

			// Drop leftover approval/followup promises from the previous live task
			// before any await that could let the user answer the old ask.
			this.options.interactions.clearPending("Showing task from history")

			await this.options.sessions.endActiveSession("showTaskWithId")

			const currentTask = this.options.getTask()
			if (currentTask) {
				currentTask.messageStateHandler.clear()
			}

			this.options.resetMessageTranslator()

			// Load messages before installing the new task proxy so any concurrent
			// postStateToWebview() caller never sees the new id with empty messages.
			const isLegacyTask = await this.options.taskHistory.isLegacyTask(taskId)
			const rawMessages = await this.options.taskHistory.getClineMessages(taskId)
			const messages = this.options.messages.finalizeMessagesForSave(rawMessages)
			const cleanedMessages = isLegacyTask
				? this.appendLegacyTaskWarningAndResumeMessage(messages)
				: messages.length > 0
					? this.appendFreshResumeMessage(rawMessages, messages)
					: []

			this.applyReopenTurnPhase(rawMessages, cleanedMessages)

			const task = createTaskProxy(
				taskId,
				(text?: string, images?: string[], files?: string[]) => this.options.onAskResponse(text, images, files),
				() => this.cancelTask(),
			)
			if (cleanedMessages.length > 0) {
				task.messageStateHandler.addMessages(cleanedMessages)
			}
			this.options.setTask(task)

			if (cleanedMessages.length > 0) {
				Logger.log(`[SdkController] Loaded ${cleanedMessages.length} messages for task: ${taskId}`)
			} else {
				Logger.log(`[SdkController] No messages found for task: ${taskId}`)
			}

			// The final state update below includes the loaded clineMessages. Avoid pushing
			// each historical message through the partial-message stream one-by-one; for
			// long tasks that serial loop can dominate history-open latency.
			await this.options.postStateToWebview()
			Logger.log(`[SdkController] Showing task: ${taskId}`)
		} catch (error) {
			Logger.error("[SdkController] Failed to show task:", error)
			// The previous task was already cleared but no new one installed; drop the
			// stale live-turn phase so the footer can't show Thinking/Cancel or a phantom
			// approval with no session behind it.
			this.options.setTurnPhase?.("idle")
			await this.options
				.postStateToWebview()
				.catch((e) => Logger.error("[SdkController] State sync after show failure:", e))
		}
	}

	private appendFreshResumeMessage(rawMessages: ClineMessage[], finalizedMessages: ClineMessage[]): ClineMessage[] {
		const cleanedMessages = finalizedMessages.filter((m) => m.ask !== "resume_task" && m.ask !== "resume_completed_task")
		// Classify from the raw transcript: finalizeMessagesForSave strips `partial`,
		// which is the interrupted-turn signal.
		const classification = classifyReopenedHistory(rawMessages)
		if (classification.appendResumeTask) {
			cleanedMessages.push({
				ts: Date.now(),
				type: "ask",
				ask: "resume_task",
				text: "",
			})
		}
		return cleanedMessages
	}

	private applyReopenTurnPhase(rawMessages: ClineMessage[], cleanedMessages: ClineMessage[]): void {
		const last = cleanedMessages[cleanedMessages.length - 1]
		// An appended resume_task (interrupted last turn, or the legacy warning path)
		// is the source of truth for the resumable footer/Enter contract.
		if (last?.ask === "resume_task") {
			this.options.setTurnPhase?.("resumable", last.ts)
			return
		}
		const classification = classifyReopenedHistory(rawMessages)
		this.options.setTurnPhase?.(classification.phase)
	}

	private appendLegacyTaskWarningAndResumeMessage(messages: ClineMessage[]): ClineMessage[] {
		const cleanedMessages = messages.filter((m) => m.ask !== "resume_task" && m.ask !== "resume_completed_task")
		const now = Date.now()
		cleanedMessages.push(
			{
				ts: now,
				type: "say",
				say: "text",
				text: "⚠️ This is a legacy task. It may not work as well because tool names may have changed.",
			},
			{
				ts: now + 1,
				type: "ask",
				ask: "resume_task",
				text: "",
			},
		)
		return cleanedMessages
	}
}
