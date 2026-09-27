import { resolveProviderConfig } from "@cline/core"
import type { ProviderConfig, ModelInfo as SdkModelInfo } from "@cline/llms"
import { resolveDataDir } from "./legacy-state-reader"
import { getProviderSettingsManager } from "./provider-migration"

/**
 * The merged model map a session hands the SDK gateway: generated ∪ bundled ∪
 * live catalog ∪ private ∪ public ∪ user overrides (`resolveProviderConfig`),
 * with the user's custom models in the picture.
 *
 * Extracted from `cline-session-factory` so two consumers cannot drift apart:
 *
 * - the session factory, which stores the result as `providerConfig.knownModels`
 *   — the map `createAgentModelFromConfig` turns into the gateway's configured
 *   models (the entries `GatewayRegistry.resolveModel` resolves against), and
 * - `reasoning-effort-decision`, which must answer "what will this Effort level
 *   really send?" from the SAME entries, not from the narrower builtin registry.
 *
 * The call mirrors the factory's exactly (same catalog flags, same config
 * shape), because those arguments decide which catalogs join the merge —
 * e.g. `loadLatestOnInit` is what puts live-catalog-only models (and their
 * `reasoningOptions`) into the map the gateway resolves.
 */
export async function resolveSessionKnownModels(input: {
	sdkProviderId: string
	modelId?: string
	apiKey?: string
	baseUrl?: string
}): Promise<Record<string, SdkModelInfo> | undefined> {
	// Constructing the settings manager loads providers.json and models.json into
	// the @cline/llms registry, keeping user custom-model overrides in the picture.
	getProviderSettingsManager(resolveDataDir())
	const resolved = await resolveProviderConfig(
		input.sdkProviderId,
		{ loadLatestOnInit: true, loadPrivateOnAuth: true, failOnError: false },
		{
			providerId: input.sdkProviderId,
			modelId: input.modelId ?? "",
			...(input.apiKey ? { apiKey: input.apiKey } : {}),
			...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
		} as ProviderConfig,
	)
	return resolved?.knownModels
}
