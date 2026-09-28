import { expect } from "@playwright/test"
import { E2E_MOCK_OUTPUT_LIMIT_RESPONSES, E2E_OUTPUT_LIMIT_TRIGGER } from "./fixtures/server/api"
import { e2e } from "./utils/helpers"

// Regression for the output-limit continuation (fix.37/38) and its chat
// notice: a model that hits its output token limit mid-turn must not kill the
// run. The mock server's output-limit stub flow streams partial text and then
// finishes the FIRST completion with `finish_reason: "length"` — the exact wire
// shape of a model cut off by max_tokens — and answers the runtime's
// continuation nudge with the completed text. The real agent loop, model
// adapter and message pipeline all run in a real VS Code window.
e2e("Chat - output-limit truncation continues the turn with a visible notice", async ({ helper, sidebar, widePane }) => {
	void widePane

	// Sign in to the mock Cline backend
	await helper.signin(sidebar)

	// Submit the trigger prompt for the output-limit stub flow
	const inputbox = sidebar.getByTestId("chat-input")
	await expect(inputbox).toBeVisible()
	await inputbox.fill(`${E2E_OUTPUT_LIMIT_TRIGGER} write the answer`)
	await expect(inputbox).toHaveValue(`${E2E_OUTPUT_LIMIT_TRIGGER} write the answer`)
	await sidebar.getByTestId("send-button").click()
	await expect(inputbox).toHaveValue("")

	// The truncated partial text is what the user sees first — a turn cut
	// mid-sentence, not a tidy answer.
	await expect(sidebar.getByText(/OUTPUT_LIMIT_CUT_HERE/).first()).toBeVisible({ timeout: 20_000 })

	// Then the visible notice row for the cut-and-continued turn.
	await expect(sidebar.getByText(/turn truncated, continuing/).first()).toBeVisible({ timeout: 20_000 })

	// And the turn finishes with the continued answer instead of dying
	// with "Model reached the maximum output token limit before
	// completing the turn" (the pre-fix.37 failure mode).
	await expect(sidebar.getByText(E2E_MOCK_OUTPUT_LIMIT_RESPONSES.COMPLETE).first()).toBeVisible({
		timeout: 20_000,
	})
	await expect(sidebar.getByText(/Model reached the maximum output token limit/)).toHaveCount(0)
})
