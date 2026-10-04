// Bridges Cline's file-based hook scripts into the SDK's runtime hooks.
//
// Runtime hooks use typed in-process lifecycle callbacks:
//   TaskStart        -> beforeRun
//   UserPromptSubmit -> beforeRun with the latest submitted user message
//   PreToolUse       -> beforeTool
//   PostToolUse      -> afterTool
//   TaskComplete     -> afterRun when completed
//   TaskCancel       -> afterRun when aborted
//
// Deferred hooks (NOT wired here): TaskResume, TaskError, SessionShutdown,
// PreCompact, Notification.

import * as fs from "node:fs/promises"
import * as path from "node:path"
import type {
	AgentAfterToolContext,
	AgentAfterToolResult,
	AgentBeforeToolContext,
	AgentBeforeToolResult,
	AgentHooks,
	AgentRunLifecycleContext,
	AgentStopControl,
} from "@cline/shared"
import type { ClineMessage } from "@shared/ExtensionMessage"
import { Logger } from "@shared/services/Logger"
import { HookFactory } from "@/core/hooks/hook-factory"
import { getHooksEnabledSafe } from "@/core/hooks/hooks-utils"
import type { StateManager } from "@/core/storage/StateManager"
import { HostProvider } from "@/hosts/host-provider"
import {
	applyIclineAgentIdentity,
	EDITOR_INPUT_CHAR_LIMIT,
	getIclineHarnessOverlay,
	getLargeWriteGuidance,
	hasChunkRecipe,
	verifyWrittenFile,
} from "@/icline/harness/guardrails"
import { recordToolTrace } from "@/icline/harness/tool-trace"
import { isIclineBuild } from "@/registry"

export type HookMessageEmitter = (message: ClineMessage) => void

function toStringRecord(input: unknown): Record<string, string> {
	if (input == null || typeof input !== "object" || Array.isArray(input)) {
		return {}
	}
	const result: Record<string, string> = {}
	for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
		result[key] = typeof value === "string" ? value : JSON.stringify(value)
	}
	return result
}

function mapStopControl(hookOutput: { cancel?: boolean; errorMessage?: string }): AgentStopControl | undefined {
	if (!hookOutput.cancel) {
		return undefined
	}
	return {
		stop: true,
		reason: hookOutput.errorMessage || undefined,
	}
}

function taskIdFromSnapshot(snapshot: AgentRunLifecycleContext["snapshot"]): string {
	return snapshot.conversationId ?? snapshot.runId ?? snapshot.agentId
}

function textFromMessageContent(content: readonly { type: string; text?: string }[]): string {
	return content
		.filter((part) => part.type === "text" && typeof part.text === "string")
		.map((part) => part.text)
		.join("")
}

function latestUserPrompt(ctx: AgentRunLifecycleContext): string {
	for (let index = ctx.snapshot.messages.length - 1; index >= 0; index -= 1) {
		const message = ctx.snapshot.messages[index]
		if (message?.role === "user") {
			return textFromMessageContent(message.content)
		}
	}
	return ""
}

function buildHookStatusMessage(opts: {
	hookName: string
	status: "running" | "completed" | "failed" | "cancelled"
	toolName?: string
	ts?: number
}): ClineMessage {
	return {
		ts: opts.ts ?? Date.now(),
		type: "say",
		say: "hook_status",
		text: JSON.stringify({
			hookName: opts.hookName,
			...(opts.toolName && { toolName: opts.toolName }),
			status: opts.status,
		}),
		partial: false,
	}
}

/**
 * @param sessionCwd The session's working directory — the SAME base the tool
 * executors resolve relative paths against. Post-write verification mirrors
 * that resolution exactly; without it the fallback is the first workspace root,
 * which can verify a different file than the one the executor wrote.
 */
