/**
 * "What you picked is not what will be sent."
 *
 * Effort is stored once per mode, so a level can be in force for a model that does not
 * accept it. The SDK gateway then clamps it on the way to the provider (`max` on a model
 * whose top level is `xhigh` is sent as X-High) and nothing told the user; previously the
 * only way to find out was to compare the provider's answer with the dropdown.
 *
 * Both places that SET an effort render this — the Settings Effort control and the Quick
 * Picker's Options panel — from the same host answer, so the two cannot disagree about a
 * model. It renders nothing while the answer is unknown, when the level is sent as
 * chosen, and when a thinking budget is what actually goes out (the budget has its own
 * control; claiming a level here would be worse than staying quiet).
 */

import { TriangleAlert } from "lucide-react"
import type { ReasoningEffortOutcome } from "@/hooks/useReasoningEffortOutcome"
import { formatPickerString, type PickerStringKey, type PickerTranslator } from "@/icline/i18n/pickerStrings"
import { effortLevelForValue } from "@/utils/modelThinkingOptions"

/** Reasons the gateway does not send the requested level. Mirrors the host's union. */
const REASON_KEYS: Record<string, PickerStringKey> = {
	"nearest-supported": "effortClampNearest",
	"catalog-unknown": "effortClampCatalogUnknown",
	"no-effort-control": "effortClampNoControl",
}

/**
 * The sentence for one outcome — or `undefined` when there is nothing honest to say.
 * Exported so the copy rules can be tested without a render.
 */
export function effortClampNotice(outcome: ReasoningEffortOutcome | undefined, tr: PickerTranslator): string | undefined {
	if (!outcome || !outcome.clamped || outcome.suppressedByBudget) {
		return undefined
	}
	const key = REASON_KEYS[outcome.reason]
	if (!key) {
		// An unknown reason means this build does not know how to describe it; showing
		// the raw values would be guesswork, so stay quiet until it is taught.
		return undefined
	}
	return formatPickerString(tr, key, {
		requested: effortLevelForValue(outcome.requested).label,
		applied: outcome.applied === undefined ? "" : effortLevelForValue(outcome.applied).label,
	})
}

interface ReasoningEffortNoticeProps {
	outcome: ReasoningEffortOutcome | undefined
	tr: PickerTranslator
	/** Compact (Options panel) vs. full-width (Settings) presentation. */
	compact?: boolean
}

export function ReasoningEffortNotice({ outcome, tr, compact }: ReasoningEffortNoticeProps) {
	const text = effortClampNotice(outcome, tr)
	if (!text) {
		return null
	}

	return (
		<div
			className={
				compact
					? "flex items-start gap-1 pt-1 text-[10.5px] text-(--vscode-editorWarning-foreground)"
					: "flex items-start gap-1.5 mt-1 text-[11px] text-(--vscode-editorWarning-foreground)"
			}
			data-icline-effort-clamp={outcome?.reason}>
			<TriangleAlert aria-hidden className="mt-0.5 shrink-0" size={compact ? 10 : 12} />
			<span>{text}</span>
		</div>
	)
}
