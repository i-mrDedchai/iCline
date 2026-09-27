import { existsSync, readdirSync, readFileSync } from "node:fs"
import * as path from "node:path"
import { DatabaseSync } from "node:sqlite"
import { expect } from "@playwright/test"
import { E2E_MOCK_TEAM_RESPONSES } from "./fixtures/server/api"
import { e2e } from "./utils/helpers"

// The full multi-agent loop in a real VS Code window: the lead spawns two
// teammates (one parallel tool batch), dispatches both as async runs, and each
// teammate then makes its OWN model calls — writing a file and leaving a
// mailbox message in one parallel batch — while the other is still working.
// The lead collects the runs and records a shared outcome.
//
// Proven at the end, from state that outlives the chat:
// - both files landed on disk (the parallel writes were real)
// - the persisted team state carries both mailbox messages (alpha↔beta), the
//   outcome with its fragment, both members, and completed runs
//
// The mock server keys the lead's conversation on the "team_request" prompt and
// each teammate's on its run task text ("write-alpha"/"write-beta"), and turns
// are sequenced by counting tool-result messages. Single-root workspace only —
// the session cwd resolution multi-root adds is covered by file-edit.test.ts.
e2e.describe("Team parallel agents", () => {
	e2e(
		"two teammates write files in parallel and leave mailbox/outcome state",
		async ({ helper, page, sidebar, app, workspaceDir }) => {
			e2e.setTimeout(240_000)

			await helper.signin(sidebar)

			// Team writes govern every mutating call in this flow (spawns, runs,
			// mailbox posts, edits) — exactly the switch the auto-approve menu
			// exposes for multi-agent work. Reads stay on the Team reads default.
			await sidebar.getByLabel("Open auto-approve settings").click()
			await sidebar.getByText("Team writes", { exact: true }).click()

			// Turn on the Sub-agents and Agent Teams feature switches. VS Code hides the
			// webview navbar (platform-configs.json), so Settings opens through the
			// extension's view-title action — the button a user clicks, firing
			// `iCline.settingsButtonClicked` (same path as quick-picker-org-policy.test.ts).
			await page.locator('.action-label[aria-label="Settings"]:visible').first().click({ delay: 30 })
			await sidebar.getByTestId("tab-features").click()
			const agentFeatures = sidebar.locator("#agent-features")
			await agentFeatures.locator('[id="Sub-agents"]').click()
			await agentFeatures.locator('[id="Agent Teams"]').click()
			await expect(agentFeatures.locator('[id="Agent Teams"]')).toHaveAttribute("data-state", "checked")
			await sidebar.getByRole("button", { name: "Done" }).click()

			// Kick off the scripted team flow.
			const inputbox = sidebar.getByTestId("chat-input")
			await expect(inputbox).toBeVisible()
			await inputbox.fill("team_request")
			await sidebar.getByTestId("send-button").click({ delay: 50 })

			// The lead's turn-ending text arrives only after both runs were awaited
			// and the outcome was recorded.
			await expect(sidebar.getByText(E2E_MOCK_TEAM_RESPONSES.TEAM_COMPLETE)).toBeVisible({ timeout: 180_000 })

			// Both parallel writes landed.
			expect(readFileSync(path.join(workspaceDir, "alpha.txt"), "utf-8")).toContain("alpha was here")
			expect(readFileSync(path.join(workspaceDir, "beta.txt"), "utf-8")).toContain("beta was here")

			// The team store persists under this launch's isolated CLINE_DATA_DIR
			// (see utils/helpers.ts) — sqlite data/db/teams.db when node:sqlite is
			// available (createLocalTeamStore's first choice), state.json files under
			// data/teams otherwise. readPersistedTeamState follows that same order.
			const clineDataDir = await app.evaluate(() => process.env.CLINE_DATA_DIR)
			expect(clineDataDir).toBeTruthy()
			// Persisted state can trail the visible turn end by a write or two; the
			// outcome fragment is attached last, so waiting for it covers the rest.
			await expect
				.poll(() => readPersistedTeamState(clineDataDir as string)?.outcomeFragments.length ?? 0, { timeout: 15_000 })
				.toBeGreaterThan(0)
			const state = readPersistedTeamState(clineDataDir as string)
			expect(state).toBeTruthy()

			// Topology: both teammates are known members.
			const memberIds = state!.members.map((member) => member.agentId)
			expect(memberIds).toEqual(expect.arrayContaining(["alpha", "beta"]))

			// Mailbox: each writer reported to the other, across two agent threads.
			const subjects = state!.mailbox.map((message) => message.subject)
			expect(subjects).toContain("ALPHA_REPORT")
			expect(subjects).toContain("BETA_REPORT")

			// Outcomes: the shared outcome exists and carries the attached fragment.
			const titles = state!.outcomes.map((outcome) => outcome.title)
			expect(titles).toContain("E2E Outcome")
			expect(state!.outcomeFragments.length).toBeGreaterThan(0)

			// Both delegated runs finished instead of being dropped or left running.
			const runStates = state!.runs.map((run) => run.status)
			expect(runStates.filter((status) => status === "completed").length).toBeGreaterThanOrEqual(2)
		},
	)
})

/** The slice of persisted team state this test asserts on. */
interface PersistedTeamState {
	members: Array<{ agentId: string }>
	mailbox: Array<{ subject: string }>
	outcomes: Array<{ title: string }>
	outcomeFragments: unknown[]
	runs: Array<{ status: string }>
}

/**
 * Read the persisted team state the way the extension persists it: the sqlite
 * team store (`data/db/teams.db`, `createLocalTeamStore`'s first choice) when
 * node:sqlite is available, else the FileTeamStore envelope
 * (`data/teams/<team>/state.json`). Returns the oldest team's state.
 */
function readPersistedTeamState(clineDataDir: string): PersistedTeamState | undefined {
	const sqlitePath = path.join(clineDataDir, "db", "teams.db")
	if (existsSync(sqlitePath)) {
		const db = new DatabaseSync(sqlitePath)
		try {
			const row = db.prepare("SELECT state_json FROM team_runtime_snapshot ORDER BY team_name ASC LIMIT 1").get() as
				| { state_json?: string }
				| undefined
			return row?.state_json ? (JSON.parse(row.state_json) as PersistedTeamState) : undefined
		} finally {
			db.close()
		}
	}
	const teamsDir = path.join(clineDataDir, "teams")
	if (!existsSync(teamsDir)) {
		return undefined
	}
	const teamDirs = readdirSync(teamsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())
	const first = teamDirs[0]
	if (!first) {
		return undefined
	}
	const envelope = JSON.parse(readFileSync(path.join(teamsDir, first.name, "state.json"), "utf-8"))
	return envelope.teamState as PersistedTeamState
}
