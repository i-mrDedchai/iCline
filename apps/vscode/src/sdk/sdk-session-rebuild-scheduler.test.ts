import { describe, expect, it, vi } from "vitest"
import { SdkSessionRebuildScheduler } from "./sdk-session-rebuild-scheduler"

describe("SdkSessionRebuildScheduler", () => {
	it("drains a rebuild when the running session becomes idle", async () => {
		const activeSession = { isRunning: true }
		const scheduler = makeScheduler(activeSession)
		const rebuild = vi.fn().mockResolvedValue(undefined)

		scheduler.request("terminalExecutionMode", rebuild)
		expect(rebuild).not.toHaveBeenCalled()

		activeSession.isRunning = false
		scheduler.sessionBecameIdle()
		await scheduler.waitUntilSettled()

		expect(rebuild).toHaveBeenCalledOnce()
	})

	it("coalesces repeated requests for the same reason", async () => {
		const activeSession = { isRunning: true }
		const scheduler = makeScheduler(activeSession)
		const first = vi.fn().mockResolvedValue(undefined)
		const latest = vi.fn().mockResolvedValue(undefined)

		scheduler.request("provider", first)
		scheduler.request("provider", latest)
		activeSession.isRunning = false
		scheduler.sessionBecameIdle()
		await scheduler.waitUntilSettled()

		expect(first).not.toHaveBeenCalled()
		expect(latest).toHaveBeenCalledOnce()
	})

	it("leaves pending work dormant when there is no active session", async () => {
		const scheduler = new SdkSessionRebuildScheduler({
			sessions: { getActiveSession: () => undefined },
			isTurnInFlight: () => false,
		})
		const rebuild = vi.fn().mockResolvedValue(undefined)

		scheduler.request("provider", rebuild)
		await Promise.resolve()

		expect(rebuild).not.toHaveBeenCalled()
	})

	it("defers the drain while a turn is in flight even though isRunning is false", async () => {
		// `isRunning` is false while a tool executes — the gap between model
		// streams — so a queued rebuild drained at exactly that moment stopped and
		// replaced a session mid-turn (the team e2e caught it killing the lead's
		// task). The turn's own lifecycle is the idle signal, not `isRunning`.
		const activeSession = { isRunning: false }
		let turnInFlight = true
		const scheduler = makeScheduler(activeSession, () => turnInFlight)
		const rebuild = vi.fn().mockResolvedValue(undefined)

		scheduler.request("provider", rebuild)
		await Promise.resolve()
		expect(rebuild).not.toHaveBeenCalled()

		turnInFlight = false
		scheduler.sessionBecameIdle()
		await scheduler.waitUntilSettled()
		expect(rebuild).toHaveBeenCalledOnce()
	})

	it("re-checks the turn between queued rebuilds", async () => {
		// A turn can start while an earlier rebuild in the queue is running; the
		// rest of the queue must wait for that turn instead of riding through it.
		const activeSession = { isRunning: false }
		let turnInFlight = false
		const scheduler = makeScheduler(activeSession, () => turnInFlight)
		let resolveFirst: () => void = () => {}
		const first = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveFirst = resolve
				}),
		)
		const second = vi.fn().mockResolvedValue(undefined)

		scheduler.request("mcpTools", first)
		scheduler.request("terminalExecutionMode", second)
		await vi.waitFor(() => expect(first).toHaveBeenCalledOnce())
		turnInFlight = true
		resolveFirst()
		await scheduler.waitUntilSettled()
		expect(second).not.toHaveBeenCalled()

		turnInFlight = false
		scheduler.sessionBecameIdle()
		await scheduler.waitUntilSettled()
		expect(second).toHaveBeenCalledOnce()
	})

	it("serializes rebuilds for different reasons", async () => {
		const activeSession = { isRunning: false }
		const scheduler = makeScheduler(activeSession)
		let resolveFirst: () => void = () => {}
		const first = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveFirst = resolve
				}),
		)
		const second = vi.fn().mockResolvedValue(undefined)

		scheduler.request("mcpTools", first)
		scheduler.request("terminalExecutionMode", second)
		await vi.waitFor(() => expect(first).toHaveBeenCalledOnce())
		expect(second).not.toHaveBeenCalled()

		resolveFirst()
		await scheduler.waitUntilSettled()
		expect(second).toHaveBeenCalledOnce()
	})

	it("holds scheduled rebuilds behind an exclusive mode rebuild", async () => {
		const activeSession = { isRunning: false }
		const scheduler = makeScheduler(activeSession)
		let resolveMode: () => void = () => {}
		const modeRebuild = scheduler.runExclusive(
			() =>
				new Promise<void>((resolve) => {
					resolveMode = resolve
				}),
		)
		const passiveRebuild = vi.fn().mockResolvedValue(undefined)

		scheduler.request("provider", passiveRebuild)
		await Promise.resolve()
		expect(passiveRebuild).not.toHaveBeenCalled()

		resolveMode()
		await modeRebuild
		await scheduler.waitUntilSettled()
		expect(passiveRebuild).toHaveBeenCalledOnce()
	})
})

function makeScheduler(activeSession: { isRunning: boolean }, isTurnInFlight: () => boolean = () => false) {
	return new SdkSessionRebuildScheduler({
		sessions: {
			getActiveSession: () =>
				activeSession as ReturnType<SdkSessionRebuildSchedulerOptions["sessions"]["getActiveSession"]>,
		},
		isTurnInFlight,
	})
}

type SdkSessionRebuildSchedulerOptions = ConstructorParameters<typeof SdkSessionRebuildScheduler>[0]
