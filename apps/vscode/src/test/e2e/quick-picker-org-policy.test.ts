import { expect } from "@playwright/test"
import { E2E_ORG_POLICY_CLINE_ONLY, E2E_REMOTE_CONFIG_ORG_ID } from "./fixtures/server/api"
import { e2e } from "./utils/helpers"

/** Provider labels are user-visible text, so they go into a regex verbatim. */
function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * E2E guard for the organization provider policy on a REAL VS Code window.
 *
 * The policy is an enterprise control-plane answer: `remoteConfiguredProviders` (derived
 * from the config's `providerSettings`) is the allowlist, and the host's remote layer
 * outranks every local write. Settings filters blocked providers out of its dropdown, but
 * the Quick Picker lists every provider's models — so before the fix.16 guard, clicking a
 * blocked provider's model looked successful while the host silently kept the pinned
 * provider, and the chip snapped back on the next state push with no explanation.
 *
 * Everything here runs through the surfaces a user has:
 *   - the mock control plane publishes the policy (`/.test/setRemoteConfig`),
 *   - the account is moved into the organization through the Account view, which is the
 *     real `setUserOrganization` → `fetchRemoteConfig` path (it awaits the fetch, so the
 *     policy is applied before the call returns),
 *   - the picker is opened and a blocked provider's model is clicked.
 *
 * What it pins: every provider the policy does not allow carries the lock, a click on one
 * of its models is answered with the policy notice, and the active model does NOT change.
 */
e2e("Quick Picker — an organization policy blocks the providers it does not allow", async ({ helper, page, sidebar, server }) => {
	expect(server).not.toBeNull()
	await helper.signin(sidebar)

	// Publish the policy for the organization every mock user belongs to.
	server!.setRemoteConfig(E2E_ORG_POLICY_CLINE_ONLY)

	// Move the account into that organization. This is the deterministic trigger: the
	// gRPC handler awaits `fetchRemoteConfig`, so by the time the org badge is visible the
	// remote (highest precedence) layer is already in force.
	// VS Code hides the webview navbar (platform-configs.json), so the Account view is
	// opened through the extension's own view-title action — the button a user clicks,
	// firing `iCline.accountButtonClicked`.
	await page.locator('.action-label[aria-label="Account"]:visible').first().click({ delay: 30 })
	// `vscode-dropdown` is the toolkit's combobox (role=combobox + role=option children), not
	// a native <select>: open it, then pick the organization.
	// The options only exist as elements (the toolkit slots them into the shadow listbox
	// when open), so this selector is by attribute — `getByRole('option')` ignores them
	// while they are hidden.
	const orgOption = sidebar.locator(`vscode-option[value="${E2E_REMOTE_CONFIG_ORG_ID}"]`)
	await expect(orgOption).toHaveCount(1, { timeout: 20_000 })
	await expect(orgOption).toHaveText("Test Organization")
	await sidebar.locator("vscode-dropdown").first().click({ delay: 30 })
	await orgOption.click({ delay: 30 })
	// The org badge appears only after the host pushed state — which `setUserOrganization`
	// does after `fetchRemoteConfig` resolved, so this is "policy applied", not a timer.
	await expect(sidebar.getByTitle("Role")).toBeVisible({ timeout: 30_000 })
	// …and the policy is in force on the webview side too: remote config present ⇒ the
	// organization picker locks itself (AccountView isLockedByRemoteConfig).
	await expect(sidebar.locator("vscode-dropdown").first()).toHaveAttribute("aria-disabled", "true", {
		timeout: 20_000,
	})

	// Back to the chat view and open the picker.
	await sidebar.getByRole("button", { name: "Done" }).click({ delay: 30 })
	const trigger = sidebar.locator("[data-icline-model-trigger]")
	await expect(trigger).toBeVisible({ timeout: 10_000 })
	const activeModelBefore = (await trigger.innerText()).trim()
	await trigger.click({ delay: 30 })

	const picker = sidebar.locator("[data-icline-quick-picker]")
	await expect(picker).toBeVisible({ timeout: 10_000 })

	// The policy reaches the webview through a state push after the fetch; the lock icons
	// are the first thing it changes, so wait on them rather than on a fixed sleep.
	const locks = sidebar.locator("[data-icline-org-blocked]")
	await expect(locks.first()).toBeVisible({ timeout: 20_000 })

	// Every provider the allowlist does not name is locked — not just the first one.
	const providerIds = await sidebar
		.locator("[data-icline-provider]")
		.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-icline-provider") ?? ""))
	expect(providerIds.length).toBeGreaterThan(1)
	const blockedIds = providerIds.filter((id) => id.length > 0 && id !== "cline")
	expect(blockedIds.length).toBeGreaterThan(0)
	for (const id of blockedIds) {
		await expect(sidebar.locator(`[data-icline-org-blocked="${id}"]`)).toHaveCount(1)
	}
	// The allowed provider is not locked: the lock means "policy", not "every provider".
	await expect(sidebar.locator('[data-icline-org-blocked="cline"]')).toHaveCount(0)

	// A blocked provider's models are still listed (the picker never hides content — it
	// answers the click). Expand blocked providers until one really has rows, so the
	// click below is a click on a MODEL, not on an empty group.
	let targetProviderId: string | null = null
	for (const id of blockedIds) {
		await sidebar.locator(`[data-icline-provider="${id}"] button[aria-expanded]`).click({ delay: 30 })
		const rows = sidebar.locator(`[data-icline-provider="${id}"] [data-icline-model-row]`)
		try {
			await expect(rows.first()).toBeVisible({ timeout: 5_000 })
			targetProviderId = id
			break
		} catch {
			// Provider resolved no models in this environment — try the next blocked one.
		}
	}
	expect(
		targetProviderId,
		`no blocked provider listed models; blocked=${blockedIds.join(",")} (the policy premise)`,
	).not.toBeNull()

	const targetHeader = sidebar.locator(`[data-icline-provider="${targetProviderId}"] button[aria-expanded]`)
	const targetLabel = (await targetHeader.locator("span").first().innerText()).trim()
	const modelRow = sidebar.locator(`[data-icline-provider="${targetProviderId}"] [data-icline-model-row]`).first()
	const blockedModelId = await modelRow.getAttribute("data-icline-model-id")
	expect(blockedModelId).toBeTruthy()

	// Click the model. Commit happens on pointerdown, so Playwright's click exercises the
	// same path a user's press does.
	await modelRow.click({ delay: 30 })

	// The click is answered where it happened, and the picker stays open to be read.
	const notice = sidebar.locator("[data-icline-org-provider-block]")
	await expect(notice).toBeVisible({ timeout: 5_000 })
	await expect(picker).toBeVisible()
	// The notice names the provider (its display name, or the raw id when the listing
	// carries no legacy id for it).
	const noticeText = (await notice.innerText()).trim()
	expect(noticeText).toMatch(new RegExp(`${escapeRegExp(targetLabel)}|${escapeRegExp(targetProviderId as string)}`, "i"))

	// And the selection really did not change: the chip still names the same model.
	await expect(trigger).toHaveText(activeModelBefore)
})
