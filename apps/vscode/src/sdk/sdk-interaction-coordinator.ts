import type { AgentToolContext, ConsecutiveMistakeLimitContext, ConsecutiveMistakeLimitDecision } from "@cline/shared"
import type { ClineAskQuestion, ClineMessage, TurnPhase } from "@shared/ExtensionMessage"
import type { ClineAskResponse } from "@shared/WebviewMessage"
import { Logger } from "@/shared/services/Logger"
import { MessageIdMinter } from "./message-id-minter"
import { buildToolApprovalAskMessage } from "./message-translator"
import type { SdkMessageCoordinator } from "./sdk-message-coordinator"
import { buildToolApprovalDenialReason } from "./tool-approval-denial"

export interface ToolApprovalRequest {
	agentId: string
	conversationId: string
	iteration: number
	toolCallId: string
	toolName: string
	input: unknown
	policy: { enabled?: boolean; autoApprove?: boolean }
}

export interface SdkInteractionCoordinatorOptions {
	messages: SdkMessageCoordinator
	getSessionId: () => string
	postStateToWebview: () => Promise<void>
	shouldAutoApproveTool?: (request: ToolApprovalRequest) => boolean
	recordApprovedToolMessage?: (toolCallId: string, messageTs: number) => void
	recordDeniedToolApproval?: (toolCallId: string, toolName: string, reason: string) => void
	/**
	 * The process-wide id/seq/epoch authority, shared with the message translator. Optional so
	 * existing tests that don't need cross-generator id uniqueness keep working; when omitted a
	 * private minter is used. Production wires the shared minter from MessageTranslatorState.
	 */
	getMinter?: () => MessageIdMinter
	/**
	 * Set the authoritative UI turn phase. Called when an approval/ask is pending
	 * (awaiting_approval / awaiting_followup) and when the user responds (back to streaming).
	 * Optional for tests.
	 */
	setTurnPhase?: (phase: TurnPhase, anchorTs?: number) => void
	/**
	 * Invoked for manually-approved tools after the auto-approve short-circuit, BEFORE the
	 * ask message is emitted. Used to open the edit diff preview so the user decides while
	 * looking at the actual change. Must not throw; failures fall back to a plain ask.
	 */
	onToolApprovalAsk?: (request: ToolApprovalRequest) => Promise<void>
	/**
	 * True when an ask/interaction belongs to a session the user is not looking at
	 * (they walked away while it was working). Such an ask is held instead of shown:
	 * it must not enter another task's transcript, and it re-surfaces when the user
	 * returns to that task. See `getDeferredAsk`.
	 */
	shouldDeferInteraction?: (sessionId?: string) => boolean
	/** The session working in the background, for asks that carry no session of their own. */
	getBackgroundSessionId?: () => string | undefined
}

export class SdkInteractionCoordinator {
	private pendingAskResolve: ((answer: string) => void) | undefined
	private pendingToolApprovalResolve: ((result: { approved: boolean; reason?: string }) => void) | undefined
	private pendingMistakeLimitResolve: ((decision: ConsecutiveMistakeLimitDecision) => void) | undefined
	private pendingToolApprovalMessage:
		| {
				toolCallId: string
				messageTs: number
				toolName: string
		  }
		| undefined
	/**
	 * An ask that belongs to a background session: kept out of the displayed transcript
	 * until the user returns to that session, at which point it is appended so the
	 * pending approval/question stays answerable (the promise below is still waiting).
	 */
	private deferredAsk: { message: ClineMessage; sessionId: string; phase: TurnPhase } | undefined

	constructor(private readonly options: SdkInteractionCoordinatorOptions) {}

	/** True when this session is waiting on a question/approval the user has not been shown. */
	isAwaitingApproval(sessionId: string): boolean {
		return this.deferredAsk?.sessionId === sessionId
	}

	/** The session holding an ask the user has not seen yet (its Recent card says so). */
	getDeferredAskSessionId(): string | undefined {
		return this.deferredAsk?.sessionId
	}

