/**
 * The Options surface of ONE model — title, model id, Thinking switch, Effort levels and
 * the capability readout. Structure locked in mock v11.
 *
 * It is rendered from the SAME `ModelStatus` object the model's row and the composer chip
 * draw their icons from, so the controls and the icons can never disagree, and it is now
 * shared by the two places that need it:
 *
 *  - the Quick Picker's hover panel (absolutely positioned beside the hovered row), and
 *  - the popover the composer's status icons open for the ACTIVE model, so raising the
 *    Effort of the model already driving the chat no longer requires opening the model
 *    list and hunting for its row.
 *
 * Everything here is presentation: the writes go through the caller's handlers, which
 * know whether the model is the active one (write through to the running configuration)
 * or not (store it as that model's preference).
 */
import { Check } from "lucide-react"
import { CAPABILITY_ICONS, effortLabelKeyFor, statusTooltip } from "@/components/chat/ModelStatusIcons"
import type { ModelInfoLike } from "@/components/chat/quickModelPickerList"
import { ReasoningEffortNotice } from "@/components/common/ReasoningEffortNotice"
import { Switch } from "@/components/ui/switch"
import type { ReasoningEffortOutcome } from "@/hooks/useReasoningEffortOutcome"
import { BalloonTooltip } from "@/icline/BalloonTooltip"
import type { PickerTranslator } from "@/icline/i18n/pickerStrings"
import type { ModelStatus } from "@/icline/pickerCapabilities"
import { cn } from "@/lib/utils"
import { resolveEffortLevels } from "@/utils/modelThinkingOptions"

export interface ModelOptionsPanelProps {
	providerId: string
	modelId: string
	/** The model's metadata, when the caller has it — the Effort levels read from it. */
	modelInfo?: ModelInfoLike | null
	/** Real status for this model — the same object the row / chip renders. */
	status: ModelStatus
	/** What the marked level really sends (host-computed); absent while unknown. */
	effortOutcome?: ReasoningEffortOutcome
	tr: PickerTranslator
	onThinkingToggle: (providerId: string, modelId: string, modelInfo: ModelInfoLike | undefined, nextEnabled: boolean) => void
	onEffortChange: (providerId: string, modelId: string, effort: string) => void
	className?: string
}

export function ModelOptionsPanel({
	providerId,
	modelId,
	modelInfo,
	status,
	effortOutcome,
	tr,
	onThinkingToggle,
	onEffortChange,
	className,
}: ModelOptionsPanelProps) {
	const switchConfigurable = status.support.showEffort || status.support.showThinkingBudget
	// The levels this model's provider metadata defines; the OFF level is never a button
	// here — turning reasoning off is the Thinking switch's job.
	const effortSet = resolveEffortLevels({ providerId, modelId, modelInfo })
	const effortLevels = effortSet.levels.filter((level) => !level.isOff)

	return (
		<div className={className} data-icline-options-panel="">
			{/* Title + model id (mock v11's `h3` + `.mid`) */}
			<div className="text-xs font-medium text-(--vscode-foreground)">{tr("optionsTitle")}</div>
			<div
				className="mt-0.5 mb-2 break-all text-[10.5px] text-(--vscode-descriptionForeground)"
				data-icline-options-model-id="">
				{modelId}
			</div>

			{/* Thinking switch: on/off exactly as the model's reasoning is configured */}
			<div className="flex items-center justify-between gap-2 text-xs text-(--vscode-foreground)">
				<span>{tr("optionsThinkingLabel")}</span>
				<BalloonTooltip label={statusTooltip(status, tr)}>
					<Switch
						aria-label={tr("optionsToggleThinking")}
						checked={status.enabled}
						data-icline-thinking-switch={status.enabled ? "on" : "off"}
						disabled={!switchConfigurable}
						onCheckedChange={(next) => onThinkingToggle(providerId, modelId, modelInfo ?? undefined, next)}
					/>
				</BalloonTooltip>
			</div>

			{/*
			 * Effort levels — the mock's four, not five with an "Off" button. Picking a
			 * level switches reasoning on for that model; the Thinking switch is the
			 * explicit off (it writes `none`).
			 */}
			<div className="pt-2 text-xs text-(--vscode-foreground)">{tr("optionsEffortLabel")}</div>
			{status.support.showEffort ? (
				<div className="pt-0.5" data-icline-effort-set={effortSet.id}>
					{effortLevels.map((level) => {
						const selected = status.effort === level.value
						const labelKey = effortLabelKeyFor(level.value)
						return (
							<button
								className={cn(
									"w-full flex items-center justify-between rounded-sm px-2 py-1 text-xs transition-colors",
									"hover:bg-(--vscode-list-hoverBackground)",
									selected ? "text-(--vscode-foreground)" : "text-(--vscode-descriptionForeground)",
								)}
								data-icline-effort-option={level.value}
								data-icline-effort-selected={selected ? "true" : undefined}
								key={level.value}
								onClick={() => onEffortChange(providerId, modelId, level.value)}
								type="button">
								<span>{labelKey ? tr(labelKey) : level.label}</span>
								{selected && <Check size={11} />}
							</button>
						)
					})}
				</div>
			) : (
				<div className="px-2 pt-0.5 text-[11px] italic text-(--vscode-descriptionForeground)">
					{tr("optionsNoEffort")}
				</div>
			)}

			{/* What the SDK will really send for the marked level (host-computed). */}
			<ReasoningEffortNotice compact outcome={effortOutcome} tr={tr} />

			{/* Capability readout — metadata-backed only, neutral colour like the mock */}
			<div className="mt-2 border-t border-(--vscode-editorGroup-border) pt-1.5" data-icline-options-caps="">
				{status.caps.length > 0 ? (
					status.caps.map((cap) => {
						const Icon = CAPABILITY_ICONS[cap.id]
						return (
							<div
								className="flex items-center gap-1.5 pt-1 text-[11px] text-(--vscode-descriptionForeground)"
								key={cap.id}>
								<Icon aria-hidden data-icline-capability={cap.id} size={11} />
								<span className="truncate">{tr(cap.labelKey)}</span>
							</div>
						)
					})
				) : (
					<div className="pt-1 text-[11px] italic text-(--vscode-descriptionForeground)">{tr("optionsNoCaps")}</div>
				)}
			</div>
		</div>
	)
}