export function buildAgentHooks(
	stateManager: StateManager,
	emitHookMessage?: HookMessageEmitter,
	sessionCwd?: string,
): AgentHooks {
	const hooksEnabled = () => getHooksEnabledSafe(stateManager.getGlobalSettingsKey("hooksEnabled"))
	// C3 loop/stall guard state — per hook instance (= per session).
	const toolStreak: ToolStreak = { key: "", count: 0 }

	return {
		async beforeRun(ctx: AgentRunLifecycleContext): Promise<AgentStopControl | undefined> {
			const taskStartControl = await runTaskStart(ctx, hooksEnabled, emitHookMessage)
			if (taskStartControl) {
				return taskStartControl
			}
			return runUserPromptSubmit(ctx, hooksEnabled, emitHookMessage)
		},

		async beforeTool(ctx: AgentBeforeToolContext): Promise<AgentBeforeToolResult | undefined> {
			// Build-level iCline guardrails (C1 subagent prompt, C3 loop streak) run
			// FIRST and independently of the user-configured hooks — they are part of
			// the build, not of user tooling, and must never be gated on hooksEnabled.
			const guardrail = runIclineBeforeToolGuardrails(ctx, toolStreak)
			const hookControl = await runPreToolUseHook(ctx, hooksEnabled, emitHookMessage)
			if (hookControl?.stop) {
				// A user hook veto outranks any rewrite — the call never executes.
				return hookControl
			}
			if (!guardrail) {
				return hookControl
			}
			return { ...guardrail, ...hookControl }
		},

		async afterTool(ctx: AgentAfterToolContext): Promise<AgentAfterToolResult | undefined> {
			// iCline harness guardrail: post-write verification. Runs independently of
			// the user-configured hooks (hooksEnabled) because it is a build-level
			// guardrail, mirroring the legacy WriteToFileToolHandler integration.
			// A failure replaces the tool result so the model sees the verification
			// error instead of a false success — but the user's PostToolUse hooks
			// still run and see the EFFECTIVE result: a guardrail interception must
			// not blind user tooling that logs every write.
			const guardrailResult = await runIclinePostWriteVerification(ctx, sessionCwd)
			const effective = guardrailResult?.result ?? ctx.result

			let runningTs: number | undefined
			try {
				if (hooksEnabled()) {
					const factory = new HookFactory()
					if (await factory.hasHook("PostToolUse")) {
						const toolName = ctx.toolCall.toolName
						const runningMsg = buildHookStatusMessage({ hookName: "PostToolUse", toolName, status: "running" })
						runningTs = runningMsg.ts
						emitHookMessage?.(runningMsg)

						const runner = await factory.create("PostToolUse")
						const result = await runner.run({
							taskId: taskIdFromSnapshot(ctx.snapshot),
							postToolUse: {
								toolName,
								parameters: toStringRecord(ctx.input),
								result: String(effective.output ?? ""),
								success: !effective.isError,
								executionTimeMs: ctx.durationMs,
							},
						})

						emitHookMessage?.(
							buildHookStatusMessage({
								hookName: "PostToolUse",
								toolName,
								status: result.cancel ? "cancelled" : "completed",
								ts: runningTs,
							}),
						)
					}
				}
			} catch (error) {
				emitHookMessage?.(
					buildHookStatusMessage({
						hookName: "PostToolUse",
						toolName: ctx.toolCall.toolName,
						status: "failed",
						ts: runningTs,
					}),
				)
				Logger.error("[HooksAdapter] afterTool hook failed:", error)
			}
			return guardrailResult
		},

		async afterRun(ctx): Promise<void> {
			let hookName: "TaskComplete" | "TaskCancel" | undefined
			let runningTs: number | undefined
			try {
				if (!hooksEnabled()) {
					return
				}

				hookName =
					ctx.result.status === "completed"
						? "TaskComplete"
						: ctx.result.status === "aborted"
							? "TaskCancel"
							: undefined
				if (!hookName) {
					return
				}

				const factory = new HookFactory()
				if (!(await factory.hasHook(hookName))) {
					return
				}

				const taskId = taskIdFromSnapshot(ctx.snapshot)
				const runningMsg = buildHookStatusMessage({ hookName, status: "running" })
				runningTs = runningMsg.ts
				emitHookMessage?.(runningMsg)

				if (hookName === "TaskComplete") {
					const runner = await factory.create("TaskComplete")
					await runner.run({
						taskId,
						taskComplete: {
							taskMetadata: {
								taskId,
								ulid: "",
								initialTask: "",
								result: ctx.result.outputText,
							},
						},
					})
				} else {
					const runner = await factory.create("TaskCancel")
					await runner.run({
						taskId,
						taskCancel: {
							taskMetadata: {
								taskId,
								ulid: "",
								initialTask: "",
								completionStatus: "cancelled",
							},
						},
					})
				}

				emitHookMessage?.(buildHookStatusMessage({ hookName, status: "completed", ts: runningTs }))
			} catch (error) {
				emitHookMessage?.(
					buildHookStatusMessage({ hookName: hookName ?? "TaskComplete", status: "failed", ts: runningTs }),
				)
				Logger.error("[HooksAdapter] afterRun hook failed:", error)
			}
		},
	}
}

