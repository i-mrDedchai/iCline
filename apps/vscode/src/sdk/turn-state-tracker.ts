import type { TurnPhase, TurnState } from "@shared/ExtensionMessage"
import type { MessageIdMinter } from "./message-id-minter"

// Authoritative UI-mode tracker for the current agent turn.
//
// The backend knows the true phase at every SDK lifecycle point (it drives the session and owns
// every interaction promise), so it sets the phase explicitly here rather than letting the
// webview infer it from the tail of the message array. The webview renders
// footer/buttons/thinking from this.
//
// Each transition stamps a fresh `seq` from the shared minter so the webview keeps only the
// newest TurnState and ignores stale/out-of-order ones (a late "streaming" can never overwrite
// a newer "completed").

/**
 * Whether a turn is in flight at this phase — "a task is happening, do not
 * disturb the session". `streaming` covers tool execution as much as model
 * output (the gap between model streams is exactly where `isRunning` is false
 * mid-turn), and the two awaiting phases hold open prompts whose answer
 * channels die with the session.
 */
export function isTurnInFlightPhase(phase: TurnPhase): boolean {
	return phase === "streaming" || phase === "awaiting_approval" || phase === "awaiting_followup"
}

export class TurnStateTracker {
	private phase: TurnPhase = "idle"
	private anchorTs: number | undefined
	private seq: number

	constructor(
		private readonly minter: MessageIdMinter,
		/**
		 * Called after every phase change (even a same-phase re-set): phase clears
		 * are the moments a deferred passive session rebuild becomes safe, so
		 * listeners re-evaluate instead of waiting for the next idle event.
		 */
		private readonly onChange?: (phase: TurnPhase) => void,
	) {
		this.seq = minter.nextSeq()
	}

	/** Set the phase (and optional anchor message ts), advancing seq. No-op metadata if unchanged. */
	set(phase: TurnPhase, anchorTs?: number): void {
		this.phase = phase
		this.anchorTs = anchorTs
		this.seq = this.minter.nextSeq()
		this.onChange?.(phase)
	}

	/** Current immutable snapshot for inclusion in the state payload. */
	get(): TurnState {
		return { phase: this.phase, anchorTs: this.anchorTs, seq: this.seq }
	}

	get currentPhase(): TurnPhase {
		return this.phase
	}
}
