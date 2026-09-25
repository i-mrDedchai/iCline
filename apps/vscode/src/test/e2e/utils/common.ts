import { expect, type Locator, type Page } from "@playwright/test"

/**
 * Writes `text` into a VS Code workbench input (quick input, search box), ADDRESSED TO THAT
 * ELEMENT.
 *
 * Not `fill`. Playwright never writes text through the DOM: `injected.fill` only selects the
 * element and answers `needsinput` for every `<input type="text">` and `<textarea>`, and the
 * write that follows is `page.keyboard.insertText` → CDP `Input.insertText`, which inserts into
 * whichever element HOLDS FOCUS — not into the element the locator resolved to. That is invisible
 * while the two agree, and corrupting when they do not: the chat webview takes focus back on its
 * own (the composer re-focuses whenever its view regains focus), so a `fill` that loses that race
 * types the query into the chat's MESSAGE BOX instead. The interesting part is that it fails
 * silently — `Secondary Side Bar — the chat keeps working after the view is moved there` is the
 * one spec that asserts the composer's exact value, and it failed about half of its runs with
 * `"…survive the move>Move View"` sitting in the draft.
 *
 * The write below is the DOM half of Playwright's own keyboard `_insertText` (native `value`
 * setter, then a bubbling `InputEvent("input")`, which is what these widgets filter on), so no
 * focus is involved and the value cannot land anywhere else. The `toHaveValue` after it makes "the
 * text went somewhere else" fail at the step that caused it, instead of later on a row that was
 * never filtered in.
 */
export const typeIntoWorkbenchInput = async (input: Locator, text: string): Promise<void> => {
	await input.evaluate((element, value) => {
		const box = element as HTMLInputElement
		// The native setter rather than `box.value =`: a framework-managed input keeps its own
		// last-known value, and assigning through the property can leave it thinking nothing
		// changed — in which case it never fires the change our event is meant to carry.
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
		if (setter) {
			setter.call(box, value)
		} else {
			box.value = value
		}
		box.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: false, data: value, inputType: "insertText" }))
		box.dispatchEvent(new Event("change", { bubbles: true }))
	}, text)
	await expect(input).toHaveValue(text)
}

export const openTab = async (_page: Page, tabName: string) => {
	await _page
		.getByRole("tab", { name: new RegExp(`${tabName}`) })
		.locator("a")
		.click()
}

export const addSelectedCodeToClineWebview = async (_page: Page) => {
	await _page.locator("div:nth-child(4) > span > span").first().click()
	await _page.getByRole("textbox", { name: "The editor is not accessible" }).press("ControlOrMeta+a")

	// Open Code Actions via keyboard for cross-platform reliability
	await _page.keyboard.press("ControlOrMeta+.")

	// Target the explicit action instead of pressing Enter on the first item.
	// The first item can vary by platform or diagnostics.
	const addToCline = _page.getByText(/Add to Cline/i)
	await addToCline.waitFor({ state: "visible" })
	// For whatever reason, we need to move the mouse to make the context menu item clickable
	await _page.mouse.move(10, 10)
	await _page.mouse.move(20, 10)
	await addToCline.click()
}

export const toggleNotifications = async (_page: Page) => {
	await _page.waitForLoadState("domcontentloaded")
	await _page.keyboard.press("ControlOrMeta+Shift+p")
	const editorSearchBar = _page.getByRole("textbox")
	if (!editorSearchBar.isVisible()) {
		await _page.keyboard.press("ControlOrMeta+Shift+p")
	}
	await editorSearchBar.click({ delay: 100 }) // Ensure focus
	await typeIntoWorkbenchInput(editorSearchBar, "> Toggle Do Not Disturb Mode")
	await _page.keyboard.press("Enter")
	return _page
}
