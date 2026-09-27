import { decideReasoningEffort, getProviderCollectionSync, getProviderIds } from "@cline/llms"
import { OPENAI_REASONING_EFFORT_OPTIONS } from "@shared/storage/types"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { resolveSessionKnownModels } from "./model-known-models"
import {
	clearReasoningEffortModelCache,
	resolveReasoningEffortOutcome,
	resolveReasoningModelLevels,
} from "./reasoning-effort-decision"

/**
 * These cases go through the REAL SDK registry (baked catalog + provider
 * collections) and the REAL `decideReasoningEffort`, so they also fail if the
 * registry stops carrying `reasoningOptions` for these providers — the condition
 * that would silently turn every notice into "broadly supported levels".
 *
 * The merged catalog seam (`resolveSessionKnownModels`) is mocked so each case
 * decides which catalog world it lives in: `undefined` is the bare-registry
 * world, a map is the merged world the gateway really resolves against.
 *
 * (Vitest owns `src/sdk/**`: the bun:test suites live outside this directory.)
 */
vi.mock("./model-known-models", () => ({
	resolveSessionKnownModels: vi.fn(),
}))

beforeEach(() => {
	vi.mocked(resolveSessionKnownModels).mockReset().mockResolvedValue(undefined)
	clearReasoningEffortModelCache()
})

describe("resolveReasoningEffortOutcome", () => {
	it("reports the Sakana clamp a user hits: max on a model that tops out at xhigh", async () => {
		const outcome = await resolveReasoningEffortOutcome({
			providerId: "sakana",
			modelId: "fugu-ultra",
			effort: "max",
		})

		expect(outcome?.requested).toBe("max")
		expect(outcome?.applied).toBe("xhigh")
		expect(outcome?.supportedEfforts).toEqual(["high", "xhigh"])
		expect(outcome?.clamped).toBe(true)
		expect(outcome?.reason).toBe("nearest-supported")
		expect(outcome?.source).toBe("sdk-registry")
	})

	it("keeps an accepted level unclamped", async () => {
		const outcome = await resolveReasoningEffortOutcome({
			providerId: "sakana",
			modelId: "fugu-ultra",
			effort: "high",
		})

		expect(outcome?.applied).toBe("high")
		expect(outcome?.clamped).toBe(false)
		expect(outcome?.reason).toBe("exact")
	})

	it("clamps levels above a native OpenAI model's ceiling", async () => {
		const xhigh = await resolveReasoningEffortOutcome({
			providerId: "openai-native",
			modelId: "gpt-5",
			effort: "xhigh",
		})
		const max = await resolveReasoningEffortOutcome({
			providerId: "openai-native",
			modelId: "gpt-5",
			effort: "max",
		})

		expect(xhigh?.applied).toBe("high")
		expect(max?.applied).toBe("high")
		expect(max?.supportedEfforts).toEqual(["minimal", "low", "medium", "high"])
	})

	it("says nothing is sent for a model with no effort control", async () => {
		const outcome = await resolveReasoningEffortOutcome({
			providerId: "openrouter",
			modelId: "anthropic/claude-sonnet-4.5",
			effort: "high",
		})

		expect(outcome?.applied).toBeUndefined()
		expect(outcome?.clamped).toBe(true)
		expect(outcome?.reason).toBe("no-effort-control")
	})

	it("falls back to broadly supported levels for ids the catalog does not know", async () => {
		const outcome = await resolveReasoningEffortOutcome({
			providerId: "openai",
			modelId: "my-local-llama",
			effort: "max",
		})

		expect(outcome?.source).toBe("registry-missing-model")
		expect(outcome?.applied).toBe("high")
		expect(outcome?.reason).toBe("catalog-unknown")
		expect(outcome?.suppressedByBudget).toBe(false)
	})

	it("flags a thinking budget as the reason no effort is sent", async () => {
		const outcome = await resolveReasoningEffortOutcome({
			providerId: "sakana",
			modelId: "fugu-ultra",
			effort: "max",
			thinkingBudgetTokens: 4096,
		})

		expect(outcome?.suppressedByBudget).toBe(true)
		expect(outcome?.applied).toBe("xhigh")
	})

	it("has nothing to report for off/empty/unknown values", async () => {
		for (const effort of ["none", "", "   ", undefined, null, "ultra"]) {
			expect(await resolveReasoningEffortOutcome({ providerId: "sakana", modelId: "fugu-ultra", effort })).toBeUndefined()
		}
	})

	it("names the levels a model takes even when no level is set", async () => {
		// The question a control asks while drawing its list. It must not depend on a
		// level already being stored: the panel needs the answer BEFORE the first pick.
		const cline = await resolveReasoningModelLevels({ providerId: "cline", modelId: "z-ai/glm-5.3-flash" })
		expect(cline.supportedEfforts).toEqual(["low", "high", "max"])
		expect(cline.source).toBe("sdk-registry")

		const toggleOnly = await resolveReasoningModelLevels({ providerId: "sakana", modelId: "fugu-ultra" })
		expect(toggleOnly.supportedEfforts.length).toBeGreaterThan(0)

		// No registry entry is not the same as no levels: the caller keeps its own set.
		const unknown = await resolveReasoningModelLevels({ providerId: "openrouter", modelId: "deepseek/deepseek-flash-latest" })
		expect(unknown).toMatchObject({ supportedEfforts: [], source: "registry-missing-model" })
	})

	it("resolves by exact id and nothing friendlier", async () => {
		// The gateway finds a model only by its exact registry key, so an id it
		// cannot resolve must not borrow another entry's levels here either: the
		// registry spells this OpenRouter model `~deepseek/…`, and the plain id the
		// app would send gets the conservative mapping on the wire too.
		const exact = await resolveReasoningEffortOutcome({
			providerId: "sakana",
			modelId: "fugu-ultra-20260615",
			effort: "high",
		})
		expect(exact?.registryModelId).toBe("fugu-ultra-20260615")

		const borrowed = await resolveReasoningEffortOutcome({
			providerId: "openrouter",
			modelId: "deepseek/deepseek-flash-latest",
			effort: "max",
		})
		expect(borrowed?.registryModelId).toBeUndefined()
		expect(borrowed?.source).toBe("registry-missing-model")
		expect(borrowed?.applied).toBe("high")

		const tilde = await resolveReasoningEffortOutcome({
			providerId: "openrouter",
			modelId: "~deepseek/deepseek-flash-latest",
			effort: "max",
		})
		expect(tilde?.registryModelId).toBe("~deepseek/deepseek-flash-latest")
		expect(tilde?.applied).toBe("max")
	})
})

