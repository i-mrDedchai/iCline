import { Empty, StringRequest } from "@shared/proto/cline/common"
import { writeTextToClipboard } from "@/utils/env"
import { type ProviderCatalogController, parseProviderIdRequest } from "./providerCatalogShared"

/**
 * Copies the saved API key for a provider to the system clipboard.
 *
 * The key is read and written entirely on the host: the webview only learns that the copy
 * happened, so the saved secret never crosses into the settings UI.
 */
export async function copySavedApiKey(controller: ProviderCatalogController, request: StringRequest): Promise<Empty> {
	const providerId = parseProviderIdRequest(request.value, "value")
	const apiKey = controller.getProviderConfigStore().read(providerId).apiKey
	if (!apiKey) {
		throw new Error(`No saved API key for provider "${providerId}"`)
	}
	await writeTextToClipboard(apiKey)
	return Empty.create()
}
