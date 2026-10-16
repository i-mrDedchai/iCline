import { StringRequest } from "@shared/proto/cline/common"
import { useCallback } from "react"
import { ModelsServiceClient } from "@/services/grpc-client"
import { getSavedApiKeyMask, sanitizeMaskedApiKeyInput } from "./apiKeyMasking"

interface UseProviderApiKeyFieldOptions {
	apiKeyLength?: number
	canWrite?: boolean
	onApiKeyChange?: (apiKey: string) => void
	providerId: string
	providerName: string
	write: (patch: { apiKey: string }) => Promise<unknown>
}

export function useProviderApiKeyField({
	apiKeyLength,
	canWrite = true,
	onApiKeyChange,
	providerId,
	providerName,
	write,
}: UseProviderApiKeyFieldOptions) {
	const savedApiKeyMask = getSavedApiKeyMask(apiKeyLength)

	const handleApiKeyChange = useCallback(
		(value: string) => {
			if (!canWrite) {
				return
			}

			const apiKey = sanitizeMaskedApiKeyInput(value, savedApiKeyMask)

			if (apiKey === undefined) {
				return
			}

			onApiKeyChange?.(apiKey)
			void write({ apiKey }).catch((err) => console.error(`Failed to update ${providerName} API key:`, err))
		},
		[canWrite, onApiKeyChange, providerName, savedApiKeyMask, write],
	)

	// The host copies the key itself; the webview never receives the secret.
	const copySavedApiKey = useCallback(
		() => ModelsServiceClient.copySavedApiKey(StringRequest.create({ value: providerId })),
		[providerId],
	)

	return { savedApiKeyMask, handleApiKeyChange, copySavedApiKey }
}