	/**
	 * The ask held for this session, if any — used when the user reopens that task so the
	 * approval/question they never saw is displayed and can be answered.
	 */
	getDeferredAsk(sessionId: string): { message: ClineMessage; phase: TurnPhase } | undefined {
		const deferred = this.deferredAsk
		if (!deferred || deferred.sessionId !== sessionId) {
			return undefined
		}
		return { message: deferred.message, phase: deferred.phase }
	}

	clearDeferredAsk(): void {
		this.deferredAsk = undefined
	}

	/**
	 * Put a held ask back in the transcript because the user just reopened that task.
	 * The approval/question promise was never resolved, so the buttons work as they did
	 * when the ask first arrived. Returns true when an ask was re-surfaced.
	 */
	surfaceDeferredAskForSession(sessionId: string): boolean {
		const deferred = this.getDeferredAsk(sessionId)
		if (!deferred) {
			return false
		}
		this.deferredAsk = undefined
		this.options.messages.appendAndEmit([deferred.message], {
			type: "status",
			payload: { sessionId, status: "running" },
		})
		this.options.setTurnPhase?.(deferred.phase, deferred.message.ts)
		Logger.log(`[SdkController] Re-surfaced held ask for session ${sessionId} after the user returned`)
		return true
	}

	/**
	 * Show an ask in the transcript, or hold it when it belongs to a session the user
	 * is not looking at. Returns true when it was displayed.
	 */
	private surfaceAsk(message: ClineMessage, sessionId: string | undefined, phase: TurnPhase): boolean {
		if (this.options.shouldDeferInteraction?.(sessionId) === true) {
			const backgroundSessionId = sessionId ?? this.options.getBackgroundSessionId?.()
			this.deferredAsk = backgroundSessionId ? { message, sessionId: backgroundSessionId, phase } : undefined
			Logger.log(
				`[SdkController] Holding ${message.ask ?? message.say} ask for background session ${backgroundSessionId}; it appears when the user returns`,
			)
			return false
		}

		this.deferredAsk = undefined
		this.options.messages.appendAndEmit([message], {
			type: "status",
			payload: { sessionId: sessionId ?? this.options.getSessionId(), status: "running" },
		})
		this.options.setTurnPhase?.(phase, message.ts)
		return true
	}

	async handleConsecutiveMistakeLimitReached(
		context: ConsecutiveMistakeLimitContext,
	): Promise<ConsecutiveMistakeLimitDecision> {
		const detail = context.details?.trim()
		const latest = detail ? `${context.reason}: ${detail}` : `${context.reason} at iteration ${context.iteration}`
		const askMessage: ClineMessage = {
			ts: this.nextMessageTs(),
			type: "ask",
			ask: "mistake_limit_reached",
			text: `Cline ran into repeated tool errors (${context.consecutiveMistakes}/${context.maxConsecutiveMistakes}).\n\nLatest: ${latest}`,
			partial: false,
		}

		this.surfaceAsk(askMessage, undefined, "error")
		if (!this.deferredAsk) {
			await this.options.postStateToWebview()
		}

		return new Promise<ConsecutiveMistakeLimitDecision>((resolve) => {
			this.pendingMistakeLimitResolve = resolve
		})
	}

