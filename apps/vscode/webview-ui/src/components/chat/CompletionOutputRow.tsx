import { CheckIcon } from "lucide-react"
import { memo } from "react"
import { DEFAULT_COMPLETED_ICON } from "@/appearance/appearance"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useTranslation } from "@/i18n/useTranslation"
import { cn } from "@/lib/utils"
import { CopyButton } from "../common/CopyButton"
import { QuoteButtonState } from "./ChatRow"
import { MarkdownRow } from "./MarkdownRow"
import QuoteButton from "./QuoteButton"

interface CompletionOutputRowProps {
	text: string
	quoteButtonState: QuoteButtonState
	handleQuoteClick: () => void
	headClassNames?: string
}

export const CompletionOutputRow = memo(
	({ headClassNames, text, quoteButtonState, handleQuoteClick }: CompletionOutputRowProps) => {
		// Icon + tint from Settings → Appearance. The title keeps the raw accent
		// so copy never fades with the tint; "none" hides the icon slot and
		// "check" keeps the legacy lucide check.
		const { appearanceCompletedIcon } = useExtensionState()
		const trQuickStart = useTranslation("quickStart")
		const completedIcon = appearanceCompletedIcon ?? DEFAULT_COMPLETED_ICON
		return (
			<div>
				<div className="rounded-sm border border-(--color-completed-border) overflow-visible bg-(--color-completed-bg) p-2 pt-3">
					{/* Title */}
					<div className={cn(headClassNames, "justify-between px-1")}>
						<div className="flex gap-2 items-center">
							{completedIcon !== "none" &&
								(completedIcon === "check" ? (
									<CheckIcon className="size-3 text-completed" />
								) : (
									<span aria-hidden className="text-completed text-sm leading-none">
										{completedIcon}
									</span>
								))}
							<span className="text-completed font-bold">{trQuickStart("approvalTaskCompleted")}</span>
						</div>
						<CopyButton className="text-completed" textToCopy={text} />
					</div>
					{/* Content */}
					<div className="w-full relative border-t-1 border-description/20 rounded-b-sm">
						<div className="completion-output-content p-2 pt-3 w-full [&_hr]:opacity-20 [&_p:last-child]:mb-0 rounded-sm">
							<MarkdownRow markdown={text} />
							{quoteButtonState.visible && (
								<QuoteButton left={quoteButtonState.left} onClick={handleQuoteClick} top={quoteButtonState.top} />
							)}
						</div>
					</div>
				</div>
			</div>
		)
	},
)

CompletionOutputRow.displayName = "CompletionOutputRow"
