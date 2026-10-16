import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { CopyButton } from "../common/CopyButton"

interface CompletionCardHeaderProps {
	/** The translated card title. */
	label: ReactNode
	/** Icon (or emoji span) that sits left of the title. */
	icon?: ReactNode
	/** Colour class shared by the title and the copy control, so the two can never disagree. */
	accentClassName?: string
	/** Inline style for the title, for cards whose accent is an inline token (the final-reply card). */
	labelStyle?: CSSProperties
	/** Test id for the title group; the e2e specs assert the icon sits left of the label inside it. */
	labelTestId?: string
	/** Text the copy control writes to the clipboard. */
	copyText?: string
	/** Margins for the row — the layout itself belongs to this component. */
	className?: string
}

/**
 * The header row of a completion card: the Task Completed panel, the Plan Created panel and
 * the final-reply card all wear one.
 *
 * The copy control is a flex sibling of the title on purpose. Floating it over the card at a
 * fixed offset put it on the first line of the answer, where it covered the words, so the
 * placement lives here once instead of once per card.
 */
export const CompletionCardHeader = ({
	label,
	icon,
	accentClassName,
	labelStyle,
	labelTestId,
	copyText,
	className,
}: CompletionCardHeaderProps) => (
	<div className={cn("flex items-center justify-between gap-2", className)}>
		<div className={cn("flex items-center justify-start gap-2", accentClassName)} data-testid={labelTestId}>
			{icon}
			<span className={cn("font-bold", accentClassName)} style={labelStyle}>
				{label}
			</span>
		</div>
		<CopyButton className={cn("shrink-0", accentClassName)} textToCopy={copyText ?? ""} />
	</div>
)
