import type { AgentAfterToolContext } from "@cline/shared"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { buildAgentHooks } from "./hooks-adapter"

const mocks = vi.hoisted(() => ({
	isIclineBuild: vi.fn(() => true),
	verifyWrittenFile: vi.fn(async (_params: { absolutePath: string; expectedMinBytes?: number }) => ({
		ok: true,
		message: "Verified write",
	})),
	getWorkspacePaths: vi.fn(async () => ({ paths: ["/workspace"] })),
	getHooksEnabledSafe: vi.fn(() => false),
	hasHook: vi.fn(async () => false),
	recordToolTrace: vi.fn(),
}))

vi.mock("@/registry", () => ({
	isIclineBuild: mocks.isIclineBuild,
}))

vi.mock("@/icline/harness/guardrails", () => ({
	verifyWrittenFile: mocks.verifyWrittenFile,
	EDITOR_INPUT_CHAR_LIMIT: 2_000_000,
	EDITOR_CHUNK_CHAR_LIMIT: 32_000,
	getLargeWriteGuidance: () => "Write it in chunks: create the file with a first chunk, then append with `insert_line`.",
}))

vi.mock("@/icline/harness/tool-trace", () => ({
	recordToolTrace: mocks.recordToolTrace,
}))

vi.mock("@/hosts/host-provider", () => ({
	HostProvider: {
		workspace: {
			getWorkspacePaths: mocks.getWorkspacePaths,
		},
	},
}))

vi.mock("@/core/hooks/hooks-utils", () => ({
	getHooksEnabledSafe: mocks.getHooksEnabledSafe,
}))

vi.mock("@/core/hooks/hook-factory", () => ({
	HookFactory: class {
		hasHook = mocks.hasHook
		create = vi.fn()
	},
}))

function makeStateManager() {
	return {
		getGlobalSettingsKey: vi.fn(() => false),
	} as unknown as Parameters<typeof buildAgentHooks>[0]
}

function makeAfterToolCtx(overrides: {
	toolName?: string
	input?: unknown
	isError?: boolean
	output?: unknown
}): AgentAfterToolContext {
	const { toolName = "editor", input = { path: "/workspace/file.ts", new_text: "content" }, isError = false } = overrides
	return {
		snapshot: {
			agentId: "agent-1",
			conversationId: "conv-1",
			runId: "run-1",
			status: "running",
			iteration: 1,
			messages: [],
			pendingToolCalls: [],
			usage: {},
		},
		tool: { name: toolName },
		toolCall: { toolName, toolCallId: "call-1" },
		input,
		result: { output: overrides.output ?? "write ok", isError },
		startedAt: new Date(),
		endedAt: new Date(),
		durationMs: 5,
	} as unknown as AgentAfterToolContext
}

