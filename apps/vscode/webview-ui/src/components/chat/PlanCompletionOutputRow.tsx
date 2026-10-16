import { NotepadTextIcon } from "lucide-react"
import { memo } from "react"
import MarkdownBlock from "@/components/common/MarkdownBlock"
import { CompletionCardHeader } from "./CompletionCardHeader"

interface PlanCompletionOutputProps {
	text: string
}

/**
 * Styled completion output for Plan Mode responses
 * Uses grayscale colors to distinguish from Act Mode's green success theme
 */
const PlanCompletionOutputRow = memo(({ text }: PlanCompletionOutputProps) => {
	return (
		<div className="rounded-sm border border-description/50 overflow-visible bg-code p-2 pt-3">
			{/* Header */}
			<CompletionCardHeader
				accentClassName="text-foreground"
				className="mb-3 px-1"
				copyText={text || ""}
				icon={<NotepadTextIcon className="size-2" />}
				label="Plan Created"
			/>

			{/* Content */}
			<div className="w-full relative border-t-1 border-description/20 rounded-b-sm">
				<div className="plan-completion-content p-2 pt-3 w-full [&_hr]:opacity-20 [&_p:last-child]:mb-0">
					<div className="wrap-anywhere [&_hr]:opacity-20">
						<MarkdownBlock markdown={text} />
					</div>
				</div>
			</div>
		</div>
	)
})

PlanCompletionOutputRow.displayName = "PlanCompletionOutputRow"

export default PlanCompletionOutputRow
