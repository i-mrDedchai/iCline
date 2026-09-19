import { Mode } from "@shared/storage/types"
import { resolveClaudeOpusAdaptiveThinking } from "@shared/utils/reasoning-support"
import { memo } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { type ModelThinkingInfo, resolveEffortLevels } from "@/utils/modelThinkingOptions"
import { getModeSpecificFields } from "./utils/providerUtils"
import { useApiConfigurationHandlers } from "./utils/useApiConfigurationHandlers"

interface ReasoningEffortSelectorProps {
	currentMode: Mode
	/** Provider whose metadata names the levels (see `@/utils/modelThinkingOptions`). */
	providerId: string
	modelId?: string
	modelInfo?: ModelThinkingInfo | null
	/** Optional callback invoked after the effort value changes. Use to persist to provider-specific stores. */
	onEffortChange?: (effort: string) => void
}

/**
 * The Effort dropdown. Both WHICH LEVELS it offers and its label/help text come from
 * the provider metadata in `@/utils/modelThinkingOptions` — the same table that decides
 * whether a model gets this control at all. Nothing here is provider-specific, so a form
 * cannot offer a level its provider does not accept, or drift from the Quick Picker.
 */
const ReasoningEffortSelector = ({
	currentMode,
	providerId,
	modelId,
	modelInfo,
	onEffortChange,
}: ReasoningEffortSelectorProps) => {
	const { apiConfiguration } = useExtensionState()
	const { handleModeFieldChange } = useApiConfigurationHandlers()
	const modeFields = getModeSpecificFields(apiConfiguration, currentMode)

	const effortLevels = resolveEffortLevels({ providerId, modelId: modelId ?? "", modelInfo })
	// Adaptive-thinking models report the effort that is IN FORCE: a leftover thinking
	// budget with no explicit effort counts as "high" (and a stored `none` as off).
	const fallback =
		effortLevels.id === "adaptive-thinking"
			? (resolveClaudeOpusAdaptiveThinking(modeFields.reasoningEffort, modeFields.thinkingBudgetTokens).effort ??
				effortLevels.default)
			: (effortLevels.defaultFor?.(modelId ?? "") ?? effortLevels.default)
	const selectedEffort = effortLevels.levels.some((level) => level.value === modeFields.reasoningEffort)
		? (modeFields.reasoningEffort as string)
		: fallback

	return (
		<div style={{ marginTop: 10, marginBottom: 5 }}>
			<Label className="text-xs font-medium">{effortLevels.label}</Label>
			<Select
				onValueChange={(value) => {
					handleModeFieldChange({ plan: "planModeReasoningEffort", act: "actModeReasoningEffort" }, value, currentMode)
					onEffortChange?.(value)
				}}
				value={selectedEffort}>
				<SelectTrigger className="w-full mt-1">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{effortLevels.levels.map((level) => (
						<SelectItem key={level.value} value={level.value}>
							{level.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<p
				style={{
					fontSize: "12px",
					marginTop: 3,
					marginBottom: 0,
					color: "var(--vscode-descriptionForeground)",
				}}>
				{effortLevels.description}
			</p>
		</div>
	)
}

export default memo(ReasoningEffortSelector)
