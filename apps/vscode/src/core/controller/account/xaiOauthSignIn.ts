import { Empty, EmptyRequest } from "@shared/proto/cline/common"
import { ShowMessageType } from "@shared/proto/host/window"
import { HostProvider } from "@/hosts/host-provider"
import { xaiOAuthManager } from "@/integrations/xai/oauth"
import { Logger } from "@/shared/services/Logger"
import { openExternal } from "@/utils/env"
import { Controller } from ".."

export async function xaiOauthSignIn(controller: Controller, _: EmptyRequest): Promise<Empty> {
	try {
		const authUrl = await xaiOAuthManager.startAuthorizationFlow()
		await openExternal(authUrl)

		xaiOAuthManager
			.waitForCallback()
			.then(async () => {
				const { refreshXaiSubscriptionModels } = await import("../models/refreshXaiSubscriptionModels")
				await refreshXaiSubscriptionModels(controller).catch(() => undefined)
				HostProvider.window.showMessage({
					type: ShowMessageType.INFORMATION,
					message: "Successfully signed in to xAI Grok",
				})
				await controller.postStateToWebview()
			})
			.catch((error) => {
				Logger.error("[xaiOAuthSignIn] OAuth callback failed:", error)
				xaiOAuthManager.cancelAuthorizationFlow()
				const errorMessage = error instanceof Error ? error.message : String(error)
				if (!errorMessage.includes("timed out")) {
					HostProvider.window.showMessage({
						type: ShowMessageType.ERROR,
						message: `xAI Grok sign in failed: ${errorMessage}`,
					})
				}
			})
	} catch (error) {
		Logger.error("[xaiOAuthSignIn] Failed to start OAuth flow:", error)
		xaiOAuthManager.cancelAuthorizationFlow()
		throw error
	}

	return {}
}
