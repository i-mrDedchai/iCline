/**
 * "Your organization does not allow that provider."
 *
 * The counterpart of the Settings provider dropdown's lock: there the blocked
 * providers are filtered out, but the Quick Picker lists every provider's models, so
 * a click on a blocked one has to be answered rather than silently reverted by the
 * host's remote layer (org policy outranks every local write).
 *
 * Rendered inside the picker, next to the commit-failure line, and the popover stays
 * open so the sentence is read where the click happened.
 */

import { Building2 } from "lucide-react"
import { formatPickerString, type PickerTranslator } from "@/i18n/picker"
import type { OrgProviderBlock } from "@/icline/orgProviderPolicy"

interface OrgProviderPolicyNoticeProps {
	block: OrgProviderBlock
	/** Provider label to show the user; falls back to the raw id. */
	providerLabel: string
	tr: PickerTranslator
}

export function OrgProviderPolicyNotice({ block, providerLabel, tr }: OrgProviderPolicyNoticeProps) {
	return (
		<div
			className="shrink-0 flex items-start gap-1.5 px-3 py-1.5 text-[11px] text-(--vscode-editorWarning-foreground) border-t border-(--vscode-editorGroup-border)"
			data-icline-org-provider-block={block.requested}
			role="alert">
			<Building2 aria-hidden className="mt-0.5 shrink-0" size={12} />
			<span>{formatPickerString(tr, "orgProviderBlocked", { provider: providerLabel })}</span>
		</div>
	)
}
