/**
 * Composer sent-message history (iCline 0.1.19-dev.1).
 *
 * Up/Down in an empty-or-boundary composer recalls what was sent before,
 * shell-style: Up walks older, Down walks back to the stashed draft. The
 * state machine here is pure so it stays unit-testable; `ChatTextArea`
 * only wires it to the textarea (caret gating + cursor restore).
 */

import { MAX_INPUT_HISTORY_ENTRIES } from "@/icline/inputHistoryStorage"

export { MAX_INPUT_HISTORY_ENTRIES }

export interface ComposerHistoryNav {
	/** Index into history currently shown, or null when showing the live draft. */
	index: number | null
	/** The live draft stashed when the user first pressed Up. */
	draft: string
}

export const INITIAL_HISTORY_NAV: ComposerHistoryNav = { index: null, draft: "" }

/**
 * Append a sent message. Trims, drops empties and consecutive duplicates,
 * and caps the length so a long session cannot grow the list forever.
 */
export function pushInputHistoryEntry(history: string[], text: string): string[] {
	const entry = text.trim()
	if (!entry) {
		return history
	}
	if (history[history.length - 1] === entry) {
		return history
	}
	const next = [...history, entry]
	return next.length > MAX_INPUT_HISTORY_ENTRIES ? next.slice(next.length - MAX_INPUT_HISTORY_ENTRIES) : next
}

/**
 * Whether an arrow key should recall history instead of moving the caret.
 * Multi-line composers keep native caret movement unless the caret sits on
 * the boundary line (first line for Up, last line for Down).
 */
export function shouldRecallOnArrow(value: string, caret: number, direction: -1 | 1): boolean {
	const safeCaret = Math.max(0, Math.min(caret, value.length))
	if (direction === -1) {
		return !value.slice(0, safeCaret).includes("\n")
	}
	return !value.slice(safeCaret).includes("\n")
}

export interface HistoryRecallResult {
	value: string
	nav: ComposerHistoryNav
}

/**
 * One recall step. Returns null when there is nothing to do (empty history,
 * or Down while already showing the live draft).
 */
export function recallInputHistory(
	history: readonly string[],
	nav: ComposerHistoryNav,
	currentValue: string,
	direction: -1 | 1,
): HistoryRecallResult | null {
	if (history.length === 0) {
		return null
	}
	if (nav.index === null) {
		if (direction === 1) {
			return null
		}
		const index = history.length - 1
		return { value: history[index], nav: { index, draft: currentValue } }
	}
	const index = nav.index + direction
	if (index < 0) {
		// Clamp at the oldest entry instead of wrapping: wrapping would fling
		// a long message back into the composer by surprise.
		return { value: history[0], nav: { index: 0, draft: nav.draft } }
	}
	if (index >= history.length) {
		// Stepped past the newest entry: hand the stashed draft back.
		return { value: nav.draft, nav: { ...INITIAL_HISTORY_NAV } }
	}
	return { value: history[index], nav: { index, draft: nav.draft } }
}
