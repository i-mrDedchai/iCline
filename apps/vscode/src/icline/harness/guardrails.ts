import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import * as path from "node:path"

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
 * Content check for FULL-FILE writes (editor create, apply_patch Add File): the
 * call carries the file's complete content, so verification can compare reality
 * against exactly what the call reported writing. Only full-file writes get this
 * — partial writes (replace, insert, Update File hunks) have no complete expected
 * content, and guessing one would manufacture false failures.
 *
 * Line endings are normalized before hashing: the executors rewrite EOL per
 * platform (`normalizeNewFileLineEndings`), so raw bytes may differ from the
 * call's `new_text` in line endings alone while the content is exactly right.
 */
function hashNormalizedContent(content: string): string {
	return createHash("sha256").update(content.replace(/\r\n/g, "\n"), "utf8").digest("hex")
}

/**
 * Lightweight post-write verification: file exists and is non-empty when content
 * was expected, and — for full-file writes — its content matches exactly what the
 * call reported writing (see hashNormalizedContent).
 * Inspired by Fable-style epistemic checks — verify claims against filesystem reality.
 */
/**
 * Human-readable classification of a filesystem read failure during
 * post-write verification (UNC/ACL gap closure, dev.5 follow-up).
 *
 * Why a separate exported function: real UNC shares and real ACL denials
 * cannot be fabricated on the dev machine (no share, no restricted ACL to
 * test against), so the mapping from `errno` to an actionable message is
 * unit-tested directly with UNC-shaped paths — while `verifyWrittenFile`
 * itself stays a thin caller. The classifier never throws: an unrecognized
 * error shape still yields the generic message.
 *
 * - `ENOENT` / `ENOTDIR` → the file is missing (UNC target unreachable and
 *   local missing file share the same code — both mean "nothing to verify").
 * - `EACCES` / `EPERM` → permission denial (share/NTFS ACL) — actionable:
 *   the write may have landed for another identity but is unreadable here,
 *   so the message says so instead of reporting "missing".
 */
export function describeVerifyReadError(absolutePath: string, error: unknown): string {
	const msg = error instanceof Error ? error.message : String(error)
	const code = (error as { code?: unknown } | null)?.code
	if (code === "EACCES" || code === "EPERM") {
		return `Verification failed: permission denied reading ${absolutePath} (check share/ACL permissions: ${msg}).`
	}
	return `Verification failed: could not read ${absolutePath} (${msg}).`
}

export async function verifyWrittenFile(params: {
	absolutePath: string
	expectedMinBytes?: number
	/** Complete expected file content — only for full-file writes. */
	expectedContent?: string
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
		if (params.expectedContent !== undefined) {
			const actual = await fs.readFile(params.absolutePath, "utf8")
			const expectedHash = hashNormalizedContent(params.expectedContent)
			const actualHash = hashNormalizedContent(actual)
			if (expectedHash !== actualHash) {
				return {
					ok: false,
					message: `Verification failed: ${path.basename(params.absolutePath)} content does not match what the call reported writing (expected ${params.expectedContent.length} chars, hash ${expectedHash.slice(0, 12)}; found ${actual.length} chars, hash ${actualHash.slice(0, 12)}).`,
				}
			}
		}
		return { ok: true, message: `Verified write: ${path.basename(params.absolutePath)} (${stat.size} bytes).` }
	} catch (error) {
		return { ok: false, message: describeVerifyReadError(params.absolutePath, error) }
	}
}

/**
 * Provider display names for self-reporting (audit F1/C2). ONE table, used by both
 * the harness overlay and the `# Active Session` block (cline-session-factory) —
 * two hand-maintained copies of a name table is exactly how the two prompt sections
 * ended up telling the model different names for the same provider.
 */
export const PROVIDER_DISPLAY_NAMES: Readonly<Record<string, string>> = {
	cline: "Cline",
	bynara: "NaraRouter",
	openrouter: "OpenRouter",
	zenmux: "ZenMux",
	requesty: "Requesty",
	xai: "xAI",
	ollama: "Ollama",
	anthropic: "Anthropic",
}

/**
 * Display name for a provider id. Unknown providers fall back to the raw id —
 * the overlay says never invent a vendor or display name, and that starts here.
 */
export function getProviderDisplayName(providerId: string): string {
	return PROVIDER_DISPLAY_NAMES[providerId] ?? providerId
}

/** The overlay's self-report pairs, generated from PROVIDER_DISPLAY_NAMES. */
function formatProviderDisplayNamePairs(): string {
	return Object.entries(PROVIDER_DISPLAY_NAMES)
		.map(([id, name]) => `"${id}" → "${name}"`)
		.join(", ")
}

/** Harness overlay text — behavioral guardrails aligned with robust agent patterns. */
export function getIclineHarnessOverlay(): string {
	return `ICLINE HARNESS GUARDRAILS
- Identity: You are iCline (fork of Cline). When introducing yourself or referring to yourself, always say "iCline", never "Cline".
- Self-reporting setup: when asked which provider or model you run on, name the provider by its display name (${formatProviderDisplayNamePairs()}) and quote the model id exactly as configured — never invent a vendor or display name for a model.
- Verify before claiming: read files, run commands, and inspect outputs before stating something is done.
- Epistemic discipline: do not echo the user's factual claims (day, date, time, version, status) as if true. For temporal claims, check the \`Date:\` line in the \`<env>\` block of your system prompt first if your session provides one (it carries today's date); if you need the exact time — or your session has no \`<env>\` block — run a command such as \`date\`. If the user's claim conflicts with verified facts, correct politely — do not mirror it.
- Reply in the natural format the runtime supports; do not fabricate tool-call markup inside plain text — write tool arguments through the real tool interface only.
- On tool errors: acknowledge what failed, do not repeat the identical failing call; change strategy.
- On ambiguous requests: ask one focused clarifying question OR proceed with the safest minimal assumption and state it.
- On partial progress: summarize what changed, what remains, and the next concrete step.
- Prefer small, verifiable edits over large speculative rewrites.
- Writing files: a whole file of any realistic size fits in one file-editing call (\`editor\` or \`apply_patch\`, whichever your session provides) — do not split a normal file across calls, and do not shrink a file to fit a per-call budget. Only an implausibly large payload (millions of characters, which one response could not have produced) is rejected; that rejection then says exactly how to land the write in chunks.
- When context is tight: preserve task goal, recent decisions, and file paths touched.`
}

/** Rewrite upstream "You are Cline" identity strings for the iCline fork. */
export function applyIclineAgentIdentity(systemPrompt: string): string {
	return systemPrompt
		.replace(/\bYou are Cline\b/g, "You are iCline")
		.replace(/\bI'm Cline\b/g, "I'm iCline")
		.replace(/\bI am Cline\b/g, "I am iCline")
}
