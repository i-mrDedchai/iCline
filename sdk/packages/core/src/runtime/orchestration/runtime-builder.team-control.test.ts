import { describe, expect, it, vi } from "vitest";

class MockAgentTeamsRuntime {
	members: Array<{ agentId: string; role: string; status: string }> = [
		{ agentId: "sess-1", role: "lead", status: "idle" },
	];
	exportState = vi.fn(() => ({
		teamId: "team_1",
		teamName: "panel-team",
		members: this.members,
		tasks: [],
		mailbox: [],
		missionLog: [],
		runs: [],
		outcomes: [],
		outcomeFragments: [],
	}));
	spawnTeammate = vi.fn();
	shutdownTeammate = vi.fn();
	getTeammateIds = vi.fn(() => []);
	hydrateState = vi.fn();
	markStaleRunsInterrupted = vi.fn();
	recoverActiveRuns = vi.fn();
}

let runtimeInstance: MockAgentTeamsRuntime | undefined;
const spawnTeamTeammateMock = vi.fn();

vi.mock("../../extensions/tools/team", () => ({
	AgentTeamsRuntime: class {
		constructor() {
			runtimeInstance = new MockAgentTeamsRuntime();
			return runtimeInstance;
		}
	},
	bootstrapAgentTeams: vi.fn(() => ({
		tools: [],
		restoredFromPersistence: false,
		restoredTeammates: [],
	})),
	spawnTeamTeammate: spawnTeamTeammateMock,
	createDelegatedAgentConfigProvider: (config: Record<string, unknown>) => ({
		getRuntimeConfig: () => ({ ...config, cwd: process.cwd() }),
		getConnectionConfig: () => ({
			providerId: config.providerId,
			modelId: config.modelId,
		}),
		updateConnectionDefaults: () => {},
	}),
}));

vi.mock("../../extensions/tools", () => ({
	ALL_DEFAULT_TOOL_NAMES: [],
	createBuiltinTools: vi.fn(() => []),
	createBuiltinToolsList: vi.fn(() => []),
	ToolPresets: {
		development: {},
		readonly: {},
	},
	resolveToolPresetName: () => "development",
	resolveToolRoutingConfig: () => [],
	DEFAULT_MODEL_TOOL_ROUTING_RULES: [],
}));

vi.mock("../../services/storage/team-store", () => ({
	createLocalTeamStore: () => ({
		loadRuntime: vi.fn(() => undefined),
		handleTeamEvent: vi.fn(),
		persistRuntime: vi.fn(),
	}),
}));

describe("DefaultRuntimeBuilder.getTeamControl", () => {
	async function buildWithTeams() {
		const { DefaultRuntimeBuilder } = await import("./runtime-builder");
		const builder = new DefaultRuntimeBuilder();
		await builder.build({
			config: {
				providerId: "anthropic",
				modelId: "claude-sonnet-4-6",
				apiKey: "key",
				systemPrompt: "test",
				cwd: process.cwd(),
				sessionId: "sess-1",
				enableTools: true,
				enableSpawnAgent: false,
				enableAgentTeams: true,
			},
		});
		return builder;
	}

	it("exposes team state for the session", async () => {
		const builder = await buildWithTeams();
		const control = builder.getTeamControl("sess-1");
		expect(control).toBeDefined();
		const state = control?.getState();
		expect(state?.teamName).toBe("panel-team");
		expect(state?.members).toEqual([
			{ agentId: "sess-1", role: "lead", status: "idle" },
		]);
	});

	it("returns undefined for sessions without a team runtime", async () => {
		const builder = await buildWithTeams();
		expect(builder.getTeamControl("other-session")).toBeUndefined();
	});

	it("spawns a teammate through the full spawn recipe and shuts it down", async () => {
		const builder = await buildWithTeams();
		const control = builder.getTeamControl("sess-1");
		control?.spawnTeammate({
			agentId: "bench",
			rolePrompt: "benchmark owner",
			modelId: "gpt-5.6",
			providerId: "openai",
		});
		expect(spawnTeamTeammateMock).toHaveBeenCalledWith(
			expect.objectContaining({
				requesterId: "sess-1",
				spec: {
					agentId: "bench",
					rolePrompt: "benchmark owner",
					modelId: "gpt-5.6",
					providerId: "openai",
				},
			}),
		);
		control?.shutdownTeammate("bench", "panel");
		expect(runtimeInstance?.shutdownTeammate).toHaveBeenCalledWith(
			"bench",
			"panel",
		);
	});
});
