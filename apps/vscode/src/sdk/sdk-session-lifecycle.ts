import type {
	CoreSessionEvent,
	ITelemetryService,
	PreparedRemoteConfigCoreIntegration,
	RestoreInput,
	RestoreResult,
	StartSessionResult,
} from "@cline/core"
import { formatModeSwitchNotice, type ModeSwitchNotice } from "@cline/shared"
import { StateManager } from "@/core/storage/StateManager"
import type { VscodeTerminalManager } from "@/hosts/vscode/terminal/VscodeTerminalManager"
import { McpHub } from "@/services/mcp/McpHub"
import { Logger } from "@/shared/services/Logger"
import type { ActiveSession } from "./cline-session-factory"
import type { SdkForegroundCommandCoordinator } from "./sdk-foreground-command-coordinator"
import { buildToolPolicies } from "./sdk-tool-policies"
import { buildTurnStallNotice, EMPTY_TURN_NOTICE, isEmptyTurnResult, TurnStallWatchdog } from "./sdk-turn-notices"
import type { SdkSessionHost } from "./session-host"
import { VscodeSessionHost } from "./vscode-session-host"

type RequestToolApprovalHandler = NonNullable<Parameters<typeof VscodeSessionHost.create>[0]["requestToolApproval"]>
type AskQuestionHandler = NonNullable<Parameters<typeof VscodeSessionHost.create>[0]["askQuestion"]>
type EditorExecutorHandler = NonNullable<Parameters<typeof VscodeSessionHost.create>[0]["editorExecutor"]>
type ApplyPatchExecutorHandler = NonNullable<Parameters<typeof VscodeSessionHost.create>[0]["applyPatchExecutor"]>

export interface SdkSessionLifecycleOptions {
	mcpHub: McpHub
	requestToolApproval: RequestToolApprovalHandler
	askQuestion: AskQuestionHandler
	/** Custom `editor` executor (diff-view edit pipeline); replaces the SDK's disk writer. */
	editorExecutor?: EditorExecutorHandler
	/** Custom `apply_patch` executor (reverts the diff preview, then applies via the SDK default). */
	applyPatchExecutor?: ApplyPatchExecutorHandler
	onSessionEvent: (event: CoreSessionEvent) => void
	/** Lazy factory for the VscodeTerminalManager (foreground terminal support). */
	getTerminalManager?: () => VscodeTerminalManager
	/** Registry of in-flight foreground executions for "Proceed While Running". */
	foregroundCommands?: SdkForegroundCommandCoordinator
	/** Returns the latest prepared remote-config integration, if remote config is active. */
	getRemoteConfigIntegration?: () => PreparedRemoteConfigCoreIntegration | undefined
	/** Shared SDK telemetry service owned by SdkController. */
	telemetry?: ITelemetryService
	onSendStart?: (sessionId: string) => void
	onSendComplete: (sessionId: string) => Promise<void> | void
	onSendError: (error: unknown, sessionId: string) => Promise<void> | void
	/**
	 * Surfaces a visible notice in the chat (empty-turn recovery hint, stall
	 * warning). The fix.31-33 smoke run's "silent stall" complaint: turns that
	 * ended or wedged quietly, with the user only learning about it after asking.
	 */
	onSendNotice?: (sessionId: string, text: string) => void
	/**
	 * Returns (and clears) a pending user-initiated plan/act switch recorded by
	 * SdkModeCoordinator for this session, so fireAndForgetSend — the single
	 * funnel for outbound turn sends — can stamp a <mode_notice> onto the next
	 * message. Consumed exactly once; null when no switch is pending.
	 */
	consumeModeSwitchNotice?: (sessionId: string) => ModeSwitchNotice | null
	onDidBecomeIdle?: () => void
	/**
	 * The parked (background) session finished its turn. Kept separate from `onDidBecomeIdle`:
	 * that hook drives deferred mode changes and session rebuilds aimed at the DISPLAYED
	 * session, and a background task finishing must not rebuild the view the user is looking at.
	 */
	onParkedSessionIdle?: () => void
}

