import { Empty, StringRequest } from "@shared/proto/cline/common"
import { openExternal } from "@/utils/env"
import { Controller } from ".."

const ZENMUX_AUTH_URLS: Record<string, string> = {
	login: "https://zenmux.ai/login",
	payg: "https://zenmux.ai/platform/pay-as-you-go",
	subscription: "https://zenmux.ai/platform/subscription",
	management: "https://zenmux.ai/platform/management",
	models: "https://zenmux.ai/models",
}

/**
 * Opens ZenMux console pages for sign-in and API key management.
 */
export async function zenmuxAuthClicked(_: Controller, req: StringRequest): Promise<Empty> {
	const target = req.value || "login"
	const url = ZENMUX_AUTH_URLS[target] || ZENMUX_AUTH_URLS.login
	await openExternal(url)
	return {}
}
