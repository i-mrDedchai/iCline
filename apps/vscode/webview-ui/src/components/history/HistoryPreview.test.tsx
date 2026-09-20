import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { recentVisibleCount } from "@/icline/recentGrid"

const mocks = vi.hoisted(() => ({
	showTaskWithId: vi.fn(),
	taskHistory: [] as unknown[],
}))

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({ taskHistory: mocks.taskHistory }),
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
