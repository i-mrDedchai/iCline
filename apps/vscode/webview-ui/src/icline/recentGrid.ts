/**
 * recentGrid — how many columns the home screen's "Recent" list shows, in ONE place.
 *
 * The list used to be one column of three rows. On the panes people actually work in that
 * left most of every row empty, because session titles are short: there was room for two or
 * three of them side by side. The rule asked for (maintainer request, 2026-09-20) is
 * therefore "three rows, as many columns as fit, never more than three" — the home shows
 * 3, 6 or 9 sessions depending on the pane, and "View All" keeps the rest.
 *
 * Row height is deliberately not part of this rule: a narrower card wraps its title into at
 * most the two lines it already clamps to, so extra columns never mean taller rows.
 *
 * `recentColumnCount` is the whole decision. `useRecentColumnCount` is its plumbing for
 * React, measuring the grid itself rather than the window: the question is how wide THIS
 * list got, and VS Code resizes the webview's frame without necessarily resizing the window.
 */
import { useEffect, useState } from "react"

/** Rows the home always shows — the reason the list is "Recent", not "History". */
export const RECENT_ROWS = 3

/** More than this and a card stops reading as a session title; the home stops at three. */
export const RECENT_MAX_COLUMNS = 3

/** Narrowest a card may get before the list drops back to fewer columns. */
export const RECENT_MIN_COLUMN_WIDTH_PX = 240

/** Must match `.history-preview-grid`'s gap. */
export const RECENT_GAP_PX = 8

/**
 * Columns that fit in `containerWidth` — `n` of them need `n * min + (n - 1) * gap`, so the
 * answer is the widest count that still fits, never below 1. A width that was not measured
 * (0, NaN, a detached grid) reads as one column: the narrow-pane layout is the safe default,
 * and it is what the list showed before the rule existed.
 */
export function recentColumnCount(
	containerWidth: number,
	minColumnWidth = RECENT_MIN_COLUMN_WIDTH_PX,
	maxColumns = RECENT_MAX_COLUMNS,
): number {
	if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
		return 1
	}
	for (let columns = maxColumns; columns > 1; columns--) {
		const required = columns * minColumnWidth + (columns - 1) * RECENT_GAP_PX
		if (containerWidth >= required) {
			return columns
		}
	}
	return 1
}

/** How many sessions the home renders for a column count — always exactly {@link RECENT_ROWS} rows. */
export function recentVisibleCount(columns: number): number {
	const safeColumns = Number.isFinite(columns) ? Math.max(1, Math.floor(columns)) : 1
	return safeColumns * RECENT_ROWS
}

/**
 * The head of the history the home renders: three rows' worth of sessions, or fewer if the
 * user has fewer. Filled left to right, so the newest session stays in the top-left card.
 */
export function sliceRecentTasks<T>(tasks: T[], columns: number): T[] {
	return tasks.slice(0, recentVisibleCount(columns))
}

/**
 * How many columns the Recent grid may use, measured from the grid element itself.
 *
 * Takes the ELEMENT, not a ref, for the two cases the home actually has: the grid is only
 * rendered once history exists (the extension state arrives after the first paint), and a wide
 * pane is reached later by dragging the sidebar. A callback ref into state re-runs the effect
 * when the grid appears, and a `ResizeObserver` on it is the honest signal for every width
 * change afterwards — the pane widening is what changes the answer, and VS Code resizes the
 * webview's frame without resizing the window. jsdom (the webview unit tests) has no
 * `ResizeObserver`, so the hook falls back to a `window` resize listener there instead of
 * giving up on the measurement.
 *
 * The first measure runs in the effect, after layout, so the first paint of a wide home is
 * already the multi-column one.
 */
export function useRecentColumnCount(grid: HTMLElement | null): number {
	const [columns, setColumns] = useState(1)

	useEffect(() => {
		if (!grid) {
			return
		}
		const measure = (width?: number) => setColumns(recentColumnCount(width ?? grid.clientWidth))
		measure()

		if (typeof ResizeObserver === "undefined") {
			const onWindowResize = () => measure()
			window.addEventListener("resize", onWindowResize)
			return () => window.removeEventListener("resize", onWindowResize)
		}

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0]
			// `contentRect` excludes padding: the grid's content box is what the columns share.
			measure(entry ? entry.contentRect.width : undefined)
		})
		observer.observe(grid)
		return () => observer.disconnect()
	}, [grid])

	return columns
}
