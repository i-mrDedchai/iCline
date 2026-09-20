import type { ClineMessage } from "@shared/ExtensionMessage"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SdkTaskControlCoordinator, type SdkTaskControlCoordinatorOptions } from "./sdk-task-control-coordinator"

vi.mock("@/shared/services/Logger", () => ({
	Logger: {
		debug: vi.fn(),
		error: vi.fn(),
		log: vi.fn(),
		warn: vi.fn(),
	},
}))

describe("SdkTaskControlCoordinator", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("cancels the active session and emits a resume task ask", async () => {
		const activeSession = makeActiveSession()
		const { coordinator, options } = makeCoordinator({ activeSession })

		await coordinator.cancelTask()

		expect(options.interactions.clearPending).toHaveBeenCalledWith("Task cancelled")
		expect(activeSession.sdkHost.abort).toHaveBeenCalledWith("session-123")
		expect(options.sessions.setRunning).toHaveBeenCalledWith(false)
		expect(options.messages.appendAndEmit).toHaveBeenCalledWith(
			[expect.objectContaining({ type: "ask", ask: "resume_task" })],
			{ type: "status", payload: { sessionId: "session-123", status: "cancelled" } },
		)
		expect(options.postStateToWebview).toHaveBeenCalledOnce()
	})

	it("raises the cancel fence BEFORE aborting the session (so stragglers are fenced)", async () => {
		const activeSession = makeActiveSession()
		const { coordinator, options } = makeCoordinator({ activeSession })

		const order: string[] = []
		;(options.raiseCancelFence as ReturnType<typeof vi.fn>).mockImplementation(() => order.push("fence"))
		;(activeSession.sdkHost.abort as ReturnType<typeof vi.fn>).mockImplementation(async () => {
			order.push("abort")
		})

		await coordinator.cancelTask()

		expect(options.raiseCancelFence).toHaveBeenCalledOnce()
		expect(order).toEqual(["fence", "abort"])
	})

	it("clears the active session and task proxy without writing classic UI message persistence", async () => {
		// Not running: a session with nothing in flight has nothing to preserve, so clearing the
		// task still ends it. (A working one is parked instead; see the park tests below.)
		const activeSession = makeActiveSession(false)
		const task = makeTask("task-1", [{ ts: 1, type: "say", say: "text", text: "hi", partial: true }])
		const { coordinator, options, state } = makeCoordinator({ activeSession, task })

		await coordinator.clearTask()

		expect(options.interactions.clearPending).toHaveBeenCalledWith("Task cleared")
		expect(options.sessions.endActiveSession).toHaveBeenCalledWith("clearTask")
		expect(options.messages.finalizeMessagesForSave).not.toHaveBeenCalled()
		expect(options.messages.cancelPendingSave).toHaveBeenCalledOnce()
		expect(task.messageStateHandler.clear).toHaveBeenCalledOnce()
		expect(state.task).toBeUndefined()
		expect(options.resetMessageTranslator).toHaveBeenCalledOnce()
	})

	it("shows a completed task without inventing a resume ask, and sets completed TurnState", async () => {
		const existingTask = makeTask("old-task")
		const activeSession = makeActiveSession(false)
		const sdkClineMessages: ClineMessage[] = [
			{ ts: 1, type: "say", say: "task", text: "hello" },
			{ ts: 2, type: "ask", ask: "completion_result", text: "" },
		]
		const { coordinator, options, state } = makeCoordinator({
			activeSession,
			task: existingTask,
			hasHistoryItem: true,
			clineMessages: sdkClineMessages,
		})

		await coordinator.showTaskWithId("task-1")

		expect(options.taskHistory.findHistoryItem).toHaveBeenCalledWith("task-1")
		expect(options.interactions.clearPending).toHaveBeenCalledWith("Showing task from history")
		expect(options.sessions.endActiveSession).toHaveBeenCalledWith("showTaskWithId")
		expect(existingTask.messageStateHandler.clear).toHaveBeenCalledOnce()
		expect(options.resetMessageTranslator).toHaveBeenCalledOnce()
		expect(state.task?.taskId).toBe("task-1")
		expect(options.taskHistory.getClineMessages).toHaveBeenCalledWith("task-1")
		expect(state.task?.messageStateHandler.getClineMessages()).toEqual([
			{ ts: 1, type: "say", say: "task", text: "hello" },
			{ ts: 2, type: "ask", ask: "completion_result", text: "" },
		])
		expect(options.setTurnPhase).toHaveBeenCalledWith("completed")
		expect(options.postStateToWebview).toHaveBeenCalledOnce()
	})

	it("treats say:completion_result as completed even when usage rows follow it", async () => {
		const sdkClineMessages: ClineMessage[] = [
			{ ts: 1, type: "say", say: "task", text: "hello" },
			{ ts: 2, type: "say", say: "completion_result", text: "All done" },
			{ ts: 3, type: "say", say: "api_req_started", text: JSON.stringify({ tokensIn: 10, tokensOut: 2 }) },
		]
		const { coordinator, options, state } = makeCoordinator({
			hasHistoryItem: true,
			clineMessages: sdkClineMessages,
		})

		await coordinator.showTaskWithId("task-1")

		expect(state.task?.messageStateHandler.getClineMessages()).toEqual(sdkClineMessages)
		expect(options.setTurnPhase).toHaveBeenCalledWith("completed")
	})

	it("sets resumable TurnState and appends resume_task when the last turn is still partial", async () => {
		const sdkClineMessages: ClineMessage[] = [
			{ ts: 1, type: "say", say: "task", text: "hello" },
			{ ts: 2, type: "say", say: "tool", text: "{}", partial: true },
		]
		const { coordinator, options, state } = makeCoordinator({
			hasHistoryItem: true,
			clineMessages: sdkClineMessages,
		})

		await coordinator.showTaskWithId("task-1")

		const loaded = state.task?.messageStateHandler.getClineMessages() ?? []
		expect(loaded[0]).toEqual({ ts: 1, type: "say", say: "task", text: "hello" })
		expect(loaded[1]).toMatchObject({ type: "say", say: "tool", text: "final" })
		expect(loaded[2]).toEqual(expect.objectContaining({ type: "ask", ask: "resume_task" }))
		expect(options.setTurnPhase).toHaveBeenCalledWith("resumable", loaded[2].ts)
	})

	it("sets resumable TurnState when the last row is an unanswered user message", async () => {
		const sdkClineMessages: ClineMessage[] = [{ ts: 1, type: "say", say: "task", text: "hello" }]
		const { coordinator, options, state } = makeCoordinator({
			hasHistoryItem: true,
			clineMessages: sdkClineMessages,
		})

		await coordinator.showTaskWithId("task-1")

		const loaded = state.task?.messageStateHandler.getClineMessages() ?? []
		expect(loaded[0]).toEqual(sdkClineMessages[0])
		expect(loaded[1]).toEqual(expect.objectContaining({ type: "ask", ask: "resume_task" }))
		expect(options.setTurnPhase).toHaveBeenCalledWith("resumable", loaded[1].ts)
	})

	it("does not treat an earlier completion as completed after a later follow-up turn", async () => {
		const sdkClineMessages: ClineMessage[] = [
			{ ts: 1, type: "say", say: "task", text: "hello" },
			{ ts: 2, type: "say", say: "completion_result", text: "First turn done" },
			{ ts: 3, type: "say", say: "user_feedback", text: "one more thing" },
			{ ts: 4, type: "say", say: "text", text: "Sure" },
		]
		const { coordinator, options, state } = makeCoordinator({
			hasHistoryItem: true,
			clineMessages: sdkClineMessages,
		})

		await coordinator.showTaskWithId("task-1")

		expect(state.task?.messageStateHandler.getClineMessages()).toEqual(sdkClineMessages)
		expect(options.setTurnPhase).toHaveBeenCalledWith("awaiting_followup")
	})

	it("sets awaiting_followup when the last turn is finished text with no completion tool", async () => {
		const sdkClineMessages: ClineMessage[] = [
			{ ts: 1, type: "say", say: "task", text: "hello" },
			{ ts: 2, type: "say", say: "text", text: "Need more info" },
		]
		const { coordinator, options, state } = makeCoordinator({
			hasHistoryItem: true,
			clineMessages: sdkClineMessages,
		})

		await coordinator.showTaskWithId("task-1")

		expect(state.task?.messageStateHandler.getClineMessages()).toEqual(sdkClineMessages)
		expect(options.setTurnPhase).toHaveBeenCalledWith("awaiting_followup")
	})

	it("sets idle TurnState when the reopened task has no messages", async () => {
		const { coordinator, options } = makeCoordinator({
			hasHistoryItem: true,
			clineMessages: [],
		})

		await coordinator.showTaskWithId("task-1")

		expect(options.setTurnPhase).toHaveBeenCalledWith("idle")
		expect(options.setTask).toHaveBeenCalledOnce()
	})

	it("resets TurnState to idle when loading the task throws mid-way", async () => {
		const { coordinator, options } = makeCoordinator({
			hasHistoryItem: true,
			task: makeTask("old-task"),
			clineMessages: [{ ts: 1, type: "say", say: "task", text: "hello" }],
		})
		;(options.taskHistory.getClineMessages as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("host read failed"))

		await coordinator.showTaskWithId("task-1")

		expect(options.setTurnPhase).toHaveBeenCalledWith("idle")
		expect(options.setTask).not.toHaveBeenCalled()
		expect(options.postStateToWebview).toHaveBeenCalledOnce()
	})

	describe("leaving a task that is still working", () => {
		it("parks it instead of stopping it, and keeps its transcript", async () => {
			const activeSession = makeActiveSession()
			const task = makeTask("task-1")
			const { coordinator, options, state } = makeCoordinator({ activeSession, task })

			await coordinator.clearTask()

			expect(options.sessions.parkActiveSession).toHaveBeenCalledWith("clearTask")
			expect(options.sessions.endActiveSession).not.toHaveBeenCalled()
			// The conversation is still being written: clearing it would erase the background turn.
			expect(task.messageStateHandler.clear).not.toHaveBeenCalled()
			expect(state.task).toBeUndefined()
			expect(options.messages.cancelPendingSave).toHaveBeenCalledOnce()
		})

		it("ends an idle parked session for good instead of leaving it as a phantom background task", async () => {
			const parked = makeActiveSession(false)
			const { coordinator, options, parkedSession } = makeCoordinator({ parkedSession: parked })

			await coordinator.clearTask()

			// Otherwise the session would linger as "the task in the background" while its transcript
			// has been dropped — a badge claiming a task is alive when the user already moved on.
			expect(options.sessions.endParkedSession).toHaveBeenCalledWith("clearTask:idle", { awaitStop: false })
			expect(parkedSession()).toBeUndefined()
		})

		it("keeps the translator's open stream pointers, so a mid-stream message is not split", async () => {
			const { coordinator, options } = makeCoordinator({ activeSession: makeActiveSession() })

			await coordinator.clearTask()

			expect(options.bumpConversationFence).toHaveBeenCalledOnce()
			expect(options.resetMessageTranslator).not.toHaveBeenCalled()
		})

		it("shows another task without stopping the one in the background", async () => {
			const activeSession = makeActiveSession()
			const { coordinator, options, parkedSession } = makeCoordinator({
				activeSession,
				task: makeTask("old-task"),
				hasHistoryItem: true,
				clineMessages: [{ ts: 1, type: "say", say: "task", text: "hello" }],
			})

			await coordinator.showTaskWithId("task-1")

			expect(options.sessions.parkActiveSession).toHaveBeenCalledWith("showTaskWithId")
			// Its session is parked, not stopped, and not replaced.
			expect(parkedSession()).toBe(activeSession)
			expect(options.sessions.endParkedSession).not.toHaveBeenCalled()
			// A pending approval belongs to the background session: clearing it would deny a tool
			// the user never saw.
			expect(options.interactions.clearPending).not.toHaveBeenCalled()
			expect(options.bumpConversationFence).toHaveBeenCalledOnce()
		})

		it("leaves the displayed task alone when its own card is clicked while it works", async () => {
			const activeSession = makeActiveSession()
			const task = makeTask("session-123")
			const { coordinator, options, state } = makeCoordinator({ activeSession, task })

			await coordinator.showTaskWithId("session-123")

			expect(options.sessions.parkActiveSession).not.toHaveBeenCalled()
			expect(options.sessions.endActiveSession).not.toHaveBeenCalled()
			expect(options.taskHistory.getClineMessages).not.toHaveBeenCalled()
			expect(state.task).toBe(task)
		})

		it("cancels the background task when asked to, without touching the displayed one", async () => {
			const parkedSession = makeActiveSession()
			const { coordinator, options, state } = makeCoordinator({ parkedSession })

			await coordinator.cancelTask()

			expect(parkedSession.sdkHost.abort).toHaveBeenCalledWith("session-123")
			expect(options.sessions.endParkedSession).toHaveBeenCalledWith("cancelTask:parked")
			expect(options.messages.appendAndEmit).not.toHaveBeenCalled()
			expect(state.task).toBeUndefined()
			expect(options.postStateToWebview).toHaveBeenCalledOnce()
		})

		it("re-attaches to it instead of reloading it when the user reopens it", async () => {
			const runningTask = makeTask("session-123")
			const { coordinator, options, state } = makeCoordinator({
				activeSession: makeActiveSession(),
				task: runningTask,
				hasHistoryItem: true,
				clineMessages: [{ ts: 1, type: "say", say: "task", text: "from disk" }],
			})
			// The real sequence: the user leaves the working task, then opens it again.
			await coordinator.clearTask()
			options.taskHistory.getClineMessages.mockClear()
			;(options.interactions.surfaceDeferredAskForSession as ReturnType<typeof vi.fn>).mockReturnValue(true)

			await coordinator.showTaskWithId("session-123")

			expect(options.sessions.resumeParkedSession).toHaveBeenCalledOnce()
			expect(options.sessions.endActiveSession).not.toHaveBeenCalled()
			// The live transcript IS the conversation: reading it back would lose anything produced
			// while the task was hidden and could restart a message that was mid-stream.
			expect(options.taskHistory.getClineMessages).not.toHaveBeenCalled()
			expect(state.task).toBe(runningTask)
			expect(options.interactions.surfaceDeferredAskForSession).toHaveBeenCalledWith("session-123")
			expect(options.setTurnPhase).toHaveBeenCalledWith("awaiting_approval")
			expect(options.postStateToWebview).toHaveBeenCalledOnce()
		})

		it("reloads the conversation when it was parked without a transcript", async () => {
			const { coordinator, options } = makeCoordinator({
				parkedSession: makeActiveSession(),
				hasHistoryItem: true,
				clineMessages: [{ ts: 1, type: "say", say: "task", text: "from disk" }],
			})

			await coordinator.showTaskWithId("session-123")

			expect(options.sessions.resumeParkedSession).toHaveBeenCalledOnce()
			expect(options.taskHistory.getClineMessages).toHaveBeenCalledWith("session-123")
		})
	})

	it("sets TurnState before installing the task proxy", async () => {
		const order: string[] = []
		const { coordinator, options } = makeCoordinator({
			hasHistoryItem: true,
			clineMessages: [{ ts: 1, type: "say", say: "task", text: "hello" }],
		})
		;(options.setTurnPhase as ReturnType<typeof vi.fn>).mockImplementation(() => order.push("phase"))
		options.setTask.mockImplementation((task) => {
			order.push("setTask")
			return task
		})

		await coordinator.showTaskWithId("task-1")

		expect(order.slice(0, 2)).toEqual(["phase", "setTask"])
	})

	it("shows a legacy task with a warning and a resume ask", async () => {
		const legacyMessages: ClineMessage[] = [{ ts: 1, type: "say", say: "task", text: "legacy task" }]
		const { coordinator, options, state } = makeCoordinator({
			hasHistoryItem: true,
			clineMessages: legacyMessages,
			isLegacyTask: true,
		})

		await coordinator.showTaskWithId("legacy-task")

		expect(options.taskHistory.isLegacyTask).toHaveBeenCalledWith("legacy-task")
		const loaded = state.task?.messageStateHandler.getClineMessages() ?? []
		expect(loaded).toEqual([
			{ ts: 1, type: "say", say: "task", text: "legacy task" },
			expect.objectContaining({
				type: "say",
				say: "text",
				text: expect.stringContaining("legacy task"),
			}),
			expect.objectContaining({ type: "ask", ask: "resume_task" }),
		])
		expect(options.setTurnPhase).toHaveBeenCalledWith("resumable", loaded[2].ts)
	})

	it("does not show a task that is missing from history", async () => {
		const { coordinator, options } = makeCoordinator({ hasHistoryItem: false })

		await coordinator.showTaskWithId("missing-task")

		expect(options.setTask).not.toHaveBeenCalled()
		expect(options.taskHistory.getClineMessages).not.toHaveBeenCalled()
		expect(options.interactions.clearPending).not.toHaveBeenCalled()
		expect(options.setTurnPhase).not.toHaveBeenCalled()
	})

	it("does not install the new task proxy until its messages are loaded", async () => {
		const sdkClineMessages: ClineMessage[] = [
			{ ts: 1, type: "say", say: "task", text: "hello" },
			{ ts: 2, type: "ask", ask: "completion_result", text: "" },
		]

		let resolveGetClineMessages: ((messages: ClineMessage[]) => void) | undefined
		const getClineMessagesDeferred = new Promise<ClineMessage[]>((resolve) => {
			resolveGetClineMessages = resolve
		})

		const { coordinator, options, state } = makeCoordinator({
			hasHistoryItem: true,
			clineMessages: sdkClineMessages,
		})
		options.taskHistory.getClineMessages.mockReturnValueOnce(getClineMessagesDeferred)

		let setTaskHadMessages: boolean | undefined
		options.setTask.mockImplementation((task: any) => {
			setTaskHadMessages = (task?.messageStateHandler?.getClineMessages?.() ?? []).length > 0
			state.task = task
		})

		const inFlight = coordinator.showTaskWithId("task-1")

		// While getClineMessages is still pending, the new task proxy must not be
		// installed — otherwise concurrent postStateToWebview() callers would see
		// currentTaskItem.id with an empty messageStateHandler.
		await Promise.resolve()
		await Promise.resolve()
		expect(options.setTask).not.toHaveBeenCalled()
		expect(state.task).toBeUndefined()

		resolveGetClineMessages?.(sdkClineMessages)
		await inFlight

		expect(options.setTask).toHaveBeenCalledTimes(1)
		expect(setTaskHadMessages).toBe(true)
		expect(state.task?.taskId).toBe("task-1")
		expect(options.postStateToWebview).toHaveBeenCalledOnce()
	})
})

