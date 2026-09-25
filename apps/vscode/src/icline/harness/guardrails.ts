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
 * Hard per-call ceiling of the runtime's `editor` tool. Mirrors `EDITOR_INPUT_CHAR_LIMIT`
 * (@cline/core `extensions/tools/schemas.ts`), which the fork layer cannot import as a
 * value: vitest aliases `@cline/core` to a stub (`src/test/cline-core-vitest-stub.ts`).
 * The upstream tool rejects a larger `new_text` before anything reaches disk, so this
 * mirror exists only to describe the rejection — `src/sdk/tool-write-pipeline.test.ts`
 * pins the number and `scripts/repro-editor-write.ts` verifies the real boundary against
 * the real tool.
 *
 * Raised 32000 → 2000000: 32k still refused files real chats produce (the fix.29 smoke
 * refused a 40,243-character write), so the refusal now only catches payloads one
 * response could not have produced. Ordinary writes land whole in one call, and the
 * executor writes them atomically (temp file + rename) so a failure at any point leaves
 * the target untouched.
 */
export const EDITOR_INPUT_CHAR_LIMIT = 2000000

/**
 * Chunk size the recovery recipe recommends when a write really is above the ceiling.
 * Mirrors `EDITOR_CHUNK_CHAR_LIMIT` — guidance only, never enforced, and deliberately
 * kept out of the harness overlay (a number in the prompt is a number models shrink to).
 */
export const EDITOR_CHUNK_CHAR_LIMIT = 32000

/**
 * The recipe for writing a file that does not fit in a single tool call. Used by the
 * post-write guardrail's recovery text; the harness overlay deliberately teaches no
 * size number (models latch onto a number in the prompt and start shrinking or
 * splitting files to fit it), only that a rejection carries this recipe.
 */
export function getLargeWriteGuidance(): string {
	return `Write it in chunks: create the file with a first chunk of at most ${EDITOR_CHUNK_CHAR_LIMIT} characters of new_text, then append the remaining chunks with \`insert_line\` (line_count + 1 appends at EOF). Do not re-send the oversized call unchanged.`
}

/**
 * Whether a failure message already carries the chunk recipe (a first chunk plus
 * `insert_line` appends). The guardrail appends its own guidance only when the
 * message lacks it — and it must key on the RECIPE, not on the words "per-call
 * limit": a message can name the limit and still never say how to re-send (the
 * preview mirror's "nothing will be written" does exactly that), and suppressing
 * the recipe on those words would hand the model a rejection with no way out.
 * This matches both wordings in play (core `getEditorSizeError` and
 * `getLargeWriteGuidance` above).
 */
export function hasChunkRecipe(message: string): boolean {
	return message.includes("first chunk") && message.includes("insert_line")
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
- Writing files: a whole file of any realistic size fits in one \`editor\` call — do not split a normal file across calls, and do not shrink a file to fit a per-call budget. Only an implausibly large payload (millions of characters, which one response could not have produced) is rejected; that rejection then says exactly how to land the write in chunks.
- When context is tight: preserve task goal, recent decisions, and file paths touched.`
}

/** Rewrite upstream "You are Cline" identity strings for the iCline fork. */
export function applyIclineAgentIdentity(systemPrompt: string): string {
	return systemPrompt
		.replace(/\bYou are Cline\b/g, "You are iCline")
		.replace(/\bI'm Cline\b/g, "I'm iCline")
		.replace(/\bI am Cline\b/g, "I am iCline")
}
