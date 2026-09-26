import { type SpawnTeamMemberRequest, TeamActionResult } from "@shared/proto/cline/team"
import type { Controller } from ".."

/**
 * Spawns a teammate on the active session's team from the team panel. The
 * optional model_id/provider_id pick that agent's model (otherwise the parent
 * session's connection is inherited). Failures come back as ok:false so the
 * panel can show them inline instead of dropping the action.
 */
export async function spawnTeamMember(controller: Controller, request: SpawnTeamMemberRequest): Promise<TeamActionResult> {
	try {
		await controller.spawnTeamMember({
			agentId: request.agentId,
			rolePrompt: request.rolePrompt,
			...(request.modelId ? { modelId: request.modelId } : {}),
			...(request.providerId ? { providerId: request.providerId } : {}),
		})
		return TeamActionResult.create({ ok: true })
	} catch (error) {
		return TeamActionResult.create({
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		})
	}
}