/** Quiet period before the stall notice fires. Long enough to skip slow builds. */
const TURN_STALL_THRESHOLD_MINUTES = 10
const TURN_STALL_THRESHOLD_MS = TURN_STALL_THRESHOLD_MINUTES * 60_000

export class SdkSessionLifecycle {
	private activeSession: ActiveSession | undefined
	/**
	 * A session the user walked away from while it was working.
	 *
	 * iCline used to end the live session on every navigation ("+", opening another
	 * task's history, starting a new task), so leaving the chat killed the agent
	 * mid-turn. A parked session keeps running against the SDK; only the *display*
	 * moves elsewhere. At most one of {active, parked} exists, and nothing is ever
	 * parked unless it is running — an idle session has nothing to preserve, and its
	 * transcript is already durable in the SDK's session store.
	 */
	private parkedSession: ActiveSession | undefined
	private sharedHost: SdkSessionHost | undefined
	private sharedHostPromise: Promise<SdkSessionHost> | undefined
	/** Watchdog for the turn currently being sent; fires a stall notice once. */
	private stallWatchdog: TurnStallWatchdog | undefined
	private sharedHostUnsubscribe: (() => void) | undefined
	/**
	 * Stops still in flight, keyed by sessionId. Mode/MCP rebuilds and
	 * follow-up resumes reuse the sessionId of the session they replace, and
	 * core cleanup is keyed by sessionId, so a same-id start that overlaps a
	 * stop would be torn down by the old session's late cleanup.
	 * startNewSession consults this map to enforce stop-before-start, the same
	 * sequencing the CLI uses.
	 */
	private readonly pendingStops = new Map<string, Promise<void>>()

	constructor(private readonly options: SdkSessionLifecycleOptions) {}

	getActiveSession(): ActiveSession | undefined {
		return this.activeSession
	}

	/** The session that is still alive in this app: the displayed one, or the parked one. */
	getLiveSession(): ActiveSession | undefined {
		return this.activeSession ?? this.parkedSession
	}

	getParkedSession(): ActiveSession | undefined {
		return this.parkedSession
	}

	/** True when this session is the one running/streaming here, displayed or parked. */
	isLiveSession(sessionId: string): boolean {
		return this.getLiveSession()?.sessionId === sessionId
	}

	/**
	 * Stop displaying the live session without stopping it.
	 * Returns the parked session, or undefined when there was none (or it was idle).
	 */
	parkActiveSession(reason: string): ActiveSession | undefined {
		const activeSession = this.activeSession
		if (!activeSession) {
			return undefined
		}
		if (!activeSession.isRunning) {
			// Idle work has nothing to preserve: leave it to endActiveSession's callers so
			// the SDK session is stopped and resources are released.
			return undefined
		}
		if (this.parkedSession) {
			Logger.warn(
				`[SdkController] Parked ${this.parkedSession.sessionId} was replaced by ${activeSession.sessionId} (${reason})`,
			)
			void this.endParkedSession(`${reason}:replaced`, { awaitStop: false })
		}
		this.activeSession = undefined
		this.parkedSession = activeSession
		Logger.log(
			`[SdkController] Parked running session ${activeSession.sessionId}; it keeps working while the UI is elsewhere (${reason})`,
		)
		return activeSession
	}

	/** Bring a parked session back to the display (its events flow to the UI again). */
	resumeParkedSession(): ActiveSession | undefined {
		const parkedSession = this.parkedSession
		if (!parkedSession) {
			return undefined
		}
		this.parkedSession = undefined
		this.activeSession = parkedSession
		Logger.log(`[SdkController] Resumed parked session ${parkedSession.sessionId}`)
		return parkedSession
	}

