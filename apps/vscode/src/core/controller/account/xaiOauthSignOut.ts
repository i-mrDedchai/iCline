import { Empty, EmptyRequest } from "@shared/proto/cline/common"
import { StateManager } from "@/core/storage/StateManager"
import { readGrokCliToken } from "@/integrations/xai/grok-cli-auth"
import { xaiOAuthManager } from "@/integrations/xai/oauth"
import { Logger } from "@/shared/services/Logger"
import { Controller } from ".."
import { refreshXaiSubscriptionModels } from "../models/refreshXaiSubscriptionModels"

export async function xaiOauthSignOut(controller: Controller, _: EmptyRequest): Promise<Empty> {
	try {
		await xaiOAuthManager.clearCredentials()
		xaiOAuthManager.cancelAuthorizationFlow()
		StateManager.get().setModelsCache("xaiSubscription", {})
		if (readGrokCliToken()?.accessToken) {
			await refreshXaiSubscriptionModels(controller).catch(() => undefined)
		}
		await controller.postStateToWebview()
	} catch (error) {
		Logger.error("[xaiOAuthSignOut] Failed to sign out:", error)
		throw error
	}

	return {}
}
