import { expect } from "@playwright/test"
import { e2e } from "./utils/helpers"

// F4: the final-reply COMPLETED card must behave like official Cline —
// every finished turn keeps its header (F4b), and the header sits left
// beside its icon instead of split across the row (F4a).
//
// The mock API answers with turn-ending text and no tools, which is exactly
// the text-only-ending path the final-reply card owns.
e2e("Chat - final-reply COMPLETED headers persist across turns", async ({ helper, sidebar, widePane }) => {
	void widePane

	await helper.signin(sidebar)

	const inputbox = sidebar.getByTestId("chat-input")
	const sendButton = sidebar.getByTestId("send-button")
	const completedHeaders = sidebar.getByTestId("final-reply-completed")
	const mockReplies = sidebar.getByText("mock Cline API response")

	// Turn 1: one finished reply owns one header.
	await inputbox.fill("first final reply check")
	await sendButton.click()
	await expect(mockReplies).toHaveCount(1, { timeout: 20_000 })
	await expect(completedHeaders).toHaveCount(1, { timeout: 10_000 })

	// Turn 2: the first turn's header must survive the new turn (F4b).
	await inputbox.fill("second final reply check")
	await sendButton.click()
	await expect(mockReplies).toHaveCount(2, { timeout: 20_000 })
	await expect(completedHeaders).toHaveCount(2, { timeout: 10_000 })

	// F4a: in every header the icon sits left of the label, on the same line.
	for (let i = 0; i < 2; i++) {
		const iconLeftOfLabel = await completedHeaders.nth(i).evaluate((el) => {
			const icon = el.firstElementChild
			const label = el.lastElementChild
			if (!icon || !label || icon === label) {
				return false
			}
			const iconBox = icon.getBoundingClientRect()
			const labelBox = label.getBoundingClientRect()
			return iconBox.x + iconBox.width <= labelBox.x + 1 && Math.abs(iconBox.y - labelBox.y) <= 4
		})
		expect(iconLeftOfLabel).toBe(true)
	}
})
