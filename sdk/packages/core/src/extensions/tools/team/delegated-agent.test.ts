import { describe, expect, it } from "vitest";
import {
	buildDelegatedAgentConfig,
	createDelegatedAgentConfigProvider,
} from "./delegated-agent";

describe("buildDelegatedAgentConfig", () => {
	it("inherits the parent distinctId and sessionId for telemetry grouping", () => {
		const configProvider = createDelegatedAgentConfigProvider({
			providerId: "anthropic",
			modelId: "claude-sonnet-4-5",
			distinctId: "user-123",
			sessionId: "sess-parent",
		});

		const config = buildDelegatedAgentConfig({
			kind: "subagent",
			prompt: "review the diff",
			tools: [],
			configProvider,
			parentAgentId: "agent-lead",
		});

		expect(config.distinctId).toBe("user-123");
		expect(config.sessionId).toBe("sess-parent");
		expect(config.parentAgentId).toBe("agent-lead");
	});

	it("applies per-agent modelId/providerId overrides over the parent connection", () => {
		const configProvider = createDelegatedAgentConfigProvider({
			providerId: "anthropic",
			modelId: "claude-sonnet-4-5",
		});

		const config = buildDelegatedAgentConfig({
			kind: "teammate",
			prompt: "own the benchmarks",
			tools: [],
			configProvider,
			modelId: "gpt-5.6",
			providerId: "openai",
		});

		expect(config.modelId).toBe("gpt-5.6");
		expect(config.providerId).toBe("openai");
	});

	it("keeps the parent model when no override is given", () => {
		const configProvider = createDelegatedAgentConfigProvider({
			providerId: "anthropic",
			modelId: "claude-sonnet-4-5",
		});

		const config = buildDelegatedAgentConfig({
			kind: "teammate",
			prompt: "own the benchmarks",
			tools: [],
			configProvider,
		});

		expect(config.modelId).toBe("claude-sonnet-4-5");
		expect(config.providerId).toBe("anthropic");
	});

	it("leaves identity fields undefined when the parent has none", () => {
		const configProvider = createDelegatedAgentConfigProvider({
			providerId: "anthropic",
			modelId: "claude-sonnet-4-5",
		});

		const config = buildDelegatedAgentConfig({
			kind: "subagent",
			prompt: "review the diff",
			tools: [],
			configProvider,
		});

		expect(config.distinctId).toBeUndefined();
		expect(config.sessionId).toBeUndefined();
	});
});
