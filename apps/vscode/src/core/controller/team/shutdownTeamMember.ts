import { type ShutdownTeamMemberRequest, TeamActionResult } from "@shared/proto/cline/team"
import type { Controller } from ".."

/**
 * Shuts a teammate down from the team panel. Failures come back as ok:false so
 * the panel can show them inline (e.g. an unknown agent id).
 */
export async function shutdownTeamMember(controller: Controller, request: ShutdownTeamMemberRequest): Promise<TeamActionResult> {
	try {
		await controller.shutdownTeamMember(request.agentId, request.reason || undefined)
		return TeamActionResult.create({ ok: true })
	} catch (error) {
		return TeamActionResult.create({
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		})
	}
}
