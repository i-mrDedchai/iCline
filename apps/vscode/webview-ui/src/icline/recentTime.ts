/**
 * Recency labels for the Recent cards.
 *
 * The cards are ordered newest first, and a bare date ("Sep 20") made several
 * sessions from the same day look interchangeable — there was no way to tell
 * which one came before which (fix.21 smoke feedback). A relative label for the
 * recent past and a clock time for today answer that directly, without adding a
 * row or changing the card height.
 */

const MINUTE_MS = 60_000

function startOfDay(date: Date): number {
	const copy = new Date(date.getTime())
	copy.setHours(0, 0, 0, 0)
	return copy.getTime()
}

const MONTH_DAY: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
const CLOCK: Intl.DateTimeFormatOptions = {
	hour: "2-digit",
	minute: "2-digit",
	hour12: false,
}
const WEEKDAY: Intl.DateTimeFormatOptions = { weekday: "short" }

export function formatRecentTimestamp(timestamp: number, now: number = Date.now()): string {
	if (!Number.isFinite(timestamp) || timestamp <= 0) {
		return ""
	}
	const date = new Date(timestamp)
	if (Number.isNaN(date.getTime())) {
		return ""
	}

	const elapsed = now - timestamp
	if (elapsed >= 0 && elapsed < MINUTE_MS) {
		return "just now"
	}

	const dayDelta = Math.round((startOfDay(new Date(now)) - startOfDay(date)) / 86_400_000)
	if (dayDelta <= 0) {
		// Today: the clock time is what makes the order readable.
		return date.toLocaleString("en-US", CLOCK)
	}
	if (dayDelta === 1) {
		return "Yesterday"
	}
	if (dayDelta < 7) {
		return date.toLocaleString("en-US", WEEKDAY)
	}
	return date.toLocaleString("en-US", MONTH_DAY)
}

/** Full date and time, for the card's hover tooltip. */
export function formatRecentTimestampTitle(timestamp: number): string {
	if (!Number.isFinite(timestamp) || timestamp <= 0) {
		return ""
	}
	const date = new Date(timestamp)
	if (Number.isNaN(date.getTime())) {
		return ""
	}
	return date.toLocaleString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}
