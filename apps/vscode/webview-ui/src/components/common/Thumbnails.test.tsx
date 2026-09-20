/**
 * Attachment thumbnails come in two sizes: the transcript's default chip (UserMessage /
 * TaskHeader) and the composer's larger one (maintainer request, 2026-09-20: "the preview
 * is a bit small — make it bigger"). Everything the chip draws is derived from that one
 * number, so these guards exist to catch the parts drifting apart: a `size` prop that
 * grows the image but leaves a 13px remove badge behind would swallow the picture.
 */
import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import Thumbnails from "./Thumbnails"

vi.mock("@/services/grpc-client", () => ({
	FileServiceClient: {
		openFile: vi.fn(async () => undefined),
		openImage: vi.fn(async () => undefined),
	},
}))

const IMAGE = "data:image/png;base64,iVBORw0KGgo="

const imageChip = (container: HTMLElement) => container.querySelector("img") as HTMLImageElement

describe("Thumbnails", () => {
	it("keeps the transcript's 34px chip when the caller does not ask for a size", () => {
		const { container } = render(<Thumbnails files={[]} images={[IMAGE]} />)

		const img = imageChip(container)
		expect(img.style.width).toBe("34px")
		expect(img.style.height).toBe("34px")
	})

	it("renders the composer's larger chip and scales the badge and the file glyphs with it", () => {
		// `setImages` is what makes the chip deletable — the badge only exists for a
		// caller that can remove the attachment, and only while the chip is hovered.
		const { container } = render(
			<Thumbnails files={["/tmp/notes.md"]} images={[IMAGE]} setImages={() => undefined} size={44} />,
		)

		const img = imageChip(container)
		expect(img.style.width).toBe("44px")
		expect(img.style.height).toBe("44px")

		// The remove badge is hover-only, and sized from the same number as the image.
		// `mouseOver`, not `mouseEnter`: React emulates enter/leave from the bubbling
		// over/out pair, so a synthetic non-bubbling `mouseenter` would never reach it.
		fireEvent.mouseOver(img.parentElement as HTMLElement)
		const badge = container.querySelector('[data-icline-thumbnail-remove="image"]') as HTMLElement
		expect(badge).not.toBeNull()
		expect(badge.style.width).toBe("17px")
		expect(badge.style.height).toBe("17px")

		// The file chip carries the same chip size, with a readable label for it.
		const fileLabel = container.querySelector("[title]") as HTMLElement
		expect(fileLabel.style.fontSize).toBe("9px")
	})
})
