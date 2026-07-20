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
}))

vi.mock("@/registry", () => ({
	isIclineBuild: mocks.isIclineBuild,
}))

vi.mock("@/icline/harness/guardrails", () => ({
	verifyWrittenFile: mocks.verifyWrittenFile,
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
		result: { output: "write ok", isError },
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

	it("replaces the tool result with an error when verification fails", async () => {
		mocks.verifyWrittenFile.mockResolvedValue({ ok: false, message: "Verification failed: file.ts is empty" })
		const hooks = buildAgentHooks(makeStateManager())
		const result = await hooks.afterTool?.(makeAfterToolCtx({}))
		expect(result).toEqual({
			result: {
				output: "Verification failed: file.ts is empty",
				isError: true,
			},
		})
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
				output: "Verification failed: existing.ts missing",
				isError: true,
			},
		})
	})
})