	/**
	 * Update the parked session's run flag from its own status events.
	 *
	 * Deliberately does NOT fire onDidBecomeIdle: that hook drives deferred mode
	 * changes and session rebuilds aimed at the *displayed* session, and a background
	 * task finishing must not trigger a rebuild of the view the user is looking at.
	 */
	setParkedRunning(isRunning: boolean): void {
		const parkedSession = this.parkedSession
		if (!parkedSession || parkedSession.isRunning === isRunning) {
			return
		}
		parkedSession.isRunning = isRunning
		if (!isRunning) {
			this.options.onParkedSessionIdle?.()
		}
	}

	setRunning(isRunning: boolean): void {
		// Applies to whichever session is live here — a parked session must still learn
		// that its turn ended, otherwise its "working" badge would never clear.
		const activeSession = this.getLiveSession()
		if (!activeSession || activeSession.isRunning === isRunning) {
			return
		}
		activeSession.isRunning = isRunning
		if (!isRunning) {
			// The two idle signals are deliberately different: only the DISPLAYED session's turn end
			// may drive deferred mode changes and session rebuilds.
			if (activeSession === this.activeSession) {
				this.options.onDidBecomeIdle?.()
			} else {
				this.options.onParkedSessionIdle?.()
			}
		}
	}

	private clearActiveSessionReference(): ActiveSession | undefined {
		const activeSession = this.activeSession
		this.activeSession = undefined
		return activeSession
	}

	async endActiveSession(
		reason: string,
		options: { awaitStop?: boolean; timeoutMs?: number } = {},
	): Promise<ActiveSession | undefined> {
		const activeSession = this.clearActiveSessionReference()
		if (!activeSession) {
			return undefined
		}

		this.safeUnsubscribe(activeSession, reason)
		const stopPromise = this.trackSessionStop(activeSession.sdkHost, activeSession.sessionId, reason)
		if (options.awaitStop) {
			const timeoutMs = options.timeoutMs ?? 3000
			const stopped = await this.waitForStop(stopPromise, timeoutMs)
			if (!stopped) {
				Logger.warn(
					`[SdkController] Timed out stopping SDK session ${activeSession.sessionId} after ${timeoutMs}ms (${reason})`,
				)
			}
		}
		return activeSession
	}

	/**
	 * Stop the parked session (its work is finished with, or the user cancelled it).
	 * Safe to call when nothing is parked.
	 */
	async endParkedSession(
		reason: string,
		options: { awaitStop?: boolean; timeoutMs?: number } = {},
	): Promise<ActiveSession | undefined> {
		const parkedSession = this.parkedSession
		this.parkedSession = undefined
		if (!parkedSession) {
			return undefined
		}

		this.safeUnsubscribe(parkedSession, reason)
		const stopPromise = this.trackSessionStop(parkedSession.sdkHost, parkedSession.sessionId, reason)
		if (options.awaitStop) {
			await this.waitForStop(stopPromise, options.timeoutMs ?? 3000)
		}
		Logger.log(`[SdkController] Stopped parked session ${parkedSession.sessionId} (${reason})`)
		return parkedSession
	}

	async updateActiveSessionModel(modelId: string): Promise<boolean> {
		const activeSession = this.activeSession
		if (!activeSession?.sdkHost.updateSessionModel) {
			return false
		}

		await activeSession.sdkHost.updateSessionModel(activeSession.sessionId, modelId)
		return true
	}