/**
 * The gateway resolves a model against the SESSION's merged knownModels
 * (generated ∪ bundled ∪ live catalog ∪ private ∪ public ∪ user overrides)
 * with those entries overriding the builtin registry by exact id. A lookup that
 * consults only the builtin registry therefore lies about every live-catalog
 * model: it claimed "no Effort data for this model, so High is sent" while the
 * wire really sent the model's own top level (smoke 2026-09-26,
 * `upstage/solar-mini4` / `qwen/qwen3.8-27b:free` — both registry misses, both
 * with real Effort controls in the merged map).
 */
describe("resolveReasoningEffortOutcome reads the map the gateway resolves", () => {
	it("sends the level the wire really sends for models only the merged catalog knows", async () => {
		vi.mocked(resolveSessionKnownModels).mockResolvedValue({
			"upstage/solar-mini4": {
				id: "upstage/solar-mini4",
				name: "Solar Mini 4",
				reasoningOptions: [{ type: "effort", values: ["none", "minimal", "low", "medium", "high", "xhigh", "max"] }],
			},
		})

		const outcome = await resolveReasoningEffortOutcome({
			providerId: "upstage",
			modelId: "upstage/solar-mini4",
			effort: "max",
		})
		expect(outcome?.source).toBe("sdk-registry")
		expect(outcome?.registryModelId).toBe("upstage/solar-mini4")
		expect(outcome?.applied).toBe("max")
		expect(outcome?.clamped).toBe(false)
		expect(outcome?.reason).toBe("exact")
		// `none` is the app's "off" switch, not a wire level: the decision drops it
		// from the advertised list even though the catalog carries it.
		expect(outcome?.supportedEfforts).toEqual(["minimal", "low", "medium", "high", "xhigh", "max"])

		// The list question gets the same answer: no more "no Effort data".
		const levels = await resolveReasoningModelLevels({ providerId: "upstage", modelId: "upstage/solar-mini4" })
		expect(levels.source).toBe("sdk-registry")
		expect(levels.supportedEfforts).toEqual(["minimal", "low", "medium", "high", "xhigh", "max"])
	})

	it("lets the merged entry win when both catalogs know the id", async () => {
		// The gateway's `mergeModels` lets the session's knownModels override the
		// builtin registry entry by id, so the merged map's controls are the ones
		// the wire clamps against — the registry's `low/high/max` must not leak in.
		vi.mocked(resolveSessionKnownModels).mockResolvedValue({
			"z-ai/glm-5.3-flash": {
				id: "z-ai/glm-5.3-flash",
				name: "glm-5.3-flash",
				reasoningOptions: [{ type: "effort", values: ["low", "medium", "high"] }],
			},
		})

		const outcome = await resolveReasoningEffortOutcome({
			providerId: "cline",
			modelId: "z-ai/glm-5.3-flash",
			effort: "max",
		})
		expect(outcome?.applied).toBe("high")
		expect(outcome?.supportedEfforts).toEqual(["low", "medium", "high"])
		expect(outcome?.clamped).toBe(true)
		expect(outcome?.reason).toBe("nearest-supported")
	})

	it("keeps answering from the registry for ids the merged map drops", async () => {
		// The union, not a replacement: `mergeModels` layers the session's models
		// OVER the builtin manifest, so a registry entry still answers for an id
		// the merged map happens to lack (a provider's map can be partial).
		vi.mocked(resolveSessionKnownModels).mockResolvedValue({
			"some/other-model": { id: "some/other-model", name: "Other" },
		})

		const tilde = await resolveReasoningEffortOutcome({
			providerId: "openrouter",
			modelId: "~deepseek/deepseek-flash-latest",
			effort: "max",
		})
		expect(tilde?.registryModelId).toBe("~deepseek/deepseek-flash-latest")
		expect(tilde?.applied).toBe("max")
	})

	it("asks the host for the merged map once per provider, not once per question", async () => {
		// The webview asks on every hover; the merge is not free. The memo is the
		// decision module's own (the helper stays a pure extraction of the session
		// factory's call), so clearing it is this module's test seam.
		await resolveReasoningModelLevels({ providerId: "sakana", modelId: "fugu-ultra" })
		await resolveReasoningEffortOutcome({ providerId: "sakana", modelId: "fugu-ultra", effort: "high" })
		expect(vi.mocked(resolveSessionKnownModels)).toHaveBeenCalledTimes(1)

		clearReasoningEffortModelCache()
		await resolveReasoningModelLevels({ providerId: "sakana", modelId: "fugu-ultra" })
		expect(vi.mocked(resolveSessionKnownModels)).toHaveBeenCalledTimes(2)
	})
})

