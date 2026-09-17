import { describe, expect, it, vi } from "vitest"

vi.mock("@shared/services/Logger", () => ({
	Logger: {
		debug: vi.fn(),
		log: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}))

import { createVscodeExtraTools } from "./vscode-runtime-builder"

describe("createVscodeExtraTools", () => {
	it("marks attempt_completion as a run-completing tool so the agent loop ends on completion", async () => {
		const mcpHub = { getServers: () => [] } as any

		const tools = await createVscodeExtraTools(mcpHub as any, { cwd: "/tmp/workspace" })

		const completion = tools.find((tool) => tool.name === "attempt_completion")
		expect(completion).toBeDefined()
		// Without this flag the agent runtime never treats the completion as
		// terminal (findCompletingToolMessage), so the completion text echoes
		// back as a tool_result and the model answers with another
		// attempt_completion — repeated "Task Completed" rows and wasted
		// full-context requests until a plain-text reply ends the turn.
		expect(completion?.lifecycle?.completesRun).toBe(true)
	})
})
