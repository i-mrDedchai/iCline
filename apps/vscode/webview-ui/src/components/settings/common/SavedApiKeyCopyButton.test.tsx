import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SavedApiKeyCopyButton } from "./SavedApiKeyCopyButton"

// `useTranslation` reads the locale from `ExtensionStateContext`, which this spec never
// provides; the locale tables themselves are pinned by `src/i18n/i18n.test.ts`.
vi.mock("@/i18n/useTranslation", () => ({
	useTranslation: () => (key: string) => key,
}))

describe("SavedApiKeyCopyButton", () => {
	it("asks the host to copy the saved key and acknowledges it", async () => {
		const onCopy = vi.fn(async () => {})
		render(<SavedApiKeyCopyButton onCopy={onCopy} providerName="LiteLLM" testId="litellm-copy" />)

		const button = screen.getByTestId("litellm-copy")
		expect(button).toHaveAttribute("aria-label", "apiKeyCopyLabel")
		fireEvent.click(button)

		await waitFor(() => expect(onCopy).toHaveBeenCalledTimes(1))
		// The tick is the only visible change: the field keeps showing its mask.
		await waitFor(() => expect(button).toHaveAttribute("title", "apiKeyCopiedLabel"))
	})

	it("reports a failed copy in the console instead of claiming success", async () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
		const onCopy = vi.fn(async () => {
			throw new Error("No saved API key")
		})
		render(<SavedApiKeyCopyButton onCopy={onCopy} providerName="OpenRouter" />)

		const button = screen.getByRole("button")
		fireEvent.click(button)

		await waitFor(() =>
			expect(consoleError).toHaveBeenCalledWith(
				expect.stringContaining("Failed to copy OpenRouter API key"),
				expect.any(Error),
			),
		)
		expect(button).toHaveAttribute("title", "apiKeyCopyLabel")
		consoleError.mockRestore()
	})
})
