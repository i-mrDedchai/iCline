import { memo } from "react"
import { useTranslation } from "@/i18n/useTranslation"
import { getQuickStartPrompt, type QuickStartPromptOverrides } from "@/icline/quickStartPromptStorage"
import QuickWinCard from "../QuickWinCard"
import type { QuickWinTask } from "../quickWinTasks"
import type { IclineQuickStartTask } from "./iclineQuickStartTasks"
import QuickStartPromptPopover from "./QuickStartPromptPopover"

interface IclineQuickStartCardProps {
	task: IclineQuickStartTask
	overrides: QuickStartPromptOverrides
	onOverridesChange: (overrides: QuickStartPromptOverrides) => void
	onExecute: (prompt: string) => void
}

const IclineQuickStartCard = ({ task, overrides, onOverridesChange, onExecute }: IclineQuickStartCardProps) => {
	const tr = useTranslation("quickStart")
	const prompt = getQuickStartPrompt(task.id, task.prompt, overrides)
	// The card body renders a `QuickWinTask`, so the translated copy is resolved here
	// and handed down; the popover gets the same title so its label and its heading
	// cannot drift apart.
	const localizedTask: QuickWinTask = {
		...task,
		title: tr(task.titleKey),
		description: tr(task.descriptionKey),
	}

	return (
		<div className="flex items-stretch gap-1.5 min-w-0">
			<div className="flex-1 min-w-0">
				<QuickWinCard onExecute={() => onExecute(prompt)} task={localizedTask} variant="grid" />
			</div>
			<div className="flex items-center pb-0.5">
				<QuickStartPromptPopover
					defaultPrompt={task.prompt}
					onOverridesChange={onOverridesChange}
					onStart={onExecute}
					overrides={overrides}
					taskId={task.id}
					taskTitle={localizedTask.title}
				/>
			</div>
		</div>
	)
}

export default memo(IclineQuickStartCard)
