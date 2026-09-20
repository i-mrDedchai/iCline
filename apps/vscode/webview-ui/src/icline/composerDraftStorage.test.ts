import { beforeEach, describe, expect, it, vi } from "vitest"
import {
	clearComposerDraft,
	imagesWithinDraftBudget,
	MAX_ATTACHMENT_PAYLOAD_CHARS,
	readComposerDraft,
	writeComposerDraftAttachments,
	writeComposerDraftText,
} from "./composerDraftStorage"

describe("composerDraftStorage", () => {
	beforeEach(() => {
		localStorage.clear()
		vi.restoreAllMocks()
	})

	it("comes up empty when nothing was stored", () => {
		expect(readComposerDraft()).toEqual({ text: "", images: [], files: [] })
	})

	it("round-trips a half-written message", () => {
		writeComposerDraftText("half written task")
		writeComposerDraftAttachments(["data:image/png;base64,AAAA"], ["/tmp/notes.md"])

		expect(readComposerDraft()).toEqual({
			text: "half written task",
			images: ["data:image/png;base64,AAAA"],
			files: ["/tmp/notes.md"],
		})
	})

	it("clears the text when the composer is emptied", () => {
		writeComposerDraftText("half written task")
		writeComposerDraftText("")

		expect(readComposerDraft().text).toBe("")
	})

	it("clears the attachments when they are removed", () => {
		writeComposerDraftAttachments(["data:image/png;base64,AAAA"], [])
		writeComposerDraftAttachments([], [])

		expect(readComposerDraft().images).toEqual([])
		expect(readComposerDraft().files).toEqual([])
	})

	it("keeps the text when the stored attachments are unreadable", () => {
		writeComposerDraftText("still here")
		localStorage.setItem("icline-composer-draft-attachments", "{not json")

		expect(readComposerDraft()).toEqual({ text: "still here", images: [], files: [] })
	})

	it("keeps the text when the stored attachments are the wrong shape", () => {
		writeComposerDraftText("still here")
		localStorage.setItem("icline-composer-draft-attachments", JSON.stringify({ images: "nope", files: [7, "ok.md"] }))

		expect(readComposerDraft()).toEqual({ text: "still here", images: [], files: ["ok.md"] })
	})

	it("clears both halves on demand", () => {
		writeComposerDraftText("half written task")
		writeComposerDraftAttachments(["data:image/png;base64,AAAA"], ["/tmp/notes.md"])

		clearComposerDraft()

		expect(readComposerDraft()).toEqual({ text: "", images: [], files: [] })
	})

	it("drops the images that do not fit, oldest first, and says so once", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
		const image = (size: number) => "x".repeat(size)
		const fits = Math.floor(MAX_ATTACHMENT_PAYLOAD_CHARS / 400_000)

		writeComposerDraftText("text survives")
		writeComposerDraftAttachments([image(400_000), image(400_000), image(400_000), image(400_000)], ["/tmp/notes.md"])

		const draft = readComposerDraft()
		expect(draft.text).toBe("text survives")
		expect(draft.images).toHaveLength(fits)
		expect(draft.files).toEqual(["/tmp/notes.md"])
		expect(warn).toHaveBeenCalledTimes(1)

		// A second oversized write does not repeat the notice.
		writeComposerDraftAttachments([image(MAX_ATTACHMENT_PAYLOAD_CHARS + 1)], [])
		expect(warn).toHaveBeenCalledTimes(1)
	})

	it("keeps an image that is exactly the budget", () => {
		expect(imagesWithinDraftBudget(["x".repeat(MAX_ATTACHMENT_PAYLOAD_CHARS)])).toHaveLength(1)
		expect(imagesWithinDraftBudget(["x".repeat(MAX_ATTACHMENT_PAYLOAD_CHARS + 1)])).toHaveLength(0)
	})

	it("survives a storage API that refuses to work", () => {
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("QuotaExceededError")
		})
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked")
		})

		expect(() => writeComposerDraftText("typed anyway")).not.toThrow()
		expect(() => writeComposerDraftAttachments(["data:image/png;base64,AAAA"], [])).not.toThrow()
		expect(readComposerDraft()).toEqual({ text: "", images: [], files: [] })
	})
})
