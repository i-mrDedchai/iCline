import { Mode } from "@shared/storage/types"
import { resolveClaudeOpusAdaptiveThinking } from "@shared/utils/reasoning-support"
import { memo, useMemo } from "react"
import { ReasoningEffortNotice } from "@/components/common/ReasoningEffortNotice"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useReasoningEffortOutcome } from "@/hooks/useReasoningEffortOutcome"
import { usePickerStrings } from "@/i18n/picker"
import { levelsWithStoredEffort, type ModelThinkingInfo, resolveEffortLevels } from "@/utils/modelThinkingOptions"
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
 *
 * The host's clamp answer (`useReasoningEffortOutcome`) is rendered underneath: effort is
 * stored per MODE, so a level can be in force for a model that does not accept it — the
 * SDK gateway then sends a different level, and this is where the user can see that.
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

	const tr = usePickerStrings()
	const effortLevels = resolveEffortLevels({ providerId, modelId: modelId ?? "", modelInfo })
	// fix.48: the help sentence under the dropdown is interface copy, but the
	// level sets live in a locale-free util (`modelThinkingOptions`) that picker
	// surfaces also import — so the selector resolves the sentence here from the
	// set id instead of teaching the util about locales.
	const effortHelp =
		effortLevels.id === "adaptive-thinking"
			? tr("settingsEffortAdaptiveDesc")
			: effortLevels.id === "sakana"
				? tr("settingsEffortSakanaDesc")
				: tr("settingsEffortGenericDesc")
	const effortLabel = effortLevels.id === "adaptive-thinking" ? tr("settingsEffortAdaptiveLabel") : tr("settingsEffortLabel")
	const storedEffort = typeof modeFields.reasoningEffort === "string" ? modeFields.reasoningEffort.trim() : ""

	/** The provider's levels, plus the stored one when that set does not contain it. */
	const displayLevels = useMemo(
		() => levelsWithStoredEffort(effortLevels.levels, storedEffort),
		[effortLevels.levels, storedEffort],
	)

	// Adaptive-thinking models report the effort that is IN FORCE: a leftover thinking
	// budget with no explicit effort counts as "high" (and a stored `none` as off).
	const fallback =
		effortLevels.id === "adaptive-thinking"
			? (resolveClaudeOpusAdaptiveThinking(modeFields.reasoningEffort, modeFields.thinkingBudgetTokens).effort ??
				effortLevels.default)
			: (effortLevels.defaultFor?.(modelId ?? "") ?? effortLevels.default)
	const selectedEffort = displayLevels.some((level) => level.value === storedEffort) ? storedEffort : fallback

	// The level the request will really carry — the same value the dropdown now shows.
	const effortOutcome = useReasoningEffortOutcome({
		providerId,
		modelId,
		effort: selectedEffort,
		thinkingBudgetTokens: modeFields.thinkingBudgetTokens,
	})

	return (
		<div style={{ marginTop: 10, marginBottom: 5 }}>
			<Label className="text-xs font-medium">{effortLabel}</Label>
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
					{displayLevels.map((level) => (
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
				{effortHelp}
			</p>
			{/* What the SDK will really send for this level (host-computed; nothing while the answer is unknown). */}
			<ReasoningEffortNotice outcome={effortOutcome} tr={tr} />
		</div>
	)
}

export default memo(ReasoningEffortSelector)
