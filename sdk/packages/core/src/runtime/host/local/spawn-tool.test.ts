import type { AgentConfig, AgentTool, ToolApprovalRequest } from "@cline/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CoreSessionConfig } from "../../../types/config";

const createSpawnAgentToolSpy = vi.fn();

vi.mock("../../../extensions/tools/team", () => ({
	createSpawnAgentTool: (config: unknown) => {
		createSpawnAgentToolSpy(config);
		return {
			name: "spawn_agent",
			description: "spawn",
			inputSchema: { type: "object" },
			execute: async () => ({ text: "", iterations: 0, finishReason: "completed", usage: { inputTokens: 0, outputTokens: 0 } }),
		} as AgentTool;
	},
}));

const baseConfig = {
	cwd: "/workspace",
	providerId: "test",
	modelId: "test-model",
	enableTools: true,
	enableSpawnAgent: true,
	mode: "act",
	systemPrompt: "test",
} as unknown as CoreSessionConfig;

function spawnDeps() {
	return {
		getSession: () => undefined,
		subAgentStarts: new Map(),
		onAgentEvent: () => {},
		invokeBackendOptional: async () => {},
	};
}

describe("createSessionSpawnTool", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("forwards host extraTools (terminal-backed run_commands) to sub-agents", async () => {
		const { createSessionSpawnTool } = await import("./spawn-tool.js");
		const customRunCommands: AgentTool = {
			name: "run_commands",
			description: "terminal-backed shell",
			inputSchema: { type: "object" },
			execute: async () => "ok",
		};
		const config: CoreSessionConfig = {
			...baseConfig,
			extraTools: [customRunCommands],
		};

		createSessionSpawnTool(spawnDeps(), config, "session-1");

		expect(createSpawnAgentToolSpy).toHaveBeenCalledTimes(1);
		const options = createSpawnAgentToolSpy.mock.calls[0][0] as {
			createSubAgentTools: () => AgentTool[];
		};
		const subAgentTools = options.createSubAgentTools();
		const runCommands = subAgentTools.find(
			(tool) => tool.name === "run_commands",
		);
		// The sub-agent must see the host's terminal tool, not go without one.
		expect(runCommands).toBe(customRunCommands);
	});

	it("forwards the session tool policies and approval callback to sub-agents", async () => {
		const { createSessionSpawnTool } = await import("./spawn-tool.js");
		const toolPolicies: AgentConfig["toolPolicies"] = {
			run_commands: { enabled: true, autoApprove: false },
		};
		const requestToolApproval = vi.fn(
			async (_request: ToolApprovalRequest) => ({
				approved: true,
			}),
		);

		createSessionSpawnTool(spawnDeps(), baseConfig, "session-1", undefined, {
			toolPolicies,
			requestToolApproval,
		});

		const options = createSpawnAgentToolSpy.mock.calls[0][0] as {
			toolPolicies?: AgentConfig["toolPolicies"];
			requestToolApproval?: (request: ToolApprovalRequest) => Promise<{ approved: boolean }>;
		};
		expect(options.toolPolicies).toBe(toolPolicies);
		expect(options.requestToolApproval).toBe(requestToolApproval);
	});

	it("omits approval wiring when none is provided instead of blocking tools", async () => {
		const { createSessionSpawnTool } = await import("./spawn-tool.js");

		createSessionSpawnTool(spawnDeps(), baseConfig, "session-1");

		const options = createSpawnAgentToolSpy.mock.calls[0][0] as Record<
			string,
			unknown
		>;
		expect("toolPolicies" in options).toBe(false);
		expect("requestToolApproval" in options).toBe(false);
	});
});
