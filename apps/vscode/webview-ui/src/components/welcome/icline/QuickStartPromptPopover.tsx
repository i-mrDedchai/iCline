import { MoreHorizontalIcon, PencilIcon, PlayIcon, RotateCcwIcon } from "lucide-react"
import { memo, useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatString } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import {
	getQuickStartPrompt,
	type QuickStartPromptOverrides,
	resetQuickStartPromptOverride,
	saveQuickStartPromptOverride,
} from "@/icline/quickStartPromptStorage"

interface QuickStartPromptPopoverProps {
	taskId: string
	taskTitle: string
	defaultPrompt: string
	overrides: QuickStartPromptOverrides
	onOverridesChange: (overrides: QuickStartPromptOverrides) => void
	onStart: (prompt: string) => void
}

const QuickStartPromptPopover = ({
	taskId,
	taskTitle,
	defaultPrompt,
	overrides,
	onOverridesChange,
	onStart,
}: QuickStartPromptPopoverProps) => {
	const tr = useTranslation("quickStart")
	const [open, setOpen] = useState(false)
	const [draft, setDraft] = useState(defaultPrompt)

	const syncDraft = useCallback(() => {
		setDraft(getQuickStartPrompt(taskId, defaultPrompt, overrides))
	}, [taskId, defaultPrompt, overrides])

	useEffect(() => {
		if (open) {
			syncDraft()
		}
	}, [open, syncDraft])

	const handleSave = () => {
		const next = saveQuickStartPromptOverride(taskId, draft)
		onOverridesChange(next)
	}

	const handleReset = () => {
		const next = resetQuickStartPromptOverride(taskId)
		onOverridesChange(next)
		setDraft(defaultPrompt)
	}

	const handleStart = () => {
		const prompt = draft.trim() || defaultPrompt
		setOpen(false)
		onStart(prompt)
	}

	const isCustomized = Boolean(overrides[taskId]?.trim())

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<button
					aria-label={formatString(tr, "popoverEditAriaLabel", { task: taskTitle })}
					className="shrink-0 flex items-center justify-center size-7 rounded-md border border-(--vscode-panel-border) text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) hover:bg-(--vscode-list-hoverBackground) transition-colors"
					onClick={(event) => event.stopPropagation()}
					type="button">
					{isCustomized ? <PencilIcon className="size-3.5" /> : <MoreHorizontalIcon className="size-3.5" />}
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-[min(92vw,24rem)] p-3 space-y-3"
				onClick={(event) => event.stopPropagation()}
				side="top">
				<div>
					<div className="text-sm font-medium text-(--vscode-editor-foreground)">{taskTitle}</div>
					<div className="text-xs text-(--vscode-descriptionForeground) mt-0.5">{tr("popoverHint")}</div>
				</div>
				<textarea
					className="w-full min-h-36 max-h-56 resize-y rounded-md border border-(--vscode-panel-border) bg-(--vscode-input-background) text-(--vscode-input-foreground) text-xs leading-relaxed p-2 outline-none focus:border-(--vscode-focusBorder)"
					onChange={(event) => setDraft(event.target.value)}
					onClick={(event) => event.stopPropagation()}
					placeholder={defaultPrompt}
					value={draft}
				/>
				<div className="flex flex-wrap gap-2 justify-end">
					<Button onClick={handleReset} size="sm" type="button" variant="secondary">
						<RotateCcwIcon className="size-3.5" />
						{tr("popoverReset")}
					</Button>
					<Button onClick={handleSave} size="sm" type="button" variant="secondary">
						{tr("popoverSave")}
					</Button>
					<Button onClick={handleStart} size="sm" type="button" variant="default">
						<PlayIcon className="size-3.5" />
						{tr("popoverStart")}
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	)
}

export default memo(QuickStartPromptPopover)
