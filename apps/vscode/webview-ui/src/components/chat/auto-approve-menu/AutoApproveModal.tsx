import React, { useEffect, useRef, useState } from "react"
import { useClickAway } from "react-use"
import { useAutoApproveActions } from "@/hooks/useAutoApproveActions"
import { getAsVar, VSC_TITLEBAR_INACTIVE_FOREGROUND } from "@/utils/vscStyles"
import AutoApproveMenuItem from "./AutoApproveMenuItem"
import { ActionMetadata } from "./types"

const breakpoint = 500

interface AutoApproveModalProps {
	isVisible: boolean
	setIsVisible: (visible: boolean) => void
	buttonRef: React.RefObject<HTMLDivElement>
	ACTION_METADATA: ActionMetadata[]
}

const AutoApproveModal: React.FC<AutoApproveModalProps> = ({ isVisible, setIsVisible, buttonRef, ACTION_METADATA }) => {
	const { isChecked, updateAction, teamBudget, updateTeamBudget } = useAutoApproveActions()
	const modalRef = useRef<HTMLDivElement>(null)
	const itemsContainerRef = useRef<HTMLDivElement>(null)
	const [containerWidth, setContainerWidth] = useState(0)

	useClickAway(modalRef, (e) => {
		// Skip if click was on the button that toggles the modal
		if (buttonRef.current && buttonRef.current.contains(e.target as Node)) {
			return
		}
		setIsVisible(false)
	})

	// Track container width for responsive layout
	useEffect(() => {
		if (!isVisible) {
			return
		}

		const updateWidth = () => {
			if (itemsContainerRef.current) {
				setContainerWidth(itemsContainerRef.current.offsetWidth)
			}
		}

		// Initial measurement
		updateWidth()

		// Set up resize observer
		const resizeObserver = new ResizeObserver(updateWidth)
		if (itemsContainerRef.current) {
			resizeObserver.observe(itemsContainerRef.current)
		}

		// Clean up
		return () => {
			resizeObserver.disconnect()
		}
	}, [isVisible])

	if (!isVisible) {
		return null
	}

	return (
		<div ref={modalRef}>
			{/* Expanded menu content - renders directly below the bar */}
			<div
				className="overflow-y-auto pb-3 px-3.5 overscroll-contain"
				style={{
					maxHeight: "60vh",
				}}>
				<div className="mb-2.5 text-muted-foreground text-xs cursor-pointer" onClick={() => setIsVisible(false)}>
					Let iCline take these actions without asking for approval.{" "}
					<a
						className="text-link hover:text-link-hover"
						href="https://docs.cline.bot/features/auto-approve#auto-approve"
						rel="noopener"
						style={{ fontSize: "inherit" }}
						target="_blank">
						Docs
					</a>
				</div>

				<div
					className="relative mb-2 w-full"
					ref={itemsContainerRef}
					style={{
						columnCount: containerWidth > breakpoint ? 2 : 1,
						columnGap: "4px",
					}}>
					{/* Vertical separator line - only visible in two-column mode */}
					{containerWidth > breakpoint && (
						<div
							className="absolute left-1/2 top-0 bottom-0 opacity-20"
							style={{
								background: getAsVar(VSC_TITLEBAR_INACTIVE_FOREGROUND),
								transform: "translateX(-50%)", // Center the line
							}}
						/>
					)}

					{/* All items in a single list - CSS Grid will handle the column distribution */}
					{ACTION_METADATA.map((action) => (
						<AutoApproveMenuItem action={action} isChecked={isChecked} key={action.id} onToggle={updateAction} />
					))}
				</div>

				<div className="mt-2 pt-2.5 border-t border-[var(--vscode-panel-border)]">
					<div className="mb-1.5 text-muted-foreground text-xs">Team budget</div>
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
						<label htmlFor="team-budget-agents">Max agents</label>
						<input
							className="w-20 px-1.5 py-0.5 rounded border border-[var(--vscode-input-border,transparent)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)]"
							id="team-budget-agents"
							min={0}
							onBlur={() => updateTeamBudget(teamBudget)}
							onChange={(event) =>
								updateTeamBudget({
									...teamBudget,
									maxAgents: Math.max(0, Number(event.target.value) || 0),
								})
							}
							type="number"
							value={teamBudget.maxAgents}
						/>
						<label htmlFor="team-budget-tokens">Tokens per turn</label>
						<input
							className="w-24 px-1.5 py-0.5 rounded border border-[var(--vscode-input-border,transparent)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)]"
							id="team-budget-tokens"
							min={0}
							onBlur={() => updateTeamBudget(teamBudget)}
							onChange={(event) =>
								updateTeamBudget({
									...teamBudget,
									maxTokensPerTurn: Math.max(0, Number(event.target.value) || 0),
								})
							}
							type="number"
							value={teamBudget.maxTokensPerTurn}
						/>
					</div>
					<div className="mt-1 text-muted-foreground text-xs">
						0 = unlimited. Caps how many teammates can run at once and how many output tokens each delegated agent
						turn may produce.
					</div>
				</div>
			</div>
		</div>
	)
}

export default AutoApproveModal
