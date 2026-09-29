import { NewTaskRequest } from "@shared/proto/cline/task"
import React, { useState } from "react"
import { useTranslation } from "@/i18n/useTranslation"
import { type QuickStartPromptOverrides, readQuickStartPromptOverrides } from "@/icline/quickStartPromptStorage"
import { TaskServiceClient } from "@/services/grpc-client"
import IclineQuickStartCard from "./icline/IclineQuickStartCard"
import { iclineQuickStartTasks } from "./icline/iclineQuickStartTasks"
import type { QuickStartMode } from "./icline/quickStartMode"
import QuickWinCard from "./QuickWinCard"
import { QuickWinTask, quickWinTasks } from "./quickWinTasks"

interface SuggestedTasksProps {
	quickStartMode: QuickStartMode
}

/**
 * Renders a heading that keeps its emphasis where the translator put it.
 *
 * The welcome headings highlight a word ("Quick [Wins] with Cline"). Keeping the
 * marker inside the string rather than splitting it into before/highlight/after keys
 * means a language that orders the sentence differently is still a translation change
 * instead of a layout change — and a translator who drops the brackets still gets a
 * whole heading rather than a stray span.
 */
const EmphasizedHeading = ({ text }: { text: string }) => {
	const start = text.indexOf("[")
	const end = start === -1 ? -1 : text.indexOf("]", start + 1)
	if (start === -1 || end === -1) {
		return <>{text}</>
	}
	return (
		<>
			{text.slice(0, start)}
			<span className="text-white">{text.slice(start, end + 1)}</span>
			{text.slice(end + 1)}
		</>
	)
}

export const SuggestedTasks: React.FC<SuggestedTasksProps> = ({ quickStartMode }) => {
	const tr = useTranslation("quickStart")
	const [promptOverrides, setPromptOverrides] = useState<QuickStartPromptOverrides>(() => readQuickStartPromptOverrides())

	const handleExecuteQuickWin = async (prompt: string) => {
		await TaskServiceClient.newTask(NewTaskRequest.create({ text: prompt, images: [] }))
	}

	if (quickStartMode === "cline") {
		return (
			<div className="px-4 pt-1 pb-3 select-none">
				<h2 className="text-sm font-medium mb-2.5 text-center text-gray">
					<EmphasizedHeading text={tr("headingQuickWins")} />
				</h2>
				<div className="flex flex-col space-y-1">
					{quickWinTasks.map((task: QuickWinTask) => (
						<QuickWinCard key={task.id} onExecute={() => handleExecuteQuickWin(task.prompt)} task={task} />
					))}
				</div>
			</div>
		)
	}

	if (quickStartMode === "icline") {
		return (
			<div className="px-4 pt-1 pb-3 select-none">
				<h2 className="text-sm font-medium mb-2.5 text-center text-gray">
					<EmphasizedHeading text={tr("headingQuickStarts")} />
				</h2>
				<div className="grid grid-cols-1 min-[300px]:grid-cols-2 gap-2">
					{iclineQuickStartTasks.map((task) => (
						<IclineQuickStartCard
							key={task.id}
							onExecute={handleExecuteQuickWin}
							onOverridesChange={setPromptOverrides}
							overrides={promptOverrides}
							task={task}
						/>
					))}
				</div>
			</div>
		)
	}

	return null
}
