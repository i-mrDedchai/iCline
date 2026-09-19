import { promises as fs } from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

/**
 * Best-effort JSONL evidence trail for the iCline write-tool guardrails.
 *
 * The phantom-write bug (editor reports success, the file never lands) was hard to
 * diagnose because the only witness was the transcript, and the guardrail REPLACED
 * the tool's real message with its own error. This sink keeps the raw material —
 * tool name, call id, resolved path, the tool's own claim, the verifier verdict —
 * next to the SDK's own logs so the next occurrence is diagnosable after the fact.
 *
 * Guardrail failures are always recorded; routine successes are recorded only when
 * the trace is explicitly enabled, so a shipped build stays quiet by default. The
 * file is capped and every failure is swallowed: tracing must never affect a turn.
 */

export interface IclineToolTraceEntry {
	event: string
	toolName: string
	toolCallId?: string
	[key: string]: unknown
}

const MAX_TRACE_BYTES = 2 * 1024 * 1024
const TRACE_FILE_NAME = "icline-tool-trace.jsonl"

export function isToolTraceEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
	return env.ICLINE_TOOL_TRACE === "1" || env.IS_DEV === "true"
}

/** Mirrors the SDK's data dir layout, honouring a custom CLINE_DIR when set. */
export function resolveToolTracePath(env: NodeJS.ProcessEnv = process.env): string {
	const clineDir = env.CLINE_DIR?.trim() || path.join(os.homedir(), ".cline")
	return path.join(clineDir, "data", "logs", TRACE_FILE_NAME)
}

// Appends are chained so concurrent tool calls never interleave a partial line.
let writeChain: Promise<void> = Promise.resolve()

export function recordToolTrace(entry: IclineToolTraceEntry, options: { force?: boolean } = {}): void {
	if (!options.force && !isToolTraceEnabled()) {
		return
	}
	writeChain = writeChain.then(async () => {
		try {
			const file = resolveToolTracePath()
			await fs.mkdir(path.dirname(file), { recursive: true })
			try {
				const stat = await fs.stat(file)
				if (stat.size > MAX_TRACE_BYTES) {
					await fs.rm(file)
				}
			} catch {
				// Missing file is the normal first-write case.
			}
			await fs.appendFile(file, `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`, "utf8")
		} catch {
			// Tracing is diagnostic only — never surface a failure into the agent loop.
		}
	})
}

/** Test seam: awaits all queued trace writes. */
export async function flushToolTrace(): Promise<void> {
	await writeChain
}
