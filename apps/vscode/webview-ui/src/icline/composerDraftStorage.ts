/**
 * composerDraftStorage — what the user typed but has not sent yet, kept OUTSIDE the webview.
 *
 * The composer is one composer: moving the iCline view to the secondary side bar (or hiding and
 * re-showing it) makes VS Code dispose the webview and build a fresh one, and everything the
 * React tree held — the half-written message, the attached images — used to go with it. The
 * draft is therefore written to `localStorage` as it is typed and read back when the composer
 * mounts again, which is what makes the text survive the move.
 *
 * One slot, not one per task, matching the composer it belongs to: the input is not cleared
 * when the user switches tasks today, so a per-task draft would model state the app does not
 * have.
 *
 * Text and attachments are separate keys on purpose — the text is rewritten on every keystroke,
 * and re-serializing megabytes of base64 images that did not change along with it would put a
 * `JSON.stringify` of the whole draft on the typing path.
 *
 * Images are data URLs and a few large screenshots can approach the webview's `localStorage`
 * quota, which everything else in the extension shares. Attachments are therefore capped:
 * images that do not fit are left out (the message text and file paths still survive, and the
 * drop is reported once in the webview console) rather than letting the whole write throw.
 *
 * `quickStartPromptStorage.ts` is the sibling module this follows — same guarded `localStorage`
 * access, same "read what you need, write what changed" shape.
 */

/** The composer text, rewritten on every keystroke. */
const TEXT_STORAGE_KEY = "icline-composer-draft-text"
/** The attachments, rewritten only when the attachment list changes. */
const ATTACHMENTS_STORAGE_KEY = "icline-composer-draft-attachments"

/**
 * How much of the attachment list is worth keeping: roughly a fifth of a typical 5MB
 * `localStorage` quota, leaving room for the other iCline keys. A data-URL screenshot is usually
 * a few hundred KB, so the ceiling still accommodates several of them.
 */
export const MAX_ATTACHMENT_PAYLOAD_CHARS = 1_000_000

export type ComposerDraft = {
	text: string
	images: string[]
	files: string[]
}

export const EMPTY_COMPOSER_DRAFT: ComposerDraft = { text: "", images: [], files: [] }

/** Only once per session: this is a "you lost something" notice, not a per-keystroke one. */
let warnedAboutDroppedImages = false

function read(key: string): string | null {
	try {
		return localStorage.getItem(key)
	} catch {
		// Private mode, a blocked origin, a disabled storage API: the draft is a convenience, so a
		// composer that types fine but does not survive a move beats a composer that throws.
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

/**
 * The images a write would keep: as many as fit under {@link MAX_ATTACHMENT_PAYLOAD_CHARS}, in
 * the order they were attached, so a draft that lost images lost the oldest ones.
 */
export function imagesWithinDraftBudget(images: string[]): string[] {
	const kept: string[] = []
	let used = 0
	for (const image of images) {
		if (used + image.length > MAX_ATTACHMENT_PAYLOAD_CHARS) {
			break
		}
		kept.push(image)
		used += image.length
	}
	return kept
}

/** What the composer should come up holding; empty when nothing usable was stored. */
export function readComposerDraft(): ComposerDraft {
	const text = read(TEXT_STORAGE_KEY) ?? ""
	const rawAttachments = read(ATTACHMENTS_STORAGE_KEY)
	if (!rawAttachments) {
		return { ...EMPTY_COMPOSER_DRAFT, text }
	}
	try {
		const parsed = JSON.parse(rawAttachments) as Partial<ComposerDraft>
		return {
			text,
			images: Array.isArray(parsed.images) ? parsed.images.filter((image) => typeof image === "string") : [],
			files: Array.isArray(parsed.files) ? parsed.files.filter((file) => typeof file === "string") : [],
		}
	} catch {
		// A draft that cannot be parsed is a draft that is gone; the text key is a separate write.
		return { ...EMPTY_COMPOSER_DRAFT, text }
	}
}

/** Persist the composer text. An empty composer clears the stored text. */
export function writeComposerDraftText(text: string): void {
	if (text) {
		write(TEXT_STORAGE_KEY, text)
	} else {
		remove(TEXT_STORAGE_KEY)
	}
}

/** Persist the composer's attachments under the same cap, clearing them when there are none. */
export function writeComposerDraftAttachments(images: string[], files: string[]): void {
	const kept = imagesWithinDraftBudget(images)

	if (kept.length < images.length && !warnedAboutDroppedImages) {
		warnedAboutDroppedImages = true
		console.warn(
			`[iCline] Composer draft: ${images.length - kept.length} attached image(s) are too large to survive a view move. The draft keeps the message text and file paths.`,
		)
	}

	if (kept.length === 0 && files.length === 0) {
		remove(ATTACHMENTS_STORAGE_KEY)
		return
	}
	write(ATTACHMENTS_STORAGE_KEY, JSON.stringify({ images: kept, files }))
}

/** Forget the draft — used when the composer is deliberately emptied. */
export function clearComposerDraft(): void {
	remove(TEXT_STORAGE_KEY)
	remove(ATTACHMENTS_STORAGE_KEY)
}
