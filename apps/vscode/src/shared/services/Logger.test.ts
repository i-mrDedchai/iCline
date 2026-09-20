import { beforeEach, describe, expect, it } from "bun:test"
import { Logger } from "./Logger"

/**
 * The compaction diagnostics only exist to be read in a packaged build, where
 * IS_DEV is unset. Before this guard they printed their title and dropped the
 * numbers, so a compaction storm could not be explained from the output
 * channel (dev.6 fix.21 smoke).
 */
const lines: string[] = []
Logger.subscribe((message: string) => lines.push(message))

describe("Logger payload visibility", () => {
	beforeEach(() => {
		lines.length = 0
		process.env.IS_DEV = "false"
		process.env.CLINE_LOG_PAYLOADS = "false"
	})

	it("always serializes the payload of a compaction diagnostic", () => {
		Logger.debug("Context compaction diagnostics", {
			requestInputTokens: 250_000,
			maxInputTokens: 1_048_576,
			shouldCompact: false,
		})

		expect(lines).toHaveLength(1)
		expect(lines[0]).toContain("Context compaction diagnostics")
		expect(lines[0]).toContain('"requestInputTokens":250000')
		expect(lines[0]).toContain('"shouldCompact":false')
	})

	it("keeps dropping the payload of ordinary chatty messages", () => {
		Logger.debug("Agent event", { type: "notice", reason: "auto_compaction" })

		expect(lines).toHaveLength(1)
		expect(lines[0]).toContain("Agent event")
		expect(lines[0]).not.toContain("auto_compaction")
	})

	it("serializes every payload when payload logging is opted in", () => {
		process.env.CLINE_LOG_PAYLOADS = "true"
		Logger.debug("Agent event", { type: "notice" })

		expect(lines[0]).toContain('"type":"notice"')
	})

	it("truncates an oversized payload instead of flooding the channel", () => {
		Logger.debug("Context compaction completed", { blob: "x".repeat(5_000) })

		expect(lines[0]).toContain("[truncated]")
		expect(lines[0].length).toBeLessThan(4_000)
	})
})
