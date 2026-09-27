import { Logger } from "@/shared/services/Logger"
import type { SdkSessionLifecycle } from "./sdk-session-lifecycle"

export type SessionRebuildReason = "provider" | "mcpTools" | "terminalExecutionMode" | "agentTools"

export interface SdkSessionRebuildSchedulerOptions {
	sessions: Pick<SdkSessionLifecycle, "getActiveSession">
	/**
	 * Whether the session is mid-turn. `isRunning` alone is NOT an idle signal: it
	 * is false while a tool executes (the gap between model streams), and a
	 * rebuild drained at exactly that moment stops and replaces a session with a
	 * turn in flight — killing the task mid-tool (the team e2e caught exactly
	 * this). The turn's own lifecycle answers "is it safe to rebuild".
	 */
	isTurnInFlight: () => boolean
}

/** Serializes passive session rebuilds and drains them only while the session is idle. */
export class SdkSessionRebuildScheduler {
	private readonly pending = new Map<SessionRebuildReason, () => Promise<void>>()
	private drainInFlight: Promise<void> | undefined

	constructor(private readonly options: SdkSessionRebuildSchedulerOptions) {}

	request(reason: SessionRebuildReason, rebuild: () => Promise<void>): void {
		this.pending.set(reason, rebuild)
		this.drainIfIdle()
	}

	cancel(reason: SessionRebuildReason): void {
		this.pending.delete(reason)
	}

	async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
		while (this.drainInFlight) {
			await this.drainInFlight
		}
		let resolveExclusive: () => void = () => {}
		const exclusive = new Promise<void>((resolve) => {
			resolveExclusive = resolve
		})
		this.drainInFlight = exclusive
		try {
			return await operation()
		} finally {
			resolveExclusive()
			if (this.drainInFlight === exclusive) {
				this.drainInFlight = undefined
			}
			this.drainIfIdle()
		}
	}

	sessionBecameIdle(): void {
		this.drainIfIdle()
	}

	async waitUntilSettled(): Promise<void> {
		while (this.drainInFlight) {
			await this.drainInFlight
		}
	}

	private drainIfIdle(): void {
		const activeSession = this.options.sessions.getActiveSession()
		if (
			this.drainInFlight ||
			this.pending.size === 0 ||
			!activeSession ||
			activeSession.isRunning ||
			this.options.isTurnInFlight()
		) {
			return
		}

		const drain = async (): Promise<void> => {
			while (this.pending.size > 0) {
				const activeSession = this.options.sessions.getActiveSession()
				if (!activeSession) {
					this.pending.clear()
					return
				}
				if (activeSession.isRunning || this.options.isTurnInFlight()) {
					return
				}

				const next = this.pending.entries().next().value
				if (!next) {
					return
				}
				const [reason, rebuild] = next
				this.pending.delete(reason)

				try {
					await rebuild()
				} catch (error) {
					Logger.error(`[SdkController] Failed scheduled ${reason} session rebuild:`, error)
				}
			}
		}

		this.drainInFlight = drain().finally(() => {
			this.drainInFlight = undefined
			this.drainIfIdle()
		})
	}
}
