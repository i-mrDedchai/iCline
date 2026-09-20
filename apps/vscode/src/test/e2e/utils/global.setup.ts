import { rmSync } from "node:fs"
import { test as setup } from "@playwright/test"
import { downloadAndUnzipVSCode, SilentReporter } from "@vscode/test-electron"
import { E2ETestHelper } from "./helpers"

setup("setup test environment", async () => {
	// Warm the VS Code download BEFORE any worker asks for it. Each worker resolves the same
	// cache directory, and on a cold cache they would extract the archive concurrently.
	// (The `channel` fixture can still ask for insiders; that one downloads in the worker.)
	await downloadAndUnzipVSCode("stable", undefined, new SilentReporter())

	try {
		const path = E2ETestHelper.getResultsDir()
		const options = { recursive: true, force: true }

		const maxAttempts = 2

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				rmSync(path, options)
				return
			} catch (error) {
				if (attempt === maxAttempts) {
					throw new Error(`Failed to rmSync ${path} after ${maxAttempts} attempts: ${error}`)
				}
				console.error(`Failed to rmSync ${path} after ${attempt} attempts: ${error}`)
				await new Promise((resolve) => setTimeout(resolve, 50 * attempt)) // Progressive delay
			}
		}
	} catch (error) {
		console.error(`Error during setup: ${error}`)
	}
})