async function runPreToolUseHook(
	ctx: AgentBeforeToolContext,
	hooksEnabled: () => boolean,
	emitHookMessage?: HookMessageEmitter,
): Promise<AgentStopControl | undefined> {
	let runningTs: number | undefined
	try {
		if (!hooksEnabled()) {
			return undefined
		}

		const factory = new HookFactory()
		if (!(await factory.hasHook("PreToolUse"))) {
			return undefined
		}

		const toolName = ctx.toolCall.toolName
		const runningMsg = buildHookStatusMessage({ hookName: "PreToolUse", toolName, status: "running" })
		runningTs = runningMsg.ts
		emitHookMessage?.(runningMsg)

		const runner = await factory.create("PreToolUse")
		const result = await runner.run({
			taskId: taskIdFromSnapshot(ctx.snapshot),
			preToolUse: {
				toolName,
				parameters: toStringRecord(ctx.input),
			},
		})

		emitHookMessage?.(
			buildHookStatusMessage({
				hookName: "PreToolUse",
				toolName,
				status: result.cancel ? "cancelled" : "completed",
				ts: runningTs,
			}),
		)
		return mapStopControl(result)
	} catch (error) {
		emitHookMessage?.(
			buildHookStatusMessage({
				hookName: "PreToolUse",
				toolName: ctx.toolCall.toolName,
				status: "failed",
				ts: runningTs,
			}),
		)
		Logger.error("[HooksAdapter] beforeTool hook failed:", error)
		return undefined
	}
}

async function runTaskStart(
	ctx: AgentRunLifecycleContext,
	hooksEnabled: () => boolean,
	emitHookMessage?: HookMessageEmitter,
): Promise<AgentStopControl | undefined> {
	let runningTs: number | undefined
	try {
		if (!hooksEnabled()) {
			return undefined
		}

		const factory = new HookFactory()
		if (!(await factory.hasHook("TaskStart"))) {
			return undefined
		}

		const runningMsg = buildHookStatusMessage({ hookName: "TaskStart", status: "running" })
		runningTs = runningMsg.ts
		emitHookMessage?.(runningMsg)

		const taskId = taskIdFromSnapshot(ctx.snapshot)
		const runner = await factory.create("TaskStart")
		const result = await runner.run({
			taskId,
			taskStart: {
				taskMetadata: {
					taskId,
					ulid: "",
					initialTask: latestUserPrompt(ctx),
				},
			},
		})

		emitHookMessage?.(
			buildHookStatusMessage({
				hookName: "TaskStart",
				status: result.cancel ? "cancelled" : "completed",
				ts: runningTs,
			}),
		)
		return mapStopControl(result)
	} catch (error) {
		emitHookMessage?.(buildHookStatusMessage({ hookName: "TaskStart", status: "failed", ts: runningTs }))
		Logger.error("[HooksAdapter] beforeRun (TaskStart) hook failed:", error)
		return undefined
	}
}

async function runUserPromptSubmit(
	ctx: AgentRunLifecycleContext,
	hooksEnabled: () => boolean,
	emitHookMessage?: HookMessageEmitter,
): Promise<AgentStopControl | undefined> {
	let runningTs: number | undefined
	try {
		if (!hooksEnabled()) {
			return undefined
		}

		const factory = new HookFactory()
		if (!(await factory.hasHook("UserPromptSubmit"))) {
			return undefined
		}

		const runningMsg = buildHookStatusMessage({ hookName: "UserPromptSubmit", status: "running" })
		runningTs = runningMsg.ts
		emitHookMessage?.(runningMsg)

		const runner = await factory.create("UserPromptSubmit")
		const result = await runner.run({
			taskId: taskIdFromSnapshot(ctx.snapshot),
			userPromptSubmit: {
				prompt: latestUserPrompt(ctx),
				attachments: [],
			},
		})

		emitHookMessage?.(
			buildHookStatusMessage({
				hookName: "UserPromptSubmit",
				status: result.cancel ? "cancelled" : "completed",
				ts: runningTs,
			}),
		)
		return mapStopControl(result)
	} catch (error) {
		emitHookMessage?.(buildHookStatusMessage({ hookName: "UserPromptSubmit", status: "failed", ts: runningTs }))
		Logger.error("[HooksAdapter] beforeRun (UserPromptSubmit) hook failed:", error)
		return undefined
	}
}

