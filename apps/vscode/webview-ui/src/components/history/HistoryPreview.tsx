import { StringRequest } from "@shared/proto/cline/common"
import { type CSSProperties, memo, useMemo, useState } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { backgroundTaskBadge, backgroundTaskNotice } from "@/icline/backgroundTaskBadge"
import { sliceRecentTasks, useRecentColumnCount } from "@/icline/recentGrid"
import { formatRecentTimestamp, formatRecentTimestampTitle } from "@/icline/recentTime"
import { TaskServiceClient } from "@/services/grpc-client"

type HistoryPreviewProps = {
	showHistoryView: () => void
}

const HistoryPreview = ({ showHistoryView }: HistoryPreviewProps) => {
	const { taskHistory, backgroundTask, queuedTask } = useExtensionState()
	// The grid measures itself: three rows stay three rows, and how many sessions fit per row
	// is the pane's decision (see `@/icline/recentGrid`). A callback ref into state, because the
	// grid only exists once there is history — which is after the first paint.
	const [grid, setGrid] = useState<HTMLDivElement | null>(null)
	const columns = useRecentColumnCount(grid)
	const recentTasks = useMemo(() => taskHistory.filter((item) => item.ts && item.task), [taskHistory])
	const badge = backgroundTask ? backgroundTaskBadge(backgroundTask) : undefined
	const handleHistorySelect = (id: string) => {
		TaskServiceClient.showTaskWithId(StringRequest.create({ value: id })).catch((error) =>
			console.error("Error showing task:", error),
		)
	}

	return (
		<div style={{ flexShrink: 0 }}>
			<style>
				{`
					.history-preview-grid {
						display: grid;
						grid-template-columns: repeat(var(--history-columns, 1), minmax(0, 1fr));
						gap: 8px;
						/* Cards in a row match the tallest of them, so a row reads as a row. */
						align-items: stretch;
					}
					.history-preview-item {
						background-color: color-mix(in srgb, var(--vscode-toolbar-hoverBackground) 65%, transparent);
						border-radius: 4px;
						position: relative;
						overflow: hidden;
						cursor: pointer;
						padding: 10px 12px;
						display: flex;
						align-items: flex-start;
						gap: 12px;
					}
					.history-preview-item:hover {
						background-color: color-mix(in srgb, var(--vscode-toolbar-hoverBackground) 100%, transparent);
						pointer-events: auto;
					}
					.history-task-content {
						flex: 1;
						display: flex;
						align-items: flex-start;
						gap: 8px;
						min-width: 0;
					}
					.history-task-description {
						flex: 1;
						overflow: hidden;
						display: -webkit-box;
						-webkit-line-clamp: 2;
						-webkit-box-orient: vertical;
						color: var(--vscode-foreground);
						font-size: var(--vscode-font-size);
						line-height: 1.4;
					}
					.history-meta-stack {
						display: flex;
						flex-direction: column;
						align-items: center;
						gap: 4px;
						flex-shrink: 0;
					}
					.history-date {
						color: var(--vscode-descriptionForeground);
						font-size: 0.85em;
						white-space: nowrap;
					}
					.history-cost-chip {
						background-color: var(--vscode-badge-background);
						color: var(--vscode-badge-foreground);
						padding: 2px 8px;
						border-radius: 12px;
						font-size: 0.85em;
						font-weight: 500;
						white-space: nowrap;
					}
					.history-view-all-btn {
						background: none;
						border: none;
						padding: 4px 0 4px 8px;
						cursor: pointer;
						font-size: 0.85em;
						font-weight: 500;
						color: var(--vscode-descriptionForeground);
						white-space: nowrap;
						display: flex;
						align-items: center;
						gap: 2px;
					}
					.history-view-all-btn .codicon {
						font-size: 1.2em;
					}
					.history-view-all-btn:hover {
						color: var(--vscode-foreground);
					}
					.history-badge-live {
						display: inline-flex;
						align-items: center;
						gap: 4px;
						background-color: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						padding: 2px 8px;
						border-radius: 12px;
						font-size: 0.85em;
						font-weight: 500;
						white-space: nowrap;
					}
					.history-badge-live .codicon {
						font-size: 1em;
					}
					@keyframes icline-live-spin {
						from { transform: rotate(0deg); }
						to { transform: rotate(360deg); }
					}
					.history-badge-live .codicon-loading {
						animation: icline-live-spin 1.4s linear infinite;
					}
					.history-live-banner {
						display: flex;
						align-items: center;
						gap: 8px;
						margin: 10px 16px 0 16px;
						padding: 8px 10px;
						border-radius: 4px;
						border-left: 3px solid var(--vscode-button-background);
						background-color: color-mix(in srgb, var(--vscode-toolbar-hoverBackground) 65%, transparent);
						font-size: var(--vscode-font-size);
					}
					.history-live-banner-text {
						flex: 1;
						min-width: 0;
						overflow: hidden;
						text-overflow: ellipsis;
						white-space: nowrap;
						color: var(--vscode-foreground);
					}
					.history-live-banner-btn {
						background: none;
						border: none;
						padding: 2px 4px;
						cursor: pointer;
						color: var(--vscode-textLink-foreground);
						font-size: 0.9em;
						font-weight: 500;
						white-space: nowrap;
					}
					.history-live-banner-btn:hover {
						text-decoration: underline;
					}
				`}
			</style>

			{
				/* The one task that is alive somewhere else. It is named here because a Recent card alone
				   cannot say whether the task is working, blocked on a question, or already finished —
				   and whoever is looking at this screen may not know a task is running at all. */
				backgroundTask && badge && (
					<div className="history-live-banner" data-icline-background-task>
						<span
							aria-hidden
							className={`codicon ${badge.icon}`}
							style={{ color: "var(--vscode-button-background)" }}
						/>
						<span className="history-live-banner-text" title={backgroundTask.title ?? undefined}>
							{backgroundTaskNotice(backgroundTask, queuedTask === true)}
						</span>
						<button
							className="history-live-banner-btn"
							onClick={() => handleHistorySelect(backgroundTask.taskId)}
							type="button">
							View
						</button>
					</div>
				)
			}

			<div
				className="history-header"
				style={{
					color: "var(--vscode-descriptionForeground)",
					margin: "10px 16px 10px 16px",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}>
				<div style={{ display: "flex", alignItems: "center" }}>
					<span
						className="codicon codicon-comment-discussion"
						style={{
							marginRight: "4px",
							transform: "scale(0.9)",
						}}
					/>
					<span
						style={{
							fontWeight: 500,
							fontSize: "0.85em",
							textTransform: "uppercase",
						}}>
						Recent
					</span>
				</div>
				{recentTasks.length > 0 && (
					<button
						aria-label="View all history"
						className="history-view-all-btn"
						onClick={() => showHistoryView()}
						type="button">
						View All
						<span className="codicon codicon-chevron-right" />
					</button>
				)}
			</div>

			{
				<div className="px-4">
					{recentTasks.length > 0 ? (
						<div
							className="history-preview-grid"
							data-columns={columns}
							data-icline-recent-grid
							ref={setGrid}
							style={{ "--history-columns": String(columns) } as CSSProperties}>
							{sliceRecentTasks(recentTasks, columns).map((item) => (
								<div className="history-preview-item" key={item.id} onClick={() => handleHistorySelect(item.id)}>
									<div className="history-task-content">
										{item.isFavorited && (
											<span
												aria-label="Favorited"
												className="codicon codicon-star-full"
												style={{
													color: "var(--vscode-button-background)",
													flexShrink: 0,
												}}
											/>
										)}
										<div className="history-task-description ph-no-capture">{item.task}</div>
										{item.isLegacy && <span className="history-cost-chip">Legacy</span>}
										{item.id === backgroundTask?.taskId && badge && (
											<span className="history-badge-live" title={badge.description}>
												<span aria-hidden className={`codicon ${badge.icon}`} />
												{badge.label}
											</span>
										)}
									</div>
									<div className="history-meta-stack">
										{/* Recency, not just a date: same-day sessions need an order. */}
										<span className="history-date" title={formatRecentTimestampTitle(item.ts)}>
											{formatRecentTimestamp(item.ts)}
										</span>
										{item.totalCost != null && (
											<span className="history-cost-chip">${item.totalCost.toFixed(2)}</span>
										)}
									</div>
								</div>
							))}
						</div>
					) : (
						<div
							style={{
								textAlign: "center",
								color: "var(--vscode-descriptionForeground)",
								fontSize: "var(--vscode-font-size)",
								padding: "10px 0",
							}}>
							No recent tasks
						</div>
					)}
				</div>
			}
		</div>
	)
}

export default memo(HistoryPreview)