	async handleRequestToolApproval(request: ToolApprovalRequest): Promise<{ approved: boolean; reason?: string }> {
		if (request.policy.autoApprove === true || this.options.shouldAutoApproveTool?.(request) === true) {
			Logger.log(`[SdkController] Auto-approving tool execution: tool=${request.toolName}`)
			return { approved: true }
		}

		const toolAskMessage: ClineMessage = buildToolApprovalAskMessage(request.toolName, request.input, this.nextMessageTs())
		const isBackground = this.options.shouldDeferInteraction?.(request.conversationId) === true

		// Open the edit diff preview before the Approve/Reject buttons render. This is the only
		// pre-execution point where the adapter has the full tool input (the SDK emits the
		// tool's content events only after approval resolves). Skipped for a background
		// session: opening a diff for an ask nobody can see is worse than showing the plain
		// approval when the user returns.
		if (!isBackground) {
			try {
				await this.options.onToolApprovalAsk?.(request)
			} catch (error) {
				Logger.warn(`[SdkController] onToolApprovalAsk failed; showing plain approval ask: ${error}`)
			}
		}

		this.surfaceAsk(toolAskMessage, request.conversationId, "awaiting_approval")
		if (!isBackground) {
			await this.options.postStateToWebview()
		}

		return new Promise<{ approved: boolean; reason?: string }>((resolve) => {
			this.pendingToolApprovalResolve = resolve
			this.pendingToolApprovalMessage = {
				toolCallId: request.toolCallId,
				messageTs: toolAskMessage.ts,
				toolName: request.toolName,
			}
		})
	}

	async handleAskQuestion(question: string, options: string[], context: AgentToolContext): Promise<string> {
		const askData: ClineAskQuestion = {
			question,
			options: options?.length ? options : undefined,
		}
		const askMessage: ClineMessage = {
			ts: this.nextMessageTs(),
			type: "ask",
			ask: "followup",
			text: JSON.stringify(askData),
			partial: false,
		}

		// The ask_question tool reports which session asked, so a background task's question can be
		// recognised as one and held instead of interrupting whatever is on screen.
		const askSessionId = context?.sessionId ?? context?.conversationId
		this.surfaceAsk(askMessage, askSessionId, "awaiting_followup")
		if (!this.deferredAsk) {
			await this.options.postStateToWebview()
		}

		return new Promise<string>((resolve) => {
			this.pendingAskResolve = resolve
		})
	}

	resolvePendingToolApproval(
		prompt: string | undefined,
		responseType: ClineAskResponse | undefined,
		images?: string[],
		files?: string[],
	): boolean {
		if (!this.pendingToolApprovalResolve) {
			return false
		}

		const resolve = this.pendingToolApprovalResolve
		const pendingMessage = this.pendingToolApprovalMessage

		if (responseType === "messageResponse") {
			Logger.log("[SdkController] Leaving pending tool approval open and routing user message as queued follow-up")
			this.options.setTurnPhase?.("awaiting_approval", pendingMessage?.messageTs)
			// The approval remains pending. The chat message still needs normal follow-up routing.
			return false
		}

		this.pendingToolApprovalResolve = undefined
		this.pendingToolApprovalMessage = undefined

		const approved = responseType === "yesButtonClicked"
		Logger.log(`[SdkController] Resolving pending tool approval: approved=${approved} (responseType=${responseType})`)
		if (approved && pendingMessage) {
			this.options.recordApprovedToolMessage?.(pendingMessage.toolCallId, pendingMessage.messageTs)
		}

		// Approved or rejected by approval controls, the agent resumes its turn and returns to streaming.
		// On rejection the agent receives the denial and continues; the SDK drives the next phase.
		this.options.setTurnPhase?.("streaming")
		// The reason must state the operation did NOT happen (for edits: the file is
		// unchanged) — raw feedback alone reads like iteration on an applied change.
		const denialReason = buildToolApprovalDenialReason(pendingMessage?.toolName, prompt)
		if (!approved && (prompt?.trim() || images?.length || files?.length)) {
			const userMessage: ClineMessage = {
				ts: this.nextMessageTs(),
				type: "say",
				say: "user_feedback",
				text: prompt ?? "",
				images,
				files,
				partial: false,
			}
			this.options.messages.appendAndEmit([userMessage], {
				type: "status",
				payload: { sessionId: this.options.getSessionId(), status: "running" },
			})
		}
		if (!approved && pendingMessage) {
			this.options.recordDeniedToolApproval?.(pendingMessage.toolCallId, pendingMessage.toolName, denialReason)
		}
		resolve({
			approved,
			...(approved ? {} : { reason: denialReason }),
		})
		return true
	}