// ---------------------------------------------------------------------------
// iCline harness guardrails: subagent prompt (C1) + loop/stall guard (C3)
// ---------------------------------------------------------------------------

interface ToolStreak {
	key: string
	count: number
}

/** C3: identical tool+args streak length that triggers the loop warning. */
const TOOL_STREAK_LIMIT = 3

/**
 * C1: subagent prompts are model-authored (`spawn_agent.input.systemPrompt`) and
 * reach the delegated agent verbatim — `buildSubAgentSystemPrompt` wraps prompts
 * only for provider "cline", so iCline subagents would otherwise run without the
 * harness overlay and with any upstream "You are Cline" identity intact. The
 * session hooks and extension rules flow to delegated agents already; the gap is
 * THIS prompt, which replaces the system prompt the main session gets. Rewrite it
 * at the call site instead: identity first, then the same overlay rules.
 */
function rewriteSpawnAgentPrompt(toolName: string, input: unknown): unknown | undefined {
	if (toolName !== "spawn_agent") {
		return undefined
	}
	const record = (input ?? {}) as Record<string, unknown>
	if (typeof record.systemPrompt !== "string" || record.systemPrompt.length === 0) {
		return undefined
	}
	const systemPrompt = `${applyIclineAgentIdentity(record.systemPrompt.trim())}\n\n${getIclineHarnessOverlay()}`
	return { ...record, systemPrompt }
}

/**
 * C3: runtime loop/stall guard. A streak of identical tool calls (same tool,
 * same arguments) is the classic loop signature — the dev.6 smoke showed a model
 * re-sending the identical failing call round after round. Warn once the streak
 * crosses TOOL_STREAK_LIMIT (and every multiple after) instead of letting it spin
 * silently. The warning is soft (`appendContext`, non-blocking): deliberate
 * repetition (polling) is legal — it must only make the loop VISIBLE.
 */
function noteToolStreak(streak: ToolStreak, ctx: AgentBeforeToolContext): string | undefined {
	let key: string
	try {
		key = `${ctx.toolCall.toolName}\u0000${JSON.stringify(ctx.input ?? {})}`
	} catch {
		return undefined
	}
	if (streak.key === key) {
		streak.count += 1
	} else {
		streak.key = key
		streak.count = 1
	}
	if (streak.count < TOOL_STREAK_LIMIT || streak.count % TOOL_STREAK_LIMIT !== 0) {
		return undefined
	}
	recordToolTrace(
		{
			event: "tool-loop-warning",
			toolName: ctx.toolCall.toolName,
			toolCallId: ctx.toolCall.toolCallId,
			repeatCount: streak.count,
		},
		{ force: true },
	)
	return `The exact same tool call (same tool, same arguments) has now run ${streak.count} times in a row. If the repetition is intentional (e.g. polling), continue; otherwise change strategy — repeating a failing or no-op call will not make it work.`
}

/** Build-level beforeTool guardrails: C1 subagent prompt rewrite + C3 loop streak. */
function runIclineBeforeToolGuardrails(ctx: AgentBeforeToolContext, streak: ToolStreak): AgentBeforeToolResult | undefined {
	try {
		if (!isIclineBuild()) {
			return undefined
		}
		let result: AgentBeforeToolResult | undefined
		const rewritten = rewriteSpawnAgentPrompt(ctx.toolCall.toolName, ctx.input)
		if (rewritten !== undefined) {
			result = { ...result, input: rewritten }
			recordToolTrace(
				{
					event: "subagent-prompt-guarded",
					toolName: ctx.toolCall.toolName,
					toolCallId: ctx.toolCall.toolCallId,
				},
				{ routine: true },
			)
		}
		const warning = noteToolStreak(streak, ctx)
		if (warning) {
			result = { ...result, appendContext: [result?.appendContext, warning].filter(Boolean).join("\n") }
		}
		return result
	} catch (error) {
		// Same fail-open contract as post-write verification: never block a call
		// on a guardrail bug, but leave forced evidence of the gap.
		Logger.warn("[HooksAdapter] iCline beforeTool guardrail error:", error)
		recordToolTrace(
			{
				event: "before-tool-guardrail-error",
				toolName: ctx.toolCall.toolName,
				toolCallId: ctx.toolCall.toolCallId,
				message: error instanceof Error ? error.message : String(error),
			},
			{ force: true },
		)
		return undefined
	}
}

