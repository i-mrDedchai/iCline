import * as fs from "node:fs"
import * as path from "node:path"
import { expect } from "@playwright/test"
import { E2E_WORKSPACE_TYPES, e2e } from "./utils/helpers"

/**
 * E2E repro for the dev.6-fix.7 class of bug, on a REAL VS Code window.
 *
 * The mock server streams a structured `editor` tool call whose new_text is
 * 7020 characters — above the runtime's 6000-char per-call input limit. The
 * real tool rejects it BEFORE touching disk by RETURNING a failure envelope
 * (`{ success: false, error: "Editor input too large …" }`) instead of
 * throwing, so the agent runtime never sets `isError` on its own.
 *
 * The iCline post-write guardrail (hooks-adapter.ts) must turn that envelope
 * into a real error carrying the executor's own message. This test pins the
 * full pipeline the maintainer smokes by hand:
 *
 *   1. the oversized call is REJECTED — nothing lands on disk;
 *   2. the transcript shows the executor's real message
 *      ("Editor input too large …") — NOT a phantom ENOENT / "Verification
 *      failed" that hides the cause;
 *   3. the follow-up request the runtime sends back to the (mock) model
 *      carries that message as a role:"tool" result, i.e. the model actually
 *      learns about the rejection;
 *   4. the turn ends with the model's completion text, and the user-visible
 *      error surface never shows an ENOENT.
 *
 * Unit-level coverage of the guardrail lives in
 * src/sdk/tool-write-pipeline.test.ts; the real-core half is
 * bun run repro:editor-write. This file proves the composition end-to-end.
 */
e2e.describe("Oversized editor write — real failure reaches the transcript", () => {
	E2E_WORKSPACE_TYPES.forEach(({ title, workspaceType }) => {
		e2e.extend({
			workspaceType,
		})(title, async ({ helper, sidebar, workspaceDir }) => {
			// The mock oversized tool call targets "oversized-repro.txt" relative
			// to the session cwd (the first workspace folder). If the guardrail
			// regresses, the executor would claim success and this file would
			// appear on disk with 7020 chars — the exact bug being pinned.
			const targetPath = path.join(workspaceDir, "oversized-repro.txt")

			try {
				await helper.signin(sidebar)

				const inputbox = sidebar.getByTestId("chat-input")
				await expect(inputbox).toBeVisible()
				await inputbox.fill("oversized_request")
				await sidebar.getByTestId("send-button").click({ delay: 50 })

				// The tool row appears for the oversized editor call (auto-approved
				// by default, same flow as file-edit.test.ts).
				await sidebar.waitForSelector('span:has-text("wants to create a new file:")')
				await expect(sidebar.getByText("oversized-repro.txt").first()).toBeVisible()

				// 1) The rejection must leave the filesystem untouched.
				//    (Poll: the guardrail runs in the extension host after the
				//    tool executes; a regression would CREATE the file.)
				await expect
					.poll(() => fs.existsSync(targetPath), {
						timeout: 20_000,
						message: "oversized-repro.txt must never be created — the oversized call is rejected before disk",
					})
					.toBe(false)

				// 2) The turn-ending text proves the model received the rejection
				//    and moved on (the runtime only streams OVERSIZED_REQUEST_COMPLETE
				//    on the follow-up request AFTER the tool result came back).
				await expect(sidebar.getByText("The editor call was rejected")).toBeVisible({ timeout: 30_000 })

				// 3) The user-visible error surface must show the executor's real
				//    message — never a phantom ENOENT or a bare "Verification failed".
				const errorText = sidebar.getByText(/Editor input too large/).first()
				await expect(errorText).toBeVisible()
				const rendered = await errorText.innerText()
				expect(rendered).not.toContain("ENOENT")
				expect(rendered).toContain("7020")
				expect(rendered).toContain("Write it in chunks")
				const bodyText = await sidebar.locator("body").innerText()
				expect(bodyText).not.toContain("Verification failed: could not read")
				expect(bodyText).not.toContain("ENOENT")

				// 4) Double-check the disk after the turn fully ended.
				expect(fs.existsSync(targetPath)).toBe(false)
			} finally {
				// The rejection must not leave anything behind; a regression would.
				await fs.promises.rm(targetPath, { force: true })
			}
		})
	})
})
