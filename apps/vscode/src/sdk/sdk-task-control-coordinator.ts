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
	setTurnPhase?: (phase: TurnPhase, anchorTs?: number) => void
	postStateToWebview: () => Promise<void>
	/**
	 * Reset the translator AND raise the fence: the displayed conversation is changing, so the
	 * webview must forget the previous transcript.
	 */
	resetMessageTranslator: () => void
	/**
	 * Raise ONLY the conversation fence (epoch), without clearing the translator's in-flight
	 * stream pointers. Used when the displayed conversation changes while a working session is
	 * parked: the webview must drop the previous transcript, but the parked session's next delta
	 * has to continue the bubble it already started.
	 */
	bumpConversationFence: () => void
	/**
	 * Raise the cancel fence SYNCHRONOUSLY before aborting the SDK session: bump the epoch so any
	 * straggler events the SDK emits after the abort request carry the old epoch (and are dropped
	 * by the webview), and mark the active turn cancelled so the session-event coordinator
	 * suppresses its remaining DISPLAY output (usage is still accounted).
	 */
	raiseCancelFence?: () => void
	/**
	 * A parked (background) session was stopped for good — cancelled from outside its own view,
	 * or replaced. Anything that was waiting on it (a queued task) can go now.
	 */
	onParkedSessionStopped?: () => void
}

export class SdkTaskControlCoordinator {
	/**
	 * The transcript of the session that kept working while the user looked elsewhere.
	 *
	 * Leaving the chat used to throw this away and re-read the conversation from the SDK store
	 * on return, which loses anything still in flight: a message that was mid-stream when the
	 * user left would come back as a finished message AND as a second, still-streaming one.
	 * Keeping the proxy means the parked session's events land in the transcript the user
	 * already has, so returning is a re-attach, not a replay.
	 */
	private parkedTask: TaskProxy | undefined

	constructor(private readonly options: SdkTaskControlCoordinatorOptions) {}

	getParkedTask(): TaskProxy | undefined {
		return this.parkedTask
	}

	/** Drop the parked transcript (its session was ended, replaced, or cancelled). */
	private discardParkedTask(): void {
		this.parkedTask = undefined
	}

	/**
	 * Raise the conversation fence for the webview without resetting the translator while a
	 * parked session is mid-stream.
	 *
	 * `reset()` clears the open-stream pointers, and the parked session is the only writer left
	 * to the translator: clearing them mid-turn would make its next delta open a SECOND bubble
	 * for text it had already partially written, leaving the first one stuck as a partial
	 * forever. Bumping the epoch is all the webview needs to replace the previous transcript.
	 */
	private fenceConversation(): void {
		if (this.options.sessions.getParkedSession()?.isRunning) {
			this.options.bumpConversationFence()
			return
		}
		this.options.resetMessageTranslator()
	}

	async cancelTask(): Promise<void> {
		// The user may cancel the session that is working in the background (its card in
		// Recent offers exactly that), so target whichever session is live here.
		const liveSession = this.options.sessions.getLiveSession()
		const isParked = liveSession !== undefined && liveSession === this.options.sessions.getParkedSession()
		if (!isParked) {
			this.options.interactions.clearPending("Task cancelled")
		}

		if (!liveSession) {
			Logger.warn("[SdkController] cancelTask: No active session")
			return
		}

		const { sdkHost, sessionId } = liveSession

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

		if (isParked) {
			// Cancelled from outside its own view: stop it for real, and keep the
			// displayed task's transcript untouched (the resume row belongs to the
			// cancelled task, which the user can reopen from Recent).
			await this.options.sessions.endParkedSession("cancelTask:parked")
			await this.options.postStateToWebview()
			Logger.log(`[SdkController] Parked task cancelled: ${sessionId}`)
			this.options.onParkedSessionStopped?.()
			return
		}

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
		// Leaving the chat is not a cancel. A session that is still working is parked
		// (it keeps running against the SDK, and its Recent card shows that), and only a
		// session with nothing in flight is ended here.
		const parked = this.options.sessions.parkActiveSession("clearTask")
		const background = parked ?? this.options.sessions.getParkedSession()
		const task = this.options.getTask()

		if (!background) {
			this.options.interactions.clearPending("Task cleared")
			await this.options.sessions.endActiveSession("clearTask")
		} else if (background.isRunning) {
			if (parked) {
				this.parkedTask = task
			}
			Logger.log("[SdkController] clearTask: kept a working session alive in the background")
		} else {
			// A parked session with nothing in flight is being left behind for good. Its transcript is
			// durable in the SDK store, so the in-memory copy can go — and so can the session itself,
			// or it would linger as a "background task" that does nothing and makes the Recent badge
			// claim a task is alive when the user already moved on.
			this.discardParkedTask()
			await this.options.sessions.endParkedSession("clearTask:idle", { awaitStop: false })
		}

		this.fenceConversation()

		if (task) {
			// SDK session persistence owns conversation history. Do not write classic
			// ui_messages.json here; history viewing reloads from SDK readMessages().
			this.options.messages.cancelPendingSave()
			// The parked transcript is the exception: it is the live copy of a conversation that
			// is still being written, so it must not be cleared out from under the running session.
			if (task !== this.parkedTask) {
				task.messageStateHandler.clear()
			}
			this.options.setTask(undefined)
		}
	}

