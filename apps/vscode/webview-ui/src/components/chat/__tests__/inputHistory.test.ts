import { describe, expect, it } from "vitest"
import {
	INITIAL_HISTORY_NAV,
	MAX_INPUT_HISTORY_ENTRIES,
	pushInputHistoryEntry,
	recallInputHistory,
	shouldRecallOnArrow,
} from "../inputHistory"

describe("pushInputHistoryEntry", () => {
	it("appends trimmed text", () => {
		expect(pushInputHistoryEntry([], "  hello  ")).toEqual(["hello"])
	})

	it("drops empties and keeps the same reference", () => {
		const history = ["a"]
		expect(pushInputHistoryEntry(history, "   ")).toBe(history)
	})

	it("drops consecutive duplicates", () => {
		const history = ["a", "b"]
		expect(pushInputHistoryEntry(history, "b")).toBe(history)
		expect(pushInputHistoryEntry(history, "a")).toEqual(["a", "b", "a"])
	})

	it("caps the length, keeping the newest", () => {
		const full = Array.from({ length: MAX_INPUT_HISTORY_ENTRIES }, (_, i) => `m${i}`)
		const next = pushInputHistoryEntry(full, "newest")
		expect(next).toHaveLength(MAX_INPUT_HISTORY_ENTRIES)
		expect(next[0]).toBe("m1")
		expect(next[next.length - 1]).toBe("newest")
	})
})

describe("shouldRecallOnArrow", () => {
	it("recalls on single-line input", () => {
		expect(shouldRecallOnArrow("hello", 5, -1)).toBe(true)
		expect(shouldRecallOnArrow("hello", 0, 1)).toBe(true)
		expect(shouldRecallOnArrow("", 0, -1)).toBe(true)
	})

	it("keeps native caret movement inside multi-line input", () => {
		// Caret on the second line: Up moves the caret, it does not recall.
		expect(shouldRecallOnArrow("a\nb", 3, -1)).toBe(false)
		// Caret on the first line: Down moves the caret, it does not recall.
		expect(shouldRecallOnArrow("a\nb", 0, 1)).toBe(false)
	})

	it("recalls on the boundary lines", () => {
		expect(shouldRecallOnArrow("a\nb", 1, -1)).toBe(true)
		expect(shouldRecallOnArrow("a\nb", 3, 1)).toBe(true)
	})

	it("clamps out-of-range carets", () => {
		expect(shouldRecallOnArrow("a\nb", 99, 1)).toBe(true)
		expect(shouldRecallOnArrow("a\nb", -4, -1)).toBe(true)
	})
})

describe("recallInputHistory", () => {
	const history = ["first", "second", "third"]

	it("returns null for empty history", () => {
		expect(recallInputHistory([], INITIAL_HISTORY_NAV, "", -1)).toBeNull()
	})

	it("Up from the draft stashes it and shows the newest", () => {
		expect(recallInputHistory(history, INITIAL_HISTORY_NAV, "draft", -1)).toEqual({
			value: "third",
			nav: { index: 2, draft: "draft" },
		})
	})

	it("Down from the draft does nothing", () => {
		expect(recallInputHistory(history, INITIAL_HISTORY_NAV, "draft", 1)).toBeNull()
	})

	it("walks older then restores the draft", () => {
		let nav = recallInputHistory(history, INITIAL_HISTORY_NAV, "draft", -1)!.nav
		expect(recallInputHistory(history, nav, "third", -1)).toEqual({
			value: "second",
			nav: { index: 1, draft: "draft" },
		})
		nav = { index: 1, draft: "draft" }
		const back = recallInputHistory(history, nav, "second", 1)!
		expect(back.value).toBe("third")
		const home = recallInputHistory(history, back.nav, "third", 1)!
		expect(home).toEqual({ value: "draft", nav: INITIAL_HISTORY_NAV })
	})

	it("clamps at the oldest entry instead of wrapping", () => {
		const nav = { index: 0, draft: "draft" }
		expect(recallInputHistory(history, nav, "first", -1)).toEqual({
			value: "first",
			nav: { index: 0, draft: "draft" },
		})
	})
})