	async startNewSession(
		startInput: Parameters<VscodeSessionHost["start"]>[0],
	): Promise<{ startResult: StartSessionResult; sdkHost: SdkSessionHost }> {
		if (this.activeSession) {
			await this.endActiveSession("startNewSession")
		}
		// A new task means the user is done with whatever was parked: by now the queue
		// has waited for it to go idle, so stopping it is not killing live work.
		if (this.parkedSession) {
			await this.endParkedSession("startNewSession", { awaitStop: true })
		}

		// Same-id starts must wait for the previous session's stop to finish;
		// see pendingStops. A fresh id cannot conflict, so it never waits.
		const requestedSessionId = startInput.config?.sessionId?.trim()
		const pendingStop = requestedSessionId ? this.pendingStops.get(requestedSessionId) : undefined
		if (pendingStop) {
			Logger.log(`[SdkController] Waiting for session ${requestedSessionId} to stop before restarting it`)
			await pendingStop
		}

		const autoApprovalSettings = StateManager.get().getGlobalSettingsKey("autoApprovalSettings")
		const yoloMode = StateManager.get().getGlobalSettingsKey("yoloModeToggled") === true
		const toolPolicies = autoApprovalSettings
			? buildToolPolicies(autoApprovalSettings, this.options.mcpHub, yoloMode)
			: undefined

		const sdkHost = await this.getOrCreateSharedHost()

		const startResult = await sdkHost.start({
			...startInput,
			...(toolPolicies ? { toolPolicies } : {}),
		})
		this.activeSession = {
			sessionId: startResult.sessionId,
			startConfig: startInput.config
				? {
						providerId: startInput.config.providerId,
						modelId: startInput.config.modelId,
					}
				: undefined,
			sdkHost,
			unsubscribe: () => {},
			startResult,
			isRunning: true,
		}

		return { startResult, sdkHost }
	}

	async replaceActiveSession(options: {
		expectedSession: ActiveSession
		startInput: Parameters<VscodeSessionHost["start"]>[0]
		initialMessages?: Parameters<VscodeSessionHost["start"]>[0]["initialMessages"]
		disposeReason: string
	}): Promise<
		| {
				oldSessionId: string
				startResult: StartSessionResult
				sdkHost: SdkSessionHost
		  }
		| undefined
	> {
		const oldSession = this.activeSession
		if (!oldSession || oldSession !== options.expectedSession || oldSession.isRunning) {
			return undefined
		}

		const { sessionId: oldSessionId } = oldSession

		// No need to await the stop here: callers reuse oldSessionId in the
		// startInput, and startNewSession waits on the pending stop for it.
		await this.endActiveSession(options.disposeReason)

		const { startResult, sdkHost } = await this.startNewSession({
			...options.startInput,
			...(options.initialMessages ? { initialMessages: options.initialMessages } : {}),
		})
		this.setRunning(false)

		return { oldSessionId, startResult, sdkHost }
	}

	async restoreActiveSession(input: RestoreInput): Promise<RestoreResult> {
		const activeSession = this.activeSession
		if (!activeSession) {
			throw new Error("No active SDK session to restore")
		}

		const sourceSessionId = activeSession.sessionId
		const restored = await activeSession.sdkHost.restore(input)
		if (!restored.startResult || !restored.sessionId) {
			return restored
		}

		this.activeSession = {
			...activeSession,
			sessionId: restored.sessionId,
			startConfig: input.start?.config
				? {
						providerId: input.start.config.providerId,
						modelId: input.start.config.modelId,
					}
				: activeSession.startConfig,
			startResult: restored.startResult,
			isRunning: false,
		}

		if (restored.sessionId !== sourceSessionId) {
			const stopPromise = this.trackSessionStop(activeSession.sdkHost, sourceSessionId, "restoreActiveSession")
			stopPromise.catch((error) => {
				Logger.warn(`[SdkController] Failed to stop source session after checkpoint restore: ${sourceSessionId}`, error)
			})
		}

		return restored
	}

	async dispose(reason = "SdkSessionLifecycle.dispose"): Promise<void> {
		await this.endActiveSession(reason, { awaitStop: true })
		await this.endParkedSession(reason, { awaitStop: true })

		const sharedHost = this.sharedHost ?? (await this.sharedHostPromise?.catch(() => undefined))
		this.sharedHost = undefined
		this.sharedHostPromise = undefined
		this.sharedHostUnsubscribe?.()
		this.sharedHostUnsubscribe = undefined
		await sharedHost?.dispose(reason)
	}