	resolvePendingAskQuestion(prompt: string | undefined): boolean {
		if (!this.pendingAskResolve) {
			return false
		}

		const resolve = this.pendingAskResolve
		this.pendingAskResolve = undefined
		const responseText = prompt ?? ""
		Logger.log(`[SdkController] Resolving pending ask_question with: "${responseText.substring(0, 80)}"`)

		if (responseText) {
			const userMessage: ClineMessage = {
				ts: this.nextMessageTs(),
				type: "say",
				say: "user_feedback",
				text: responseText,
				partial: false,
			}
			this.options.messages.appendAndEmit([userMessage], {
				type: "status",
				payload: { sessionId: this.options.getSessionId(), status: "running" },
			})
		}

		// User answered the follow-up — the agent resumes its turn.
		this.options.setTurnPhase?.("streaming")
		resolve(responseText)
		return true
	}

	resolvePendingMistakeLimit(prompt: string | undefined, responseType: ClineAskResponse | undefined): boolean {
		if (!this.pendingMistakeLimitResolve) {
			return false
		}

		const resolve = this.pendingMistakeLimitResolve
		this.pendingMistakeLimitResolve = undefined
		this.options.setTurnPhase?.("streaming")

		if (responseType === "noButtonClicked") {
			resolve({ action: "stop", reason: "stopped after mistake_limit_reached prompt" })
			return true
		}

		const trimmedPrompt = prompt?.trim()
		if (trimmedPrompt) {
			const userMessage: ClineMessage = {
				ts: this.nextMessageTs(),
				type: "say",
				say: "user_feedback",
				text: trimmedPrompt,
				partial: false,
			}
			this.options.messages.appendAndEmit([userMessage], {
				type: "status",
				payload: { sessionId: this.options.getSessionId(), status: "running" },
			})
		}

		const guidance = trimmedPrompt
			? `mistake_limit_reached: ${trimmedPrompt}`
			: "mistake_limit_reached: retry with a different approach, validate tool parameters before calls, and avoid repeating failed steps."

		resolve({ action: "continue", guidance })
		return true
	}

	clearPending(reason: string): void {
		this.deferredAsk = undefined
		this.pendingAskResolve = undefined
		if (this.pendingMistakeLimitResolve) {
			this.pendingMistakeLimitResolve({ action: "stop", reason })
			this.pendingMistakeLimitResolve = undefined
		}
		const pendingMessage = this.pendingToolApprovalMessage
		this.pendingToolApprovalMessage = undefined
		if (this.pendingToolApprovalResolve) {
			// Record before resolving: the denial unblocks the core, which emits the
			// tool's lifecycle events before the caller's abort lands. Unless the
			// denial is already recorded, the translator renders those events as a
			// second tool row next to the still-visible approval ask.
			if (pendingMessage) {
				this.options.recordDeniedToolApproval?.(pendingMessage.toolCallId, pendingMessage.toolName, reason)
			}
			this.pendingToolApprovalResolve({ approved: false, reason })
			this.pendingToolApprovalResolve = undefined
		}
	}

	/**
	 * Mint a unique message id from the SHARED minter so interaction messages (tool-approval
	 * asks, ask_question, user_feedback) never collide with translator-minted ids. Falls back to
	 * a private minter when none is wired (tests).
	 */
	private nextMessageTs(): number {
		return this.getMinter().nextId()
	}

	private fallbackMinter: MessageIdMinter | undefined
	private getMinter(): MessageIdMinter {
		if (this.options.getMinter) {
			return this.options.getMinter()
		}
		if (!this.fallbackMinter) {
			// Lazy import-free fallback: construct on first use.
			this.fallbackMinter = new MessageIdMinter()
		}
		return this.fallbackMinter
	}
}
