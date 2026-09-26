import { TeamState, type TeamStateRequest } from "@shared/proto/cline/team"
import type { Controller } from ".."

/** Cap for the panel's mailbox viewer (newest first). */
const MAILBOX_LIMIT = 50

/**
 * Returns the active session's team state for the team panel: topology
 * (members), mailbox viewer data, and headline counts. `active: false` when
 * the session has no team runtime (feature switch off or no session).
 */
export async function getTeamState(controller: Controller, _request: TeamStateRequest): Promise<TeamState> {
	const state = await controller.getTeamState()
	if (!state) {
		return TeamState.create({ active: false })
	}

	const mailbox = [...state.mailbox].sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime()).slice(0, MAILBOX_LIMIT)

	return TeamState.create({
		active: true,
		teamId: state.teamId,
		teamName: state.teamName,
		members: state.members.map((member) => ({
			agentId: member.agentId,
			role: member.role,
			description: member.description ?? "",
			status: member.status,
			modelId: member.modelId ?? "",
			providerId: member.providerId ?? "",
		})),
		mailbox: mailbox.map((message) => ({
			id: message.id,
			fromAgentId: message.fromAgentId,
			toAgentId: message.toAgentId,
			subject: message.subject,
			body: message.body,
			sentAt: message.sentAt.toISOString(),
			read: message.readAt != null,
		})),
		unreadMessages: state.mailbox.filter((message) => message.readAt == null).length,
		openTasks: state.tasks.filter((task) => task.status !== "completed").length,
		activeRuns: state.runs.filter((run) => run.status === "running" || run.status === "queued").length,
	})
}