	private createSafeUnsubscribe(unsubscribe: () => void, label: string): () => void {
		let unsubscribed = false
		return () => {
			if (unsubscribed) {
				return
			}
			unsubscribed = true
			try {
				unsubscribe()
			} catch (error) {
				Logger.warn(`[SdkController] Failed to unsubscribe SDK session listener (${label}):`, error)
			}
		}
	}

	private safeUnsubscribe(activeSession: ActiveSession, reason: string): void {
		activeSession.unsubscribe()
		Logger.debug(`[SdkController] Unsubscribed SDK session listener: ${activeSession.sessionId} (${reason})`)
	}

	private ensureSharedHostSubscription(sdkHost: SdkSessionHost): void {
		if (this.sharedHostUnsubscribe) {
			return
		}
		this.sharedHostUnsubscribe = this.createSafeUnsubscribe(
			sdkHost.subscribe((event) => {
				// Any session event proves the turn is alive; the watchdog only fires
				// across a quiet stretch with no tool/command/model progress.
				this.stallWatchdog?.touch()
				this.options.onSessionEvent(event)
			}),
			"shared-host",
		)
	}

	/**
	 * Starts the session's stop and records it in pendingStops until it
	 * settles. The returned promise never rejects.
	 */
	private trackSessionStop(sdkHost: SdkSessionHost, sessionId: string, reason: string): Promise<void> {
		const startedAt = Date.now()
		const stopPromise = sdkHost
			.stop(sessionId)
			.then(() => {
				const elapsed = Date.now() - startedAt
				if (elapsed > 250) {
					Logger.log(`[SdkController] SDK session ${sessionId} stopped in ${elapsed}ms (${reason})`)
				}
			})
			.catch((error: unknown) => {
				Logger.warn(`[SdkController] Failed to stop SDK session ${sessionId} (${reason}):`, error)
			})
			.finally(() => {
				if (this.pendingStops.get(sessionId) === stopPromise) {
					this.pendingStops.delete(sessionId)
				}
			})
		this.pendingStops.set(sessionId, stopPromise)
		return stopPromise
	}

	private async waitForStop(stopPromise: Promise<void>, timeoutMs: number): Promise<boolean> {
		let timeoutHandle: ReturnType<typeof setTimeout> | undefined
		try {
			const timeout = new Promise<"timeout">((resolve) => {
				timeoutHandle = setTimeout(() => resolve("timeout"), timeoutMs)
			})
			const result = await Promise.race([stopPromise.then(() => "stopped" as const), timeout])
			return result === "stopped"
		} finally {
			clearTimeout(timeoutHandle)
		}
	}

	private async getOrCreateSharedHost(): Promise<SdkSessionHost> {
		if (this.sharedHost) {
			this.ensureSharedHostSubscription(this.sharedHost)
			return this.sharedHost
		}
		if (!this.sharedHostPromise) {
			// Host-lifetime dependencies only. Anything task/session-specific must be
			// supplied to sdkHost.start(...), otherwise it can leak across reused sessions.
			this.sharedHostPromise = VscodeSessionHost.create({
				mcpHub: this.options.mcpHub,
				requestToolApproval: this.options.requestToolApproval,
				askQuestion: this.options.askQuestion,
				editorExecutor: this.options.editorExecutor,
				applyPatchExecutor: this.options.applyPatchExecutor,
				getTerminalManager: this.options.getTerminalManager,
				foregroundCommands: this.options.foregroundCommands,
				getRemoteConfigIntegration: this.options.getRemoteConfigIntegration,
				telemetry: this.options.telemetry,
			})
				.then((sdkHost) => {
					this.ensureSharedHostSubscription(sdkHost)
					this.sharedHost = sdkHost
					return sdkHost
				})
				.finally(() => {
					this.sharedHostPromise = undefined
				})
		}
		return this.sharedHostPromise
	}

