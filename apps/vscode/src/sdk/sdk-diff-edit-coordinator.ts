import {
	type ApplyPatchExecutor,
	type ApplyPatchInput,
	computePatchChanges,
	createApplyPatchExecutor,
	createEditorExecutor,
	type EditFileInput,
	type EditorExecutor,
	PatchActionType,
} from "@cline/core"
import type { AgentToolContext } from "@cline/shared"
import * as fs from "fs/promises"
import * as path from "path"
import { HostProvider } from "@/hosts/host-provider"
import { EDITOR_INPUT_CHAR_LIMIT } from "@/icline/harness/guardrails"
import type { EditPreview } from "@/integrations/editor/EditPreview"
import { Logger } from "@/shared/services/Logger"

/**
 * How long an auto-approved edit's preview stays visible after the write, so the
 * user can watch the change land without stalling the agent loop for long.
 * Manually-approved edits don't need this: the preview is open while the user decides.
 */
const AUTO_APPROVE_PREVIEW_LINGER_MS = 1_500

export interface SdkDiffEditCoordinatorOptions {
	/** Workspace root used to resolve relative tool paths. */
	getCwd: () => Promise<string>
	/** When Background Edit is enabled, edits apply headlessly with no preview. */
	isBackgroundEditEnabled: () => boolean
	/** Injectable for tests. Defaults to the host-registered factory. */
	createEditPreview?: () => EditPreview
	/** Injectable for tests. Defaults to the SDK's disk-writing editor executor. */
	fallbackEditorExecutor?: EditorExecutor
	/** Injectable for tests. Defaults to the SDK's disk-writing apply_patch executor. */
	fallbackApplyPatchExecutor?: ApplyPatchExecutor
	/** Test seam: overrides the auto-approve preview linger. */
	autoApprovePreviewLingerMs?: number
}

interface DiffEditSession {
	/** Undefined once the preview has been displaced by a newer same-file preview. */
	preview: EditPreview | undefined
	absolutePath: string
}

/**
 * Shows a read-only diff preview of SDK edit-tool changes (editor / apply_patch).
 *
 * The preview is a virtual-document diff — both sides are virtual, the real file is
 * never opened or modified by the preview — so opening it has no side effects,
 * rejecting an edit only closes a tab, and multiple previews (even of the same file)
 * can't interfere with each other. The actual write is always the SDK's default
 * disk-writing executor, which the overridden executors delegate to after closing
 * the preview; its results and error strings reach the model unchanged.
 *
 * Previews open at approval time (the SDK surfaces tool input only after the model's
 * stream completes, so the approval callback is the only pre-execution point with
 * full input; streaming-during-generation is not possible). Auto-approved edits get
 * a brief preview during execution instead.
 */
export class SdkDiffEditCoordinator {
	private readonly sessions = new Map<string, DiffEditSession>()
	private readonly fallbackEditorExecutor: EditorExecutor
	private readonly fallbackApplyPatchExecutor: ApplyPatchExecutor
	private readonly autoApprovePreviewLingerMs: number

	constructor(private readonly options: SdkDiffEditCoordinatorOptions) {
		this.fallbackEditorExecutor = options.fallbackEditorExecutor ?? createEditorExecutor()
		this.fallbackApplyPatchExecutor = options.fallbackApplyPatchExecutor ?? createApplyPatchExecutor()
		this.autoApprovePreviewLingerMs = options.autoApprovePreviewLingerMs ?? AUTO_APPROVE_PREVIEW_LINGER_MS
	}

	/**
	 * Opens the diff preview for an edit tool BEFORE its approval ask is shown, so the
	 * user decides while looking at the actual change. Never throws; on any failure the
	 * approval flow proceeds without a preview and the executor still applies the edit.
	 */
	async openForApproval(toolCallId: string, toolName: string, input: unknown): Promise<void> {
		if (this.options.isBackgroundEditEnabled() || this.sessions.has(toolCallId)) {
			return
		}
		try {
			if (toolName === "editor") {
				await this.openEditorPreview(toolCallId, input as EditFileInput)
			} else if (toolName === "apply_patch") {
				await this.openPatchPreview(toolCallId, input as ApplyPatchInput)
			}
		} catch (error) {
			Logger.warn(`[SdkDiffEditCoordinator] Failed to open diff preview for ${toolName}: ${error}`)
			await this.discardPreview(toolCallId)
		}
	}