function makeCoordinator(input: Partial<MakeCoordinatorInput> = {}) {
	const state: { task?: ReturnType<typeof makeTask> } = {
		task: input.task,
	}
	// A parked session is opt-in: with none, parking is a no-op and the coordinator behaves
	// exactly as it did before tasks learned to keep running in the background.
	let parkedSession = input.parkedSession
	const options = {
		sessions: {
			// Parking moves the session out of the display, exactly as the real lifecycle does.
			getActiveSession: vi.fn(() => (parkedSession === input.activeSession ? undefined : input.activeSession)),
			getLiveSession: vi.fn(() => input.activeSession ?? parkedSession),
			getParkedSession: vi.fn(() => parkedSession),
			parkActiveSession: vi.fn(() => {
				if (!input.activeSession?.isRunning) {
					return undefined
				}
				parkedSession = input.activeSession
				return input.activeSession
			}),
			resumeParkedSession: vi.fn(() => {
				const resumed = parkedSession
				parkedSession = undefined
				return resumed
			}),
			endParkedSession: vi.fn(() => {
				const ended = parkedSession
				parkedSession = undefined
				return Promise.resolve(ended)
			}),
			setParkedRunning: vi.fn(),
			endActiveSession: vi.fn().mockResolvedValue(input.activeSession),
			setRunning: vi.fn(),
		},
		interactions: {
			clearPending: vi.fn(),
			surfaceDeferredAskForSession: vi.fn(() => false),
		},
		messages: {
			appendAndEmit: vi.fn(),
			appendMessages: vi.fn(),
			cancelPendingSave: vi.fn(),
			finalizeMessagesForSave: vi.fn((messages: ClineMessage[]) =>
				messages.map((message) => {
					if (!message.partial) {
						return message
					}
					const { partial: _partial, ...rest } = message
					return { ...rest, text: "final" }
				}),
			),
		},
		taskHistory: {
			getClineMessages: vi.fn().mockResolvedValue(input.clineMessages ?? []),
			isLegacyTask: vi.fn().mockResolvedValue(input.isLegacyTask ?? false),
			findHistoryItem: vi.fn(() =>
				input.hasHistoryItem === false
					? undefined
					: {
							id: "task-1",
							ts: 1,
							task: "hello",
							tokensIn: 0,
							tokensOut: 0,
							totalCost: 0,
						},
			),
		},
		getTask: vi.fn(() => state.task),
		setTask: vi.fn((task) => {
			state.task = task as ReturnType<typeof makeTask> | undefined
		}),
		onAskResponse: vi.fn().mockResolvedValue(undefined),
		resetMessageTranslator: vi.fn(),
		bumpConversationFence: vi.fn(),
		setTurnPhase: vi.fn(),
		raiseCancelFence: vi.fn(),
		postStateToWebview: vi.fn().mockResolvedValue(undefined),
	} as unknown as SdkTaskControlCoordinatorOptions & {
		sessions: SdkTaskControlCoordinatorOptions["sessions"] & {
			getActiveSession: ReturnType<typeof vi.fn>
			getLiveSession: ReturnType<typeof vi.fn>
			getParkedSession: ReturnType<typeof vi.fn>
			parkActiveSession: ReturnType<typeof vi.fn>
			resumeParkedSession: ReturnType<typeof vi.fn>
			endParkedSession: ReturnType<typeof vi.fn>
			endActiveSession: ReturnType<typeof vi.fn>
			setRunning: ReturnType<typeof vi.fn>
		}
		interactions: SdkTaskControlCoordinatorOptions["interactions"] & {
			clearPending: ReturnType<typeof vi.fn>
			surfaceDeferredAskForSession: ReturnType<typeof vi.fn>
		}
		messages: SdkTaskControlCoordinatorOptions["messages"] & {
			appendAndEmit: ReturnType<typeof vi.fn>
			appendMessages: ReturnType<typeof vi.fn>
			cancelPendingSave: ReturnType<typeof vi.fn>
			finalizeMessagesForSave: ReturnType<typeof vi.fn>
		}
		taskHistory: SdkTaskControlCoordinatorOptions["taskHistory"] & {
			findHistoryItem: ReturnType<typeof vi.fn>
			getClineMessages: ReturnType<typeof vi.fn>
			isLegacyTask: ReturnType<typeof vi.fn>
		}
		getTask: ReturnType<typeof vi.fn>
		setTask: ReturnType<typeof vi.fn>
		resetMessageTranslator: ReturnType<typeof vi.fn>
		setTurnPhase: ReturnType<typeof vi.fn>
		postStateToWebview: ReturnType<typeof vi.fn>
	}

	return {
		coordinator: new SdkTaskControlCoordinator(options),
		options,
		state,
		/** The session parked so far — the one the app must keep alive in the background. */
		parkedSession: () => parkedSession,
	}
}

interface MakeCoordinatorInput {
	activeSession: ReturnType<typeof makeActiveSession>
	task: ReturnType<typeof makeTask>
	/** A session already parked before this coordinator was built (the user left it working). */
	parkedSession: ReturnType<typeof makeActiveSession>
	hasHistoryItem: boolean
	clineMessages: ClineMessage[]
	isLegacyTask: boolean
}

function makeActiveSession(isRunning = true) {
	return {
		sessionId: "session-123",
		sdkHost: {
			abort: vi.fn().mockResolvedValue(undefined),
			stop: vi.fn().mockResolvedValue(undefined),
			dispose: vi.fn().mockResolvedValue(undefined),
		},
		unsubscribe: vi.fn(),
		isRunning,
	}
}

function makeTask(taskId: string, messages: ClineMessage[] = []) {
	return {
		taskId,
		messageStateHandler: {
			getClineMessages: vi.fn(() => messages),
			clear: vi.fn(),
		},
	}
}
