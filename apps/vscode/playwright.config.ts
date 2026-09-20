import { defineConfig } from "@playwright/test"

const isCI = !!process?.env?.CI
const isWindow = process?.platform?.startsWith("win")

/**
 * How many VS Code windows run at once.
 *
 * Every test drives a full Electron app, and the suite paid for that serially (15 tests,
 * ~4.5 min single-file). Splitting is safe now that each worker owns its own mock API
 * server (fixtures/server, port 0 + `CLINE_API_BASE_URL`) and each test opens a private
 * copy of the workspace fixtures — before that, workers collided on localhost:7777, on
 * os.tmpdir() cleanup and on the checked-in files the extension edits.
 *
 * 3 is deliberately modest for a local run: each worker is an Electron app with its own
 * extension host, and the suite is judged on wall clock, not on saturating the machine.
 * CI runners are shared 4-vCPU boxes, so they get 2. Override with E2E_WORKERS.
 */
const workers = Number(process.env.E2E_WORKERS) || (isCI ? 2 : 3)

export default defineConfig({
	workers,
	retries: 1,
	forbidOnly: isCI,
	testDir: "src/test/e2e",
	testMatch: /.*\.test\.ts/,
	timeout: isCI || isWindow ? 60000 : 20000,
	expect: {
		timeout: isCI || isWindow ? 5000 : 2000,
	},
	// Tests in the same FILE are spread across workers too, so one slow file cannot hold a
	// worker hostage. That is safe because nothing a test touches is shared with a test in
	// another worker: its own VS Code, its own workspace copy, its own mock server. Tests
	// inside one worker still run one after another, which is what keeps the mutations of a
	// worker's mock server (organization policy, balances) from overlapping in time.
	fullyParallel: true,
	reporter: isCI ? [["github"], ["list"]] : [["list"]],
	use: {
		video: "retain-on-failure",
	},
	projects: [
		{
			name: "setup test environment",
			testMatch: /global\.setup\.ts/,
		},
		{
			name: "e2e tests",
			dependencies: ["setup test environment"],
		},
	],
})
