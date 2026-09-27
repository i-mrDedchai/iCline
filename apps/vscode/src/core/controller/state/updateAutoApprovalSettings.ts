import { Empty } from "@shared/proto/cline/common"
import { AutoApprovalSettingsRequest } from "@shared/proto/cline/state"
import { Controller } from ".."

/**
 * Updates the auto approval settings
 * @param controller The controller instance
 * @param request The auto approval settings request
 * @returns Empty response
 */
export async function updateAutoApprovalSettings(controller: Controller, request: AutoApprovalSettingsRequest): Promise<Empty> {
	const currentSettings = (await controller.getStateToPostToWebview()).autoApprovalSettings
	const incomingVersion = request.version
	const currentVersion = currentSettings?.version ?? 1

	// Only write when the incoming version is higher, so an out-of-order message
	// cannot overwrite a newer choice.
	if (incomingVersion > currentVersion) {
		// Merge with current settings to preserve unspecified fields
		const settings = {
			...currentSettings,
			...(request.version !== undefined && { version: request.version }),
			...(request.enableNotifications !== undefined && { enableNotifications: request.enableNotifications }),
			...(request.teamBudget !== undefined && {
				teamBudget: {
					maxAgents: request.teamBudget.maxAgents ?? 0,
					maxTokensPerTurn: request.teamBudget.maxTokensPerTurn ?? 0,
				},
			}),
			actions: {
				...currentSettings.actions,
				...(request.actions
					? Object.fromEntries(Object.entries(request.actions).filter(([_, v]) => v !== undefined))
					: {}),
			},
		}

		controller.stateManager.setGlobalState("autoApprovalSettings", settings)
		if (controller.task?.taskId) {
			controller.stateManager.setTaskSettings(controller.task.taskId, "autoApprovalSettings", settings)
		}
	}

	// Always post the authoritative state, including for a refused write. The
	// webview derives its next version from the last state it received, so a
	// silently dropped update would leave it sending a version that can never
	// exceed the stored one — every later toggle (e.g. Execute commands) would be
	// discarded until a reload, and auto-approved commands would keep prompting.
	await controller.postStateToWebview()

	return Empty.create()
}
