import type {
	AgentConfig,
	AgentEvent,
	AgentHooks,
	AgentTool,
	BasicLogger,
	HookErrorMode,
	ITelemetryService,
	ToolApprovalRequest,
	ToolApprovalResult,
} from "@cline/shared";
import { SessionRuntime } from "../../../runtime/orchestration/session-runtime-orchestrator";
import {
	buildSubAgentSystemPrompt,
	buildTeammateSystemPrompt,
} from "./subagent-prompts";

type AgentExtension = NonNullable<AgentConfig["extensions"]>[number];

export type DelegatedAgentConnectionConfig = Pick<
	AgentConfig,
	| "providerId"
	| "modelId"
	| "apiKey"
	| "baseUrl"
	| "headers"
	| "onAuthError"
	| "providerConfig"
	| "knownModels"
	| "thinking"
	| "reasoningEffort"
	| "thinkingBudgetTokens"
	| "maxTokensPerTurn"
	| "temperature"
>;

export interface DelegatedAgentRuntimeConfig
	extends DelegatedAgentConnectionConfig {
	cwd?: string;
	providerId: string;
	clinePlatform?: string;
	clineIdeName?: string;
	maxIterations?: number;
	hooks?: AgentHooks;
	extensions?: AgentExtension[];
	logger?: BasicLogger;
	telemetry?: ITelemetryService;
	workspaceMetadata?: string;
	/**
	 * Stable end-user identity inherited from the parent session so
	 * delegated-agent telemetry (Langfuse `userId`) groups with the user.
	 */
	distinctId?: string;
	/**
	 * Root core session id inherited from the parent session so
	 * delegated-agent telemetry (Langfuse `sessionId`) groups with it.
	 */
	sessionId?: string;
}

export interface DelegatedAgentConfigProvider {
	getRuntimeConfig(): DelegatedAgentRuntimeConfig;
	getConnectionConfig(): DelegatedAgentConnectionConfig;
	updateConnectionDefaults(
		overrides: Partial<DelegatedAgentConnectionConfig>,
	): void;
}

export type DelegatedAgentKind = "subagent" | "teammate";

export interface BuildDelegatedAgentConfigOptions {
	kind: DelegatedAgentKind;
	prompt: string;
	tools: AgentTool[];
	configProvider: DelegatedAgentConfigProvider;
	parentAgentId?: string;
	maxIterations?: number;
	abortSignal?: AbortSignal;
	onEvent?: (event: AgentEvent) => void;
	hookErrorMode?: HookErrorMode;
	toolPolicies?: AgentConfig["toolPolicies"];
	requestToolApproval?: (
		request: ToolApprovalRequest,
	) => Promise<ToolApprovalResult> | ToolApprovalResult;
	role?: string;
	cwd?: string;
	/** Per-agent model override (team panel: each teammate can pick its own model). */
	modelId?: string;
	/** Per-agent provider override paired with `modelId`. */
	providerId?: string;
	/**
	 * Per-turn output token cap for the delegated agent (team budget). Applied
	 * over the inherited connection cap when set.
	 */
	maxTokensPerTurn?: number;
}

export function createDelegatedAgentConfigProvider(
	initialConfig: DelegatedAgentRuntimeConfig,
): DelegatedAgentConfigProvider {
	let runtimeConfig: DelegatedAgentRuntimeConfig = { ...initialConfig };

	return {
		getRuntimeConfig: () => runtimeConfig,
		getConnectionConfig: () => ({
			providerId: runtimeConfig.providerId,
			modelId: runtimeConfig.modelId,
			apiKey: runtimeConfig.apiKey,
			baseUrl: runtimeConfig.baseUrl,
			headers: runtimeConfig.headers,
			onAuthError: runtimeConfig.onAuthError,
			providerConfig: runtimeConfig.providerConfig,
			knownModels: runtimeConfig.knownModels,
			thinking: runtimeConfig.thinking,
			reasoningEffort: runtimeConfig.reasoningEffort,
			thinkingBudgetTokens: runtimeConfig.thinkingBudgetTokens,
			maxTokensPerTurn: runtimeConfig.maxTokensPerTurn,
			temperature: runtimeConfig.temperature,
		}),
		updateConnectionDefaults: (overrides) => {
			runtimeConfig = {
				...runtimeConfig,
				...overrides,
			};
		},
	};
}

export function buildDelegatedAgentConfig(
	options: BuildDelegatedAgentConfigOptions,
): AgentConfig & { role?: string } {
	const runtimeConfig = options.configProvider.getRuntimeConfig();
	const systemPrompt =
		options.kind === "teammate"
			? buildTeammateSystemPrompt(options.prompt, runtimeConfig)
			: buildSubAgentSystemPrompt(options.prompt, runtimeConfig);

	return {
		...options.configProvider.getConnectionConfig(),
		...(options.modelId !== undefined ? { modelId: options.modelId } : {}),
		...(options.providerId !== undefined ? { providerId: options.providerId } : {}),
		...(options.maxTokensPerTurn !== undefined
			? { maxTokensPerTurn: options.maxTokensPerTurn }
			: {}),
		distinctId: runtimeConfig.distinctId,
		sessionId: runtimeConfig.sessionId,
		systemPrompt,
		tools: options.tools,
		maxIterations: options.maxIterations ?? runtimeConfig.maxIterations,
		parentAgentId: options.parentAgentId,
		abortSignal: options.abortSignal,
		onEvent: options.onEvent,
		hooks: runtimeConfig.hooks,
		extensions: runtimeConfig.extensions,
		hookErrorMode: options.hookErrorMode,
		toolPolicies: options.toolPolicies,
		// Stamp delegated approval requests with their caller kind so the host's
		// auto-approval rules can treat teammate/sub-agent work differently from
		// the session's own tool calls (e.g. team reads vs team writes).
		requestToolApproval: options.requestToolApproval
			? (request) =>
					options.requestToolApproval!({
						...request,
						callerKind: options.kind,
					})
			: undefined,
		logger: runtimeConfig.logger,
		role: options.role,
	};
}

export function createDelegatedAgent(
	options: BuildDelegatedAgentConfigOptions,
): SessionRuntime {
	const config = buildDelegatedAgentConfig(options);
	const session = new SessionRuntime(config);
	if (config.onEvent) {
		session.subscribeEvents(config.onEvent);
	}
	return session;
}
