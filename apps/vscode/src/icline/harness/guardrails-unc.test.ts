import * as fsSync from "node:fs"
import * as fs from "node:fs/promises"
import { afterAll, describe, expect, it } from "vitest"
import { verifyWrittenFile } from "./guardrails"

/**
 * Real-UNC verification (closes test gap #5 for UNC paths).
 *
 * Needs a live SMB share — by default `\\localhost\iClineUncTest` (see
 * `docs/icline/harness-guardrails-notes.md` for the one-command setup).
 * Without the share every test here SKIPS instead of failing, so the suite
 * stays green on machines with no share (CI, fresh checkouts) while proving
 * the real path wherever the share exists. Override the share with
 * `ICLINE_UNC_TEST_SHARE`.
 *
 * What this proves beyond the classifier unit tests in `guardrails.test.ts`:
 * `verifyWrittenFile` stats/reads through an actual UNC redirector — path
 * handling, `stat.isFile()`, and the content hash all work on `\\server\…`
 * paths, not just on local drive letters.
 */
const SHARE = process.env.ICLINE_UNC_TEST_SHARE ?? String.raw`\\localhost\iClineUncTest`

function shareAvailable(): boolean {
	try {
		fsSync.statSync(SHARE)
		return true
	} catch {
		return false
	}
}

const RUN = `icline-unc-${Date.now().toString(36)}`

describe.runIf(shareAvailable())("verifyWrittenFile over a real UNC share", () => {
	const dir = `${SHARE}\\${RUN}`

	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true })
	})

	it("verifies a full-file write with content hash through UNC", async () => {
		await fs.mkdir(dir, { recursive: true })
		const target = `${dir}\\write.ts`
		await fs.writeFile(target, "const x = 1;\n")
		const result = await verifyWrittenFile({ absolutePath: target, expectedMinBytes: 1, expectedContent: "const x = 1;\n" })
		expect(result.ok).toBe(true)
	})

	it("tolerates CRLF on disk against LF expectation through UNC", async () => {
		await fs.mkdir(dir, { recursive: true })
		const target = `${dir}\\eol.ts`
		await fs.writeFile(target, "a\r\nb\r\n")
		const result = await verifyWrittenFile({ absolutePath: target, expectedContent: "a\nb\n" })
		expect(result.ok).toBe(true)
	})

	it("reports a missing file on the share as unreadable, not as a crash", async () => {
		const result = await verifyWrittenFile({ absolutePath: `${dir}\\definitely-missing.ts` })
		expect(result.ok).toBe(false)
		expect(result.message).toContain("could not read")
	})
})