describe("hooks-adapter iCline post-write verification", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.isIclineBuild.mockReturnValue(true)
		mocks.verifyWrittenFile.mockResolvedValue({ ok: true, message: "Verified write" })
		mocks.getHooksEnabledSafe.mockReturnValue(false)
		mocks.hasHook.mockResolvedValue(false)
	})

	it("passes through when the write verifies", async () => {
		const hooks = buildAgentHooks(makeStateManager())
		const result = await hooks.afterTool?.(makeAfterToolCtx({}))
		expect(result).toBeUndefined()
		expect(mocks.verifyWrittenFile).toHaveBeenCalledWith({
			absolutePath: "/workspace/file.ts",
			expectedMinBytes: 1,
		})
	})

	it("fails the tool call but keeps what the tool claimed", async () => {
		mocks.verifyWrittenFile.mockResolvedValue({ ok: false, message: "Verification failed: file.ts is empty" })
		const hooks = buildAgentHooks(makeStateManager())
		const result = await hooks.afterTool?.(makeAfterToolCtx({}))
		expect(result).toEqual({
			result: {
				output: "Verification failed: file.ts is empty\nThe tool reported: write ok",
				isError: true,
			},
		})
	})

	// dev.6-fix.7 root cause: upstream edit tools report input-level rejection by
	// RETURNING `{ success: false, error }`, and the agent runtime only flags THROWN
	// errors — so `isError` is undefined. Verifying such a result stats a file that
	// was never written and replaces the real cause with a phantom ENOENT, which is
	// what made small models loop on oversized writes.
	it("surfaces a returned failure envelope instead of verifying a file that was never written", async () => {
		const hooks = buildAgentHooks(makeStateManager())
		const result = await hooks.afterTool?.(
			makeAfterToolCtx({
				output: {
					query: "edit:/workspace/file.ts",
					result: "",
					error: "Editor input too large: new_text was 33020 characters",
					success: false,
				},
			}),
		)
		expect(mocks.verifyWrittenFile).not.toHaveBeenCalled()
		expect(result).toEqual({
			result: {
				output: "Editor input too large: new_text was 33020 characters",
				isError: true,
			},
		})
	})

	// ui-guidelines rule 8: when the tool's own rejection already carries the size,
	// "nothing was written" and the chunk recipe, the guardrail passes it through
	// unchanged — the fix.29 chat showed that same notice twice (two paragraphs).
	it("returns the tool's size rejection once — never as two paragraphs", async () => {
		const hooks = buildAgentHooks(makeStateManager())
		const chars = 2_000_001
		const message = `Editor input too large: new_text was ${chars} characters, above the 2000000-character per-call limit; nothing was written. Create the file with a first chunk of at most 32000 characters, then append the remaining chunks with \`insert_line\` (line_count + 1 appends at EOF). Do not re-send the oversized call unchanged.`
		const result = await hooks.afterTool?.(
			makeAfterToolCtx({
				input: { path: "/workspace/file.ts", new_text: "x".repeat(chars) },
				output: {
					query: "edit:/workspace/file.ts",
					result: "",
					error: message,
					success: false,
				},
			}),
		)
		expect(mocks.verifyWrittenFile).not.toHaveBeenCalled()
		expect(result).toEqual({ result: { output: message, isError: true } })
		const output = (result?.result as { output: string }).output
		expect(output.match(/per-call limit/g)).toHaveLength(1)
	})

	// Defensive: a failure from elsewhere on an oversized input still gets the sizes
	// and the shared chunk recipe appended, because that message lacks both.
	it("adds the oversize explanation only when the failure message lacks it", async () => {
		const hooks = buildAgentHooks(makeStateManager())
		const chars = 2_000_001
		const result = await hooks.afterTool?.(
			makeAfterToolCtx({
				input: { path: "/workspace/file.ts", new_text: "x".repeat(chars) },
				output: {
					query: "edit:/workspace/file.ts",
					result: "",
					error: "Editor operation failed: ENOSPC (no space left on device)",
					success: false,
				},
			}),
		)
		expect(mocks.verifyWrittenFile).not.toHaveBeenCalled()
		const output = (result?.result as { output: string; isError: boolean }).output
		expect(output).toContain("Editor operation failed: ENOSPC")
		expect(output).toContain(`The call carried ${chars} characters of new_text`)
		// From the mocked getLargeWriteGuidance — the recipe the overlay no longer prints.
		expect(output).toContain("Write it in chunks")
		expect((result?.result as { isError: boolean }).isError).toBe(true)
	})

	it("leaves a realistic whole-file write alone", async () => {
		// 40243 characters is the size the fix.29 smoke chat was refused at under the
		// old 32k wall; it is an ordinary write now, so a failure envelope at this size
		// cannot come from the size guard and gets no oversize explanation.
		const hooks = buildAgentHooks(makeStateManager())
		const result = await hooks.afterTool?.(
			makeAfterToolCtx({
				input: { path: "/workspace/file.ts", new_text: "x".repeat(40_243) },
				output: {
					query: "edit:/workspace/file.ts",
					result: "",
					error: "Editor operation failed: No replacement performed: text not found in file.ts.",
					success: false,
				},
			}),
		)
		const output = (result?.result as { output: string; isError: boolean }).output
		expect(output).toContain("No replacement performed")
		expect(output).not.toContain("per-call limit")
	})

	it("still verifies a successful envelope that carries an empty error field", async () => {
		const hooks = buildAgentHooks(makeStateManager())
		const result = await hooks.afterTool?.(
			makeAfterToolCtx({
				output: {
					query: "edit:/workspace/file.ts",
					result: "File created successfully at: /workspace/file.ts",
					error: "",
					success: true,
				},
			}),
		)
		expect(result).toBeUndefined()
		expect(mocks.verifyWrittenFile).toHaveBeenCalledTimes(1)
	})

	it("reports the envelope failure for apply_patch without appending editor guidance", async () => {
		const hooks = buildAgentHooks(makeStateManager())
		const patch = ["*** Begin Patch", "*** Add File: /workspace/new.ts", "+const x = 1", "*** End Patch"].join("\n")
		const result = await hooks.afterTool?.(
			makeAfterToolCtx({
				toolName: "apply_patch",
				input: { input: patch },
				output: { query: "apply_patch", result: "", error: "apply_patch failed: hunk mismatch", success: false },
			}),
		)
		expect(mocks.verifyWrittenFile).not.toHaveBeenCalled()
		expect(result).toEqual({ result: { output: "apply_patch failed: hunk mismatch", isError: true } })
	})

	it("skips verification when the tool call already errored", async () => {
		const hooks = buildAgentHooks(makeStateManager())
		const result = await hooks.afterTool?.(makeAfterToolCtx({ isError: true }))
		expect(result).toBeUndefined()
		expect(mocks.verifyWrittenFile).not.toHaveBeenCalled()
	})

	it("skips non-write tools", async () => {
		const hooks = buildAgentHooks(makeStateManager())
		const result = await hooks.afterTool?.(makeAfterToolCtx({ toolName: "read_file", input: { path: "/x" } }))
		expect(result).toBeUndefined()
		expect(mocks.verifyWrittenFile).not.toHaveBeenCalled()
	})

	it("skips entirely on non-iCline builds", async () => {
		mocks.isIclineBuild.mockReturnValue(false)
		const hooks = buildAgentHooks(makeStateManager())
		const result = await hooks.afterTool?.(makeAfterToolCtx({}))
		expect(result).toBeUndefined()
		expect(mocks.verifyWrittenFile).not.toHaveBeenCalled()
	})

	it("uses expectedMinBytes 0 when new_text is empty (pure deletion)", async () => {
		const hooks = buildAgentHooks(makeStateManager())
		await hooks.afterTool?.(makeAfterToolCtx({ input: { path: "/workspace/file.ts", new_text: "" } }))
		expect(mocks.verifyWrittenFile).toHaveBeenCalledWith({
			absolutePath: "/workspace/file.ts",
			expectedMinBytes: 0,
		})
	})

	it("resolves relative editor paths against the workspace root", async () => {
		const hooks = buildAgentHooks(makeStateManager())
		await hooks.afterTool?.(makeAfterToolCtx({ input: { path: "src/file.ts", new_text: "x" } }))
		expect(mocks.getWorkspacePaths).toHaveBeenCalled()
		expect(mocks.verifyWrittenFile).toHaveBeenCalledWith({
			absolutePath: expect.stringMatching(/src[\\/]file\.ts$/),
			expectedMinBytes: 1,
		})
	})

	it("verifies apply_patch Add and Update targets, skipping Delete", async () => {
		const patch = [
			"*** Begin Patch",
			"*** Add File: /workspace/new.ts",
			"+const x = 1",
			"*** Update File: /workspace/existing.ts",
			"@@",
			"-old",
			"+new",
			"*** Delete File: /workspace/gone.ts",
			"*** End Patch",
		].join("\n")
		const hooks = buildAgentHooks(makeStateManager())
		const result = await hooks.afterTool?.(makeAfterToolCtx({ toolName: "apply_patch", input: { input: patch } }))
		expect(result).toBeUndefined()
		expect(mocks.verifyWrittenFile).toHaveBeenCalledTimes(2)
		expect(mocks.verifyWrittenFile).toHaveBeenCalledWith({
			absolutePath: "/workspace/new.ts",
			expectedMinBytes: 1,
		})
		expect(mocks.verifyWrittenFile).toHaveBeenCalledWith({
			absolutePath: "/workspace/existing.ts",
			expectedMinBytes: 0,
		})
	})

	it("treats an Add File block with no content lines as expectedMinBytes 0", async () => {
		const patch = ["*** Begin Patch", "*** Add File: /workspace/empty.ts", "*** End Patch"].join("\n")
		const hooks = buildAgentHooks(makeStateManager())
		await hooks.afterTool?.(makeAfterToolCtx({ toolName: "apply_patch", input: { input: patch } }))
		expect(mocks.verifyWrittenFile).toHaveBeenCalledWith({
			absolutePath: "/workspace/empty.ts",
			expectedMinBytes: 0,
		})
	})

	it("fails the apply_patch tool when any patch target fails verification", async () => {
		mocks.verifyWrittenFile
			.mockResolvedValueOnce({ ok: true, message: "ok" })
			.mockResolvedValueOnce({ ok: false, message: "Verification failed: existing.ts missing" })
		const patch = [
			"*** Begin Patch",
			"*** Add File: /workspace/new.ts",
			"+const x = 1",
			"*** Update File: /workspace/existing.ts",
			"@@",
			"-old",
			"+new",
			"*** End Patch",
		].join("\n")
		const hooks = buildAgentHooks(makeStateManager())
		const result = await hooks.afterTool?.(makeAfterToolCtx({ toolName: "apply_patch", input: { input: patch } }))
		expect(result).toEqual({
			result: {
				output: "Verification failed: existing.ts missing\nThe tool reported: write ok",
				isError: true,
			},
		})
	})
})