// ---------------------------------------------------------------------------
// iCline harness guardrail: post-write verification
// ---------------------------------------------------------------------------
//
// Re-applies the legacy WriteToFileToolHandler guardrail in the SDK hook
// architecture. After an `editor` / `apply_patch` tool call, the written file(s)
// are checked against filesystem reality (exists, non-empty when content was
// expected) and any mismatch is reported as a failure so the model cannot claim a
// write that did not land.
//
// "The tool did not throw" is NOT a success signal, for two upstream reasons:
//   1. Input-level failures (e.g. `new_text` beyond EDITOR_INPUT_CHAR_LIMIT) come back
//      as a failure ENVELOPE — `{ success: false, error }` — and the agent runtime
//      only sets `isError` for THROWN errors, so such results arrive looking fine.
//   2. Running verification on those results stats a file that was never meant to
//      be written, then replaces the real, actionable message with a misleading
//      ENOENT. That is the "success reported, file missing" loop from the dev.6
//      smoke tests: the model never learned the call was rejected for its size.
// So: detect the envelope first, keep its message, and never discard evidence.

const WRITE_TOOL_NAMES = new Set(["editor", "apply_patch"])

interface WriteTarget {
	absolutePath: string
	expectedMinBytes: number
	/**
	 * Complete expected file content (D10) — set ONLY for full-file writes
	 * (editor create, apply_patch Add File), where the call carries the file's
	 * whole content. Partial writes have no complete expected content to hash.
	 */
	expectedContent?: string
}

/**
 * Failure text carried by a RETURNED (not thrown) tool envelope. Upstream edit
 * tools signal input-level rejection this way, with `success: false` and/or a
 * non-empty `error` string.
 *
 * An EXPLICIT `success: true` is never a failure — it is a claim, and the
 * verification below checks filesystem reality anyway. Reading a warning in the
 * `error` field as a failure would report a false failure for a write that
 * landed the moment upstream starts passing warnings through that field.
 */
function readToolEnvelopeFailure(output: unknown): string | undefined {
	if (output == null || typeof output !== "object" || Array.isArray(output)) {
		return undefined
	}
	const record = output as Record<string, unknown>
	const error = typeof record.error === "string" ? record.error.trim() : ""
	if (record.success === false) {
		return error || "The tool reported success: false"
	}
	if (record.success === true) {
		return undefined
	}
	return error || undefined
}

/**
 * Warning text carried by an explicit `success: true` envelope alongside a
 * non-empty `error` string. Not a failure (see readToolEnvelopeFailure) — but it
 * must not disappear either, so the caller traces it.
 */
function readToolEnvelopeWarning(output: unknown): string | undefined {
	if (output == null || typeof output !== "object" || Array.isArray(output)) {
		return undefined
	}
	const record = output as Record<string, unknown>
	if (record.success !== true) {
		return undefined
	}
	const error = typeof record.error === "string" ? record.error.trim() : ""
	return error || undefined
}

/** Short single-line rendering of the tool's own output, for the model and the trace. */
function describeToolOutput(output: unknown): string {
	if (typeof output === "string") {
		return output.trim()
	}
	try {
		const text = JSON.stringify(output)
		return text && text.length > 400 ? `${text.slice(0, 400)}...` : (text ?? "")
	} catch {
		return String(output)
	}
}

/**
 * Actionable guidance when the rejected call exceeded the runtime's per-call input
 * limit — by far the most common cause of "the write reported success but nothing
 * is on disk". Without this the model can only guess (dev.6 smoke: it guessed
 * "race" and re-sent the identical oversized call).
 *
 * The caller appends this ONLY when the failure message does not already carry the
 * size rejection: the common case (the core guard's own message) states the size,
 * "nothing was written" and the chunk recipe, and repeating any of it made the chat
 * show the same notice twice (ui-guidelines rule 8: one message).
 */
function describeOversizeInput(input: unknown): string | undefined {
	const newText = (input as { new_text?: unknown } | undefined)?.new_text
	if (typeof newText !== "string" || newText.length <= EDITOR_INPUT_CHAR_LIMIT) {
		return undefined
	}
	return `The call carried ${newText.length} characters of new_text, above the runtime's ${EDITOR_INPUT_CHAR_LIMIT}-character per-call limit, so it was rejected before touching disk. ${getLargeWriteGuidance()}`
}

