// Evidence-trail tests for the iCline write-tool guardrails.
//
// The dev.6 phantom-write bug survived several rounds because the only witness was
// the chat transcript, and the guardrail REPLACED the executor's own message with its
// own. `recordToolTrace` is the sink that keeps the raw material (tool name, call id,
// resolved path, the tool's claim, the verifier verdict); it must never throw into a
// turn and must stay quiet in a shipped build unless the trace is explicitly enabled.
import { promises as fs } from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { flushToolTrace, isToolTraceEnabled, recordToolTrace, resolveToolTracePath } from "./tool-trace"

describe("tool trace", () => {
	let tmpDir: string
	let traceFile: string
	const original = {
		CLINE_DIR: process.env.CLINE_DIR,
		ICLINE_TOOL_TRACE: process.env.ICLINE_TOOL_TRACE,
		IS_DEV: process.env.IS_DEV,
	}

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "icline-trace-"))
		process.env.CLINE_DIR = tmpDir
		delete process.env.ICLINE_TOOL_TRACE
		delete process.env.IS_DEV
		traceFile = resolveToolTracePath()
	})

	afterEach(async () => {
		await flushToolTrace()
		restore("CLINE_DIR", original.CLINE_DIR)
		restore("ICLINE_TOOL_TRACE", original.ICLINE_TOOL_TRACE)
		restore("IS_DEV", original.IS_DEV)
		await fs.rm(tmpDir, { recursive: true, force: true })
	})

	function restore(key: keyof typeof original, value: string | undefined): void {
		if (value === undefined) {
			delete process.env[key]
		} else {
			process.env[key] = value
		}
	}

	async function readLines(): Promise<Array<Record<string, unknown>>> {
		await flushToolTrace()
		const content = await fs.readFile(traceFile, "utf8")
		return content
			.split("\n")
			.filter(Boolean)
			.map((line) => JSON.parse(line))
	}

	it("resolves the sink next to the SDK's own logs and honours CLINE_DIR", () => {
		expect(traceFile).toBe(path.join(tmpDir, "data", "logs", "icline-tool-trace.jsonl"))
	})

	it("stays quiet by default so a shipped build writes no routine traffic", async () => {
		expect(isToolTraceEnabled()).toBe(false)
		recordToolTrace({ event: "post-write-verified", toolName: "editor" })
		await expect(fs.access(traceFile)).rejects.toThrow()
	})

	it("records failure evidence even when the trace is disabled", async () => {
		recordToolTrace(
			{
				event: "post-write-verification-failed",
				toolName: "editor",
				toolCallId: "call-1",
				absolutePath: path.join(tmpDir, "missing.css"),
				verification: "Verification failed: could not read missing.css",
				toolClaim: "File created successfully at: missing.css",
				newTextChars: 7020,
			},
			{ force: true },
		)

		const [entry] = await readLines()
		expect(entry).toMatchObject({
			event: "post-write-verification-failed",
			toolName: "editor",
			toolCallId: "call-1",
			newTextChars: 7020,
			toolClaim: "File created successfully at: missing.css",
		})
		expect(typeof entry.ts).toBe("string")
	})

	it("records successful writes when the trace is explicitly enabled", async () => {
		process.env.ICLINE_TOOL_TRACE = "1"
		expect(isToolTraceEnabled()).toBe(true)
		recordToolTrace({ event: "post-write-verified", toolName: "editor", toolCallId: "call-2" })
		await expect(readLines()).resolves.toHaveLength(1)
	})

	it("writes one whole line per concurrent call so a trace stays parseable", async () => {
		const entries = Array.from({ length: 24 }, (_, index) =>
			recordToolTrace({ event: "post-write-verified", toolName: "editor", toolCallId: `call-${index}` }, { force: true }),
		)
		void entries
		const lines = await readLines()
		expect(lines).toHaveLength(24)
		expect(new Set(lines.map((line) => line.toolCallId)).size).toBe(24)
	})

	it("rotates the overflow into one .1 generation instead of destroying the evidence", async () => {
		// The overflow is usually the evidence trail of an interesting session;
		// truncating it (the pre-fix behavior) destroyed exactly what a later
		// diagnosis needs. One rotated generation is kept next to the live file.
		recordToolTrace(
			{ event: "post-write-verified", toolName: "editor", payload: "x".repeat(2 * 1024 * 1024 + 64) },
			{ force: true },
		)
		await flushToolTrace()
		expect((await fs.stat(traceFile)).size).toBeGreaterThan(2 * 1024 * 1024)

		recordToolTrace({ event: "post-write-verified", toolName: "editor", toolCallId: "after-cap" }, { force: true })
		const lines = await readLines()
		expect(lines).toHaveLength(1)
		expect(lines[0].toolCallId).toBe("after-cap")

		const rotated = await fs.readFile(`${traceFile}.1`, "utf8")
		expect(rotated).toContain('"payload":"x')
		expect(rotated.split("\n").filter(Boolean)).toHaveLength(1)
	})

	it("keeps only one rotated generation when the live file overflows again", async () => {
		recordToolTrace({ event: "e1", toolName: "editor", payload: "x".repeat(2 * 1024 * 1024 + 64) }, { force: true })
		recordToolTrace({ event: "e2", toolName: "editor", toolCallId: "second" }, { force: true })
		// Second overflow: the old .1 is replaced, never accumulated.
		recordToolTrace({ event: "e3", toolName: "editor", payload: "y".repeat(2 * 1024 * 1024 + 64) }, { force: true })
		recordToolTrace({ event: "e4", toolName: "editor", toolCallId: "third" }, { force: true })
		await flushToolTrace()

		const rotated = await fs.readFile(`${traceFile}.1`, "utf8")
		expect(rotated).toContain('"event":"e2"')
		expect(rotated).toContain('"event":"e3"')
		expect(rotated).not.toContain('"event":"e1"')
		const live = await readLines()
		expect(live).toHaveLength(1)
		expect(live[0].toolCallId).toBe("third")
	})

	it("records routine traffic only when the trace is explicitly enabled", async () => {
		// `IS_DEV=true` alone must NOT churn routine successes into the file —
		// they would rotate the real evidence out of the live file on every dev run.
		process.env.IS_DEV = "true"
		recordToolTrace({ event: "post-write-verified", toolName: "editor", toolCallId: "dev" }, { routine: true })
		await flushToolTrace()
		await expect(fs.access(traceFile)).rejects.toThrow()

		process.env.ICLINE_TOOL_TRACE = "1"
		recordToolTrace({ event: "post-write-verified", toolName: "editor", toolCallId: "explicit" }, { routine: true })
		const lines = await readLines()
		expect(lines).toHaveLength(1)
		expect(lines[0].toolCallId).toBe("explicit")
	})
})
