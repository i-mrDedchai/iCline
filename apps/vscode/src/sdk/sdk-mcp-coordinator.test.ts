import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StateManager } from "@/core/storage/StateManager"
import { SdkMcpCoordinator, type SdkMcpCoordinatorOptions } from "./sdk-mcp-coordinator"

vi.mock("@/shared/services/Logger", () => ({
	Logger: {
		error: vi.fn(),
		log: vi.fn(),
		warn: vi.fn(),
	},
}))

describe("SdkMcpCoordinator", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("does nothing when MCP tools change without an active session", () => {
		const { coordinator, options } = makeCoordinator()

		coordinator.handleToolListChanged()

		expect(options.sessions.replaceActiveSession).not.toHaveBeenCalled()
	})

	it("schedules MCP restart while the active session is running", () => {
		const activeSession = makeActiveSession({ isRunning: true })
		const { coordinator, options } = makeCoordinator({ activeSession })

		coordinator.handleToolListChanged()

		expect(options.sessions.replaceActiveSession).not.toHaveBeenCalled()
		expect(options.rebuilds.request).toHaveBeenCalledWith("mcpTools", expect.any(Function))
	})

	it("restarts immediately when MCP tools change while the active session is idle", async () => {
		const activeSession = makeActiveSession()
		const { coordinator, options } = makeCoordinator({ activeSession })

		coordinator.handleToolListChanged()

		await vi.waitFor(() => expect(options.sessions.replaceActiveSession).toHaveBeenCalledOnce())
		// Reloading tools is silent: only a status transition is emitted, no chat message.
		expect(options.messages.emitSessionEvents).toHaveBeenCalledWith([], {
			type: "status",
			payload: { sessionId: "old-session", status: "running" },
		})
		expect(options.messages.appendAndEmit).not.toHaveBeenCalled()
	})

	it("rebuilds the active session with the current mode and preserved messages", async () => {
		const activeSession = makeActiveSession()
		const { coordinator, options } = makeCoordinator({ activeSession, mode: "plan" })

		await coordinator.restartSessionForMcpTools()

		expect(options.sessionConfigBuilder.build).toHaveBeenCalledWith({ cwd: "/workspace", mode: "plan" })
		expect(options.loadInitialMessages).toHaveBeenCalledWith(activeSession.sdkHost, "old-session")
		expect(options.buildStartSessionInput).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "old-session" }), {
			cwd: "/workspace",
			mode: "plan",
		})
		expect(options.sessions.replaceActiveSession).toHaveBeenCalledWith({
			expectedSession: activeSession,
			startInput: { prompt: "start" },
			initialMessages: [{ role: "user", content: "hello" }],
			disposeReason: "mcpToolRestart",
		})
		// Success is silent: only a status transition back to idle, no chat
		// message or completion banner.
		expect(options.messages.emitSessionEvents).toHaveBeenCalledWith([], {
			type: "status",
			payload: { sessionId: "new-session", status: "idle" },
		})
		expect(options.messages.appendAndEmit).not.toHaveBeenCalled()
		expect(options.postStateToWebview).toHaveBeenCalledOnce()
	})

	it("defers the restart when a turn starts during the await window", async () => {
		// The session looks idle at schedule time but a turn is mid-tool when the
		// restart reaches its replace step — `isRunning` is false mid-tool, so the
		// guard must read the turn phase and defer instead of killing the task.
		const activeSession = makeActiveSession()
		const { coordinator, options } = makeCoordinator({
			activeSession,
			isTurnInFlight: () => true,
		})

		await coordinator.restartSessionForMcpTools()

		expect(options.sessions.replaceActiveSession).not.toHaveBeenCalled()
		expect(options.rebuilds.request).toHaveBeenCalledWith("mcpTools", expect.any(Function))
	})

	it("defers the restart when the active session changed during the await window", async () => {
		const activeSession = makeActiveSession()
		let current: unknown = activeSession
		const { coordinator, options } = makeCoordinator({
			activeSession,
			sessionsOverride: {
				getActiveSession: vi.fn(() => current),
				replaceActiveSession: vi.fn().mockResolvedValue({
					startResult: { sessionId: "new-session" },
					sdkHost: { send: vi.fn() },
				}),
			},
		})
		options.loadInitialMessages.mockImplementation(async () => {
			current = makeActiveSession()
			return []
		})

		await coordinator.restartSessionForMcpTools()

		// The old session is never replaced; the restart is re-queued to target
		// whichever session is active when it next drains.
		expect(options.sessions.replaceActiveSession).not.toHaveBeenCalled()
		expect(options.rebuilds.request).toHaveBeenCalledWith("mcpTools", expect.any(Function))
	})

	it("emits an error message when restart fails", async () => {
		const activeSession = makeActiveSession()
		const { coordinator, options } = makeCoordinator({ activeSession })
		options.sessions.replaceActiveSession.mockRejectedValue(new Error("boom"))

		await coordinator.restartSessionForMcpTools()

		expect(options.messages.appendAndEmit).toHaveBeenLastCalledWith(
			[
				expect.objectContaining({
					type: "say",
					say: "error",
					text: "Failed to reload MCP tools: boom. MCP tools may be outdated.",
				}),
			],
			{ type: "status", payload: { sessionId: "old-session", status: "error" } },
		)
		expect(options.postStateToWebview).toHaveBeenCalledOnce()
	})
})

