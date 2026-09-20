import { expect } from "@playwright/test"
import { e2e } from "./utils/helpers"

// `widePane` is a request, not an assertion: VS Code's default sidebar is ~300px, where the
// composer row overlaps itself and the model chip's truncated name sits over the Plan/Act
// switch, so `planButton.click()` was intercepted on every run. Widen the pane to the width
// the composer is laid out for before the body starts (see utils/pane.ts).
e2e("Chat - can send messages and switch between modes", async ({ helper, sidebar, widePane }) => {
	void widePane

	// Sign in
	await helper.signin(sidebar)

	// Submit a message
	const inputbox = sidebar.getByTestId("chat-input")
	await expect(inputbox).toBeVisible()
	await inputbox.fill("Hello, Cline!")
	await expect(inputbox).toHaveValue("Hello, Cline!")
	await sidebar.getByTestId("send-button").click()
	await expect(inputbox).toHaveValue("")

	// Wait for the (mock) agent turn to finish before navigating away — the task
	// is persisted to SDK session history when the turn completes, so clicking
	// "New Task" mid-turn races the history write and "Recent" may not show.
	await expect(sidebar.getByText("mock Cline API response")).toBeVisible()

	// Starting a new task should clear the current chat view and show the recent tasks
	// Clicked-and-verified with a retry: the chat header re-renders when the mock turn lands, so a
	// single click can be swallowed by the re-render that replaces the button under the pointer.
	await expect(async () => {
		await sidebar.getByRole("button", { name: "New Task", exact: true }).first().click({ timeout: 5_000 })
		await expect(sidebar.getByText(/recent/i).first()).toBeVisible({ timeout: 1_500 })
	}).toPass({ timeout: 20_000 })
	await expect(sidebar.getByText("Hello, Cline!")).toBeVisible()

	// Makes sure the act and plan switches are working correctly
	// Aria-checked state should be true for Act and false for Plan
	const actButton = sidebar.getByRole("switch", { name: "Act" })
	const planButton = sidebar.getByRole("switch", { name: "Plan" })

	// Act button should be active. It doesn't have c
	await expect(actButton).toHaveAttribute("aria-checked", "true")
	await expect(planButton).not.toHaveAttribute("aria-checked", "true")

	await planButton.click()
	await expect(planButton).toHaveAttribute("aria-checked", "true")
	await expect(actButton).not.toHaveAttribute("aria-checked", "true")

	// === slash commands preserve following text ===
	await expect(inputbox).toHaveValue("")
	// Type partial slash command to trigger menu
	await inputbox.fill("/newt")

	// Wait for menu to be visible and click on menu item. Addressed as the ARIA option it is —
	// a bare text match can land on the menu's screen-reader announcement instead of the row.
	await inputbox.focus()
	await sidebar
		.getByTestId("slash-commands-menu")
		.getByRole("option", { name: /newtask/i })
		.click()
	await expect(inputbox).toHaveValue("/newtask ")

	// Add following text to verify it works correctly
	await inputbox.pressSequentially("following text should be preserved")
	await expect(inputbox).toHaveValue("/newtask following text should be preserved")

	// === @ mentions preserve following text ===
	await inputbox.fill("")
	await expect(inputbox).toHaveValue("")

	// Type partial @ mention to trigger menu
	await inputbox.fill("@prob")

	// Wait for menu to be visible and click on menu item (same ARIA-option reasoning as above:
	// "Problems" also exists as a screen-reader announcement, "Problems, 2 of 2").
	// `selected: true` picks the row the menu itself has highlighted — the suggestions list
	// carries two Problems rows, and only that one inserts the mention.
	await sidebar
		.getByRole("listbox", { name: "Context mentions" })
		.getByRole("option", { name: "Problems", selected: true })
		.click()
	await expect(inputbox).toHaveValue("@problems ")

	// Add following text to verify it works correctly
	await inputbox.pressSequentially("following text should be preserved")
	await expect(inputbox).toHaveValue("@problems following text should be preserved")
})
