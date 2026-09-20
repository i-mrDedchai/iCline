/**
 * What a stored Effort level really sends, fetched once per (provider, model, effort,
 * budget) and shared by every surface that shows it — the Quick Picker's Options panel
 * and the Settings Effort control.
 *
 * The host owns the answer (`@/sdk/reasoning-effort-decision` calls the SDK's own
 * decision function), so this hook is a thin, cached reader: no loading state, no
 * flicker, and nothing rendered until the real answer arrives (a wrong "Max → High"
 * claim is worse than a moment of silence).
 */

import { ResolveReasoningEffortRequest, type ResolveReasoningEffortResponse } from "@shared/proto/cline/models"
import { useEffect, useState } from "react"
import { ModelsServiceClient } from "@/services/grpc-client"

export interface ReasoningEffortOutcome {
	/** The level that was asked for. */
	requested: string
	/** The level that will reach the provider; undefined when none is forwarded. */
	applied?: string
	/** Levels the model advertises, ascending (empty when the catalog has none). */
	supportedEfforts: string[]
	/** Why `applied` differs: see the proto's `reason`. */
	reason: string
	clamped: boolean
	/** A thinking budget is what goes out instead of this effort. */
	suppressedByBudget: boolean
}

/** Answers already fetched, plus the in-flight requests, keyed by the question. */
const outcomeCache = new Map<string, ReasoningEffortOutcome | null>()
const inFlight = new Map<string, Promise<ReasoningEffortOutcome | null>>()
const MAX_CACHE_ENTRIES = 200

function cacheKey(input: { providerId: string; modelId: string; effort: string; thinkingBudgetTokens?: number | null }): string {
	return [input.providerId, input.modelId, input.effort, input.thinkingBudgetTokens ?? 0].join("|")
}

function remember(key: string, outcome: ReasoningEffortOutcome | null): void {
	// The key space is small (levels × models viewed) and bounded by insertion order;
	// dropping the oldest entry keeps a long session from growing without limit.
	if (outcomeCache.size >= MAX_CACHE_ENTRIES) {
		const oldest = outcomeCache.keys().next().value
		if (oldest !== undefined) {
			outcomeCache.delete(oldest)
		}
	}
	outcomeCache.set(key, outcome)
}

/** Test seam: forget every cached answer. */
export function clearReasoningEffortOutcomeCache(): void {
	outcomeCache.clear()
	inFlight.clear()
}

function toOutcome(response: ResolveReasoningEffortResponse): ReasoningEffortOutcome {
	return {
		requested: response.requested,
		applied: response.applied,
		supportedEfforts: response.supportedEfforts,
		reason: response.reason,
		clamped: response.clamped,
		suppressedByBudget: response.suppressedByBudget,
	}
}

/**
 * `undefined` while the answer is unknown (or when the question does not apply:
 * no model, no effort, `none`).
 */
export function useReasoningEffortOutcome(input: {
	providerId?: string
	modelId?: string
	effort?: string | null
	thinkingBudgetTokens?: number | null
}): ReasoningEffortOutcome | undefined {
	const providerId = input.providerId ?? ""
	const modelId = input.modelId ?? ""
	const effort = input.effort?.trim() ?? ""
	const thinkingBudgetTokens = input.thinkingBudgetTokens ?? 0
	// `none`/empty means "send no reasoning at all" — the host has nothing to report.
	const applies = Boolean(providerId && modelId && effort && effort !== "none")
	const key = cacheKey({ providerId, modelId, effort, thinkingBudgetTokens })

	// The answer is stored WITH the question it answers: a stale result must never be
	// rendered as if it described the model now under the cursor.
	const [answer, setAnswer] = useState<{ key: string; outcome: ReasoningEffortOutcome | null } | undefined>(() => {
		const cached = applies ? outcomeCache.get(key) : undefined
		return cached !== undefined ? { key, outcome: cached } : undefined
	})

	useEffect(() => {
		if (!applies) {
			setAnswer(undefined)
			return
		}

		const cached = outcomeCache.get(key)
		if (cached !== undefined) {
			setAnswer({ key, outcome: cached })
			return
		}

		let cancelled = false
		let request = inFlight.get(key)
		if (!request) {
			request = ModelsServiceClient.resolveReasoningEffort(
				ResolveReasoningEffortRequest.create({
					providerId,
					modelId,
					effort,
					thinkingBudgetTokens: thinkingBudgetTokens > 0 ? thinkingBudgetTokens : undefined,
				}),
			)
				.then((response) => toOutcome(response))
				.catch(() => {
					// A host-side failure is logged at the gRPC layer; staying silent here
					// keeps a stale "nothing to report" from becoming a false claim.
					return null
				})
				.finally(() => {
					inFlight.delete(key)
				})
			inFlight.set(key, request)
			void request.then((result) => remember(key, result))
		}

		void request.then((result) => {
			if (!cancelled) {
				setAnswer({ key, outcome: result })
			}
		})
		return () => {
			cancelled = true
		}
	}, [applies, key, providerId, modelId, effort, thinkingBudgetTokens])

	return applies && answer?.key === key ? (answer.outcome ?? undefined) : undefined
}
