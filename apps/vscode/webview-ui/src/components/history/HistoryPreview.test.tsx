import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { recentVisibleCount } from "@/icline/recentGrid"

const mocks = vi.hoisted(() => ({
	showTaskWithId: vi.fn(),
	taskHistory: [] as unknown[],
	backgroundTask: undefined as unknown,
	queuedTask: undefined as unknown,
}))

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({
		taskHistory: mocks.taskHistory,
		backgroundTask: mocks.backgroundTask,
		queuedTask: mocks.queuedTask,
	}),
}))

vi.mock("@/services/grpc-client", () => ({
	TaskServiceClient: { showTaskWithId: mocks.showTaskWithId },
}))

vi.mock("@shared/proto/cline/common", () => ({
	StringRequest: { create: (request: unknown) => request },
}))

import HistoryPreview from "./HistoryPreview"

/** The widths the grid is told it has, in order — one entry per ResizeObserver callback. */
const observerCallbacks: ResizeObserverCallback[] = []

class FakeResizeObserver {
	constructor(callback: ResizeObserverCallback) {
		observerCallbacks.push(callback)
	}
	observe() {}
	disconnect() {}
	unobserve() {}
}

/** Report a grid width the way the browser would. */
const resizeGridTo = (width: number) =>
	act(() => {
		for (const callback of observerCallbacks) {
			callback([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver)
		}
	})

const history = (count: number) =>
	Array.from({ length: count }, (_, index) => ({
		id: `task-${index}`,
		ts: 1_700_000_000_000 + index,
		task: `Session number ${index}`,
		totalCost: 0,
	}))

describe("HistoryPreview", () => {
	beforeEach(() => {
		observerCallbacks.length = 0
		vi.stubGlobal("ResizeObserver", FakeResizeObserver)
		mocks.showTaskWithId.mockReset().mockResolvedValue({})
		mocks.taskHistory = history(12)
		mocks.backgroundTask = undefined
		mocks.queuedTask = undefined
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it("fills three rows and adds columns as the pane allows", () => {
		const { container } = render(<HistoryPreview showHistoryView={vi.fn()} />)
		const grid = () => container.querySelector("[data-icline-recent-grid]")

		// Narrow (VS Code's default sidebar): one column of three — the layout it always had.
		expect(grid()?.getAttribute("data-columns")).toBe("1")
		expect(screen.getAllByText(/Session number/)).toHaveLength(3)

		resizeGridTo(600)
		expect(grid()?.getAttribute("data-columns")).toBe("2")
		expect(screen.getAllByText(/Session number/)).toHaveLength(recentVisibleCount(2))

		resizeGridTo(900)
		expect(grid()?.getAttribute("data-columns")).toBe("3")
		expect(screen.getAllByText(/Session number/)).toHaveLength(recentVisibleCount(3))
		// The columns are the grid's own template, not a guess by the test.
		expect(grid()?.getAttribute("style")).toContain("--history-columns: 3")

		// And it never grows past three columns, however wide the pane gets.
		resizeGridTo(6000)
		expect(grid()?.getAttribute("data-columns")).toBe("3")
	})

	it("labels each card with its recency so same-day sessions have an order", () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date(2026, 8, 20, 15, 4, 0))
		const at = (hour: number, minute: number, day = 20) => new Date(2026, 8, day, hour, minute, 0).getTime()
		mocks.taskHistory = [
			{ id: "newest", ts: at(14, 32), task: "Newest session", totalCost: 0 },
			{ id: "older", ts: at(9, 5), task: "Older session", totalCost: 0 },
			{ id: "yesterday", ts: at(23, 59, 19), task: "Yesterday session", totalCost: 0 },
		]

		render(<HistoryPreview showHistoryView={vi.fn()} />)
		const labelFor = (task: string) =>
			screen.getByText(task).closest(".history-preview-item")?.querySelector(".history-date")?.textContent

		expect(labelFor("Newest session")).toBe("14:32")
		expect(labelFor("Older session")).toBe("09:05")
		expect(labelFor("Yesterday session")).toBe("Yesterday")
		vi.useRealTimers()
	})

	it("renders the sessions it has, and only those", () => {
		mocks.taskHistory = history(4)

		const { container } = render(<HistoryPreview showHistoryView={vi.fn()} />)
		resizeGridTo(900)

		expect(container.querySelector("[data-icline-recent-grid]")).not.toBeNull()
		expect(screen.getAllByText(/Session number/)).toHaveLength(4)
	})

	it("opens the session that was clicked", () => {
		mocks.taskHistory = history(4)
		render(<HistoryPreview showHistoryView={vi.fn()} />)

		fireEvent.click(screen.getByText("Session number 2"))

		expect(mocks.showTaskWithId).toHaveBeenCalledWith({ value: "task-2" })
	})

	it("marks the one card that is still working, and only that one", () => {
		mocks.backgroundTask = { taskId: "task-2", title: "Session number 2", isRunning: true, awaitingApproval: false }
		render(<HistoryPreview showHistoryView={vi.fn()} />)

		const badges = screen.getAllByText("Working")
		expect(badges).toHaveLength(1)
		expect(badges[0].closest(".history-preview-item")?.textContent).toContain("Session number 2")
	})

	it("says a background task needs an answer when it is waiting on one", () => {
		mocks.backgroundTask = { taskId: "task-1", title: "Session number 1", isRunning: true, awaitingApproval: true }
		render(<HistoryPreview showHistoryView={vi.fn()} />)

		expect(screen.queryByText("Working")).toBeNull()
		expect(screen.getByText("Waiting")).toBeTruthy()
		// The banner names the task, so the user need not hunt for it among the cards.
		expect(screen.getByText(/Waiting for your answer: Session number 1/)).toBeTruthy()
	})

	it("says Done when the task finished while the user was away", () => {
		mocks.backgroundTask = { taskId: "task-1", title: "Session number 1", isRunning: false, awaitingApproval: false }
		render(<HistoryPreview showHistoryView={vi.fn()} />)

		// "Working" here would be a lie: nothing is running, the user just has not seen the result.
		expect(screen.queryByText("Working")).toBeNull()
		expect(screen.getByText("Done")).toBeTruthy()
		expect(screen.getByText(/Finished in the background: Session number 1/)).toBeTruthy()
	})

	it("banners the background task and jumps to it", () => {
		mocks.backgroundTask = { taskId: "task-3", title: "Session number 3", isRunning: true, awaitingApproval: false }
		mocks.queuedTask = true
		render(<HistoryPreview showHistoryView={vi.fn()} />)

		expect(screen.getByText(/Still working in the background: Session number 3/)).toBeTruthy()
		expect(screen.getByText(/your next task starts when it finishes/)).toBeTruthy()

		fireEvent.click(screen.getByRole("button", { name: "View" }))
		expect(mocks.showTaskWithId).toHaveBeenCalledWith({ value: "task-3" })
	})

	it("shows no badge or banner when nothing is running in the background", () => {
		const { container } = render(<HistoryPreview showHistoryView={vi.fn()} />)

		expect(container.querySelector("[data-icline-background-task]")).toBeNull()
		expect(screen.queryByText("Working")).toBeNull()
		expect(screen.queryByText("Waiting")).toBeNull()
	})

	it("keeps the View All escape hatch", () => {
		const showHistoryView = vi.fn()
		render(<HistoryPreview showHistoryView={showHistoryView} />)

		fireEvent.click(screen.getByRole("button", { name: "View all history" }))

		expect(showHistoryView).toHaveBeenCalledTimes(1)
	})

	it("shows the empty state, without a View All button, when there is no history", () => {
		mocks.taskHistory = []

		const { container } = render(<HistoryPreview showHistoryView={vi.fn()} />)

		expect(container.querySelector("[data-icline-recent-grid]")).toBeNull()
		expect(screen.getByText("No recent tasks")).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "View all history" })).toBeNull()
	})
})
