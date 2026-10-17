import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CopyButton, WithCopyButton } from "./CopyButton"

// `useTranslation` reads the locale from `ExtensionStateContext`, which this spec never
// provides; the locale tables themselves are pinned by `src/i18n/i18n.test.ts`.
vi.mock("@/i18n/useTranslation", () => ({
	useTranslation: () => (key: string) => key,
}))

const writeText = vi.fn(async () => {})

beforeEach(() => {
	writeText.mockClear()
	Object.assign(navigator, { clipboard: { writeText } })
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe("CopyButton", () => {
	it("is a real button named by the translator, not a hardcoded word", () => {
		render(<CopyButton textToCopy="hello" />)

		const button = screen.getByRole("button")
		expect(button).toHaveAttribute("aria-label", "copyLabel")
		expect(button).toHaveAttribute("type", "button")
	})

	it("announces the copy through a live region, not only through the tick", async () => {
		render(<CopyButton textToCopy="hello" />)

		const button = screen.getByRole("button")
		expect(screen.getByRole("status")).toHaveTextContent("")

		fireEvent.click(button)

		await waitFor(() => expect(writeText).toHaveBeenCalledWith("hello"))
		// The confirmation is the accessible feedback; the icon swap is aria-hidden.
		await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("copiedLabel"))
		expect(button).toHaveAttribute("title", "copiedLabel")
	})

	it("keeps an explicit name when the surrounding context needs one", () => {
		render(<CopyButton ariaLabel="copyCodeLabel" textToCopy="const a = 1" />)

		expect(screen.getByRole("button")).toHaveAttribute("aria-label", "copyCodeLabel")
	})

	it("stays reachable by keyboard: the wrapped control is revealed on focus", () => {
		render(
			<WithCopyButton textToCopy="code">
				<pre>code</pre>
			</WithCopyButton>,
		)

		const wrapper = screen.getByRole("button").parentElement
		// A control that only appears on hover is still tabbable; focus has to reveal it too.
		expect(wrapper?.className).toContain("group-focus-within:opacity-100")
	})
})
