import {
	type ApiConfiguration,
	type ApiProvider,
	type ModelInfo,
	type OcaModelInfo,
	getXaiModelsForAuth,
	openRouterDefaultModelId,
	openRouterDefaultModelInfo,
	requestyDefaultModelId,
	requestyDefaultModelInfo,
	sakanaDefaultModelId,
	sakanaDefaultModelInfo,
	sakanaModels,
	zenmuxDefaultModelId,
	zenmuxDefaultModelInfo,
} from "@shared/api"
import PROVIDERS from "@shared/providers/providers.json"
import { isOpenaiReasoningEffort, type Mode, type OpenaiReasoningEffort } from "@shared/storage/types"
import { isClaudeOpusAdaptiveThinkingModel, resolveClaudeOpusAdaptiveThinking } from "@shared/utils/reasoning-support"
import { getChatModelPreference } from "@/components/chat/chatModelPreferences"
import {
	getModeSpecificFields,
	getModelsForProvider,
	normalizeApiConfiguration,
	supportsReasoningEffortForModelId,
} from "@/components/settings/utils/providerUtils"
import { PlatformType } from "@/config/platform.config"
import { getProviderLabel } from "@/utils/getConfiguredProviders"

export interface ChatModelEntry {
	id: string
	displayName: string
	modelInfo?: ModelInfo
}

export interface ChatProviderGroup {
	provider: ApiProvider
	label: string
	subtitle?: string
	models: ChatModelEntry[]
	isLoading?: boolean
}

export interface ChatModelPickerContext {
	apiConfiguration: ApiConfiguration | undefined
	mode: Mode
	platformType?: PlatformType
	isClinePassEnabled?: boolean
	remoteConfigSettings?: { remoteConfiguredProviders?: ApiProvider[] }
	xaiOAuthIsAuthenticated?: boolean
	xaiGrokCliIsAuthenticated?: boolean
	xaiSubscriptionModels: Record<string, ModelInfo>
	openRouterModels: Record<string, ModelInfo>
	clineModels: Record<string, ModelInfo> | null
	zenmuxModels: Record<string, ModelInfo>
	requestyModels: Record<string, ModelInfo>
	vercelAiGatewayModels: Record<string, ModelInfo>
	groqModels: Record<string, ModelInfo>
	basetenModels: Record<string, ModelInfo>
	huggingFaceModels: Record<string, ModelInfo>
	hicapModels: Record<string, ModelInfo>
	liteLlmModels: Record<string, ModelInfo>
}

const ICLINE_PRIORITY_PROVIDERS: ApiProvider[] = ["xai", "zenmux", "sakana"]

const DYNAMIC_MODEL_PROVIDERS = new Set<ApiProvider>([
	"openrouter",
	"cline",
	"zenmux",
	"requesty",
	"vercel-ai-gateway",
	"groq",
	"baseten",
	"huggingface",
	"hicap",
	"litellm",
])

