import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
	RECENT_GAP_PX,
	RECENT_MIN_COLUMN_WIDTH_PX,
	RECENT_ROWS,
	recentColumnCount,
	recentVisibleCount,
	sliceRecentTasks,
	useRecentColumnCount,
} from "./recentGrid"

/** `n` columns of the minimum width, with the gaps between them. */
const widthFor = (columns: number) => columns * RECENT_MIN_COLUMN_WIDTH_PX + (columns - 1) * RECENT_GAP_PX

/** A grid element whose measured width the test controls (jsdom lays nothing out). */
const fakeGrid = (width: number) => {
	const element = document.createElement("div")
	Object.defineProperty(element, "clientWidth", { value: width, writable: true, configurable: true })
	return element as HTMLElement & { clientWidth: number }
}

describe("recentColumnCount", () => {
	it("gives a squeezed pane the single column it used to have", () => {
		// VS Code's default sidebar is ~300px; the home's padding leaves it under 300.
		expect(recentColumnCount(268)).toBe(1)
		expect(recentColumnCount(widthFor(2) - 1)).toBe(1)
	})

	it("adds a column the moment the pane can hold one", () => {
		expect(recentColumnCount(widthFor(2))).toBe(2)
		expect(recentColumnCount(widthFor(3) - 1)).toBe(2)
		expect(recentColumnCount(widthFor(3))).toBe(3)
	})

	it("shows the three columns of the reported working width", () => {
		// The pane in the report was ~875px wide; the padded list gets ~843px of it.
		expect(recentColumnCount(843)).toBe(3)
	})

	it("stops at three columns however wide the pane gets", () => {
		expect(recentColumnCount(4000)).toBe(3)
	})

	it("falls back to one column when nothing was measured", () => {
		for (const width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(recentColumnCount(width)).toBe(1)
		}
	})

	it("honours a caller's own minimum and maximum", () => {
		expect(recentColumnCount(1000, 500)).toBe(1)
		expect(recentColumnCount(1000, 500, 4)).toBe(1)
		expect(recentColumnCount(2000, 500, 4)).toBe(3)
	})
})

describe("recent grid slice", () => {
	const tasks = Array.from({ length: 12 }, (_, index) => ({ id: `task-${index}` }))

	it("keeps the list at three rows whatever the column count", () => {
		expect(RECENT_ROWS).toBe(3)
		expect(recentVisibleCount(1)).toBe(3)
		expect(recentVisibleCount(2)).toBe(6)
		expect(recentVisibleCount(3)).toBe(9)
	})

	it("takes the newest sessions, left to right", () => {
		expect(sliceRecentTasks(tasks, 3).map((task) => task.id)).toEqual([
			"task-0",
			"task-1",
			"task-2",
			"task-3",
			"task-4",
			"task-5",
			"task-6",
			"task-7",
			"task-8",
		])
		expect(sliceRecentTasks(tasks, 2)).toHaveLength(6)
		expect(sliceRecentTasks(tasks, 1)).toHaveLength(3)
	})

	it("shows fewer than a full grid when the user has fewer sessions", () => {
		expect(sliceRecentTasks(tasks.slice(0, 4), 3)).toHaveLength(4)
		expect(sliceRecentTasks([], 3)).toEqual([])
	})

	it("never asks for more than one column's worth when the count is nonsense", () => {
		expect(sliceRecentTasks(tasks, 0)).toHaveLength(3)
		expect(sliceRecentTasks(tasks, -2)).toHaveLength(3)
		expect(sliceRecentTasks(tasks, Number.NaN)).toHaveLength(3)
	})
})

describe("useRecentColumnCount", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it("measures the grid it was given", () => {
		vi.stubGlobal("ResizeObserver", undefined)
		const grid = fakeGrid(800)

		const { result } = renderHook(() => useRecentColumnCount(grid))

		expect(result.current).toBe(3)
	})

	it("re-measures on a window resize when there is no ResizeObserver", () => {
		vi.stubGlobal("ResizeObserver", undefined)
		const grid = fakeGrid(300)

		const { result } = renderHook(() => useRecentColumnCount(grid))
		expect(result.current).toBe(1)

		grid.clientWidth = 900
		act(() => {
			window.dispatchEvent(new Event("resize"))
		})
		expect(result.current).toBe(3)
	})

	it("follows the observer's content box where ResizeObserver exists", () => {
		// What VS Code does: the pane is dragged, the grid's box changes, an entry arrives.
		const callbacks: ResizeObserverCallback[] = []
		class FakeResizeObserver {
			constructor(callback: ResizeObserverCallback) {
				callbacks.push(callback)
			}
			observe() {}
			disconnect() {}
			unobserve() {}
		}
		vi.stubGlobal("ResizeObserver", FakeResizeObserver)
		const grid = fakeGrid(300)

		const { result } = renderHook(() => useRecentColumnCount(grid))
		expect(result.current).toBe(1)

		act(() => {
			callbacks[0]([{ contentRect: { width: 900 } } as ResizeObserverEntry], {} as ResizeObserver)
		})
		expect(result.current).toBe(3)
	})

	it("stays at one column while there is no grid to measure", () => {
		vi.stubGlobal("ResizeObserver", undefined)

		const { result } = renderHook(() => useRecentColumnCount(null))

		expect(result.current).toBe(1)
	})

	it("measures a grid that only appears later", () => {
		// What the home does: the first paint has no history yet, the grid mounts with the state.
		vi.stubGlobal("ResizeObserver", undefined)

		const { result, rerender } = renderHook((grid: HTMLElement | null) => useRecentColumnCount(grid), {
			initialProps: null,
		})
		expect(result.current).toBe(1)

		rerender(fakeGrid(900))

		expect(result.current).toBe(3)
	})
})