/**
 * The notice copy is only allowed two shapes: "X → Y" (a level really goes out)
 * or "X is not sent · no Effort control". It fills an `{applied}` slot, so a
 * clamp with NO level and a reason other than `no-effort-control` would render a
 * hole (`"Max →  · …"`). `ReasoningEffortNotice` mirrors the rule, and this scan
 * is what keeps the registry from introducing the third shape silently.
 */
describe("every clamped decision is describable", () => {
	it("names the level it sends, or reports that the model has no Effort control", () => {
		const offenders: string[] = []
		for (const providerId of getProviderIds()) {
			const models = getProviderCollectionSync(providerId)?.models ?? {}
			for (const [modelId, model] of Object.entries(models)) {
				for (const effort of OPENAI_REASONING_EFFORT_OPTIONS) {
					if (effort === "none") {
						continue
					}
					const decision = decideReasoningEffort({ effort, reasoningOptions: model.reasoningOptions })
					if (decision.clamped && decision.reason === "exact") {
						offenders.push(`${providerId}/${modelId} ${effort}: clamped but reason=exact`)
					}
					if (decision.applied === undefined && decision.reason !== "no-effort-control") {
						offenders.push(`${providerId}/${modelId} ${effort}: no level sent, reason=${decision.reason}`)
					}
					if (decision.applied !== undefined && decision.reason === "no-effort-control") {
						offenders.push(
							`${providerId}/${modelId} ${effort}: reason=no-effort-control but sends ${decision.applied}`,
						)
					}
				}
			}
		}

		expect(offenders.slice(0, 5)).toEqual([])
	})
})
