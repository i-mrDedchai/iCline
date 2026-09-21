/**
 * A watchdog for a stream that goes QUIET.
 *
 * The failure this exists for has no error in it: the request is open, the socket is
 * alive, the provider just stops sending. Nothing fails, so nothing retries — the AI
 * SDK's retry only covers request INITIATION, the empty-response middleware only sees
 * turns that ended, and the agent loop's turn-level retry only runs on a `finish` event
 * that says `error`. The turn therefore hangs on screen until the provider's own gateway
 * gives up, which in smoke 2026-09-21 (Cline's free tier, GLM 5.3 Flash) took minutes and
 * surfaced only as the upstream's own "Upstream idle timeout exceeded" — after the user
 * had watched a reply crawl for that long.
 *
 * This turns silence into an ordinary abort, which the layers above already know how to
 * handle: the caller maps it to a retryable provider error and the existing backoff
 * re-runs the turn. It also wraps the caller's own abort signal, so a user-initiated
 * cancel and a deadline both arrive at the vendor as the same thing.
 *
 * `touch()` must be called for EVERY part the stream yields, including ones the provider
 * emits while thinking — "idle" means "no output at all for this long", never "no text
 * yet", because a reasoning model is legitimately silent while it reasons.
 */

/**
 * How long the stream may produce NOTHING before it is treated as dead.
 *
 * Two minutes, because that budget has to cover the slowest legitimate case: a
 * high-effort reasoning turn on a free tier that sends its first visible part late.
 * Shorter values cut those turns off and retry them forever; the point is to catch the
 * stream that has stopped, not the model that is thinking.
 */
export const STREAM_IDLE_TIMEOUT_MS = 120_000

export interface StreamIdleWatchdog {
	/** Hand this to the vendor call: it aborts on idle AND on the caller's abort. */
	readonly signal: AbortSignal
	/** True once the watchdog aborted — the caller reports an idle timeout, not a cancel. */
	readonly timedOut: boolean
	/** The stream produced something: re-arm. */
	touch(): void
	/** The stream is over (either way): stop watching and let the process exit. */
	stop(): void
}

export interface StreamIdleWatchdogOptions {
	/** Silence that counts as dead. Defaults to {@link STREAM_IDLE_TIMEOUT_MS}. */
	timeoutMs?: number
	/** The caller's abort signal (user cancel), chained into {@link StreamIdleWatchdog.signal}. */
	signal?: AbortSignal
	/** Called once, when the watchdog decides the stream is dead — for the log line. */
	onIdle?: (info: { silentMs: number }) => void
}

/** The error the watchdog aborts with, so a caller can name the reason it was aborted. */
export class StreamIdleTimeoutError extends Error {
	readonly silentMs: number

	constructor(silentMs: number) {
		super(`Provider stream idle timeout: the model produced no output for ${Math.round(silentMs / 1000)}s`)
		this.name = "StreamIdleTimeoutError"
		this.silentMs = silentMs
	}
}

export function createStreamIdleWatchdog(options: StreamIdleWatchdogOptions = {}): StreamIdleWatchdog {
	const timeoutMs = options.timeoutMs ?? STREAM_IDLE_TIMEOUT_MS
	const controller = new AbortController()
	let timedOut = false
	let stopped = false
	let timer: ReturnType<typeof setTimeout> | undefined

	const abort = (reason: unknown) => {
		if (!controller.signal.aborted) {
			controller.abort(reason)
		}
	}

	const onCallerAbort = () => abort(options.signal?.reason)

	const arm = () => {
		if (stopped) {
			return
		}
		timer = setTimeout(() => {
			timedOut = true
			try {
				options.onIdle?.({ silentMs: timeoutMs })
			} finally {
				abort(new StreamIdleTimeoutError(timeoutMs))
			}
		}, timeoutMs)
		// A watchdog must never be the reason a finished process stays alive.
		;(timer as { unref?: () => void }).unref?.()
	}

	if (options.signal) {
		if (options.signal.aborted) {
			abort(options.signal.reason)
		} else {
			options.signal.addEventListener("abort", onCallerAbort, { once: true })
		}
	}
	arm()

	return {
		signal: controller.signal,
		get timedOut() {
			return timedOut
		},
		touch() {
			if (stopped) {
				return
			}
			if (timer) {
				clearTimeout(timer)
			}
			arm()
		},
		stop() {
			stopped = true
			if (timer) {
				clearTimeout(timer)
				timer = undefined
			}
			options.signal?.removeEventListener("abort", onCallerAbort)
		},
	}
}