	/**
	 * The `editor` tool executor override: delegate the write to the SDK's disk executor,
	 * with the preview visible around it. Auto-approved edits (no pre-approval preview)
	 * get a brief preview that lingers shortly after the write so the user sees it land.
	 */
	async executeEditorTool(input: EditFileInput, cwd: string, context: AgentToolContext): Promise<string> {
		const toolCallId = context.toolCallId ?? ""
		const hadPreApprovalPreview = this.sessions.has(toolCallId)
		try {
			if (!hadPreApprovalPreview && !this.options.isBackgroundEditEnabled()) {
				// Auto-approved (or hook-approved) edit: no preview was opened at approval
				// time, so show one now. Best-effort — never blocks the edit.
				try {
					await this.openEditorPreview(toolCallId, input)
				} catch (error) {
					Logger.warn(`[SdkDiffEditCoordinator] Failed to show auto-approve preview: ${error}`)
				}
			}
			const result = await this.fallbackEditorExecutor(input, cwd, context)
			if (!hadPreApprovalPreview && this.sessions.get(toolCallId)?.preview) {
				// Keep the auto-approve preview visible briefly after the write; an abort
				// just cuts the linger short (the edit has already been applied).
				await lingerDelay(this.autoApprovePreviewLingerMs, context.signal)
			}
			return result
		} finally {
			await this.discardPreview(toolCallId)
		}
	}

	/**
	 * The `apply_patch` tool executor override: manually-approved patches close their
	 * approval preview before applying; auto-approved patches show a brief preview
	 * around execution, matching the `editor` tool behavior.
	 */
	async executeApplyPatchTool(input: ApplyPatchInput, cwd: string, context: AgentToolContext): Promise<string> {
		const toolCallId = context.toolCallId ?? ""
		const hadPreApprovalPreview = this.sessions.has(toolCallId)
		try {
			if (hadPreApprovalPreview) {
				await this.discardPreview(toolCallId)
			} else if (!this.options.isBackgroundEditEnabled()) {
				try {
					await this.openPatchPreview(toolCallId, input)
				} catch (error) {
					Logger.warn(`[SdkDiffEditCoordinator] Failed to show auto-approve patch preview: ${error}`)
				}
			}

			const result = await this.fallbackApplyPatchExecutor(input, cwd, context)
			if (!hadPreApprovalPreview && this.sessions.get(toolCallId)?.preview) {
				await lingerDelay(this.autoApprovePreviewLingerMs, context.signal)
			}
			return result
		} finally {
			await this.discardPreview(toolCallId)
		}
	}

	/** Closes one preview (reject / abort / edit applied). Never throws; unknown ids are a no-op. */
	async discardPreview(toolCallId: string): Promise<void> {
		const session = this.sessions.get(toolCallId)
		this.sessions.delete(toolCallId)
		if (!session?.preview) {
			return
		}
		try {
			await session.preview.close()
		} catch (error) {
			Logger.warn(`[SdkDiffEditCoordinator] Failed to close diff preview: ${error}`)
		}
	}

	/** Closes every open preview. Called on turn end, task end, and controller dispose. */
	async discardAllPreviews(reason: string): Promise<void> {
		if (this.sessions.size === 0) {
			return
		}
		Logger.log(`[SdkDiffEditCoordinator] Closing ${this.sessions.size} diff preview(s): ${reason}`)
		for (const toolCallId of [...this.sessions.keys()]) {
			await this.discardPreview(toolCallId)
		}
	}

	private async openEditorPreview(toolCallId: string, input: EditFileInput): Promise<void> {
		if (typeof input?.path !== "string" || input.path.length === 0 || typeof input.new_text !== "string") {
			throw new Error("editor input missing path or new_text")
		}
		const cwd = await this.options.getCwd()
		const absolutePath = resolveEditPath(cwd, input.path)
		let originalContent: string | undefined
		try {
			originalContent = await fs.readFile(absolutePath, "utf-8")
		} catch {
			originalContent = undefined
		}
		if (normalizeInsertLine(input.insert_line) != null && originalContent === undefined) {
			// The SDK's insert path requires an existing file; skip the preview and let
			// the executor produce its canonical error.
			throw new Error(`cannot insert into missing file ${absolutePath}`)
		}
		const editType = originalContent === undefined ? "create" : "modify"
		const newContent = computeNewEditorContent(originalContent ?? "", input, absolutePath, editType)

		await this.openPreview(toolCallId, {
			absolutePath,
			displayPath: input.path,
			editType,
			leftContent: originalContent ?? "",
			rightContent: newContent,
		})
	}

