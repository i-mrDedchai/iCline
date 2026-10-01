/**
 * inputHistoryStorage — what the user already sent, kept OUTSIDE the webview.
 *
 * Sibling of `composerDraftStorage` and follows it on purpose: the composer is one
 * composer, so the history is one slot, not one per task. Up-recall must offer
 * yesterday's wording after VS Code disposes the webview (secondary side bar move,
 * hide/re-show, window reload), and the React tree holding it is gone by then.
 *
 * Entries are plain trimmed strings, newest last, capped so a marathon session
 * cannot crowd the storage quota everything else in the extension shares. A history
 * that cannot be parsed is a history that is gone — recall then starts empty
 * instead of throwing.
 */

/** How many sent messages survive a webview replacement. */
export const MAX_INPUT_HISTORY_ENTRIES = 50

const HISTORY_STORAGE_KEY = "icline-composer-input-history"

function read(key: string): string | null {
	try {
		return localStorage.getItem(key)
	} catch {
		// Same stance as the draft store: history is a convenience, and a composer
		// that types fine but recalls nothing beats one that throws.
		return null
	}
}

function write(key: string, value: string): void {
	try {
		localStorage.setItem(key, value)
	} catch {
		// Quota exceeded, storage unavailable — see `read`.
	}
}

function remove(key: string): void {
	try {
		localStorage.removeItem(key)
	} catch {
		// See `read`.
	}
}

/** What Up-recall should offer when the composer mounts; empty when nothing usable was stored. */
export function readInputHistory(): string[] {
	const raw = read(HISTORY_STORAGE_KEY)
	if (!raw) {
		return []
	}
	try {
		const parsed: unknown = JSON.parse(raw)
		if (!Array.isArray(parsed)) {
			return []
		}
		const entries = parsed.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
		return entries.slice(-MAX_INPUT_HISTORY_ENTRIES)
	} catch {
		return []
	}
}

/** Persist the history. An empty history clears the stored slot. */
export function writeInputHistory(history: readonly string[]): void {
	if (history.length === 0) {
		remove(HISTORY_STORAGE_KEY)
		return
	}
	write(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(-MAX_INPUT_HISTORY_ENTRIES)))
}

/** Forget the history — used by tests to start from a clean slot. */
export function clearInputHistory(): void {
	remove(HISTORY_STORAGE_KEY)
}
