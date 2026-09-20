import * as fs from "node:fs/promises"
import * as path from "node:path"

/** Categories for harness mistake tracking (Fable-inspired: precise failure modes). */
export type HarnessMistakeCategory = "format" | "logic" | "loop" | "stall" | "verification"

export interface HarnessMistakeState {
	format: number
	logic: number
	loop: number
	stall: number
	verification: number
}

export function createHarnessMistakeState(): HarnessMistakeState {
	return { format: 0, logic: 0, loop: 0, stall: 0, verification: 0 }
}

export function incrementHarnessMistake(state: HarnessMistakeState, category: HarnessMistakeCategory): number {
	state[category] += 1
	return totalHarnessMistakes(state)
}

export function resetHarnessMistakeCategory(state: HarnessMistakeState, category: HarnessMistakeCategory): void {
	state[category] = 0
}

export function totalHarnessMistakes(state: HarnessMistakeState): number {
	return state.format + state.logic + state.loop + state.stall + state.verification
}

/** Clamp auto-compact threshold to avoid accidental early compaction (known Cline footgun). */
export function normalizeCompactionThreshold(raw?: number): number {
	if (raw === undefined || Number.isNaN(raw)) {
		return 0.75
	}
	if (raw < 0.5) {
		return 0.5
	}
	if (raw > 0.95) {
		return 0.95
	}
	return raw
}

/**
 * Per-call input limit of the runtime's `editor` tool. Mirrors `EDITOR_INPUT_CHAR_LIMIT`
 * (@cline/core `extensions/tools/schemas.ts`), which the fork layer cannot import as a
 * value: vitest aliases `@cline/core` to a stub (`src/test/cline-core-vitest-stub.ts`).
 * The upstream tool rejects a larger `new_text` before anything reaches disk, so this
 * mirror exists only to describe the rejection — `src/sdk/tool-write-pipeline.test.ts`
 * pins the number and `scripts/repro-editor-write.ts` verifies the real boundary against
 * the real tool.
 *
 * Raised 6000 → 32000 in dev.6-fix.23: 6000 is below one ordinary source file, so
 * whole-file writes were rejected and re-sent in chunks (extra round trips each time).
 */
export const EDITOR_INPUT_CHAR_LIMIT = 32000

/**
 * The recipe for writing a file that does not fit in a single tool call. Shared by
 * the harness overlay (prevention) and the post-write guardrail (recovery) so both
 * surfaces tell the model the same thing.
 */
export function getLargeWriteGuidance(): string {
	return `Write it in chunks: create the file with a first chunk of at most ${EDITOR_INPUT_CHAR_LIMIT} characters of new_text, then append the remaining chunks with \`insert_line\` (line_count + 1 appends at EOF). Do not re-send the oversized call unchanged.`
}

export interface PostWriteVerificationResult {
	ok: boolean
	message: string
}

/**
 * Lightweight post-write verification: file exists and is non-empty when content was expected.
 * Inspired by Fable-style epistemic checks — verify claims against filesystem reality.
 */
export async function verifyWrittenFile(params: {
	absolutePath: string
	expectedMinBytes?: number
}): Promise<PostWriteVerificationResult> {
	try {
		const stat = await fs.stat(params.absolutePath)
		if (!stat.isFile()) {
			return { ok: false, message: `Verification failed: ${params.absolutePath} is not a file after write.` }
		}
		const minBytes = params.expectedMinBytes ?? 1
		if (stat.size < minBytes) {
			return {
				ok: false,
				message: `Verification failed: ${path.basename(params.absolutePath)} is empty or too small (${stat.size} bytes).`,
			}
		}
		return { ok: true, message: `Verified write: ${path.basename(params.absolutePath)} (${stat.size} bytes).` }
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error)
		return { ok: false, message: `Verification failed: could not read ${params.absolutePath} (${msg}).` }
	}
}

/** Harness overlay text — behavioral guardrails aligned with robust agent patterns. */
export function getIclineHarnessOverlay(): string {
	return `ICLINE HARNESS GUARDRAILS
- Identity: You are iCline (fork of Cline). When introducing yourself or referring to yourself, always say "iCline", never "Cline".
- Verify before claiming: read files, run commands, and inspect outputs before stating something is done.
- Epistemic discipline: do not echo the user's factual claims (day, date, time, version, status) as if true. For temporal claims, check \`# Current Time\` in environment_details first; run a command only if that is insufficient. If the user's claim conflicts with verified facts, correct politely — do not mirror it.
- Reply in the natural format the runtime supports; do not fabricate tool-call markup inside plain text — write tool arguments through the real tool interface only.
- On tool errors: acknowledge what failed, do not repeat the identical failing call; change strategy.
- On ambiguous requests: ask one focused clarifying question OR proceed with the safest minimal assumption and state it.
- On partial progress: summarize what changed, what remains, and the next concrete step.
- Prefer small, verifiable edits over large speculative rewrites.
- Writing files: a whole file fits in one \`editor\` call (up to ~${EDITOR_INPUT_CHAR_LIMIT} characters of new_text) — do not split a normal file across calls. Only above that size is the call rejected, and then: ${getLargeWriteGuidance()}
- When context is tight: preserve task goal, recent decisions, and file paths touched.`
}

/** Rewrite upstream "You are Cline" identity strings for the iCline fork. */
export function applyIclineAgentIdentity(systemPrompt: string): string {
	return systemPrompt
		.replace(/\bYou are Cline\b/g, "You are iCline")
		.replace(/\bI'm Cline\b/g, "I'm iCline")
		.replace(/\bI am Cline\b/g, "I am iCline")
}