function makeCoordinator(input: Partial<MakeCoordinatorInput> = {}) {
	const activeSession = input.activeSession
	let autoRunDepth = 0
	const sessions = input.sessionsOverride ?? {
		getActiveSession: vi.fn(() => activeSession),
		replaceActiveSession: vi.fn().mockResolvedValue({
			startResult: { sessionId: "new-session" },
			sdkHost: { send: vi.fn() },
		}),
	}
	const config = {
		providerId: "anthropic",
		modelId: "claude",
		apiKey: "key",
	}
	const options = {
		stateManager: {
			getGlobalSettingsKey: vi.fn(() => input.mode ?? "act"),
		} as unknown as StateManager,
		sessions,
		messages: {
			appendAndEmit: vi.fn(),
			emitSessionEvents: vi.fn(),
		},
		sessionConfigBuilder: {
			build: vi.fn().mockResolvedValue(config),
		},
		getWorkspaceRoot: vi.fn().mockResolvedValue("/workspace"),
		loadInitialMessages: vi.fn().mockResolvedValue([{ role: "user", content: "hello" }]),
		buildStartSessionInput: vi.fn(() => ({ prompt: "start" })),
		postStateToWebview: vi.fn().mockResolvedValue(undefined),
		rebuilds: {
			request: vi.fn((_reason: string, rebuild: () => Promise<void>) => {
				// Auto-run like a drained scheduler, but only one level deep: a
				// rebuild that defers itself must not recurse forever.
				if (!activeSession?.isRunning && autoRunDepth === 0) {
					autoRunDepth += 1
					void rebuild().finally(() => {
						autoRunDepth -= 1
					})
				}
			}),
		},
		isTurnInFlight: input.isTurnInFlight ?? (() => false),
	} as unknown as SdkMcpCoordinatorOptions & {
		stateManager: StateManager & { getGlobalSettingsKey: ReturnType<typeof vi.fn> }
		sessions: SdkMcpCoordinatorOptions["sessions"] & {
			getActiveSession: ReturnType<typeof vi.fn>
			replaceActiveSession: ReturnType<typeof vi.fn>
		}
		messages: SdkMcpCoordinatorOptions["messages"] & {
			appendAndEmit: ReturnType<typeof vi.fn>
			emitSessionEvents: ReturnType<typeof vi.fn>
		}
		sessionConfigBuilder: SdkMcpCoordinatorOptions["sessionConfigBuilder"] & { build: ReturnType<typeof vi.fn> }
		getWorkspaceRoot: ReturnType<typeof vi.fn>
		loadInitialMessages: ReturnType<typeof vi.fn>
		buildStartSessionInput: ReturnType<typeof vi.fn>
		postStateToWebview: ReturnType<typeof vi.fn>
	}

	return {
		coordinator: new SdkMcpCoordinator(options),
		options,
	}
}

interface MakeCoordinatorInput {
	activeSession: ReturnType<typeof makeActiveSession>
	mode: "act" | "plan"
	isTurnInFlight: () => boolean
	sessionsOverride: {
		getActiveSession: ReturnType<typeof vi.fn>
		replaceActiveSession: ReturnType<typeof vi.fn>
	}
}

function makeActiveSession(input: { isRunning?: boolean } = {}) {
	return {
		sessionId: "old-session",
		sdkHost: {
			send: vi.fn(),
			stop: vi.fn().mockResolvedValue(undefined),
			dispose: vi.fn().mockResolvedValue(undefined),
		},
		unsubscribe: vi.fn(),
		startResult: { sessionId: "old-session" },
		isRunning: input.isRunning ?? false,
	}
}
