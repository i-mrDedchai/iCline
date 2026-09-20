import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import {
	clearComposerDraft,
	readComposerDraft,
	writeComposerDraftAttachments,
	writeComposerDraftText,
} from "@/icline/composerDraftStorage"
import { useChatState } from "./useChatState"

/**
 * The bug these cover: VS Code disposes the webview when the iCline view is moved to the
 * secondary side bar and resolves a fresh one, so an unsent message used to be lost with the
 * React tree. A replacement webview is a second `useChatState` mount on the same storage.
 */
describe("useChatState — the composer draft", () => {
	beforeEach(() => {
		clearComposerDraft()
	})

	const typeInto = (state: ReturnType<typeof useChatState>, text: string) => act(() => state.setInputValue(text))

	it("starts empty when there is nothing stored", () => {
		const { result } = renderHook(() => useChatState([]))

		expect(result.current.inputValue).toBe("")
		expect(result.current.selectedImages).toEqual([])
		expect(result.current.selectedFiles).toEqual([])
	})

	it("brings back what was typed before the webview was replaced", () => {
		const first = renderHook(() => useChatState([]))
		typeInto(first.result.current, "half written message")
		first.unmount()

		const replacement = renderHook(() => useChatState([]))

		expect(replacement.result.current.inputValue).toBe("half written message")
	})

	it("brings the attachments and the file paths back too", () => {
		const first = renderHook(() => useChatState([]))
		act(() => {
			first.result.current.setSelectedImages(["data:image/png;base64,AAAA"])
			first.result.current.setSelectedFiles(["/tmp/notes.md"])
		})
		first.unmount()

		const replacement = renderHook(() => useChatState([]))

		expect(replacement.result.current.selectedImages).toEqual(["data:image/png;base64,AAAA"])
		expect(replacement.result.current.selectedFiles).toEqual(["/tmp/notes.md"])
	})

	it("starts from a stored draft it finds on the way in", () => {
		// What the storage module guarantees before the composer ever mounts.
		writeComposerDraftText("typed in the sidebar")
		writeComposerDraftAttachments(["data:image/png;base64,AAAA"], [])

		const { result } = renderHook(() => useChatState([]))

		expect(result.current.inputValue).toBe("typed in the sidebar")
		expect(result.current.selectedImages).toEqual(["data:image/png;base64,AAAA"])
	})

	it("forgets the draft once the message has been sent", () => {
		const { result } = renderHook(() => useChatState([]))
		typeInto(result.current, "this one gets sent")
		act(() => {
			result.current.setSelectedImages(["data:image/png;base64,AAAA"])
		})

		// What `handleSendMessage` does to the composer when the message goes out.
		act(() => {
			result.current.setInputValue("")
			result.current.setSelectedImages([])
			result.current.setSelectedFiles([])
		})

		expect(readComposerDraft()).toEqual({ text: "", images: [], files: [] })

		// The replacement webview opens on an empty composer, not on the sent message.
		const replacement = renderHook(() => useChatState([]))
		expect(replacement.result.current.inputValue).toBe("")
	})

	it("follows the composer when a send fails and the text comes back", () => {
		const { result } = renderHook(() => useChatState([]))
		typeInto(result.current, "typed")
		act(() => result.current.setInputValue(""))

		// `restorePendingMessageState` puts the message back after a failed send.
		typeInto(result.current, "typed")

		expect(readComposerDraft().text).toBe("typed")
	})
})
