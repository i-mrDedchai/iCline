import type { Mode } from "@shared/storage/types"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { normalizeApiConfiguration } from "@/components/settings/utils/providerUtils"

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

interface ProviderModelChipProps {
	mode: Mode
}

const ProviderModelChip = ({ mode }: ProviderModelChipProps) => {
	const { apiConfiguration } = useExtensionState()
	const normalized = normalizeApiConfiguration(apiConfiguration, mode)
	const providerLabel = formatProviderLabel(normalized.selectedProvider)
	const modelLabel = normalized.selectedModelId ? shortenModelId(normalized.selectedModelId) : "default model"

	return (
		<div
			className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-(--vscode-panel-border) bg-white/2 text-xs text-(--vscode-descriptionForeground)"
			title={`${providerLabel} · ${normalized.selectedModelId ?? "default"}`}>
			<span className="codicon codicon-sparkle text-(--vscode-symbolIcon-classForeground)" />
			<span className="font-medium text-(--vscode-editor-foreground)">{providerLabel}</span>
			<span className="opacity-60">·</span>
			<span className="truncate max-w-[220px]">{modelLabel}</span>
			<span className="opacity-60 uppercase tracking-wide text-[10px]">{mode}</span>
		</div>
	)
}

export default ProviderModelChip