/**
 * What a stored Effort level really sends, fetched once per (provider, model, effort,
 * budget) and shared by every surface that shows it — the Quick Picker's Options panel
 * and the Settings Effort control.
 *
 * The host owns the answer (`@/sdk/reasoning-effort-decision` calls the SDK's own
 * decision function), so this hook is a thin, cached reader: no loading state, no
 * flicker, and nothing rendered until the real answer arrives (a wrong "Max → High"
 * claim is worse than a moment of silence).
 *
 * ## The answer has two halves, and they are cached by different questions
 *
 * `supportedEfforts`/`source` are properties of the MODEL; `applied`/`reason`/`clamped`
 * are properties of the LEVEL in force. Keying both by the whole question made every
 * Thinking toggle drop the model's levels on the floor: the new question (`none`) had no
 * answer yet, the hook answered `undefined`, and the Options panel fell back to the
 * provider VOCABULARY — six generic levels plus a clamp notice for a level the model
 * takes — until the answer landed and it snapped back to the model's three. On a panel
 * whose height decides where it sits, that is a visible jump on every click, for every
 * model (smoke 2026-09-21, dev.6-fix.27: "the Options page jumps around and is not in
 * line with its own model row"). So the two halves are remembered separately:
 * `levelsCache` by model, `outcomeCache` by the exact question.
 */

import { ResolveReasoningEffortRequest, type ResolveReasoningEffortResponse } from "@shared/proto/cline/models"
import { useEffect, useState } from "react"
import { ModelsServiceClient } from "@/services/grpc-client"

/**
 * The MODEL-level half of an answer: the levels this model advertises, and whether the
 * registry carried it at all. Independent of the level in force, so it outlives one.
 */
export interface ReasoningEffortLevels {
	/** Levels the model advertises, ascending (empty when the catalog has none). */
	supportedEfforts: string[]
	/** "sdk-registry" when a catalog entry answered, else "registry-missing-model". */
	source: string
}

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
	/**
	 * "sdk-registry" when a catalog entry answered the question, else
	 * "registry-missing-model". A model the catalog does not carry is UNKNOWN, not
	 * level-less — surfaces must not read `supportedEfforts: []` from it as "this model
	 * has no levels".
	 */
	source: string
}

/** Answers already fetched, plus the in-flight requests, keyed by the question. */
const outcomeCache = new Map<string, ReasoningEffortOutcome | null>()
/** The model-level half of every answer fetched so far, keyed by provider+model. */
const levelsCache = new Map<string, ReasoningEffortLevels>()
const inFlight = new Map<string, Promise<ReasoningEffortOutcome | null>>()
const MAX_CACHE_ENTRIES = 200

function cacheKey(input: { providerId: string; modelId: string; effort: string; thinkingBudgetTokens?: number | null }): string {
	return [input.providerId, input.modelId, input.effort, input.thinkingBudgetTokens ?? 0].join("|")
}

/** The key the model-level half is remembered under — no level, no budget. */
function levelsKey(input: { providerId: string; modelId: string }): string {
	return [input.providerId, input.modelId].join("|")
}

/** The key for a CALLER's question — same normalization the hook applies to its own. */
function questionKey(input: {
	providerId?: string
	modelId?: string
	effort?: string | null
	thinkingBudgetTokens?: number | null
}): string {
	return cacheKey({
		providerId: input.providerId ?? "",
		modelId: input.modelId ?? "",
		effort: input.effort?.trim() ?? "",
		thinkingBudgetTokens: input.thinkingBudgetTokens ?? 0,
	})
}

/**
 * The levels already known for this model, whatever level is in force — what a click
 * handler needs to decide which level an ON switch should land on. Independent of the
 * stored level, so it survives the toggle that is asking the question.
 */
export function readReasoningEffortLevels(input: { providerId?: string; modelId?: string }): ReasoningEffortLevels | undefined {
	const providerId = input.providerId ?? ""
	const modelId = input.modelId ?? ""
	if (!providerId || !modelId) {
		return undefined
	}
	return levelsCache.get(levelsKey({ providerId, modelId }))
}