/** Trace-safe summary of a write input — never the payload itself. */
function traceInputShape(input: unknown): Record<string, unknown> {
	const record = (input ?? {}) as Record<string, unknown>
	const text = (value: unknown) => (typeof value === "string" ? value.length : undefined)
	return {
		path: typeof record.path === "string" ? record.path : undefined,
		newTextChars: text(record.new_text),
		oldTextChars: text(record.old_text),
		insertLine: record.insert_line ?? undefined,
		patchChars: text(record.input),
	}
}

async function runIclinePostWriteVerification(
	ctx: AgentAfterToolContext,
	sessionCwd?: string,
): Promise<AgentAfterToolResult | undefined> {
	try {
		if (!isIclineBuild()) {
			return undefined
		}
		const toolName = ctx.toolCall.toolName
		if (!WRITE_TOOL_NAMES.has(toolName)) {
			return undefined
		}

		const envelopeFailure = readToolEnvelopeFailure(ctx.result.output)
		if (envelopeFailure) {
			// When the failure IS the size rejection and already carries the chunk
			// recipe, appending our explanation would show the model (and the chat)
			// the same notice twice. Key on the RECIPE, not on "per-call limit": a
			// message can name the limit without saying how to re-send, and those
			// must still get the recipe (see hasChunkRecipe).
			const guidance = hasChunkRecipe(envelopeFailure) ? undefined : describeOversizeInput(ctx.input)
			Logger.log(
				`[HooksAdapter] iCline guardrail: ${toolName} returned a failure envelope without the error flag; surfacing it to the model: ${envelopeFailure.slice(0, 200)}`,
			)
			recordToolTrace(
				{
					event: "write-tool-failure-envelope",
					toolName,
					toolCallId: ctx.toolCall.toolCallId,
					message: envelopeFailure,
					...traceInputShape(ctx.input),
				},
				{ force: true },
			)
			// Marked as an error so the loop and the UI treat it as a failed tool
			// call, but with the tool's own message preserved verbatim.
			return {
				result: {
					output: guidance ? `${envelopeFailure}\n${guidance}` : envelopeFailure,
					isError: true,
				},
			}
		}

		if (ctx.result.isError) {
			// The write already failed — nothing to verify, and replacing the
			// error would hide the real failure from the model.
			return undefined
		}

		const envelopeWarning = readToolEnvelopeWarning(ctx.result.output)
		if (envelopeWarning) {
			// Explicit success + non-empty error string: a warning, not a failure.
			// Verification below checks reality; the warning is kept as evidence.
			recordToolTrace(
				{
					event: "write-tool-envelope-warning",
					toolName,
					toolCallId: ctx.toolCall.toolCallId,
					message: envelopeWarning,
					...traceInputShape(ctx.input),
				},
				{ force: true },
			)
		}

		const targets = await extractWriteTargets(toolName, ctx.input, sessionCwd)
		if (targets.length === 0) {
			// A write call whose targets could not be extracted is a verification
			// GAP: the tool may have landed something we never checked (best-effort
			// patch parsing gives up on wrappers the executor still accepts). The
			// skip used to vanish silently — fail-open must not mean invisible, so
			// leave forced evidence behind.
			recordToolTrace(
				{
					event: "post-write-verify-skipped-no-targets",
					toolName,
					toolCallId: ctx.toolCall.toolCallId,
					...traceInputShape(ctx.input),
				},
				{ force: true },
			)
			return undefined
		}
		for (const target of targets) {
			const verification = await verifyWrittenFile(target)
			if (!verification.ok) {
				const claimed = describeToolOutput(ctx.result.output)
				const guidance = describeOversizeInput(ctx.input)
				Logger.warn(`[HooksAdapter] iCline post-write verification failed: ${verification.message}`)
				recordToolTrace(
					{
						event: "post-write-verification-failed",
						toolName,
						toolCallId: ctx.toolCall.toolCallId,
						absolutePath: target.absolutePath,
						expectedMinBytes: target.expectedMinBytes,
						verification: verification.message,
						toolClaim: claimed,
						...traceInputShape(ctx.input),
					},
					{ force: true },
				)
				// Keep what the tool claimed: it names the path the executor believed it
				// wrote, which is exactly the evidence earlier rounds lost.
				return {
					result: {
						output: [verification.message, claimed && `The tool reported: ${claimed}`, guidance]
							.filter((line): line is string => !!line)
							.join("\n"),
						isError: true,
					},
				}
			}
		}
		recordToolTrace(
			{
				event: "post-write-verified",
				toolName,
				toolCallId: ctx.toolCall.toolCallId,
				...traceInputShape(ctx.input),
			},
			{ routine: true },
		)
		return undefined
	} catch (error) {
		// Never block a successful tool call on a verifier bug — but leave forced
		// evidence of the gap: an invisible fail-open is what made the phantom-write
		// bug undiagnosable in the first place.
		Logger.warn("[HooksAdapter] iCline post-write verification error:", error)
		recordToolTrace(
			{
				event: "post-write-verification-error",
				toolName: ctx.toolCall.toolName,
				toolCallId: ctx.toolCall.toolCallId,
				message: error instanceof Error ? error.message : String(error),
			},
			{ force: true },
		)
		return undefined
	}
}

