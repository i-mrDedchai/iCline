import { beforeEach, describe, expect, it } from "vitest"
import { clearInputHistory, MAX_INPUT_HISTORY_ENTRIES, readInputHistory, writeInputHistory } from "./inputHistoryStorage"

describe("inputHistoryStorage", () => {
	beforeEach(() => {
		clearInputHistory()
	})

	it("starts empty when nothing was stored", () => {
		expect(readInputHistory()).toEqual([])
	})

	it("round-trips what was written", () => {
		writeInputHistory(["first", "second"])
		expect(readInputHistory()).toEqual(["first", "second"])
	})

	it("clears the slot when the history is emptied", () => {
		writeInputHistory(["first"])
		writeInputHistory([])
		expect(readInputHistory()).toEqual([])
	})

	it("drops non-strings and blanks", () => {
		localStorage.setItem("icline-composer-input-history", JSON.stringify(["ok", 42, "", "  ", null, "fine"]))
		expect(readInputHistory()).toEqual(["ok", "fine"])
	})

	it("treats corrupt or foreign payloads as gone", () => {
		localStorage.setItem("icline-composer-input-history", "not json{")
		expect(readInputHistory()).toEqual([])
		localStorage.setItem("icline-composer-input-history", JSON.stringify({ text: "nope" }))
		expect(readInputHistory()).toEqual([])
	})

	it("caps what it keeps, newest last", () => {
		const long = Array.from({ length: MAX_INPUT_HISTORY_ENTRIES + 5 }, (_, i) => `m${i}`)
		writeInputHistory(long)
		const kept = readInputHistory()
		expect(kept).toHaveLength(MAX_INPUT_HISTORY_ENTRIES)
		expect(kept[0]).toBe("m5")
		expect(kept[kept.length - 1]).toBe(`m${long.length - 1}`)
	})
})
