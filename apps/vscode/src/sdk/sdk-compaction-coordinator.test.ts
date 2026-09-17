import { createContextCompactionPrepareTurn } from "@cline/core"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StateManager } from "@/core/storage/StateManager"
import { SdkCompactionCoordinator, type SdkCompactionCoordinatorOptions } from "./sdk-compaction-coordinator"

vi.mock("@cline/core", () => ({
	createContextCompactionPrepareTurn: vi.fn(),
	createSessionCompactionState: vi.fn((input: { compactedMessages: unknown[] }) => ({
		version: 1,
		messages: input.compactedMessages,
	})),
	CORE_BUILD_VERSION: "test-core-version",
}))

const mockCreateContextCompactionPrepareTurn = createContextCompactionPrepareTurn as unknown as ReturnType<typeof vi.fn>

vi.mock("@/shared/services/Logger", () => ({
	Logger: {
		debug: vi.fn(),
		error: vi.fn(),
		log: vi.fn(),
		warn: vi.fn(),
	},
}))

describe("SdkCompactionCoordinator", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("emits an info message and does not rebuild when there is no active session", async () => {
		const { coordinator, options } = makeCoordinator({ activeSession: undefined })

		await coordinator.compactTask()

		expect(options.sessions.replaceActiveSession).not.toHaveBeenCalled()
		expect(mockCreateContextCompactionPrepareTurn).not.toHaveBeenCalled()
		expect(options.messages.appendAndEmit).toHaveBeenCalledWith(
			[expect.objectContaining({ say: "info", text: "There is no active task to compact." })],
			expect.anything(),
		)
	})

	it("refuses to compact while a turn is running", async () => {
		const activeSession = makeActiveSession({ isRunning: true })
		const { coordinator, options } = makeCoordinator({ activeSession })

		await coordinator.compactTask()

		expect(mockCreateContextCompactionPrepareTurn).not.toHaveBeenCalled()
		expect(options.sessions.replaceActiveSession).not.toHaveBeenCalled()
		expect(options.messages.appendAndEmit).toHaveBeenCalledWith(
			[expect.objectContaining({ say: "info", text: expect.stringContaining("Cannot compact while a response") })],
			expect.anything(),
		)
	})

	it("reports when there are no messages to compact", async () => {
		const activeSession = makeActiveSession()
		activeSession.sdkHost.readMessages.mockResolvedValueOnce([])
		const { coordinator, options } = makeCoordinator({ activeSession })

		await coordinator.compactTask()

		expect(mockCreateContextCompactionPrepareTurn).not.toHaveBeenCalled()
		expect(options.sessions.replaceActiveSession).not.toHaveBeenCalled()
		expect(options.messages.appendAndEmit).toHaveBeenCalledWith(
			[expect.objectContaining({ say: "info", text: "No messages to compact." })],
			expect.anything(),
		)
	})

	it("reports unsupported runtime without running compaction", async () => {
		const activeSession = makeActiveSession()
		;(activeSession.sdkHost as Partial<typeof activeSession.sdkHost>).updateSessionCompactionState = undefined
		const { coordinator, options } = makeCoordinator({ activeSession })

		await coordinator.compactTask()

		expect(activeSession.sdkHost.readMessages).not.toHaveBeenCalled()
		expect(mockCreateContextCompactionPrepareTurn).not.toHaveBeenCalled()
		expect(options.messages.appendAndEmit).toHaveBeenCalledWith(
			[expect.objectContaining({ say: "info", text: expect.stringContaining("not supported") })],
			expect.anything(),
		)
	})

	it("reports when the strategy declines to compact", async () => {
		const activeSession = makeActiveSession()
		const { coordinator, options } = makeCoordinator({ activeSession })
		mockCreateContextCompactionPrepareTurn.mockReturnValueOnce(vi.fn().mockResolvedValue(undefined))

		await coordinator.compactTask()

		expect(mockCreateContextCompactionPrepareTurn).toHaveBeenCalledOnce()
		expect(options.sessions.replaceActiveSession).not.toHaveBeenCalled()
		expect(options.messages.appendAndEmit).toHaveBeenCalledWith(
			[expect.objectContaining({ say: "info", text: "No compaction needed." })],
			expect.anything(),
		)
	})

	it("compacts and persists the sidecar without rebuilding the session", async () => {
		const activeSession = makeActiveSession()
		activeSession.sdkHost.readMessages.mockResolvedValueOnce([
			{ role: "user", content: "1" },
			{ role: "assistant", content: "2" },
			{ role: "user", content: "3" },
		])
		const { coordinator, options } = makeCoordinator({ activeSession })
		mockCreateContextCompactionPrepareTurn.mockReturnValueOnce(
			vi.fn().mockResolvedValue({ messages: [{ role: "user", content: "summary" }] }),
		)

		await coordinator.compactTask()

		expect(activeSession.sdkHost.updateSessionCompactionState).toHaveBeenCalledWith("old-session", {
			version: 1,
			messages: [{ role: "user", content: "summary" }],
		})
		expect(options.sessions.replaceActiveSession).not.toHaveBeenCalled()
		expect(options.messages.appendAndEmit).toHaveBeenCalledWith(
			[expect.objectContaining({ say: "info", text: "Compacted 3 messages to 1." })],
			expect.anything(),
		)
	})

	it("does not append compaction status to a different active session", async () => {
		const activeSession = makeActiveSession()
		const { coordinator, options } = makeCoordinator({ activeSession })
		// compactTask reads active once; post-compact helpers may read again —
		// any later read must still see a different session so status is skipped.
		options.sessions.getActiveSession
			.mockReturnValueOnce(activeSession)
			.mockReturnValue(makeActiveSession({ sessionId: "other-session" }))
		mockCreateContextCompactionPrepareTurn.mockReturnValueOnce(
			vi.fn().mockResolvedValue({ messages: [{ role: "user", content: "summary" }] }),
		)

		await coordinator.compactTask()

		expect(activeSession.sdkHost.updateSessionCompactionState).toHaveBeenCalled()
		expect(options.messages.appendAndEmit).not.toHaveBeenCalled()
	})

	it("does not restart or report success when sidecar persistence fails", async () => {
		const activeSession = makeActiveSession()
		activeSession.sdkHost.updateSessionCompactionState.mockResolvedValueOnce({ updated: false })
		const { coordinator, options } = makeCoordinator({ activeSession })
		mockCreateContextCompactionPrepareTurn.mockReturnValueOnce(
			vi.fn().mockResolvedValue({ messages: [{ role: "user", content: "summary" }] }),
		)

		await coordinator.compactTask()

		expect(options.sessions.replaceActiveSession).not.toHaveBeenCalled()
		expect(options.messages.appendAndEmit).toHaveBeenCalledWith(
			[
				expect.objectContaining({
					say: "info",
					text: "Couldn't compact the conversation. Please try again. (Compaction sidecar could not be persisted.)",
				}),
			],
			expect.anything(),
		)
	})

	it("emits a post-compact usage estimate marked excludeFromTotals from the last real usage row", async () => {
		const activeSession = makeActiveSession()
		activeSession.sdkHost.readMessages.mockResolvedValueOnce([
			{ role: "user", content: "1" },
			{ role: "assistant", content: "2" },
			{ role: "user", content: "3" },
		])
		const { coordinator, options } = makeCoordinator({
			activeSession,
			clineMessages: [
				{
					ts: 1,
					type: "say",
					say: "api_req_started",
					text: JSON.stringify({ tokensIn: 1000, tokensOut: 200, cacheWrites: 0, cacheReads: 0, cost: 0.4 }),
				},
			],
		})
		mockCreateContextCompactionPrepareTurn.mockReturnValueOnce(
			vi.fn().mockResolvedValue({ messages: [{ role: "user", content: "summary" }] }),
		)

		await coordinator.compactTask()

		const estimateCall = options.messages.appendAndEmit.mock.calls.find(([messages]) =>
			messages.some((message: { say?: string }) => message.say === "api_req_started"),
		)
		expect(estimateCall).toBeDefined()
		const estimate = JSON.parse(estimateCall?.[0][0].text ?? "{}")
		expect(estimate).toMatchObject({
			tokensIn: 400,
			tokensOut: 0,
			cacheWrites: 0,
			cacheReads: 0,
			cost: 0,
			excludeFromTotals: true,
		})
		expect(options.messages.appendAndEmit).toHaveBeenCalledWith(
			[expect.objectContaining({ say: "info", text: "Compacted 3 messages to 1." })],
			expect.anything(),
		)
	})

	it("reports a failure when compaction throws", async () => {
		const activeSession = makeActiveSession()
		const { coordinator, options } = makeCoordinator({ activeSession })
		mockCreateContextCompactionPrepareTurn.mockReturnValueOnce(vi.fn().mockRejectedValue(new Error("boom")))

		await coordinator.compactTask()

		expect(options.sessions.replaceActiveSession).not.toHaveBeenCalled()
		expect(options.messages.appendAndEmit).toHaveBeenCalledWith(
			[expect.objectContaining({ say: "info", text: "Couldn't compact the conversation. Please try again. (boom)" })],
			expect.anything(),
		)
	})

	it("attaches Cline client identity headers to the manual compaction request config", async () => {
		const activeSession = makeActiveSession()
		const { coordinator } = makeCoordinator({
			activeSession,
			config: {
				providerConfig: { providerId: "cline", modelId: "cline-free/deepseek-v4.1-flash" },
				providerId: "cline",
				modelId: "cline-free/deepseek-v4.1-flash",
				extensionContext: {
					client: {
						name: "VSCode Extension",
						version: "0.1.18-dev.5",
						platform: "win32",
						platformVersion: "10.0.22631",
						isMultiRoot: false,
					},
				},
			},
		})
		mockCreateContextCompactionPrepareTurn.mockReturnValueOnce(
			vi.fn().mockResolvedValue({ messages: [{ role: "user", content: "summary" }] }),
		)

		await coordinator.compactTask()

		const prepareInput = mockCreateContextCompactionPrepareTurn.mock.calls[0]?.[0]
		expect(prepareInput?.providerConfig?.headers).toMatchObject({
			"User-Agent": "Cline/0.1.18-dev.5",
			"X-CLIENT-TYPE": "VSCode Extension",
			"X-CLIENT-VERSION": "0.1.18-dev.5",
			"X-PLATFORM": "win32",
			"X-PLATFORM-VERSION": "10.0.22631",
			"X-CORE-VERSION": "test-core-version",
			"X-Task-ID": "old-session",
		})
	})

	it("leaves provider headers untouched for non-Cline providers", async () => {
		const activeSession = makeActiveSession()
		const { coordinator } = makeCoordinator({ activeSession })
		mockCreateContextCompactionPrepareTurn.mockReturnValueOnce(
			vi.fn().mockResolvedValue({ messages: [{ role: "user", content: "summary" }] }),
		)

		await coordinator.compactTask()

		const prepareInput = mockCreateContextCompactionPrepareTurn.mock.calls[0]?.[0]
		expect(prepareInput?.providerConfig?.headers).toBeUndefined()
	})

	it("keeps existing provider headers but lets Cline identity headers win", async () => {
		const activeSession = makeActiveSession()
		const { coordinator } = makeCoordinator({
			activeSession,
			config: {
				providerConfig: {
					providerId: "cline",
					modelId: "cline-free/deepseek-v4.1-flash",
					headers: { "X-Custom": "keep-me", "X-CLIENT-VERSION": "custom" },
				},
				providerId: "cline",
				modelId: "cline-free/deepseek-v4.1-flash",
			},
		})
		mockCreateContextCompactionPrepareTurn.mockReturnValueOnce(
			vi.fn().mockResolvedValue({ messages: [{ role: "user", content: "summary" }] }),
		)

		await coordinator.compactTask()

		const prepareInput = mockCreateContextCompactionPrepareTurn.mock.calls[0]?.[0]
		expect(prepareInput?.providerConfig?.headers).toMatchObject({
			"X-Custom": "keep-me",
			"X-CLIENT-VERSION": "unknown",
			"X-Task-ID": "old-session",
		})
	})
})