export function formatModelDisplayName(modelId: string, modelInfo?: ModelInfo): string {
	if (modelInfo?.name && modelInfo.name !== modelId) {
		return modelInfo.name
	}
	return modelId
		.split(/[-_/]/)
		.map((part) => (part.length <= 3 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
		.join(" ")
}

function modelsRecordToEntries(models: Record<string, ModelInfo> | undefined | null): ChatModelEntry[] {
	if (!models) {
		return []
	}
	return Object.entries(models)
		.map(([id, info]) => ({
			id,
			displayName: formatModelDisplayName(id, info),
			modelInfo: info,
		}))
		.sort((a, b) => a.displayName.localeCompare(b.displayName))
}

function getXaiGroupSubtitle(ctx: ChatModelPickerContext): string | undefined {
	const oauthConnected = !!ctx.xaiOAuthIsAuthenticated
	const cliOnlyConnected = !!ctx.xaiGrokCliIsAuthenticated && !oauthConnected
	const hasApiKey = !!ctx.apiConfiguration?.xaiApiKey?.trim()

	if (oauthConnected) {
		return "SuperGrok / Premium+"
	}
	if (cliOnlyConnected) {
		return "Grok CLI"
	}
	if (hasApiKey) {
		return "API key"
	}
	return undefined
}

function getStoredModelIdForProvider(provider: ApiProvider, ctx: ChatModelPickerContext): string | undefined {
	const fields = getModeSpecificFields(ctx.apiConfiguration, ctx.mode)
	switch (provider) {
		case "openrouter":
			return fields.openRouterModelId
		case "cline":
			return fields.clineModelId
		case "cline-pass":
			return fields.clinePassModelId
		case "requesty":
			return fields.requestyModelId
		case "zenmux":
			return fields.zenmuxModelId
		case "sakana":
			return fields.sakanaModelId
		case "openai":
			return fields.openAiModelId
		case "ollama":
			return fields.ollamaModelId
		case "lmstudio":
			return fields.lmStudioModelId
		case "jan":
			return fields.janModelId
		case "litellm":
			return fields.liteLlmModelId
		case "groq":
			return fields.groqModelId
		case "huggingface":
			return fields.huggingFaceModelId
		case "baseten":
			return fields.basetenModelId
		case "together":
			return fields.togetherModelId
		case "fireworks":
			return fields.fireworksModelId
		case "hicap":
			return fields.hicapModelId
		case "vercel-ai-gateway":
			return fields.vercelAiGatewayModelId
		case "aihubmix":
			return fields.aihubmixModelId
		case "nousResearch":
			return fields.nousResearchModelId
		case "huawei-cloud-maas":
			return fields.huaweiCloudMaasModelId
		case "oca":
			return fields.ocaModelId
		default:
			if (fields.apiProvider === provider) {
				return fields.apiModelId
			}
			return undefined
	}
}

function getModelsForProviderInPicker(
	provider: ApiProvider,
	ctx: ChatModelPickerContext,
): { models: Record<string, ModelInfo> | undefined; isLoading: boolean } {
	switch (provider) {
		case "xai":
			return {
				models: getXaiModelsForAuth({
					subscriptionAuthenticated: !!ctx.xaiOAuthIsAuthenticated || !!ctx.xaiGrokCliIsAuthenticated,
					hasApiKey: !!ctx.apiConfiguration?.xaiApiKey?.trim(),
					xaiSubscriptionModels: ctx.xaiSubscriptionModels,
				}),
				isLoading: false,
			}
		case "openrouter":
			return {
				models: Object.keys(ctx.openRouterModels).length > 0 ? ctx.openRouterModels : undefined,
				isLoading: Object.keys(ctx.openRouterModels).length === 0,
			}
		case "cline":
			return {
				models: ctx.clineModels ?? undefined,
				isLoading: ctx.clineModels === null,
			}
		case "zenmux":
			return {
				models: Object.keys(ctx.zenmuxModels).length > 0 ? ctx.zenmuxModels : undefined,
				isLoading: Object.keys(ctx.zenmuxModels).length === 0,
			}
		case "sakana":
			return { models: sakanaModels, isLoading: false }
		case "requesty":
			return {
				models: Object.keys(ctx.requestyModels).length > 0 ? ctx.requestyModels : undefined,
				isLoading: Object.keys(ctx.requestyModels).length === 0,
			}
		case "vercel-ai-gateway":
			return {
				models: Object.keys(ctx.vercelAiGatewayModels).length > 0 ? ctx.vercelAiGatewayModels : undefined,
				isLoading: Object.keys(ctx.vercelAiGatewayModels).length === 0,
			}
		case "groq":
			return {
				models: Object.keys(ctx.groqModels).length > 0 ? ctx.groqModels : undefined,
				isLoading: Object.keys(ctx.groqModels).length === 0,
			}
		case "baseten":
			return {
				models: Object.keys(ctx.basetenModels).length > 0 ? ctx.basetenModels : undefined,
				isLoading: Object.keys(ctx.basetenModels).length === 0,
			}
		case "huggingface":
			return {
				models: Object.keys(ctx.huggingFaceModels).length > 0 ? ctx.huggingFaceModels : undefined,
				isLoading: Object.keys(ctx.huggingFaceModels).length === 0,
			}
		case "hicap":
			return {
				models: Object.keys(ctx.hicapModels).length > 0 ? ctx.hicapModels : undefined,
				isLoading: Object.keys(ctx.hicapModels).length === 0,
			}
		case "litellm":
			return {
				models: Object.keys(ctx.liteLlmModels).length > 0 ? ctx.liteLlmModels : undefined,
				isLoading: Object.keys(ctx.liteLlmModels).length === 0,
			}
		default:
			return {
				models: getModelsForProvider(provider, ctx.apiConfiguration, {
					liteLlmModels: ctx.liteLlmModels,
					basetenModels: ctx.basetenModels,
				}),
				isLoading: false,
			}
	}
}

function getProviderGroupLabel(provider: ApiProvider): string {
	const entry = PROVIDERS.list.find((p) => p.value === provider)
	return entry?.label ?? getProviderLabel(provider)
}

function sortProviders(providers: ApiProvider[], selectedProvider: ApiProvider): ApiProvider[] {
	const unique = [...new Set(providers)]
	return unique.sort((a, b) => {
		if (a === selectedProvider) return -1
		if (b === selectedProvider) return 1
		const aPriority = ICLINE_PRIORITY_PROVIDERS.indexOf(a)
		const bPriority = ICLINE_PRIORITY_PROVIDERS.indexOf(b)
		if (aPriority !== -1 || bPriority !== -1) {
			if (aPriority === -1) return 1
			if (bPriority === -1) return -1
			return aPriority - bPriority
		}
		return getProviderGroupLabel(a).localeCompare(getProviderGroupLabel(b))
	})
}

export function getPickerProviderList(ctx: ChatModelPickerContext): ApiProvider[] {
	let providers = PROVIDERS.list.map((entry) => entry.value as ApiProvider)

	if (!ctx.isClinePassEnabled) {
		providers = providers.filter((provider) => provider !== "cline-pass")
	}
	if (ctx.platformType !== PlatformType.VSCODE) {
		providers = providers.filter((provider) => provider !== "vscode-lm")
	}

	const remoteProviders = ctx.remoteConfigSettings?.remoteConfiguredProviders
	if (remoteProviders?.length) {
		providers = providers.filter((provider) => remoteProviders.includes(provider))
	}

	const { selectedProvider } = normalizeApiConfiguration(ctx.apiConfiguration, ctx.mode)
	return sortProviders(providers, selectedProvider)
}

export function buildChatProviderGroups(ctx: ChatModelPickerContext): ChatProviderGroup[] {
	const groups: ChatProviderGroup[] = []

	for (const provider of getPickerProviderList(ctx)) {
		const { models, isLoading } = getModelsForProviderInPicker(provider, ctx)
		let entries = modelsRecordToEntries(models)

		if (entries.length === 0) {
			const storedModelId = getStoredModelIdForProvider(provider, ctx)
			if (storedModelId) {
				entries = [
					{
						id: storedModelId,
						displayName: formatModelDisplayName(storedModelId),
					},
				]
			}
		}

		if (entries.length === 0 && !isLoading && !DYNAMIC_MODEL_PROVIDERS.has(provider)) {
			continue
		}

		groups.push({
			provider,
			label: getProviderGroupLabel(provider),
			subtitle: provider === "xai" ? getXaiGroupSubtitle(ctx) : undefined,
			models: entries,
			isLoading: isLoading && entries.length === 0,
		})
	}

	return groups
}

export function getSelectedModelForProvider(
	provider: ApiProvider,
	ctx: ChatModelPickerContext,
): { modelId: string; modelInfo?: ModelInfo } {
	const { selectedProvider, selectedModelId, selectedModelInfo } = normalizeApiConfiguration(
		ctx.apiConfiguration,
		ctx.mode,
	)
	if (provider !== selectedProvider) {
		const storedId = getStoredModelIdForProvider(provider, ctx)
		return { modelId: storedId ?? "", modelInfo: undefined }
	}
	return { modelId: selectedModelId, modelInfo: selectedModelInfo }
}

export interface ModelOptionSupport {
	showReasoningEffort: boolean
	showThinkingBudget: boolean
	hint?: string
}

export function getModelOptionSupport(
	provider: ApiProvider,
	modelId: string,
	modelInfo?: ModelInfo,
): ModelOptionSupport {
	if (!modelId) {
		return { showReasoningEffort: false, showThinkingBudget: false }
	}

	if (provider === "xai") {
		if (modelId.includes("3-mini")) {
			return { showReasoningEffort: true, showThinkingBudget: false }
		}
		if (/non[- ]?reasoning/i.test(modelId)) {
			return {
				showReasoningEffort: false,
				showThinkingBudget: false,
				hint: "This Grok variant runs without extended reasoning.",
			}
		}
		if (/reasoning|multi-agent/i.test(modelId)) {
			return {
				showReasoningEffort: false,
				showThinkingBudget: false,
				hint: "Reasoning is built into this Grok model variant.",
			}
		}
	}

	const showReasoningEffort =
		isClaudeOpusAdaptiveThinkingModel(modelId) ||
		supportsReasoningEffortForModelId(modelId) ||
		!!modelInfo?.supportsReasoning

	const showThinkingBudget = !showReasoningEffort && !!modelInfo?.thinkingConfig

	return { showReasoningEffort, showThinkingBudget }
}

const EFFORT_SHORT: Record<OpenaiReasoningEffort, string> = {
	none: "—",
	low: "L",
	medium: "M",
	high: "H",
	xhigh: "X",
}

export interface ModelThinkingStatus {
	configurable: boolean
	enabled: boolean
	builtin?: boolean
	effort?: OpenaiReasoningEffort
	effortShort?: string
	tooltip: string
}

export function getModelThinkingStatus(
	provider: ApiProvider,
	modelId: string,
	modelInfo: ModelInfo | undefined,
	isActive: boolean,
	activeReasoningEffort?: string,
	activeThinkingBudgetTokens?: number,
): ModelThinkingStatus {
	const support = getModelOptionSupport(provider, modelId, modelInfo)

	if (support.hint?.includes("built into")) {
		return {
			configurable: false,
			enabled: true,
			builtin: true,
			tooltip: "Reasoning built into this model",
		}
	}

	if (!support.showReasoningEffort && !support.showThinkingBudget) {
		return {
			configurable: false,
			enabled: false,
			tooltip: "Thinking not configurable",
		}
	}

	const saved = getChatModelPreference(provider, modelId)
	const preference = saved
		? saved
		: isActive
			? {
					reasoningEffort: isOpenaiReasoningEffort(activeReasoningEffort) ? activeReasoningEffort : undefined,
					thinkingBudgetTokens: activeThinkingBudgetTokens,
				}
			: undefined

	if (support.showReasoningEffort) {
		let effort: OpenaiReasoningEffort | undefined
		if (isOpenaiReasoningEffort(preference?.reasoningEffort)) {
			effort = preference.reasoningEffort
		} else if (isActive) {
			effort = resolveClaudeOpusAdaptiveThinking(activeReasoningEffort, activeThinkingBudgetTokens).effort
		}
		const enabled = !!effort && effort !== "none"
		return {
			configurable: true,
			enabled,
			effort: enabled ? effort : "none",
			effortShort: enabled ? EFFORT_SHORT[effort!] : EFFORT_SHORT.none,
			tooltip: enabled ? `Thinking on · Effort ${EFFORT_SHORT[effort!]}` : "Thinking off",
		}
	}

	const budget = preference?.thinkingBudgetTokens ?? 0
	const enabled = budget > 0
	return {
		configurable: true,
		enabled,
		tooltip: enabled ? `Thinking on · ${budget.toLocaleString()} tokens` : "Thinking off",
	}
}

function setModeFields<K extends keyof ApiConfiguration>(
	updates: Partial<ApiConfiguration>,
	planKey: K,
	actKey: K,
	value: ApiConfiguration[K],
	mode: Mode,
	separateModels: boolean,
) {
	if (separateModels) {
		const key = mode === "plan" ? planKey : actKey
		updates[key] = value
	} else {
		updates[planKey] = value
		updates[actKey] = value
	}
}

export function buildChatModelSelectionUpdates(
	provider: ApiProvider,
	modelId: string,
	modelInfo: ModelInfo | undefined,
	mode: Mode,
	separateModels: boolean,
	preference?: { reasoningEffort?: string; thinkingBudgetTokens?: number },
): Partial<ApiConfiguration> {
	const updates: Partial<ApiConfiguration> = {}

	setModeFields(updates, "planModeApiProvider", "actModeApiProvider", provider, mode, separateModels)

	if (preference?.reasoningEffort !== undefined) {
		setModeFields(
			updates,
			"planModeReasoningEffort",
			"actModeReasoningEffort",
			preference.reasoningEffort,
			mode,
			separateModels,
		)
	}
	if (preference?.thinkingBudgetTokens !== undefined) {
		setModeFields(
			updates,
			"planModeThinkingBudgetTokens",
			"actModeThinkingBudgetTokens",
			preference.thinkingBudgetTokens,
			mode,
			separateModels,
		)
	}

	switch (provider) {
		case "openrouter":
			setModeFields(updates, "planModeOpenRouterModelId", "actModeOpenRouterModelId", modelId, mode, separateModels)
			setModeFields(
				updates,
				"planModeOpenRouterModelInfo",
				"actModeOpenRouterModelInfo",
				modelInfo ?? openRouterDefaultModelInfo,
				mode,
				separateModels,
			)
			break
		case "cline":
			setModeFields(updates, "planModeClineModelId", "actModeClineModelId", modelId, mode, separateModels)
			setModeFields(
				updates,
				"planModeClineModelInfo",
				"actModeClineModelInfo",
				modelInfo ?? openRouterDefaultModelInfo,
				mode,
				separateModels,
			)
			break
		case "requesty":
			setModeFields(updates, "planModeRequestyModelId", "actModeRequestyModelId", modelId, mode, separateModels)
			setModeFields(
				updates,
				"planModeRequestyModelInfo",
				"actModeRequestyModelInfo",
				modelInfo ?? requestyDefaultModelInfo,
				mode,
				separateModels,
			)
			break
		case "zenmux":
			setModeFields(updates, "planModeZenmuxModelId", "actModeZenmuxModelId", modelId, mode, separateModels)
			setModeFields(
				updates,
				"planModeZenmuxModelInfo",
				"actModeZenmuxModelInfo",
				modelInfo ?? zenmuxDefaultModelInfo,
				mode,
				separateModels,
			)
			break
		case "sakana":
			setModeFields(updates, "planModeSakanaModelId", "actModeSakanaModelId", modelId, mode, separateModels)
			setModeFields(
				updates,
				"planModeSakanaModelInfo",
				"actModeSakanaModelInfo",
				modelInfo ?? sakanaDefaultModelInfo,
				mode,
				separateModels,
			)
			break
		case "openai":
			setModeFields(updates, "planModeOpenAiModelId", "actModeOpenAiModelId", modelId, mode, separateModels)
			if (modelInfo) {
				setModeFields(updates, "planModeOpenAiModelInfo", "actModeOpenAiModelInfo", modelInfo, mode, separateModels)
			}
			break
		case "ollama":
			setModeFields(updates, "planModeOllamaModelId", "actModeOllamaModelId", modelId, mode, separateModels)
			break
		case "lmstudio":
			setModeFields(updates, "planModeLmStudioModelId", "actModeLmStudioModelId", modelId, mode, separateModels)
			break
		case "jan":
			setModeFields(updates, "planModeJanModelId", "actModeJanModelId", modelId, mode, separateModels)
			break
		case "litellm":
			setModeFields(updates, "planModeLiteLlmModelId", "actModeLiteLlmModelId", modelId, mode, separateModels)
			if (modelInfo) {
				setModeFields(updates, "planModeLiteLlmModelInfo", "actModeLiteLlmModelInfo", modelInfo, mode, separateModels)
			}
			break
		case "groq":
			setModeFields(updates, "planModeGroqModelId", "actModeGroqModelId", modelId, mode, separateModels)
			if (modelInfo) {
				setModeFields(updates, "planModeGroqModelInfo", "actModeGroqModelInfo", modelInfo, mode, separateModels)
			}
			break
		case "huggingface":
			setModeFields(updates, "planModeHuggingFaceModelId", "actModeHuggingFaceModelId", modelId, mode, separateModels)
			if (modelInfo) {
				setModeFields(
					updates,
					"planModeHuggingFaceModelInfo",
					"actModeHuggingFaceModelInfo",
					modelInfo,
					mode,
					separateModels,
				)
			}
			break
		case "baseten":
			setModeFields(updates, "planModeBasetenModelId", "actModeBasetenModelId", modelId, mode, separateModels)
			if (modelInfo) {
				setModeFields(updates, "planModeBasetenModelInfo", "actModeBasetenModelInfo", modelInfo, mode, separateModels)
			}
			break
		case "together":
			setModeFields(updates, "planModeTogetherModelId", "actModeTogetherModelId", modelId, mode, separateModels)
			break
		case "fireworks":
			setModeFields(updates, "planModeFireworksModelId", "actModeFireworksModelId", modelId, mode, separateModels)
			break
		case "hicap":
			setModeFields(updates, "planModeHicapModelId", "actModeHicapModelId", modelId, mode, separateModels)
			if (modelInfo) {
				setModeFields(updates, "planModeHicapModelInfo", "actModeHicapModelInfo", modelInfo, mode, separateModels)
			}
			break
		case "vercel-ai-gateway":
			setModeFields(
				updates,
				"planModeVercelAiGatewayModelId",
				"actModeVercelAiGatewayModelId",
				modelId,
				mode,
				separateModels,
			)
			if (modelInfo) {
				setModeFields(
					updates,
					"planModeVercelAiGatewayModelInfo",
					"actModeVercelAiGatewayModelInfo",
					modelInfo,
					mode,
					separateModels,
				)
			}
			break
		case "aihubmix":
			setModeFields(updates, "planModeAihubmixModelId", "actModeAihubmixModelId", modelId, mode, separateModels)
			if (modelInfo) {
				setModeFields(updates, "planModeAihubmixModelInfo", "actModeAihubmixModelInfo", modelInfo, mode, separateModels)
			}
			break
		case "nousResearch":
			setModeFields(updates, "planModeNousResearchModelId", "actModeNousResearchModelId", modelId, mode, separateModels)
			break
		case "huawei-cloud-maas":
			setModeFields(
				updates,
				"planModeHuaweiCloudMaasModelId",
				"actModeHuaweiCloudMaasModelId",
				modelId,
				mode,
				separateModels,
			)
			if (modelInfo) {
				setModeFields(
					updates,
					"planModeHuaweiCloudMaasModelInfo",
					"actModeHuaweiCloudMaasModelInfo",
					modelInfo,
					mode,
					separateModels,
				)
			}
			break
		case "oca":
			setModeFields(updates, "planModeOcaModelId", "actModeOcaModelId", modelId, mode, separateModels)
			if (modelInfo) {
				setModeFields(
					updates,
					"planModeOcaModelInfo",
					"actModeOcaModelInfo",
					modelInfo as OcaModelInfo,
					mode,
					separateModels,
				)
			}
			break
		default:
			setModeFields(updates, "planModeApiModelId", "actModeApiModelId", modelId, mode, separateModels)
			break
	}

	if (provider === "openrouter" && !modelId) {
		setModeFields(
			updates,
			"planModeOpenRouterModelId",
			"actModeOpenRouterModelId",
			openRouterDefaultModelId,
			mode,
			separateModels,
		)
	}
	if (provider === "zenmux" && !modelId) {
		setModeFields(updates, "planModeZenmuxModelId", "actModeZenmuxModelId", zenmuxDefaultModelId, mode, separateModels)
	}
	if (provider === "sakana" && !modelId) {
		setModeFields(updates, "planModeSakanaModelId", "actModeSakanaModelId", sakanaDefaultModelId, mode, separateModels)
	}
	if (provider === "requesty" && !modelId) {
		setModeFields(updates, "planModeRequestyModelId", "actModeRequestyModelId", requestyDefaultModelId, mode, separateModels)
	}

	return updates
}

export type RefreshModelsHandler = () => void

export function getRefreshModelsHandler(
	provider: ApiProvider,
	handlers: {
		refreshXaiSubscriptionModels: () => void
		refreshZenmuxModels: () => void
		refreshOpenRouterModels: () => void
		refreshClineModels: () => void
		refreshVercelAiGatewayModels: () => void
		refreshHicapModels: () => void
		refreshLiteLlmModels: () => Promise<void>
	},
): RefreshModelsHandler | undefined {
	switch (provider) {
		case "xai":
			return handlers.refreshXaiSubscriptionModels
		case "zenmux":
			return handlers.refreshZenmuxModels
		case "openrouter":
			return handlers.refreshOpenRouterModels
		case "cline":
			return handlers.refreshClineModels
		case "vercel-ai-gateway":
			return handlers.refreshVercelAiGatewayModels
		case "hicap":
			return handlers.refreshHicapModels
		case "litellm":
			return () => {
				void handlers.refreshLiteLlmModels()
			}
		default:
			return undefined
	}
}

export function refreshAllChatPickerModels(handlers: {
	refreshXaiSubscriptionModels: () => void
	refreshZenmuxModels: () => void
	refreshOpenRouterModels: () => void
	refreshClineModels: () => void
	refreshVercelAiGatewayModels: () => void
	refreshHicapModels: () => void
	refreshLiteLlmModels: () => Promise<void>
	refreshBasetenModels: () => void
}) {
	handlers.refreshOpenRouterModels()
	handlers.refreshZenmuxModels()
	handlers.refreshXaiSubscriptionModels()
	handlers.refreshClineModels()
	handlers.refreshVercelAiGatewayModels()
	handlers.refreshHicapModels()
	handlers.refreshBasetenModels()
	void handlers.refreshLiteLlmModels()
}