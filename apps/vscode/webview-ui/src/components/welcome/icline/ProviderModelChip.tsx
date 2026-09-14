import type { Mode } from "@shared/storage/types"
import { getModeSpecificFields } from "@/components/settings/utils/providerUtils"
import { useExtensionState } from "@/context/ExtensionStateContext"

const PROVIDER_LABELS: Record<string, string> = {
	xai: "Grok",
	zenmux: "ZenMux",
	sakana: "Sakana.ai",
	openrouter: "OpenRouter",
	anthropic: "Anthropic",
	openai: "OpenAI",
	gemini: "Gemini",
	ollama: "Ollama",
	lmstudio: "LM Studio",
	jan: "Jan",
	cline: "Cline",
	"cline-pass": "Cline Pass",
}

function formatProviderLabel(provider: string | undefined): string {
	if (!provider) {
		return "Not configured"
	}
	return PROVIDER_LABELS[provider] ?? provider
}

function shortenModelId(modelId: string): string {
	if (modelId.length <= 36) {
		return modelId
	}
	return `${modelId.slice(0, 33)}…`
}

/** Resolve the provider-specific model id (not always *ModeApiModelId). */
function getChipModelId(
	provider: string,
	apiConfiguration: ReturnType<typeof useExtensionState>["apiConfiguration"],
	mode: Mode,
): string | undefined {
	if (!apiConfiguration) {
		return undefined
	}
	const fields = getModeSpecificFields(apiConfiguration, mode)
	switch (provider) {
		case "openrouter":
			return fields.openRouterModelId || fields.apiModelId
		case "openai":
			return fields.openAiModelId || fields.apiModelId
		case "ollama":
			return fields.ollamaModelId
		case "lmstudio":
			return fields.lmStudioModelId
		case "litellm":
			return fields.liteLlmModelId
		case "requesty":
			return fields.requestyModelId
		case "together":
			return fields.togetherModelId
		case "fireworks":
			return fields.fireworksModelId
		case "groq":
			return fields.groqModelId
		case "baseten":
			return fields.basetenModelId
		case "huggingface":
			return fields.huggingFaceModelId
		case "vercel-ai-gateway":
			return fields.vercelAiGatewayModelId
		case "zenmux":
			return fields.zenmuxModelId || fields.apiModelId
		case "sakana":
			return fields.sakanaModelId || fields.apiModelId
		case "jan":
			return fields.janModelId || fields.apiModelId
		case "cline":
			return fields.clineModelId || fields.apiModelId
		case "cline-pass":
			return fields.clinePassModelId || fields.apiModelId
		case "aihubmix":
			return fields.aihubmixModelId || fields.apiModelId
		default:
			return fields.apiModelId
	}
}

interface ProviderModelChipProps {
	mode: Mode
}

const ProviderModelChip = ({ mode }: ProviderModelChipProps) => {
	const { apiConfiguration } = useExtensionState()
	const selectedProvider =
		(mode === "plan" ? apiConfiguration?.planModeApiProvider : apiConfiguration?.actModeApiProvider) || "anthropic"
	const selectedModelId = getChipModelId(selectedProvider, apiConfiguration, mode)
	const providerLabel = formatProviderLabel(selectedProvider)
	const modelLabel = selectedModelId ? shortenModelId(selectedModelId) : "default model"

	return (
		<div
			className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-(--vscode-panel-border) bg-white/2 text-xs text-(--vscode-descriptionForeground)"
			title={`${providerLabel} · ${selectedModelId ?? "default"}`}>
			<span className="codicon codicon-sparkle text-(--vscode-symbolIcon-classForeground)" />
			<span className="font-medium text-(--vscode-editor-foreground)">{providerLabel}</span>
			<span className="opacity-60">·</span>
			<span className="truncate max-w-[220px]">{modelLabel}</span>
			<span className="opacity-60 uppercase tracking-wide text-[10px]">{mode}</span>
		</div>
	)
}

export default ProviderModelChip
