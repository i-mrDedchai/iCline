import { expect } from "@playwright/test"
import { E2E_GATEWAY_CHAT_REPLY, getMockApiServerUrl } from "./fixtures/server"
import { E2E_GATEWAY_API_KEY, E2E_GATEWAY_MODEL_ID } from "./fixtures/server/api"
import { e2e } from "./utils/helpers"

/**
 * Regression guard for "Unknown or disabled provider": a user-created custom
 * provider was saved and selectable, yet its first chat message was rejected
 * because the chat gateway never registered that provider's manifest.
 *
 * The provider points at the mock OpenAI-compatible gateway, which answers
 * chat only with its own reply text. Seeing that text in the transcript proves
 * the custom provider produced the answer end to end, through the real host.
 */
e2e("Chat - a saved custom provider answers a message through its own endpoint", async ({ helper, sidebar, page }) => {
	const providerId = "e2e-gw-chat"
	const providerName = "E2E Gateway Chat"

	await helper.signin(sidebar)

	await sidebar.evaluate(() => window.dispatchEvent(new Event("icline:navigate-to-settings-model-picker")))
	const providerInput = sidebar.getByTestId("provider-selector-input")
	await expect(providerInput).toBeVisible({ timeout: 10_000 })
	await expect(sidebar.getByTestId("custom-provider-manager")).toBeVisible({ timeout: 10_000 })

	await sidebar.getByTestId("custom-provider-add").click({ delay: 40 })
	await sidebar.getByTestId("custom-provider-id").fill(providerId)
	await sidebar.getByTestId("custom-provider-name").fill(providerName)
	await sidebar.getByTestId("custom-provider-base-url").fill(`${getMockApiServerUrl()}/e2e-gateway/v1`)
	await sidebar.getByTestId("custom-provider-api-key").fill(E2E_GATEWAY_API_KEY)
	await sidebar.getByTestId("custom-provider-models").fill(E2E_GATEWAY_MODEL_ID)
	await sidebar.getByTestId("custom-provider-save").click({ delay: 40 })
	await expect(sidebar.getByTestId(`custom-provider-row-${providerId}`)).toBeVisible({ timeout: 15_000 })

	await providerInput.click({ delay: 50 })
	await page.keyboard.type(providerName, { delay: 40 })
	await sidebar.getByTestId(`provider-option-${providerId}`).click({ delay: 50 })
	await expect(providerInput).toHaveAttribute("current-value", new RegExp(providerName, "i"), { timeout: 10_000 })
	await page.keyboard.press("Escape")
	await sidebar.getByRole("button", { name: "Done" }).click({ delay: 30 })

	const inputbox = sidebar.getByTestId("chat-input")
	await expect(inputbox).toBeVisible({ timeout: 15_000 })
	await inputbox.fill("say hello through the custom provider")
	await sidebar.getByTestId("send-button").click()

	await expect(sidebar.getByText(E2E_GATEWAY_CHAT_REPLY)).toBeVisible({ timeout: 30_000 })
	await expect(sidebar.getByTestId("final-reply-completed").first()).toBeVisible({ timeout: 10_000 })
})
