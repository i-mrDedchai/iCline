import { expect } from "@playwright/test"
import { e2e } from "./utils/helpers"

/**
 * E2E guard for the interface language (fix.45).
 *
 * Preferred Language had only ever reached the model: choosing Thai changed how the
 * agent talked and left every string in the window in English. Unit tests can prove
 * the tables and the resolver, but not the thing a user actually reported — that the
 * setting does not change what they see. So this drives the real control in a real
 * VS Code window and reads the real screen:
 *
 *   Thai    → the General tab's copy is Thai
 *   English → back to English
 *   Turkish → English, because we can name that language but have no copy for it
 *
 * The third case is the one worth pinning hardest: an untranslated language must
 * degrade to the English source rather than render blanks or raw keys, and that is
 * the behaviour that decides whether adding a translation later is safe.
 */
const GENERAL_TAB = "tab-general"
const LANGUAGE_SELECT = "vscode-dropdown#preferred-language-dropdown"

const THAI_LABEL = "ภาษาที่ต้องการ"
const THAI_HINT = "ภาษาที่ iCline ใช้ตอบกลับ และใช้แสดงผลหน้าจอนี้"
const ENGLISH_LABEL = "Preferred Language"
const ENGLISH_HINT = "The language Cline uses for its replies and for this interface."

e2e("Settings — the General tab follows the Preferred Language setting", async ({ helper, sidebar, page }) => {
	await helper.signin(sidebar)

	// Open Settings through the extension's view-title action rather than the
	// in-app navigate event the sibling specs use: the event leaves the pointer on
	// the activity bar, and the icon tooltip VS Code paints from there (`context-view`,
	// chrome outside the webview) then swallows every click on a Settings tab.
	await page.locator('.action-label[aria-label="Settings"]:visible').first().click({ delay: 30 })
	await sidebar.getByTestId(GENERAL_TAB).click()

	const languageSelect = sidebar.locator(LANGUAGE_SELECT).first()
	await expect(languageSelect).toBeVisible({ timeout: 10_000 })
	// English first, so the Thai assertions below cannot pass on a stale paint.
	await expect(sidebar.getByText(ENGLISH_LABEL, { exact: true })).toBeVisible({ timeout: 10_000 })

	/**
	 * `vscode-dropdown` is the toolkit's combobox (role=combobox + role=option children),
	 * not a native `<select>`: it mirrors its selection into `current-value` and has to be
	 * opened before its option can be clicked.
	 */
	const pickLanguage = async (display: string) => {
		await languageSelect.click({ delay: 50 })
		await languageSelect.locator(`vscode-option[value="${display}"]`).click({ delay: 50 })
	}

	// --- Thai: copy the interface, not just the agent's replies ---
	await pickLanguage("Thai - ไทย")
	await expect(sidebar.getByText(THAI_LABEL, { exact: true })).toBeVisible({ timeout: 10_000 })
	await expect(sidebar.getByText(THAI_HINT, { exact: true })).toBeVisible({ timeout: 10_000 })
	await expect(sidebar.getByText(ENGLISH_HINT, { exact: true })).toHaveCount(0)

	// --- English: back, with the hint that names both jobs of the setting ---
	await pickLanguage("English")
	await expect(sidebar.getByText(ENGLISH_HINT, { exact: true })).toBeVisible({ timeout: 10_000 })
	await expect(sidebar.getByText(THAI_LABEL, { exact: true })).toHaveCount(0)

	// --- A language we can name but have not translated degrades to English ---
	await pickLanguage("Turkish - Türkçe")
	await expect(sidebar.getByText(ENGLISH_LABEL, { exact: true })).toBeVisible({ timeout: 10_000 })
	await expect(sidebar.getByText(ENGLISH_HINT, { exact: true })).toBeVisible({ timeout: 10_000 })
})
