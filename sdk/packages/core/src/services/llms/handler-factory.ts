import {
	createGateway,
	createHandlerAsync,
	fillCrossProviderModelInfo,
	getModelsForProviderSync,
	hasRegisteredHandler,
	normalizeProviderId,
	resolveProviderRegistrationSync,
	toGatewayModelCapabilities,
} from "@cline/llms";
import type {
	AgentConfig,
	AgentModel,
	BasicLogger,
	GatewayModelDefinition,
	ITelemetryService,
	ModelInfo,
} from "@cline/shared";
import { createAgentModelFromApiHandler } from "./apihandler-agent-model-adapter";
import type { ProviderConfig } from "./provider-settings";

function compactOptions(
	options: Record<string, unknown>,
): Record<string, unknown> | undefined {
	const compacted = Object.fromEntries(
		Object.entries(options).filter(([, value]) => value !== undefined),
	);
	return Object.keys(compacted).length > 0 ? compacted : undefined;
}

function usesOpenAICompatibleClient(config: ProviderConfig): boolean {
	return (
		config.providerId === "openai-compatible" ||
		config.clientType === "openai-compatible"
	);
}

function buildGatewayProviderOptions(
	config: ProviderConfig,
): Record<string, unknown> | undefined {
	const options: Record<string, unknown> = {
		region: config.region,
		apiLine: config.apiLine,
		openRouterProviderSorting: config.openRouterProviderSorting,
		modelCatalog: config.modelCatalog,
	};

	if (usesOpenAICompatibleClient(config)) {
		Object.assign(options, {
			apiVersion: config.azure?.apiVersion,
			useIdentity: config.azure?.useIdentity,
		});
	}

	if (config.providerId === "bedrock") {
		Object.assign(options, {
			authentication: config.aws?.authentication,
			profile: config.aws?.profile,
			accessKeyId: config.aws?.accessKey,
			secretAccessKey: config.aws?.secretKey,
			sessionToken: config.aws?.sessionToken,
			usePromptCache: config.aws?.usePromptCache,
			useCrossRegionInference: config.useCrossRegionInference,
			useGlobalInference: config.useGlobalInference,
			endpoint: config.aws?.endpoint,
			customModelBaseId: config.aws?.customModelBaseId,
		});
	}

	if (config.providerId === "vertex") {
		const gcpRegion = config.gcp?.region ?? config.region;
		Object.assign(options, {
			project: config.gcp?.projectId,
			projectId: config.gcp?.projectId,
			location: gcpRegion,
			region: gcpRegion,
		});
	}

	if (config.providerId === "claude-code") {
		// The Claude Code CLI executes its own tools, so its session must be
		// anchored on the workspace. Without an explicit cwd the spawned CLI
		// inherits the host process cwd — `/` in GUI extension hosts — and
		// then refuses writes outside its allowed working directories.
		const workspace = config.extensionContext?.workspace;
		Object.assign(options, {
			cwd: workspace?.cwd ?? workspace?.rootPath,
		});
	}

	if (config.providerId === "sapaicore") {
		Object.assign(options, config.sap);
	}

	return compactOptions(options);
}

function readPositiveInteger(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value > 0
		? Math.floor(value)
		: undefined;
}

export function resolveKnownModelsFromConfig(
	config: AgentConfig,
): Record<string, ModelInfo> | undefined {
	const pc = config.providerConfig as ProviderConfig | undefined;
	// Registry lookup goes through getModelsForProviderSync: the collection view
	// (MODEL_COLLECTIONS_BY_PROVIDER_ID[...].models) does not include models
	// registered at runtime (models.json `registerModel` entries), so reading it
	// directly dropped their declared limits (e.g. a 1M contextWindow) and the
	// runtime budgeted against fabricated defaults instead.
	const registryModels = getModelsForProviderSync(config.providerId);
	const knownModels = pc?.knownModels
		? pc.knownModels
		: (config.knownModels ??
			(Object.keys(registryModels).length > 0 ? registryModels : undefined));
	// The selected model may be unknown to this provider slot (a custom
	// gateway selling a catalog model id) while the bundled catalog describes
	// it under other provider keys. Surface that metadata — fill-only, never
	// overriding declared values — so the gateway budgets against the real
	// context window instead of fabricated defaults.
	const selectedBase = fillCrossProviderModelInfo(
		knownModels?.[config.modelId],
		config.modelId,
	);
	const withSelected =
		knownModels === undefined && selectedBase === undefined
			? undefined
			: {
					...(knownModels ?? {}),
					...(selectedBase ? { [config.modelId]: selectedBase } : {}),
				};
	// Caller-configured limits are authoritative for the selected model —
	// surface them to the gateway so the resolved model definition carries
	// the right limits (e.g. Ollama's num_ctx derives from the resolved
	// model's context window):
	//  - `maxInputTokens` is where `ProviderSettings.contextWindow` lands via
	//    `toProviderConfig` (the providers.json path used by CLI/Core hosts).
	//  - `modelInfo` is an explicit per-model override (the VS Code path);
	//    it wins over the generic limit.
	const configuredContextWindow = readPositiveInteger(pc?.maxInputTokens);
	const modelInfo =
		pc?.modelInfo && pc.modelInfo.id === config.modelId
			? pc.modelInfo
			: undefined;
	if (configuredContextWindow === undefined && !modelInfo) {
		return withSelected;
	}
	return {
		...(withSelected ?? {}),
		[config.modelId]: {
			...withSelected?.[config.modelId],
			...(configuredContextWindow !== undefined
				? {
						contextWindow: configuredContextWindow,
						maxInputTokens: configuredContextWindow,
					}
				: {}),
			...modelInfo,
			id: config.modelId,
		},
	};
}

