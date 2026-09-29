import type { TeamMailboxEntry, TeamMember, TeamState } from "@shared/proto/cline/team"
import { ShutdownTeamMemberRequest, SpawnTeamMemberRequest, TeamStateRequest } from "@shared/proto/cline/team"
import { RefreshCw, Users, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { formatString } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import { TeamServiceClient } from "@/services/grpc-client"

type TeamPanelProps = {
	onDone: () => void
}

const STATUS_BADGE_STYLES: Record<string, string> = {
	running: "bg-[var(--vscode-testing-iconPassed)]/20 text-[var(--vscode-testing-iconPassed)]",
	stopped: "bg-[var(--vscode-inputValidation-errorBackground)] text-[var(--vscode-inputValidation-errorForeground)]",
}

/** OpenRouter catalog drives the per-agent model picker; the provider is fixed to openrouter. */
const MODEL_PROVIDER_ID = "openrouter"

/**
 * Team management panel: shows the agent team topology (lead + teammates with
 * status and per-agent model), the team mailbox (newest first, unread marked),
 * and controls to spawn a teammate (with an optional model override) or shut
 * one down. State is polled so parallel agents' progress stays visible.
 */
export const TeamPanel = ({ onDone }: TeamPanelProps) => {
	const tr = useTranslation("surfaces")
	const { openRouterModels } = useExtensionState()
	const [teamState, setTeamState] = useState<TeamState | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [actionError, setActionError] = useState<string | null>(null)
	const [agentId, setAgentId] = useState("")
	const [rolePrompt, setRolePrompt] = useState("")
	const [modelId, setModelId] = useState("")
	const [isSpawning, setIsSpawning] = useState(false)

	const loadTeamState = useCallback(async () => {
		try {
			const state = await TeamServiceClient.getTeamState(TeamStateRequest.create({}))
			// Only update state when data changed to prevent flickering
			setTeamState((prev) => (JSON.stringify(prev) === JSON.stringify(state) ? prev : state))
			setLoadError(null)
		} catch (err) {
			setLoadError(err instanceof Error ? err.message : tr("teamFailedLoad"))
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		loadTeamState()
		const interval = window.setInterval(() => {
			loadTeamState()
		}, 5000)
		return () => window.clearInterval(interval)
	}, [loadTeamState])

	const handleSpawn = useCallback(async () => {
		if (!agentId.trim() || !rolePrompt.trim() || isSpawning) {
			return
		}
		setIsSpawning(true)
		setActionError(null)
		try {
			const result = await TeamServiceClient.spawnTeamMember(
				SpawnTeamMemberRequest.create({
					agentId: agentId.trim(),
					rolePrompt: rolePrompt.trim(),
					modelId,
					providerId: modelId ? MODEL_PROVIDER_ID : "",
				}),
			)
			if (result.ok) {
				setAgentId("")
				setRolePrompt("")
				setModelId("")
			} else {
				setActionError(result.error || tr("teamFailedSpawn"))
			}
		} catch (err) {
			setActionError(err instanceof Error ? err.message : tr("teamFailedSpawn"))
		} finally {
			setIsSpawning(false)
			loadTeamState()
		}
	}, [agentId, rolePrompt, modelId, isSpawning, loadTeamState])

	const handleShutdown = useCallback(
		async (member: TeamMember) => {
			setActionError(null)
			try {
				const result = await TeamServiceClient.shutdownTeamMember(
					ShutdownTeamMemberRequest.create({
						agentId: member.agentId,
						reason: tr("teamShutdownNote"),
					}),
				)
				if (!result.ok) {
					setActionError(result.error || formatString(tr, "teamFailedShutdown", { id: member.agentId }))
				}
			} catch (err) {
				setActionError(
					err instanceof Error ? err.message : formatString(tr, "teamFailedShutdown", { id: member.agentId }),
				)
			} finally {
				loadTeamState()
			}
		},
		[loadTeamState],
	)

	const modelLabelFor = useCallback(
		(member: TeamMember): string => {
			if (!member.modelId) {
				return tr("teamInheritModel")
			}
			return openRouterModels?.[member.modelId]?.name ?? member.modelId
		},
		[openRouterModels],
	)

	const lead = teamState?.members.find((member) => member.role === "lead")
	const teammates = teamState?.members.filter((member) => member.role !== "lead") ?? []

	return (
		<div className="fixed inset-0 flex flex-col overflow-hidden">
			{/* Sticky header */}
			<div className="flex-none flex justify-between items-center px-5 py-3 border-b border-[var(--vscode-panel-border)]">
				<h3 className="m-0 flex items-center gap-2">
					<Users className="w-4 h-4" />
					Agent Teams
				</h3>
				<div className="flex items-center gap-2">
					<button
						className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-transparent border border-[var(--vscode-panel-border)] text-[var(--vscode-foreground)] hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer"
						onClick={loadTeamState}
						type="button">
						<RefreshCw className="w-3.5 h-3.5" />
						Refresh
					</button>
					<button
						aria-label={tr("teamClosePanel")}
						className="flex items-center justify-center p-1 rounded bg-transparent border-none text-[var(--vscode-foreground)] hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer"
						onClick={onDone}
						type="button">
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Scrollable content */}
			<div className="flex-1 overflow-y-auto p-5">
				{isLoading && !teamState && (
					<p className="text-sm text-[var(--vscode-descriptionForeground)] m-0">{tr("teamLoading")}</p>
				)}
				{loadError && <p className="text-sm m-0 mb-4 text-[var(--vscode-errorForeground)]">{loadError}</p>}
				{teamState && !teamState.active && (
					<div
						className="p-3 rounded-md"
						style={{
							border: "1px solid var(--vscode-widget-border)",
							backgroundColor: "var(--vscode-list-hoverBackground)",
						}}>
						<p className="text-sm m-0">{tr("teamInactive")}</p>
						<p className="text-sm text-[var(--vscode-descriptionForeground)] m-0 mt-1">
							Start a task that uses team tools to create a team, then come back here to manage its agents.
						</p>
					</div>
				)}
				{teamState?.active && (
					<div className="flex flex-col gap-5">
						{/* Team summary */}
						<div className="flex flex-wrap items-center gap-2">
							<span className="font-semibold break-all">{teamState.teamName || teamState.teamId}</span>
							<span className="text-xs px-1.5 py-0.5 rounded bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)]">
								{teamState.members.length} agents
							</span>
							<span className="text-xs px-1.5 py-0.5 rounded bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)]">
								{teamState.openTasks} open tasks
							</span>
							<span className="text-xs px-1.5 py-0.5 rounded bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)]">
								{teamState.activeRuns} active runs
							</span>
						</div>

						{/* Topology: lead node with its teammates */}
						<div>
							<h4 className="m-0 mb-2 text-sm">{tr("teamTopology")}</h4>
							<div className="flex flex-col md:flex-row md:items-start gap-3">
								{lead && (
									<div className="flex-none w-full md:w-56 p-3 rounded border border-[var(--vscode-focusBorder)] bg-[var(--vscode-list-activeSelectionBackground)]">
										<MemberCard member={lead} modelLabel={modelLabelFor(lead)} />
									</div>
								)}
								<div className="flex flex-col gap-2 md:border-l md:border-[var(--vscode-panel-border)] md:pl-3 flex-1 min-w-0">
									{teammates.length === 0 && (
										<p className="text-sm text-[var(--vscode-descriptionForeground)] m-0">
											No teammates yet. Spawn one below.
										</p>
									)}
									{teammates.map((member) => (
										<div
											className="p-3 rounded border border-[var(--vscode-panel-border)]"
											key={member.agentId}>
											<MemberCard member={member} modelLabel={modelLabelFor(member)} />
											<button
												className="mt-2 px-2 py-1 rounded text-xs bg-transparent border border-[var(--vscode-inputValidation-errorBackground)] text-[var(--vscode-errorForeground)] hover:bg-[var(--vscode-inputValidation-errorBackground)] hover:text-[var(--vscode-inputValidation-errorForeground)] cursor-pointer"
												onClick={() => handleShutdown(member)}
												type="button">
												Shutdown {member.agentId}
											</button>
										</div>
									))}
								</div>
							</div>
						</div>

						{/* Mailbox viewer */}
						<div>
							<div className="flex items-center gap-2 mb-2">
								<h4 className="m-0 text-sm">{tr("teamMailbox")}</h4>
								{teamState.unreadMessages > 0 && (
									<span className="text-xs px-1.5 py-0.5 rounded bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)]">
										{teamState.unreadMessages} unread
									</span>
								)}
							</div>
							{teamState.mailbox.length === 0 && (
								<p className="text-sm text-[var(--vscode-descriptionForeground)] m-0">{tr("teamNoMessages")}</p>
							)}
							<div className="flex flex-col gap-2">
								{teamState.mailbox.map((entry: TeamMailboxEntry) => (
									<div
										className={`p-2.5 rounded border ${
											entry.read
												? "border-[var(--vscode-panel-border)]"
												: "border-[var(--vscode-focusBorder)] bg-[var(--vscode-list-hoverBackground)]"
										}`}
										key={entry.id}>
										<div className="flex flex-wrap items-center gap-2 text-xs">
											<span className="font-medium break-all">
												{entry.fromAgentId} → {entry.toAgentId}
											</span>
											<span className={entry.read ? "" : "font-semibold"}>{entry.subject}</span>
											<span className="text-[var(--vscode-descriptionForeground)]">
												{formatSentAt(entry.sentAt)}
											</span>
										</div>
										<p className="m-0 mt-1 text-sm whitespace-pre-wrap break-words">{entry.body}</p>
									</div>
								))}
							</div>
						</div>

						{/* Spawn form */}
						<div>
							<h4 className="m-0 mb-2 text-sm">{tr("teamSpawnTeammate")}</h4>
							<div className="flex flex-col gap-2 max-w-xl">
								<label className="text-xs" htmlFor="team-agent-id">
									{tr("teamAgentIdLabel")}
								</label>
								<input
									className="px-2 py-1 rounded border border-[var(--vscode-input-border,transparent)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)]"
									id="team-agent-id"
									onChange={(event) => setAgentId(event.target.value)}
									placeholder={tr("teamAgentIdHint")}
									value={agentId}
								/>
								<label className="text-xs" htmlFor="team-role-prompt">
									{tr("teamRoleLabel")}
								</label>
								<textarea
									className="px-2 py-1 rounded border border-[var(--vscode-input-border,transparent)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] min-h-20"
									id="team-role-prompt"
									onChange={(event) => setRolePrompt(event.target.value)}
									placeholder={tr("teamRoleHint")}
									value={rolePrompt}
								/>
								<label className="text-xs" htmlFor="team-model">
									{tr("teamModelFieldLabel")}
								</label>
								<select
									className="px-2 py-1 rounded border border-[var(--vscode-input-border,transparent)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)]"
									id="team-model"
									onChange={(event) => setModelId(event.target.value)}
									value={modelId}>
									<option value="">{tr("teamDefaultModel")}</option>
									{Object.entries(openRouterModels ?? {}).map(([id, info]) => (
										<option key={id} value={id}>
											{(info as { name?: string }).name ?? id} ({id})
										</option>
									))}
								</select>
								<div>
									<button
										className="px-3 py-1.5 rounded text-sm bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] border-none hover:bg-[var(--vscode-button-hoverBackground)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
										disabled={!agentId.trim() || !rolePrompt.trim() || isSpawning}
										onClick={handleSpawn}
										type="button">
										{isSpawning ? tr("teamSpawning") : tr("teamSpawn")}
									</button>
								</div>
								{actionError && <p className="m-0 text-sm text-[var(--vscode-errorForeground)]">{actionError}</p>}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

type MemberCardProps = {
	member: TeamMember
	modelLabel: string
}

const MemberCard = ({ member, modelLabel }: MemberCardProps) => {
	const tr = useTranslation("surfaces")
	return (
		<div>
			<div className="flex flex-wrap items-center gap-2">
				<span className="font-semibold break-all">{member.agentId}</span>
				<span className="text-xs px-1.5 py-0.5 rounded bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)]">
					{member.role === "lead" ? tr("teamLead") : tr("teamTeammate")}
				</span>
				<span
					className={`text-xs px-1.5 py-0.5 rounded ${
						STATUS_BADGE_STYLES[member.status] ??
						"bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)]"
					}`}>
					{member.status}
				</span>
			</div>
			{member.description && (
				<p className="m-0 mt-1 text-xs text-[var(--vscode-descriptionForeground)] break-words">{member.description}</p>
			)}
			<div className="flex items-center gap-1.5 mt-1 text-xs">
				<span className="text-[var(--vscode-descriptionForeground)]">{tr("teamModelLabel")}</span>
				<span className="font-medium break-all">{modelLabel}</span>
			</div>
		</div>
	)
}

function formatSentAt(sentAt: string): string {
	const timestamp = Date.parse(sentAt)
	return Number.isNaN(timestamp) ? sentAt : new Date(timestamp).toLocaleString()
}

export default TeamPanel