/**
 * The answer already fetched for this exact question, for the one caller that needs it
 * without a hook: a click handler deciding which level an ON switch should land on.
 *
 * Hooks cannot be called from a callback, and the level list a control draws must be
 * the model's own (`z-ai/glm-5.3-flash` takes Low/High/Max) — an ON switch that wrote
 * the provider vocabulary's `minimal` would be silently clamped to `low`.
 *
 * `undefined` while the answer is unknown, exactly like the hook: the caller must keep
 * a fallback rather than invent levels. Every surface that reaches this asked the same
 * question for its own panel a moment earlier, and the question is keyed by the values
 * in force, so that answer IS this one.
 */
export function readReasoningEffortOutcome(input: {
	providerId?: string
	modelId?: string
	effort?: string | null
	thinkingBudgetTokens?: number | null
}): ReasoningEffortOutcome | undefined {
	return outcomeCache.get(questionKey(input)) ?? undefined
}

function remember(key: string, modelKey: string, outcome: ReasoningEffortOutcome | null): void {
	// The key space is small (levels × models viewed) and bounded by insertion order;
	// dropping the oldest entry keeps a long session from growing without limit.
	if (outcomeCache.size >= MAX_CACHE_ENTRIES) {
		const oldest = outcomeCache.keys().next().value
		if (oldest !== undefined) {
			outcomeCache.delete(oldest)
		}
	}
	outcomeCache.set(key, outcome)
	if (outcome) {
		// Every answer also teaches the model half, so a level the user has not asked
		// about yet is already known when the Thinking switch moves to it.
		levelsCache.set(modelKey, { supportedEfforts: outcome.supportedEfforts, source: outcome.source })
	}
}

/** Test seam: forget every cached answer. */
export function clearReasoningEffortOutcomeCache(): void {
	outcomeCache.clear()
	levelsCache.clear()
	inFlight.clear()
}

/**
 * The answer for a level whose own question is still in flight: the model's real levels,
 * and NO claim about this level.
 *
 * `applied`/`clamped`/`suppressedByBudget` stay empty so no surface reports a downgrade
 * that has not been decided yet, and `reason` says nothing except the one model-level
 * fact the registry itself asserts: a model it carries with no levels at all really has
 * no effort control. Everything else is `not-applicable`, which renders as silence — the
 * same thing an unknown answer renders, so a half-known answer can never be read as a
 * claim.
 */
function levelsOnlyOutcome(levels: ReasoningEffortLevels, requested: string): ReasoningEffortOutcome {
	return {
		requested,
		applied: undefined,
		supportedEfforts: levels.supportedEfforts,
		reason: levels.supportedEfforts.length === 0 && levels.source === "sdk-registry" ? "no-effort-control" : "not-applicable",
		clamped: false,
		suppressedByBudget: false,
		source: levels.source,
	}
}

function toOutcome(response: ResolveReasoningEffortResponse): ReasoningEffortOutcome {
	return {
		requested: response.requested,
		applied: response.applied,
		supportedEfforts: response.supportedEfforts,
		reason: response.reason,
		clamped: response.clamped,
		suppressedByBudget: response.suppressedByBudget,
		source: response.source,
	}
}

/**
 * `undefined` while the answer is unknown, or when there is no model to ask about.
 *
 * Asked for a model with NO level set as well: the answer then carries
 * `supportedEfforts` (the levels that model's wire format accepts) and reports no
 * downgrade, which is what a control needs to draw its list. Gating the question on
 * an already-set level is what made a control unable to name levels it did not
 * already hold.
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
	const applies = Boolean(providerId && modelId)
	const key = cacheKey({ providerId, modelId, effort, thinkingBudgetTokens })
	const modelKey = levelsKey({ providerId, modelId })

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
		// The model half is already known (from another level's answer): there is nothing
		// to wait for, and re-asking would only flicker the list. The exact answer is
		// still fetched, because THAT is the half that is missing.
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
			void request.then((result) => remember(key, modelKey, result))
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

	if (!applies) {
		return undefined
	}
	// The exact answer wins; while it is missing, the model's own levels answer instead
	// of nothing — the list the panel draws does not depend on the level in force.
	if (answer?.key === key) {
		return answer.outcome ?? undefined
	}
	const levels = levelsCache.get(modelKey)
	return levels ? levelsOnlyOutcome(levels, effort) : undefined
}