	fireAndForgetSend(
		sdkHost: SdkSessionHost,
		sessionId: string,
		prompt: string,
		images?: string[],
		files?: string[],
		delivery?: "queue" | "steer",
	): void {
		// Captured by object identity, not sessionId: rebuilds (mode change) reuse
		// the same sessionId for the replacement session, so only reference
		// equality can tell this send's session apart from a successor. If the
		// session was replaced by the time the send settles, the settle callbacks
		// must not run bookkeeping against the successor (e.g. flipping a live
		// auto-continued run to isRunning=false, which makes the event coordinator
		// treat the new turn's completion as a cancelled-turn straggler).
		const sessionAtSend = this.activeSession
		const isSuperseded = (label: string): boolean => {
			if (this.activeSession === sessionAtSend) {
				return false
			}
			Logger.debug(`[SdkController] Ignoring ${label} of superseded send for session: ${sessionId}`)
			return true
		}
		// Mark a preceding user-initiated mode switch on this message so the model
		// sees exactly when the rules changed, instead of only inferring it from
		// the user_input mode attribute flipping (mirrors the CLI's
		// run-interactive stamping). The notice survives prepareTurnInput's
		// normalizeUserInput sanitize and is hidden from display surfaces by
		// stripModeNotices.
		const notice = this.options.consumeModeSwitchNotice?.(sessionId)
		const noticedPrompt = notice ? `${formatModeSwitchNotice(notice.from, notice.to)}\n${prompt}` : prompt
		this.options.onSendStart?.(sessionId)
		// Stall watchdog only for the turn this send actually starts; queued and
		// steered messages return before a turn runs (drained later by core).
		const startsTurn = delivery !== "queue" && delivery !== "steer"
		let stallWatchdog: TurnStallWatchdog | undefined
		if (startsTurn) {
			stallWatchdog = new TurnStallWatchdog({
				thresholdMs: TURN_STALL_THRESHOLD_MS,
				onStall: () => {
					if (this.activeSession === sessionAtSend) {
						this.options.onSendNotice?.(sessionId, buildTurnStallNotice(TURN_STALL_THRESHOLD_MINUTES))
					}
				},
			})
			this.stallWatchdog = stallWatchdog
			stallWatchdog.start()
		}
		const clearStallWatchdog = (): void => {
			if (stallWatchdog && this.stallWatchdog === stallWatchdog) {
				this.stallWatchdog = undefined
				stallWatchdog.stop()
			}
		}
		sdkHost
			.send({
				sessionId,
				prompt: noticedPrompt,
				userImages: images,
				userFiles: files,
				delivery,
			})
			.then(async (result) => {
				if (delivery === "queue" || delivery === "steer") {
					Logger.log(`[SdkController] Message queued for session: ${sessionId}`)
					return
				}
				if (isSuperseded("completion")) {
					return
				}
				clearStallWatchdog()
				if (isEmptyTurnResult(result)) {
					// The turn finished with no output at all — the "silent end" the
					// smoke run kept hitting. Say so instead of leaving the chat quiet.
					Logger.warn(`[SdkController] Turn produced no output for session: ${sessionId}`)
					this.options.onSendNotice?.(sessionId, EMPTY_TURN_NOTICE)
				}
				Logger.log(`[SdkController] Agent turn completed for session: ${sessionId}`)
				this.setRunning(false)
				await this.options.onSendComplete(sessionId)
			})
			.catch(async (error: unknown) => {
				if (isAbortError(error)) {
					clearStallWatchdog()
					Logger.debug(`[SdkController] Agent turn aborted (expected): ${sessionId}`)
					return
				}
				if (isSuperseded("failure")) {
					return
				}
				clearStallWatchdog()
				Logger.error("[SdkController] Agent turn failed:", error)
				this.setRunning(false)
				await this.options.onSendError(error, sessionId)
			})
	}
}

export function isAbortError(error: unknown): boolean {
	if (error instanceof Error) {
		return error.name === "AbortError" || error.message.toLowerCase().includes("aborted")
	}
	return false
}
