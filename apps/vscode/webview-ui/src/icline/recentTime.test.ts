import { describe, expect, it } from "vitest"
import { formatRecentTimestamp, formatRecentTimestampTitle } from "./recentTime"

/** Local-time anchor: 2026-09-20 15:04 local. */
const NOW = new Date(2026, 8, 20, 15, 4, 0).getTime()
const at = (h: number, m = 0, day = 20, month = 8) => new Date(2026, month, day, h, m, 0).getTime()

describe("formatRecentTimestamp", () => {
	it("marks a session from the last minute as just now", () => {
		expect(formatRecentTimestamp(NOW - 30_000, NOW)).toBe("just now")
	})

	it("shows a clock time for earlier the same day so the order is readable", () => {
		expect(formatRecentTimestamp(at(9, 5), NOW)).toBe("09:05")
		expect(formatRecentTimestamp(at(14, 32), NOW)).toBe("14:32")
	})

	it("labels yesterday and the rest of the week", () => {
		expect(formatRecentTimestamp(at(23, 59, 19), NOW)).toBe("Yesterday")
		expect(formatRecentTimestamp(at(12, 0, 18), NOW)).toBe("Fri")
	})

	it("falls back to a date beyond a week", () => {
		expect(formatRecentTimestamp(at(12, 0, 10), NOW)).toBe("Sep 10")
		expect(formatRecentTimestamp(new Date(2026, 6, 4, 9, 0).getTime(), NOW)).toBe("Jul 4")
	})

	it("returns an empty label for missing timestamps", () => {
		expect(formatRecentTimestamp(0, NOW)).toBe("")
		expect(formatRecentTimestamp(Number.NaN, NOW)).toBe("")
	})
})

describe("formatRecentTimestampTitle", () => {
	it("keeps the full date and time for the tooltip", () => {
		expect(formatRecentTimestampTitle(at(9, 5))).toBe("Sep 20, 2026, 09:05 AM")
	})

	it("returns an empty title for missing timestamps", () => {
		expect(formatRecentTimestampTitle(0)).toBe("")
	})
})