function toGatewayConfiguredModel(
	id: string,
	model: ModelInfo,
): Omit<GatewayModelDefinition, "providerId"> {
	return {
		id,
		name: model.name ?? id,
		description: model.description,
		contextWindow: model.contextWindow,
		maxInputTokens: model.maxInputTokens,
		maxOutputTokens: model.maxTokens,
		operation: model.operation,
		operationModes: model.operationModes,
		modalities: model.modalities,
		capabilities: toGatewayModelCapabilities(model.capabilities),
		reasoningOptions: model.reasoningOptions,
		metadata: {
			family: model.family,
			pricing: model.pricing,
			status: model.status,
			releaseDate: model.releaseDate,
		},
	};
}

export type ConnectionConfig = Pick<
	AgentConfig,
	"providerId" | "modelId" | "apiKey" | "baseUrl" | "headers" | "providerConfig"
>;

/**
 * Resolve the provider connection for a request from the live session config.
 * Top-level fields win over the nested `providerConfig` snapshot, and the
 * snapshot only contributes when it describes the same provider, so a token
 * refresh or connection change written to the top level applies to every
 * request built afterwards. Every request builder (main agent, compaction
 * summarizer) must go through this so they never disagree on credentials.
 */
export function resolveConnectionProviderConfig(
	config: ConnectionConfig,
): ProviderConfig {
	const pc = config.providerConfig as ProviderConfig | undefined;
	const base = pc?.providerId === config.providerId ? pc : undefined;
	return {
		...(base ?? {}),
		providerId: config.providerId,
		modelId: config.modelId,
		apiKey: config.apiKey ?? base?.apiKey,
		baseUrl: config.baseUrl ?? base?.baseUrl,
		headers: config.headers ?? base?.headers,
	};
}

export function createAgentModelFromConfig(
	config: AgentConfig,
	logger: BasicLogger | undefined,
	telemetry?: ITelemetryService,
): AgentModel {
	const normalizedProviderConfig: ProviderConfig = {
		...resolveConnectionProviderConfig(config),
		knownModels: resolveKnownModelsFromConfig(config),
		maxOutputTokens: config.maxTokensPerTurn,
		temperature: config.temperature,
		reasoningEffort: config.reasoningEffort,
		thinkingBudgetTokens: config.thinkingBudgetTokens,
		thinking: config.thinking,
		logger,
		extensionContext: config.extensionContext,
	};

	// Host-registered custom handlers (e.g. VS Code LM, which needs the host's
	// `vscode.lm` API) are not part of the gateway. When a handler is registered
	// for this provider, adapt its `ApiHandler` surface onto the `AgentModel`
	// contract the runtime expects. The handler is built lazily (via
	// `createHandlerAsync`) on the first stream so that providers registered
	// with `registerAsyncHandler` resolve correctly.
	if (
		hasRegisteredHandler(
			normalizeProviderId(normalizedProviderConfig.providerId),
		)
	) {
		return createAgentModelFromApiHandler(() =>
			createHandlerAsync(normalizedProviderConfig),
		);
	}

	// A user-created provider id is not in the gateway's built-in set, so its
	// manifest must be registered explicitly. Without it the gateway rejects the
	// id with "Unknown or disabled provider" at chat time, even though the
	// provider's settings and models are saved.
	const registration = resolveProviderRegistrationSync(normalizedProviderConfig);

	return createGateway({
		// Forward the host-provided fetch so inference honors proxy/CA config on
		// JetBrains and CLI, where the global fetch is not proxy-aware. Without
		// this the agent loop falls back to bare global fetch and corporate
		// proxy/self-signed CA setups fail.
		fetch: normalizedProviderConfig.fetch,
		providers: registration ? [registration] : undefined,
		providerConfigs: [
			{
				providerId: normalizedProviderConfig.providerId,
				apiKey: normalizedProviderConfig.apiKey,
				baseUrl: normalizedProviderConfig.baseUrl,
				headers: normalizedProviderConfig.headers,
				timeoutMs: normalizedProviderConfig.timeoutMs,
				fetch: normalizedProviderConfig.fetch,
				options: buildGatewayProviderOptions(normalizedProviderConfig),
				models: normalizedProviderConfig.knownModels
					? Object.entries(normalizedProviderConfig.knownModels).map(
							([id, model]) => toGatewayConfiguredModel(id, model),
						)
					: undefined,
			},
		],
		logger,
		telemetry:
			telemetry ?? config.telemetry ?? config.extensionContext?.telemetry,
	}).createAgentModel(
		{
			providerId: normalizedProviderConfig.providerId,
			modelId: normalizedProviderConfig.modelId,
		},
		{
			maxTokens: normalizedProviderConfig.maxOutputTokens,
			temperature: normalizedProviderConfig.temperature,
		},
	);
}