async function extractWriteTargets(toolName: string, input: unknown, sessionCwd?: string): Promise<WriteTarget[]> {
	if (toolName === "editor") {
		const editorInput = input as { path?: unknown; new_text?: unknown; old_text?: unknown; insert_line?: unknown } | undefined
		if (typeof editorInput?.path !== "string" || editorInput.path.length === 0) {
			return []
		}
		const newText = typeof editorInput.new_text === "string" ? editorInput.new_text : ""
		// D10: content hash only for FULL-FILE writes. With `old_text` absent and
		// no insert boundary (`insert_line` 0 is a filler for null — mirror
		// normalizeInsertLine), the executor's only success path is createFile with
		// `new_text` as the complete content: the partial paths (insertFile,
		// replaceInFile) require insert_line / old_text, and "create" on an
		// existing file throws before anything reaches verification. Any other
		// shape has no complete expected content, and guessing one would
		// manufacture false failures.
		const isFullFileWrite = editorInput.old_text == null && (editorInput.insert_line == null || editorInput.insert_line === 0)
		return [
			{
				absolutePath: await resolveMaybeRelative(editorInput.path, sessionCwd),
				expectedMinBytes: newText.trim().length > 0 ? 1 : 0,
				expectedContent: isFullFileWrite ? newText : undefined,
			},
		]
	}

	// apply_patch: best-effort target extraction from the canonical patch grammar.
	const patchText = (input as { input?: unknown } | undefined)?.input
	if (typeof patchText !== "string" || patchText.length === 0) {
		return []
	}
	return extractPatchTargets(patchText, sessionCwd)
}

/**
 * Extracts Add/Update File targets from a canonical apply_patch payload.
 * Add File targets expect non-empty content when the patch carries visible
 * content lines; Update File targets only assert existence (an update may
 * legitimately shrink a file). Delete File targets are skipped.
 *
 * `*** Update File: old` + `*** Move to: new` (the canonical rename form) lands
 * the content at the move destination and DELETES the source (the executor's
 * `fs.rm(sourceAbsPath)`), so the move destination is the only path worth
 * verifying. Verifying the source instead reports a false failure for a write
 * that landed — the mirror image of the phantom-write bug this guardrail exists
 * to catch.
 */
async function extractPatchTargets(patchText: string, sessionCwd?: string): Promise<WriteTarget[]> {
	const targets: WriteTarget[] = []
	const lines = patchText.split("\n")
	let pendingAdd: { path: string; hasContent: boolean; contentLines: string[] | undefined } | undefined
	let pendingUpdate: { path: string } | undefined

	const flushPendingAdd = async () => {
		if (pendingAdd) {
			targets.push({
				absolutePath: await resolveMaybeRelative(pendingAdd.path, sessionCwd),
				expectedMinBytes: pendingAdd.hasContent ? 1 : 0,
				// D10: an Add File block carries the complete content the parser
				// writes (`lines.join("\n")`), so a full-file hash is available —
				// unless content collection bailed on a malformed block (see below),
				// in which case only existence and size are asserted.
				expectedContent: pendingAdd.contentLines ? pendingAdd.contentLines.join("\n") : undefined,
			})
			pendingAdd = undefined
		}
	}

	const flushPendingUpdate = async () => {
		if (pendingUpdate) {
			targets.push({ absolutePath: await resolveMaybeRelative(pendingUpdate.path, sessionCwd), expectedMinBytes: 0 })
			pendingUpdate = undefined
		}
	}

	for (const line of lines) {
		const header = line.match(/^\*\*\* (Add|Update|Delete) File: (.+)$/)
		if (header) {
			await flushPendingAdd()
			await flushPendingUpdate()
			const [, action, rawPath] = header
			const filePath = rawPath.trim()
			if (action === "Add") {
				pendingAdd = { path: filePath, hasContent: false, contentLines: [] }
			} else if (action === "Update") {
				pendingUpdate = { path: filePath }
			}
			continue
		}
		const move = line.match(/^\*\*\* Move to: (.+)$/)
		if (move) {
			// Re-point the pending update at the move destination (see doc comment).
			if (pendingUpdate) {
				pendingUpdate.path = move[1].trim()
			}
			continue
		}
		if (line.startsWith("***")) {
			await flushPendingAdd()
			await flushPendingUpdate()
			continue
		}
		if (pendingAdd) {
			if (line.startsWith("+")) {
				const text = line.slice(1)
				pendingAdd.contentLines?.push(text)
				if (text.trim().length > 0) {
					pendingAdd.hasContent = true
				}
			} else {
				// The canonical parser rejects any non-"+" line in an Add File
				// block (the patch then writes nothing), but a wrapped patch can
				// reach us in a shape the parser would not accept. Give up the
				// content hash rather than guess; the target itself stays verified.
				pendingAdd.contentLines = undefined
			}
		}
	}
	await flushPendingAdd()
	await flushPendingUpdate()
	return targets
}