	private async openPatchPreview(toolCallId: string, input: ApplyPatchInput): Promise<void> {
		if (typeof input?.input !== "string" || input.input.length === 0) {
			return
		}
		const cwd = await this.options.getCwd()
		const { changes } = await computePatchChanges(input.input, cwd)
		// Preview the first file the patch creates or updates. Multi-file patches are
		// uncommon; any remaining files apply without a preview.
		const first = Object.entries(changes).find(
			([, change]) =>
				(change.type === PatchActionType.ADD || change.type === PatchActionType.UPDATE) &&
				change.newContent !== undefined,
		)
		if (!first) {
			return
		}
		const [filePath, change] = first
		await this.openPreview(toolCallId, {
			absolutePath: resolveEditPath(cwd, filePath),
			displayPath: filePath,
			editType: change.type === PatchActionType.ADD ? "create" : "modify",
			leftContent: change.oldContent ?? "",
			rightContent: change.newContent ?? "",
		})
	}

	private async openPreview(
		toolCallId: string,
		content: {
			absolutePath: string
			displayPath: string
			editType: "create" | "modify"
			leftContent: string
			rightContent: string
		},
	): Promise<void> {
		// A newer preview for the same file supersedes an older pending one (approvals
		// resolve sequentially, so the older edit is already decided — its executor only
		// needs the session entry, not the tab).
		for (const [id, session] of this.sessions) {
			if (session.preview && session.absolutePath === content.absolutePath) {
				try {
					await session.preview.close()
				} catch (error) {
					Logger.warn(`[SdkDiffEditCoordinator] Failed to close superseded preview: ${error}`)
				}
				session.preview = undefined
				Logger.log(`[SdkDiffEditCoordinator] Superseded pending preview ${id} for ${content.displayPath}`)
			}
		}

		const preview = this.createPreview()
		const fileName = path.basename(content.absolutePath)
		const title =
			content.editType === "create"
				? `${fileName}: New File (Preview)`
				: `${fileName}: Original ↔ Cline's Changes (Preview)`
		try {
			await preview.open({
				title,
				absolutePath: content.absolutePath,
				displayPath: content.displayPath,
				leftContent: content.leftContent,
				rightContent: content.rightContent,
			})
		} catch (error) {
			// open() can fail after partially opening (the session isn't registered yet,
			// so discardPreview couldn't reach it) — close directly to avoid an orphaned tab.
			await preview.close().catch(() => {})
			throw error
		}
		this.sessions.set(toolCallId, { preview, absolutePath: content.absolutePath })
	}

	private createPreview(): EditPreview {
		return this.options.createEditPreview?.() ?? HostProvider.get().createEditPreview()
	}
}

/**
 * Mirror of core's `normalizeInsertLine` (@cline/core extensions/tools/schemas.ts), which
 * this layer cannot import as a value: vitest aliases `@cline/core` to a stub.
 *
 * 0 is a filler for the optional `insert_line`, not a boundary — zod's `coerce` turns
 * "", "   " and false into 0, so the same call can carry 0 without the model having chosen it,
 * and a model that meant to insert at the top writes 1 once the error says "positive
 * one-based". The dev.6-fix.30 log refused `Invalid insert_line: 0` eleven times while the model
 * re-sent the identical call. Reading it here the way the executor reads it is what keeps this
 * preview from skipping a tab (with a warning) for a write the executor goes on to perform.
 */
function normalizeInsertLine(insertLine: number | null | undefined): number | undefined {
	return insertLine == null || insertLine === 0 ? undefined : insertLine
}

/**
 * Computes the full proposed file content for an `editor` tool input, mirroring the
 * SDK executor's semantics (sdk/packages/core/src/extensions/tools/executors/editor.ts)
 * so the preview shows exactly what the executor will write. Inputs the SDK would
 * reject throw here too — including one above the runtime's per-call size ceiling —
 * and the preview is simply skipped.
 */