interface MakeCoordinatorInput {
	activeSession: ReturnType<typeof makeActiveSession> | undefined
	clineMessages: Array<{ ts: number; type: "say"; say: string; text?: string }>
	config?: Record<string, unknown>
}

function makeCoordinator(input: Partial<MakeCoordinatorInput> = {}) {
	const activeSession = "activeSession" in input ? input.activeSession : makeActiveSession()
	const config = {
		providerConfig: { providerId: "anthropic", modelId: "claude" },
		providerId: "anthropic",
		modelId: "claude",
		knownModels: undefined,
		compaction: undefined,
		logger: undefined,
		telemetry: undefined,
		sessionId: undefined as string | undefined,
		...(input.config ?? {}),
	}
	const options = {
		stateManager: {
			getGlobalSettingsKey: vi.fn(() => "act"),
		} as unknown as StateManager,
		sessions: {
			getActiveSession: vi.fn(() => activeSession),
			replaceActiveSession: vi.fn().mockResolvedValue({
				startResult: { sessionId: "new-session" },
				sdkHost: { send: vi.fn() },
			}),
		},
		messages: {
			appendAndEmit: vi.fn(),
			getClineMessages: vi.fn(() => input.clineMessages ?? []),
		},
		sessionConfigBuilder: {
			build: vi.fn().mockResolvedValue(config),
		},
		getWorkspaceRoot: vi.fn().mockResolvedValue("/workspace"),
		postStateToWebview: vi.fn().mockResolvedValue(undefined),
	} as unknown as SdkCompactionCoordinatorOptions & {
		sessions: SdkCompactionCoordinatorOptions["sessions"] & {
			getActiveSession: ReturnType<typeof vi.fn>
			replaceActiveSession: ReturnType<typeof vi.fn>
		}
		messages: SdkCompactionCoordinatorOptions["messages"] & {
			appendAndEmit: ReturnType<typeof vi.fn>
		}
		sessionConfigBuilder: SdkCompactionCoordinatorOptions["sessionConfigBuilder"] & {
			build: ReturnType<typeof vi.fn>
		}
		postStateToWebview: ReturnType<typeof vi.fn>
	}

	return {
		coordinator: new SdkCompactionCoordinator(options),
		options,
	}
}

function makeActiveSession(input: { isRunning?: boolean; sessionId?: string } = {}) {
	return {
		sessionId: input.sessionId ?? "old-session",
		sdkHost: {
			readMessages: vi.fn().mockResolvedValue([{ role: "user", content: "1" }]),
			updateSessionCompactionState: vi.fn().mockResolvedValue({ updated: true }),
			send: vi.fn(),
			abort: vi.fn().mockResolvedValue(undefined),
			stop: vi.fn().mockResolvedValue(undefined),
			dispose: vi.fn().mockResolvedValue(undefined),
		},
		unsubscribe: vi.fn(),
		startResult: { sessionId: "old-session" },
		isRunning: input.isRunning ?? false,
	}
}
