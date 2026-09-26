import { afterEach, describe, expect, it, vi } from "vitest"
import { isEmptyTurnResult, type TurnResultShape, TurnStallWatchdog } from "./sdk-turn-notices"

describe("isEmptyTurnResult", () => {
	const base: TurnResultShape = {
		text: "",
		toolCalls: [],
		finishReason: "completed",
	}

	it("detects a completed turn that produced no output at all", () => {
		expect(isEmptyTurnResult(base)).toBe(true)
	})

	it("is false when the turn produced final text", () => {
		expect(isEmptyTurnResult({ ...base, text: "done" })).toBe(false)
	})

	it("is false when the turn ran tools", () => {
		const withTool: TurnResultShape = {
			...base,
			toolCalls: [{ id: "t1" }] as unknown as TurnResultShape["toolCalls"],
		}
		expect(isEmptyTurnResult(withTool)).toBe(false)
	})

	it("is false for aborted turns", () => {
		expect(isEmptyTurnResult({ ...base, finishReason: "aborted" })).toBe(false)
	})

	it("is false for error turns (those surface through the error path)", () => {
		expect(isEmptyTurnResult({ ...base, finishReason: "error" })).toBe(false)
	})
})

describe("TurnStallWatchdog", () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it("fires once after the threshold without activity", () => {
		vi.useFakeTimers()
		const onStall = vi.fn()
		const watchdog = new TurnStallWatchdog({ thresholdMs: 60_000, onStall })
		watchdog.start()
		vi.advanceTimersByTime(59_000)
		expect(onStall).not.toHaveBeenCalled()
		vi.advanceTimersByTime(2_000)
		expect(onStall).toHaveBeenCalledTimes(1)
		vi.advanceTimersByTime(600_000)
		expect(onStall).toHaveBeenCalledTimes(1)
	})

	it("resets the deadline on every touch", () => {
		vi.useFakeTimers()
		const onStall = vi.fn()
		const watchdog = new TurnStallWatchdog({ thresholdMs: 60_000, onStall })
		watchdog.start()
		vi.advanceTimersByTime(50_000)
		watchdog.touch()
		vi.advanceTimersByTime(50_000)
		expect(onStall).not.toHaveBeenCalled()
		vi.advanceTimersByTime(11_000)
		expect(onStall).toHaveBeenCalledTimes(1)
	})

	it("does not fire after stop", () => {
		vi.useFakeTimers()
		const onStall = vi.fn()
		const watchdog = new TurnStallWatchdog({ thresholdMs: 60_000, onStall })
		watchdog.start()
		watchdog.stop()
		vi.advanceTimersByTime(600_000)
		expect(onStall).not.toHaveBeenCalled()
	})

	it("does not fire before start even after touches", () => {
		vi.useFakeTimers()
		const onStall = vi.fn()
		const watchdog = new TurnStallWatchdog({ thresholdMs: 60_000, onStall })
		watchdog.touch()
		vi.advanceTimersByTime(600_000)
		expect(onStall).not.toHaveBeenCalled()
	})
})
