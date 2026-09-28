import type { ModelInfo } from "./types";
import { GENERATED_PROVIDER_MODELS } from "./catalog.generated";
import {
	findRegisteredModelsSync,
	getProviderCollectionSync,
	getProviderIds,
} from "../providers/model-registry";

/**
 * Cross-provider model-id metadata lookup.
 *
 * The catalog is keyed provider → model id, but proxies and resellers
 * (OpenAI-compatible gateways, serverless hosts, coding plans) sell the same
 * model ids under their own provider keys — and custom providers (e.g. a bare
 * `openai-compatible` endpoint pointing at some gateway) carry no catalog key
 * at all. A model like `gpt-5.6-sol` therefore looked "unknown" on such a
 * provider even though the bundled catalog already describes it under 16 other
 * keys, and the UI showed no context window (or, before, a fabricated 128K).
 *
 * This lookup matches a model id **exactly** across every provider's catalog
 * entry and resolves one reference entry. Resellers publish slightly different
 * numbers for the same model (observed: 1,050,000 / 1,000,000 / 372,000 for
 * `gpt-5.6-sol`), so the scalar limits are resolved by majority vote across
 * providers — which lands on the vendor-canonical value in practice (13/16
 * providers, including `openai-native`, agree on 1,050,000). Ties break toward
 * the lexicographically-first provider id so results are deterministic.
 *
 * Results are advisory: callers use them to FILL missing metadata only (see
 * {@link fillCrossProviderModelInfo}); anything the user or the provider's own
 * catalog declared always wins.
 */

export interface CrossProviderModelMatch {
	/** The resolved reference entry (limits reflect the majority vote). */
	info: ModelInfo;
	/** Provider ids whose catalog carries this model id. */
	providers: string[];
	/** How many providers agree on the resolved contextWindow (0 = none carry one). */
	agreement: number;
}

interface Candidate {
	providerId: string;
	info: ModelInfo;
}

/**
 * The generated catalog is immutable per build (memoized per model id); the
 * registry (custom providers / models.json entries) is read live on every call
 * so `registerModel` results are never stale.
 */
const generatedCandidatesCache = new Map<string, Candidate[]>();

function generatedCandidates(modelId: string): Candidate[] {
	const cached = generatedCandidatesCache.get(modelId);
	if (cached) {
		return cached;
	}
	const out: Candidate[] = [];
	for (const [providerId, models] of Object.entries(
		GENERATED_PROVIDER_MODELS.providers,
	)) {
		const info = models[modelId];
		if (info) {
			out.push({ providerId, info });
		}
	}
	generatedCandidatesCache.set(modelId, out);
	return out;
}

function registryCandidates(modelId: string): Candidate[] {
	// Cheap per-provider reads (no merged views): the bundled/custom provider
	// collections first, then runtime-registered models (models.json) which
	// take precedence for their provider id.
	const byProvider = new Map<string, Candidate>();
	for (const providerId of getProviderIds()) {
		const info = getProviderCollectionSync(providerId)?.models[modelId];
		if (info) {
			byProvider.set(providerId, { providerId, info });
		}
	}
	for (const candidate of findRegisteredModelsSync(modelId)) {
		byProvider.set(candidate.providerId, candidate);
	}
	return [...byProvider.values()];
}

function candidatesFor(modelId: string): Candidate[] {
	const generated = generatedCandidates(modelId);
	const registry = registryCandidates(modelId);
	if (registry.length === 0) {
		return generated;
	}
	// Registry entries are live (and may replace a generated entry for the
	// same provider id), so merge per provider id before voting.
	const byProvider = new Map<string, Candidate>();
	for (const candidate of generated) {
		byProvider.set(candidate.providerId, candidate);
	}
	for (const candidate of registry) {
		byProvider.set(candidate.providerId, candidate);
	}
	return [...byProvider.values()];
}

function resolveReference(
	candidates: Candidate[],
): CrossProviderModelMatch | undefined {
	if (candidates.length === 0) {
		return undefined;
	}
	// Deterministic order: provider id ascending.
	const sorted = [...candidates].sort((a, b) =>
		a.providerId < b.providerId ? -1 : a.providerId > b.providerId ? 1 : 0,
	);

	// Majority vote on contextWindow (entries without one do not vote).
	const votes = new Map<number, number>();
	for (const { info } of sorted) {
		if (typeof info.contextWindow === "number" && info.contextWindow > 0) {
			votes.set(info.contextWindow, (votes.get(info.contextWindow) ?? 0) + 1);
		}
	}
	let chosen: number | undefined;
	let best = 0;
	for (const [value, count] of votes) {
		// Strict > keeps the first-seen (lowest provider id) value on ties.
		if (count > best) {
			best = count;
			chosen = value;
		}
	}

	// Reference entry: the first provider carrying the winning limit, else the
	// first provider overall (it still contributes name/capabilities/pricing).
	const reference =
		(chosen !== undefined
			? sorted.find(({ info }) => info.contextWindow === chosen)
			: undefined) ?? sorted[0];
	const info: ModelInfo = {
		...reference.info,
		...(chosen !== undefined ? { contextWindow: chosen } : {}),
	};
	return {
		info,
		providers: sorted.map(({ providerId }) => providerId),
		agreement: chosen !== undefined ? best : 0,
	};
}

/**
 * Find catalog metadata for a model id across ALL providers (generated catalog
 * merged with the live registry — custom providers and models.json entries).
 * Returns undefined when no provider carries the id.
 */
export function findCrossProviderModelInfo(
	modelId: string,
): CrossProviderModelMatch | undefined {
	const trimmed = modelId.trim();
	if (!trimmed) {
		return undefined;
	}
	return resolveReference(candidatesFor(trimmed));
}

const FILL_KEYS = [
	"name",
	"description",
	"maxTokens",
	"contextWindow",
	"maxInputTokens",
	"capabilities",
	"operation",
	"operationModes",
	"modalities",
	"reasoningOptions",
	"apiFormat",
	"systemRole",
	"temperature",
	"pricing",
	"thinkingConfig",
	"status",
	"releaseDate",
	"family",
	"metadata",
] as const satisfies readonly (keyof ModelInfo)[];

/**
 * Fill MISSING metadata on `base` from the cross-provider catalog lookup.
 * Existing values (user config, provider-scoped catalog, state snapshots with
 * real numbers) are never overridden — this only fills what is absent, so the
 * fabricated-128K failure mode cannot come back through this path either.
 * Returns `base` unchanged when no catalog entry matches the id.
 */
export function fillCrossProviderModelInfo(
	base: ModelInfo | undefined,
	modelId: string,
): ModelInfo | undefined {
	const match = findCrossProviderModelInfo(modelId);
	if (!match) {
		return base;
	}
	const source = match.info;
	const filled: ModelInfo = { ...(base ?? {}), id: base?.id ?? modelId };
	for (const key of FILL_KEYS) {
		if (filled[key] === undefined && source[key] !== undefined) {
			// Key-by-key copy of a union of optional fields; the assignment is
			// sound because both sides are ModelInfo.
			;(filled as Record<string, unknown>)[key] = (
				source as Record<string, unknown>
			)[key];
		}
	}
	if (!filled.name) {
		filled.name = source.name ?? modelId;
	}
	return filled;
}
