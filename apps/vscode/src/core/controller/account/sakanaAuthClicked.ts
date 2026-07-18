import { Empty, StringRequest } from "@shared/proto/cline/common"
import { openExternal } from "@/utils/env"
import { Controller } from ".."

const SAKANA_AUTH_URLS: Record<string, string> = {
	login: "https://console.sakana.ai/get-started",
	keys: "https://console.sakana.ai/api-keys",
	pricing: "https://console.sakana.ai/pricing",
	subscription: "https://console.sakana.ai/pricing",
	payg: "https://console.sakana.ai/pricing",
	models: "https://console.sakana.ai/models",
}

export async function sakanaAuthClicked(_: Controller, req: StringRequest): Promise<Empty> {
	const target = req.value || "login"
	const url = SAKANA_AUTH_URLS[target] || SAKANA_AUTH_URLS.login
	await openExternal(url)
	return {}
}