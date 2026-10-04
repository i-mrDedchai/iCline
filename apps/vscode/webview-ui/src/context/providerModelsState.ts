import type { ProviderModelsResponse } from "@shared/proto/cline/models"
import { fromProtobufModels } from "@shared/proto-conversions/models/typeConversion"
import type { ModelInfo } from "../../../src/shared/api"

export type ProviderId = string

export interface ProviderModelsState {
	providerId: ProviderId
	models: Record<string, ModelInfo>
	defaultModelId: string
	configFingerprint: string
	requestId: string
	source?: string
	fetchedAt: number
	isLoading: boolean
	isStale: boolean
	error?: string
}

/**
 * Pure transition for unified provider-catalog responses. Lives outside the
 * provider component so it is unit-testable without mounting the full
 * gRPC-wired provider.
 *
 * A FAILED refresh must never wipe last-good catalog data: it keeps the
 * previous models/defaultModelId/fetchedAt and only marks the entry stale
 * with the error. (dev.5 128K follow-up — wiping let the chat silently fall
 * back to a stale committed 128K snapshot with no affordance, because an
 * empty entry reads as "absent, not stale" to the freshness gate.)
 */
export function reduceProviderModelsResponse(
	prev: Partial<Record<ProviderId, ProviderModelsState>>,
	latestRequestId: string | undefined,
	response: ProviderModelsResponse,
): Partial<Record<ProviderId, ProviderModelsState>> {
	if (latestRequestId !== response.requestId) {
		console.debug("Dropping stale provider models response", {
			providerId: response.providerId,
			requestId: response.requestId,
			latestRequestId,
		})
		return prev
	}

	if (!response.ok) {
		const previous = prev[response.providerId]
		if (previous && Object.keys(previous.models).length > 0) {
			return {
				...prev,
				[response.providerId]: {
					...previous,
					requestId: response.requestId,
					isLoading: false,
					isStale: true,
					error: response.error?.message,
				},
			}
		}
	}

	return {
		...prev,
		[response.providerId]: {
			providerId: response.providerId,
			models: response.ok ? fromProtobufModels(response.models) : {},
			defaultModelId: response.defaultModelId ?? "",
			configFingerprint: response.configFingerprint,
			requestId: response.requestId,
			source: response.source,
			fetchedAt: response.fetchedAt,
			isLoading: false,
			isStale: false,
			error: response.ok ? undefined : response.error?.message,
		},
	}
}
