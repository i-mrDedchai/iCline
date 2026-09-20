/**
 * The status readout for one model — capability icons plus the one-letter effort badge,
 * each with the balloon tooltip that explains it.
 *
 * Shared by the Quick Picker's rows and the model name under the chat input, so the two
 * cannot drift: the composer shows exactly what the row shows for the same model
 * (smoke 2026-09-20 — the row had icons and the composer had a bare name, which left the
 * effort/reasoning state invisible outside the picker).
 *
 * Everything here is presentation on top of `@/icline/pickerCapabilities`, which owns
 * what the icons mean and which are backed by real metadata.
 */
import { Brain, Database, Eye, type LucideIcon, Music, Sparkles, Video } from "lucide-react"
import { BalloonTooltip } from "@/icline/BalloonTooltip"
import type { PickerStringKey, PickerTranslator } from "@/icline/i18n/pickerStrings"
import { CAPABILITY_COLORS, type CapabilityId, type ModelStatus } from "@/icline/pickerCapabilities"
import { cn } from "@/lib/utils"

/**
 * Guideline กฎที่ 2 icons — all already present in the webview's Lucide set.
 * Exported so the Options panel's capability list uses the same glyph per capability
 * instead of keeping a second table that could drift from the icon a row shows.
 */
export const CAPABILITY_ICONS: Record<CapabilityId, LucideIcon> = {
	reasoning: Brain,
	thinking: Sparkles,
	vision: Eye,
	audio: Music,
	video: Video,
	training: Database,
}

/**
 * Level label keys for the status tooltips. `resolveEffortLevels` already supplies a
 * label per level, but a tooltip is built from a stored VALUE alone — and the wording
 * has to match Settings (mock v11 called `xhigh` "Max"; now it is X-High).
 */
const EFFORT_LABEL_KEYS: Record<string, PickerStringKey> = {
	minimal: "effortMinimal",
	low: "effortLow",
	medium: "effortMedium",
	high: "effortHigh",
	xhigh: "effortXhigh",
	max: "effortMax",
}

/** The tooltip label for one effort value, falling back to the raw value. */
export function effortLabelKeyFor(value: string): PickerStringKey | undefined {
	return EFFORT_LABEL_KEYS[value]
}

/**
 * Tooltip for the two capability icons that also carry state. It reports what is
 * really in force — on with which effort, off, or not configurable at all — so an icon
 * never claims more than the panel next to it.
 */
export function statusTooltip(status: ModelStatus, tr: PickerTranslator): string {
	if (status.support.builtinReasoning) {
		return tr("statusThinkingBuiltin")
	}
	if (status.enabled) {
		const effort = status.effort
		if (status.support.showEffort && effort && effort !== "none") {
			const key = effortLabelKeyFor(effort)
			return `${tr("statusThinkingOn")} ${key ? tr(key) : effort}`
		}
		return tr("statusThinkingBudgetOn")
	}
	if (status.support.showEffort || status.support.showThinkingBudget) {
		return tr("statusThinkingOff")
	}
	return tr("statusThinkingFixed")
}

export interface ModelStatusIconsProps {
	status: ModelStatus
	tr: PickerTranslator
	/** Icon edge length; the row and the composer both read this at a glance. */
	size?: number
	className?: string
}

/**
 * Capability icons for a model. Reasoning and thinking are coloured by REAL state
 * (accent when switched on, muted when off), the rest keep their capability colour;
 * the tooltip always explains which is which. The effort badge only exists while an
 * effort is actually in force.
 */
export function ModelStatusIcons({ status, tr, size = 11, className }: ModelStatusIconsProps) {
	const stateTooltip = statusTooltip(status, tr)
	return (
		<span className={cn("inline-flex shrink-0 items-center gap-1", className)} data-icline-model-status="">
			{status.caps.map((cap) => {
				const Icon = CAPABILITY_ICONS[cap.id]
				const isStateful = cap.id === "reasoning" || cap.id === "thinking"
				const lit = !isStateful || status.enabled
				return (
					<BalloonTooltip key={cap.id} label={isStateful ? stateTooltip : tr(cap.tooltipKey)}>
						<Icon
							aria-hidden
							className={cn("shrink-0", !lit && "opacity-50 text-(--vscode-descriptionForeground)")}
							data-icline-capability={cap.id}
							data-icline-state={isStateful ? (status.enabled ? "on" : "off") : undefined}
							size={size}
							style={lit ? { color: CAPABILITY_COLORS[cap.id] } : undefined}
						/>
					</BalloonTooltip>
				)
			})}
			{status.effortShort && (
				<BalloonTooltip label={tr("effortBadgeTooltip")}>
					<span
						className="shrink-0 rounded-sm border border-(--vscode-editorGroup-border) px-1 text-[9px] text-(--vscode-descriptionForeground)"
						data-icline-effort={status.effort}>
						{status.effortShort}
					</span>
				</BalloonTooltip>
			)}
		</span>
	)
}