async function resolveMaybeRelative(filePath: string, sessionCwd?: string): Promise<string> {
	if (path.isAbsolute(filePath)) {
		return filePath
	}
	// Mirror the executors exactly: they resolve relative paths against the
	// SESSION cwd (`config.cwd` in sdk core's definitions.ts), and both editor
	// and apply_patch reject relative paths that escape it. Resolving against
	// anything else (a workspace root, the extension host's process.cwd()) can
	// verify a different file than the one the executor wrote — the multi-root
	// and custom-cwd failure mode.
	if (sessionCwd && sessionCwd.trim().length > 0) {
		return path.resolve(sessionCwd, filePath)
	}
	// Fallback for callers that could not supply a session cwd (D1): pick the
	// root that MATCHES the path instead of always the first — a relative path
	// of workspace root 2+ must not silently verify root 1's file.
	try {
		const { paths } = await HostProvider.workspace.getWorkspacePaths({})
		const roots = (paths ?? []).filter((root): root is string => typeof root === "string" && root.length > 0)
		if (roots.length > 0) {
			// 1. A root whose folder the path names ("two/src/x.ts" for root
			//    ".../two") — deterministic from the string alone, and nested
			//    roots resolve to the same target. Longest match wins.
			const named = roots
				.map((root) => ({ root, count: rootNamePrefixLength(root, filePath) }))
				.filter((entry) => entry.count > 0)
				.sort((a, b) => b.count - a.count || b.root.length - a.root.length)[0]
			if (named) {
				const rest = filePath.split(/[\\/]/).slice(named.count).join(path.sep)
				return path.resolve(named.root, rest)
			}
			// 2. Else the root where the resolved target actually exists — the
			//    strongest "this root matches" signal a relative path can give.
			//    Longest (most specific) root wins; with no match, the first root.
			const existing: string[] = []
			for (const root of roots) {
				if (await fileExists(path.resolve(root, filePath))) {
					existing.push(root)
				}
			}
			const match = existing.sort((a, b) => b.length - a.length)[0]
			return path.resolve(match ?? roots[0], filePath)
		}
	} catch (error) {
		Logger.warn("[HooksAdapter] Failed to resolve workspace root for post-write verification:", error)
	}
	return path.resolve(filePath)
}

/**
 * Longest-prefix match of a relative path's leading segments against a root's
 * trailing segments: "two/src/x.ts" matches root ".../two" (1 segment),
 * "packages/two/src/x.ts" matches ".../packages/two" (2 segments). Requires a
 * leftover segment — a path that IS just the root's name is a sibling file in
 * the parent directory, not the root directory itself.
 */
function rootNamePrefixLength(root: string, filePath: string): number {
	const rootSegments = root.split(/[\\/]/).filter(Boolean)
	const fileSegments = filePath.split(/[\\/]/)
	const sameSegment = (a: string, b: string) => a === b || (process.platform === "win32" && a.toLowerCase() === b.toLowerCase())
	let best = 0
	for (let count = 1; count <= rootSegments.length && count < fileSegments.length; count += 1) {
		const rootTail = rootSegments.slice(-count)
		if (rootTail.every((segment, index) => sameSegment(segment, fileSegments[index]))) {
			best = count
		}
	}
	return best
}

async function fileExists(candidate: string): Promise<boolean> {
	try {
		await fs.stat(candidate)
		return true
	} catch {
		return false
	}
}