export function computeNewEditorContent(
	originalContent: string,
	input: EditFileInput,
	filePath: string,
	editType: "create" | "modify",
): string {
	// Mirror of the runtime's size guard (core `getEditorSizeError`): opening a
	// preview for a call the executor will refuse would show the user an edit that
	// never happens. The throw is caught by the preview openers and skips the tab;
	// the executor's own envelope still reaches the model unchanged.
	if (typeof input.new_text === "string" && input.new_text.length > EDITOR_INPUT_CHAR_LIMIT) {
		throw new Error(
			`Editor input too large: new_text was ${input.new_text.length} characters, above the ${EDITOR_INPUT_CHAR_LIMIT}-character per-call limit; nothing will be written.`,
		)
	}
	if (typeof input.old_text === "string" && input.old_text.length > EDITOR_INPUT_CHAR_LIMIT) {
		throw new Error(
			`Editor input too large: old_text was ${input.old_text.length} characters, above the ${EDITOR_INPUT_CHAR_LIMIT}-character per-call limit; nothing will be written.`,
		)
	}

	const insertLine = normalizeInsertLine(input.insert_line)
	if (insertLine != null) {
		const lines = originalContent.split("\n")
		const maxBoundaryLine = lines.length + 1
		if (insertLine < 1 || insertLine > maxBoundaryLine) {
			throw new Error(
				`Invalid insert_line: ${insertLine}. insert_line must be a positive one-based boundary line in the range 1-${maxBoundaryLine}. Use ${maxBoundaryLine} to append at EOF.`,
			)
		}
		lines.splice(insertLine - 1, 0, ...input.new_text.split("\n"))
		return lines.join("\n")
	}

	if (editType === "create") {
		return input.new_text
	}

	if (input.old_text == null) {
		throw new Error("Parameter `old_text` is required when editing an existing file without `insert_line`")
	}

	const lineEnding = originalContent.includes("\r\n") ? "\r\n" : "\n"
	const oldText = input.old_text.split(/\r\n|\n/).join(lineEnding)
	const newText = (input.new_text ?? "").split(/\r\n|\n/).join(lineEnding)
	const occurrences = oldText.length === 0 ? 0 : originalContent.split(oldText).length - 1
	if (occurrences === 0) {
		// Mirror of the executor's whitespace-insensitive fallback (core
		// `findNormalizedLineMatch`): rewrites whose old_text drifted only in
		// trailing whitespace or EOF newlines must preview the write the
		// executor will actually perform.
		const fallback = findNormalizedLineMatch(originalContent, input.old_text)
		if (fallback.count > 1) {
			throw new Error(`No replacement performed: multiple occurrences of text found in ${filePath}.`)
		}
		if (fallback.count === 1) {
			return originalContent.slice(0, fallback.start) + newText + originalContent.slice(fallback.end)
		}
		throw new Error(`No replacement performed: text not found in ${filePath}.`)
	}
	if (occurrences > 1) {
		throw new Error(`No replacement performed: multiple occurrences of text found in ${filePath}.`)
	}
	return originalContent.replace(oldText, () => newText)
}

interface NormalizedMatch {
	count: number
	start: number
	end: number
}

/** Mirror of core editor.ts `findNormalizedLineMatch`. */
function findNormalizedLineMatch(content: string, oldStr: string): NormalizedMatch {
	const oldLinesRaw = oldStr.split(/\r\n|\n/)
	const oldEndsWithNewline = oldLinesRaw.length > 1 && oldLinesRaw[oldLinesRaw.length - 1] === ""
	if (oldEndsWithNewline) oldLinesRaw.pop()
	const oldLines = oldLinesRaw.map((line) => line.replace(/[\t ]+$/u, ""))
	if (oldLines.length === 0) return { count: 0, start: 0, end: 0 }

	const lines: Array<{ start: number; contentEnd: number; end: number; normalized: string }> = []
	let lineStart = 0
	while (lineStart <= content.length) {
		let eol = content.indexOf("\n", lineStart)
		const hasEol = eol !== -1
		if (!hasEol) eol = content.length
		const contentEnd = hasEol && eol > lineStart && content[eol - 1] === "\r" ? eol - 1 : eol
		lines.push({
			start: lineStart,
			contentEnd,
			end: hasEol ? eol + 1 : eol,
			normalized: content.slice(lineStart, contentEnd).replace(/[\t ]+$/u, ""),
		})
		if (!hasEol) break
		lineStart = eol + 1
	}

	let count = 0
	let start = 0
	let end = 0
	for (let i = 0; i + oldLines.length <= lines.length; i++) {
		let matches = true
		for (let k = 0; k < oldLines.length; k++) {
			if (lines[i + k].normalized !== oldLines[k]) {
				matches = false
				break
			}
		}
		if (!matches) continue
		count++
		if (count === 1) {
			const last = lines[i + oldLines.length - 1]
			start = lines[i].start
			end = oldEndsWithNewline ? last.end : last.contentEnd
		}
	}
	return { count, start, end }
}

/** Mirrors the SDK executor's resolveFilePath (restrictToCwd=true): absolute paths pass through. */
function resolveEditPath(cwd: string, inputPath: string): string {
	const isAbsoluteInput = path.isAbsolute(inputPath)
	const resolved = isAbsoluteInput ? path.normalize(inputPath) : path.resolve(cwd, inputPath)
	if (isAbsoluteInput) {
		return resolved
	}
	const rel = path.relative(cwd, resolved)
	if (rel.startsWith("..") || path.isAbsolute(rel)) {
		throw new Error(`Path must stay within cwd: ${inputPath}`)
	}
	return resolved
}

/** Waits `ms`, resolving early (never rejecting) if the signal aborts. */
function lingerDelay(ms: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) {
		return Promise.resolve()
	}
	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort)
			resolve()
		}, ms)
		const onAbort = () => {
			clearTimeout(timer)
			resolve()
		}
		signal?.addEventListener("abort", onAbort, { once: true })
	})
}
