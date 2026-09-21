import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createStreamIdleWatchdog, STREAM_IDLE_TIMEOUT_MS } from "./stream-idle-watchdog"

describe("createStreamIdleWatchdog", () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("aborts only after the whole budget passes with no output", () => {
		const idle = vi.fn()
		const watchdog = createStreamIdleWatchdog({ timeoutMs: 1_000, onIdle: idle })

		vi.advanceTimersByTime(999)
		expect(watchdog.signal.aborted).toBe(false)
		expect(watchdog.timedOut).toBe(false)

		vi.advanceTimersByTime(1)
		expect(idle).toHaveBeenCalledWith({ silentMs: 1_000 })
		expect(watchdog.signal.aborted).toBe(true)
		expect(watchdog.timedOut).toBe(true)
		expect(String(watchdog.signal.reason)).toContain("idle timeout")
		expect(String(watchdog.signal.reason)).toContain("no output for 1s")
	})

	it("re-arms on every part, so a slow-but-alive stream is never cut off", () => {
		// The case that matters on a free tier: a part every 900ms for a long time is
		// alive, however slow it looks, and must never be retried forever.
		const idle = vi.fn()
		const watchdog = createStreamIdleWatchdog({ timeoutMs: 1_000, onIdle: idle })

		for (let step = 0; step < 20; step += 1) {
			vi.advanceTimersByTime(900)
			watchdog.touch()
		}
		expect(watchdog.signal.aborted).toBe(false)
		expect(idle).not.toHaveBeenCalled()

		// …and then it really does go quiet.
		vi.advanceTimersByTime(1_001)
		expect(idle).toHaveBeenCalledTimes(1)
		expect(watchdog.timedOut).toBe(true)
	})

	it("stops watching once the stream is over, so a finished run cannot abort later", () => {
		const watchdog = createStreamIdleWatchdog({ timeoutMs: 1_000 })
		watchdog.stop()

		vi.advanceTimersByTime(10_000)
		expect(watchdog.signal.aborted).toBe(false)
		expect(watchdog.timedOut).toBe(false)

		// …and a stray touch after stop cannot re-arm it.
		watchdog.touch()
		vi.advanceTimersByTime(10_000)
		expect(watchdog.signal.aborted).toBe(false)
	})

	it("carries the caller's own abort through to the vendor", () => {
		const caller = new AbortController()
		const watchdog = createStreamIdleWatchdog({ timeoutMs: 60_000, signal: caller.signal })
		expect(watchdog.signal.aborted).toBe(false)

		caller.abort(new Error("user cancelled"))

		expect(watchdog.signal.aborted).toBe(true)
		// A cancel is NOT an idle timeout: the caller must not report one.
		expect(watchdog.timedOut).toBe(false)
	})

	it("is already aborted when the caller handed over a dead signal", () => {
		const watchdog = createStreamIdleWatchdog({ timeoutMs: 60_000, signal: AbortSignal.abort() })
		expect(watchdog.signal.aborted).toBe(true)
		expect(watchdog.timedOut).toBe(false)
	})

	it("defaults to the streaming budget the round chose", () => {
		expect(STREAM_IDLE_TIMEOUT_MS).toBe(120_000)
		const watchdog = createStreamIdleWatchdog()
		vi.advanceTimersByTime(STREAM_IDLE_TIMEOUT_MS - 1)
		expect(watchdog.signal.aborted).toBe(false)
		vi.advanceTimersByTime(1)
		expect(watchdog.signal.aborted).toBe(true)
	})
})