	/**
	 * Bring the session that kept working in the background back to the display.
	 *
	 * Unlike opening a task from history, this does NOT re-read the conversation and does NOT
	 * rebuild the task proxy: the parked transcript is the live copy, so re-attaching to it is
	 * both cheaper and the only way a message that was mid-stream when the user left comes back
	 * as one message. The SDK session itself kept running throughout, so its events simply start
	 * reaching the display again.
	 */
	private async resumeParkedTask(taskId: string): Promise<void> {
		const isRunning = this.options.sessions.getParkedSession()?.isRunning === true
		const parkedTask = this.parkedTask

		// Raise the fence BEFORE re-attaching: the webview has to swap in the parked transcript,
		// but a parked session that is still mid-turn must keep its open stream pointers (see
		// fenceConversation).
		this.fenceConversation()
		this.options.sessions.resumeParkedSession()
		this.parkedTask = undefined

		const onScreenTask = this.options.getTask()
		if (onScreenTask && onScreenTask !== parkedTask) {
			onScreenTask.messageStateHandler.clear()
		}

		if (!parkedTask) {
			// Nothing was adopted when it was parked, so there is no live transcript to re-attach
			// to: read the conversation back the way opening history does. Correct, just slower.
			Logger.warn(`[SdkController] Resumed ${taskId} without an in-memory transcript; reloading it`)
			await this.loadTaskFromHistory(taskId)
			return
		}

		// The message objects are the ones the user left behind, so a message that was
		// mid-stream when they walked away keeps streaming into the bubble it already owns
		// instead of reappearing as a second, duplicated message.
		parkedTask.taskId = taskId
		this.options.setTask(parkedTask)

		if (this.options.interactions.surfaceDeferredAskForSession(taskId)) {
			// A question/approval it asked while hidden is still pending — its promise was never
			// resolved — so showing it now makes those buttons work as they did when it asked.
			this.options.setTurnPhase?.("awaiting_approval")
		} else {
			this.options.setTurnPhase?.(isRunning ? "streaming" : "awaiting_followup")
		}

		// The transcript is shipped as one snapshot; pushing each message through the partial
		// stream one-by-one would make a long task re-render its whole history.
		await this.options.postStateToWebview()
		Logger.log(`[SdkController] Resumed parked task: ${taskId}`)
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

			const displayedSession = this.options.sessions.getActiveSession()
			if (displayedSession?.sessionId === taskId && displayedSession.isRunning) {
				// Already on screen and still working: reloading it from disk would swap the live
				// transcript for a stale copy while the session kept producing messages.
				Logger.debug(`[SdkController] showTaskWithId: ${taskId} is already the displayed session`)
				return
			}

			// Reopening the task that has been working in the background brings it back to the
			// display: its events flow to the UI again, its live transcript is re-attached (so
			// nothing produced while it was hidden is lost), and a held approval is re-surfaced
			// because the promise behind it is still waiting.
			if (this.options.sessions.getParkedSession()?.sessionId === taskId) {
				await this.resumeParkedTask(taskId)
				return
			}

			// Any other target parks a running session rather than killing it mid-turn.
			this.options.sessions.parkActiveSession("showTaskWithId")
			if (this.options.sessions.getParkedSession()?.isRunning) {
				Logger.log(`[SdkController] showTaskWithId: parked a working session behind ${taskId}`)
			} else {
				// Nothing is working in the background (parking only takes a running session), so any
				// parked session left over is idle and finished with: drop it — and its promises, which
				// must not survive as an answerable ask nobody is waiting for.
				this.options.interactions.clearPending("Showing task from history")
				this.discardParkedTask()
				await this.options.sessions.endParkedSession("showTaskWithId:idle", { awaitStop: false })
			}

			await this.options.sessions.endActiveSession("showTaskWithId")

			const currentTask = this.options.getTask()
			if (currentTask && currentTask !== this.parkedTask) {
				currentTask.messageStateHandler.clear()
			}

			this.fenceConversation()
			await this.loadTaskFromHistory(taskId)
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

	/**
	 * Read a task's conversation out of the SDK store and make it the displayed task.
	 *
	 * The caller has already parked (or ended) whatever was live and raised the fence, so this
	 * only has to build the transcript and the proxy.
	 */
	private async loadTaskFromHistory(taskId: string): Promise<void> {
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

		// The final state update includes the loaded clineMessages. Avoid pushing each historical
		// message through the partial-message stream one-by-one; for long tasks that serial loop
		// can dominate history-open latency.
		await this.options.postStateToWebview()
		Logger.log(`[SdkController] Showing task: ${taskId}`)
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
