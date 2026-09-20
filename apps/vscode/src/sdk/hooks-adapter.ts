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

import * as path from "node:path"
import type {
	AgentAfterToolContext,
	AgentAfterToolResult,
	AgentBeforeToolContext,
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
import { EDITOR_INPUT_CHAR_LIMIT, verifyWrittenFile } from "@/icline/harness/guardrails"
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

export function buildAgentHooks(stateManager: StateManager, emitHookMessage?: HookMessageEmitter): AgentHooks {
	const hooksEnabled = () => getHooksEnabledSafe(stateManager.getGlobalSettingsKey("hooksEnabled"))

	return {
		async beforeRun(ctx: AgentRunLifecycleContext): Promise<AgentStopControl | undefined> {
			const taskStartControl = await runTaskStart(ctx, hooksEnabled, emitHookMessage)
			if (taskStartControl) {
				return taskStartControl
			}
			return runUserPromptSubmit(ctx, hooksEnabled, emitHookMessage)
		},

		async beforeTool(ctx: AgentBeforeToolContext): Promise<{ stop?: boolean; reason?: string } | undefined> {
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
		},

		async afterTool(ctx: AgentAfterToolContext): Promise<AgentAfterToolResult | undefined> {
			// iCline harness guardrail: post-write verification. Runs independently of
			// the user-configured hooks (hooksEnabled) because it is a build-level
			// guardrail, mirroring the legacy WriteToFileToolHandler integration.
			// A failure short-circuits and replaces the tool result so the model
			// sees the verification error instead of a false success.
			const guardrailResult = await runIclinePostWriteVerification(ctx)
			if (guardrailResult) {
				return guardrailResult
			}

			let runningTs: number | undefined
			try {
				if (!hooksEnabled()) {
					return undefined
				}

				const factory = new HookFactory()
				if (!(await factory.hasHook("PostToolUse"))) {
					return undefined
				}

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
						result: String(ctx.result.output ?? ""),
						success: !ctx.result.isError,
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
				return undefined
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
				return undefined
			}
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
}

/**
 * Failure text carried by a RETURNED (not thrown) tool envelope. Upstream edit
 * tools signal input-level rejection this way, with `success: false` and/or a
 * non-empty `error` string. A successful envelope carries neither.
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
 * "race" and re-sent the identical oversized call). The tool's own rejection message
 * (which this text is appended to) already carries the chunking recipe, so this adds
 * only the sizes and the "nothing reached disk" fact.
 */
function describeOversizeInput(input: unknown): string | undefined {
	const newText = (input as { new_text?: unknown } | undefined)?.new_text
	if (typeof newText !== "string" || newText.length <= EDITOR_INPUT_CHAR_LIMIT) {
		return undefined
	}
	return `The call carried ${newText.length} characters of new_text, above the runtime's ${EDITOR_INPUT_CHAR_LIMIT}-character per-call limit, so it was rejected before touching disk. Split the write as that error describes — do not re-send the oversized call unchanged.`
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

async function runIclinePostWriteVerification(ctx: AgentAfterToolContext): Promise<AgentAfterToolResult | undefined> {
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
			const guidance = describeOversizeInput(ctx.input)
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

		const targets = await extractWriteTargets(toolName, ctx.input)
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
		recordToolTrace({
			event: "post-write-verified",
			toolName,
			toolCallId: ctx.toolCall.toolCallId,
			...traceInputShape(ctx.input),
		})
		return undefined
	} catch (error) {
		// Never block a successful tool call on a verifier bug.
		Logger.warn("[HooksAdapter] iCline post-write verification error:", error)
		return undefined
	}
}

async function extractWriteTargets(toolName: string, input: unknown): Promise<WriteTarget[]> {
	if (toolName === "editor") {
		const editorInput = input as { path?: unknown; new_text?: unknown } | undefined
		if (typeof editorInput?.path !== "string" || editorInput.path.length === 0) {
			return []
		}
		const newText = typeof editorInput.new_text === "string" ? editorInput.new_text : ""
		return [
			{
				absolutePath: await resolveMaybeRelative(editorInput.path),
				expectedMinBytes: newText.trim().length > 0 ? 1 : 0,
			},
		]
	}

	// apply_patch: best-effort target extraction from the canonical patch grammar.
	const patchText = (input as { input?: unknown } | undefined)?.input
	if (typeof patchText !== "string" || patchText.length === 0) {
		return []
	}
	return extractPatchTargets(patchText)
}

/**
 * Extracts Add/Update File targets from a canonical apply_patch payload.
 * Add File targets expect non-empty content when the patch carries visible
 * content lines; Update File targets only assert existence (an update may
 * legitimately shrink a file). Delete File targets are skipped.
 */
async function extractPatchTargets(patchText: string): Promise<WriteTarget[]> {
	const targets: WriteTarget[] = []
	const lines = patchText.split("\n")
	let pendingAdd: { path: string; hasContent: boolean } | undefined

	const flushPendingAdd = async () => {
		if (pendingAdd) {
			targets.push({
				absolutePath: await resolveMaybeRelative(pendingAdd.path),
				expectedMinBytes: pendingAdd.hasContent ? 1 : 0,
			})
			pendingAdd = undefined
		}
	}

	for (const line of lines) {
		const header = line.match(/^\*\*\* (Add|Update|Delete) File: (.+)$/)
		if (header) {
			await flushPendingAdd()
			const [, action, rawPath] = header
			const filePath = rawPath.trim()
			if (action === "Add") {
				pendingAdd = { path: filePath, hasContent: false }
			} else if (action === "Update") {
				targets.push({ absolutePath: await resolveMaybeRelative(filePath), expectedMinBytes: 0 })
			}
			continue
		}
		if (line.startsWith("***")) {
			await flushPendingAdd()
			continue
		}
		if (pendingAdd && line.startsWith("+") && line.slice(1).trim().length > 0) {
			pendingAdd.hasContent = true
		}
	}
	await flushPendingAdd()
	return targets
}

async function resolveMaybeRelative(filePath: string): Promise<string> {
	if (path.isAbsolute(filePath)) {
		return filePath
	}
	try {
		const { paths } = await HostProvider.workspace.getWorkspacePaths({})
		const root = paths?.[0]
		if (root) {
			return path.resolve(root, filePath)
		}
	} catch (error) {
		Logger.warn("[HooksAdapter] Failed to resolve workspace root for post-write verification:", error)
	}
	return path.resolve(filePath)
}
