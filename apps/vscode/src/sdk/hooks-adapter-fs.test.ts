// Real-filesystem integration for the iCline post-write verification chain.
//
// hooks-adapter.test.ts verifies the chain with a MOCKED verifier; this file
// exercises extract -> resolve -> verify against real disk — the pieces the
// combined harness audit listed as test gap #5 (real-host filesystem cases) and
// #6 (apply_patch move end to end). The executor half of a rename is pinned by
// sdk core's own apply-patch tests; this pins the harness half: what lands on
// disk is what gets verified, at the path the executor actually used.
//
// Only the build seams are mocked (registry, user hooks, host workspace, trace);
// `verifyWrittenFile` itself is the real one.

import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import type { AgentAfterToolContext } from "@cline/shared"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { buildAgentHooks } from "./hooks-adapter"

const mocks = vi.hoisted(() => ({
	isIclineBuild: vi.fn(() => true),
	getHooksEnabledSafe: vi.fn(() => false),
	getWorkspacePaths: vi.fn(async () => ({ paths: [] as string[] })),
	recordToolTrace: vi.fn(),
}))

vi.mock("@/registry", () => ({
	isIclineBuild: mocks.isIclineBuild,
}))

vi.mock("@/core/hooks/hooks-utils", () => ({
	getHooksEnabledSafe: mocks.getHooksEnabledSafe,
}))

vi.mock("@/core/hooks/hook-factory", () => ({
	HookFactory: class {
		hasHook = async () => false
		create = async () => ({ run: async () => ({}) })
	},
}))

vi.mock("@/hosts/host-provider", () => ({
	HostProvider: {
		workspace: {
			getWorkspacePaths: mocks.getWorkspacePaths,
		},
	},
}))

vi.mock("@/icline/harness/tool-trace", () => ({
	recordToolTrace: mocks.recordToolTrace,
}))

function makeStateManager() {
	return {
		getGlobalSettingsKey: vi.fn(() => false),
	} as unknown as Parameters<typeof buildAgentHooks>[0]
}

function makeAfterToolCtx(overrides: { toolName?: string; input?: unknown }): AgentAfterToolContext {
	const { toolName = "editor", input = {} } = overrides
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
		result: { output: "write ok", isError: false },
		startedAt: new Date(),
		endedAt: new Date(),
		durationMs: 5,
	} as unknown as AgentAfterToolContext
}

describe("hooks-adapter against real filesystem", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.isIclineBuild.mockReturnValue(true)
		mocks.getHooksEnabledSafe.mockReturnValue(false)
	})

	it("verifies the move destination on real disk after a rename landed (test gap #6)", async () => {
		// `*** Update File: old` + `*** Move to: new` is the canonical rename: the
		// executor applies the hunk at the destination and deletes the source
		// (`fs.rm(sourceAbsPath)`). Mirror that end state on disk, then let the
		// harness verify: it must pass at the DESTINATION (the source is gone, so
		// verifying it would report a false failure for a write that landed).
		const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "icline-move-"))
		await fs.mkdir(path.join(tmp, "old"))
		await fs.mkdir(path.join(tmp, "new"))
		await fs.writeFile(path.join(tmp, "old", "name.ts"), "old line")
		// executor: write updated content to the destination, delete the source
		await fs.writeFile(path.join(tmp, "new", "name.ts"), "new line")
		await fs.rm(path.join(tmp, "old", "name.ts"))

		const patch = [
			"*** Begin Patch",
			"*** Update File: old/name.ts",
			"*** Move to: new/name.ts",
			"@@",
			"-old line",
			"+new line",
			"*** End Patch",
		].join("\n")

		const hooks = buildAgentHooks(makeStateManager(), undefined, tmp)
		const result = await hooks.afterTool?.(makeAfterToolCtx({ toolName: "apply_patch", input: { input: patch } }))
		expect(result).toBeUndefined()
	})

	it("catches an existing file whose content differs from the full-file write (D10)", async () => {
		// Existence alone cannot see a stale file; the content hash can.
		const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "icline-hash-"))
		const target = path.join(tmp, "file.ts")
		await fs.writeFile(target, "stale content from an earlier run")

		const hooks = buildAgentHooks(makeStateManager(), undefined, tmp)
		const result = await hooks.afterTool?.(makeAfterToolCtx({ input: { path: target, new_text: "fresh content" } }))

		expect(result?.result?.isError).toBe(true)
		expect(String(result?.result?.output)).toContain("content does not match")
	})

	it("does not fail a real write whose line endings differ from new_text (D10)", async () => {
		// Windows executors rewrite EOL (normalizeNewFileLineEndings): a landed
		// write with CRLF on disk must verify against LF `new_text`.
		const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "icline-eol-"))
		const target = path.join(tmp, "file.ts")
		await fs.writeFile(target, "a\r\nb\r\n")

		const hooks = buildAgentHooks(makeStateManager(), undefined, tmp)
		const result = await hooks.afterTool?.(makeAfterToolCtx({ input: { path: target, new_text: "a\nb\n" } }))
		expect(result).toBeUndefined()
	})

	it("passes a real full-file create whose content matches (the quiet path)", async () => {
		const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "icline-ok-"))
		const target = path.join(tmp, "file.ts")
		await fs.writeFile(target, "body {}")

		const hooks = buildAgentHooks(makeStateManager(), undefined, tmp)
		const result = await hooks.afterTool?.(makeAfterToolCtx({ input: { path: target, new_text: "body {}" } }))
		expect(result).toBeUndefined()
	})
})
