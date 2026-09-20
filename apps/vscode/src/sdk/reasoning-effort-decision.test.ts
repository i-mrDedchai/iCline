import { decideReasoningEffort, getProviderCollectionSync, getProviderIds } from "@cline/llms"
import { OPENAI_REASONING_EFFORT_OPTIONS } from "@shared/storage/types"
import { describe, expect, it } from "vitest"
import { resolveReasoningEffortOutcome } from "./reasoning-effort-decision"

/**
 * These cases go through the REAL SDK registry (baked catalog + provider
 * collections) and the REAL `decideReasoningEffort`, so they also fail if the
 * registry stops carrying `reasoningOptions` for these providers — the condition
 * that would silently turn every notice into "broadly supported levels".
 *
 * (Vitest owns `src/sdk/**`: the bun:test suites live outside this directory.)
 */
describe("resolveReasoningEffortOutcome", () => {
	it("reports the Sakana clamp a user hits: max on a model that tops out at xhigh", () => {
		const outcome = resolveReasoningEffortOutcome({
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

	it("keeps an accepted level unclamped", () => {
		const outcome = resolveReasoningEffortOutcome({
			providerId: "sakana",
			modelId: "fugu-ultra",
			effort: "high",
		})

		expect(outcome?.applied).toBe("high")
		expect(outcome?.clamped).toBe(false)
		expect(outcome?.reason).toBe("exact")
	})

	it("clamps levels above a native OpenAI model's ceiling", () => {
		const xhigh = resolveReasoningEffortOutcome({
			providerId: "openai-native",
			modelId: "gpt-5",
			effort: "xhigh",
		})
		const max = resolveReasoningEffortOutcome({
			providerId: "openai-native",
			modelId: "gpt-5",
			effort: "max",
		})

		expect(xhigh?.applied).toBe("high")
		expect(max?.applied).toBe("high")
		expect(max?.supportedEfforts).toEqual(["minimal", "low", "medium", "high"])
	})

	it("says nothing is sent for a model with no effort control", () => {
		const outcome = resolveReasoningEffortOutcome({
			providerId: "openrouter",
			modelId: "anthropic/claude-sonnet-4.5",
			effort: "high",
		})

		expect(outcome?.applied).toBeUndefined()
		expect(outcome?.clamped).toBe(true)
		expect(outcome?.reason).toBe("no-effort-control")
	})

	it("falls back to broadly supported levels for ids the catalog does not know", () => {
		const outcome = resolveReasoningEffortOutcome({
			providerId: "openai",
			modelId: "my-local-llama",
			effort: "max",
		})

		expect(outcome?.source).toBe("registry-missing-model")
		expect(outcome?.applied).toBe("high")
		expect(outcome?.reason).toBe("catalog-unknown")
		expect(outcome?.suppressedByBudget).toBe(false)
	})

	it("flags a thinking budget as the reason no effort is sent", () => {
		const outcome = resolveReasoningEffortOutcome({
			providerId: "sakana",
			modelId: "fugu-ultra",
			effort: "max",
			thinkingBudgetTokens: 4096,
		})

		expect(outcome?.suppressedByBudget).toBe(true)
		expect(outcome?.applied).toBe("xhigh")
	})

	it("has nothing to report for off/empty/unknown values", () => {
		for (const effort of ["none", "", "   ", undefined, null, "ultra"]) {
			expect(resolveReasoningEffortOutcome({ providerId: "sakana", modelId: "fugu-ultra", effort })).toBeUndefined()
		}
	})

	it("resolves by exact id and nothing friendlier", () => {
		// The gateway finds a model only by its exact registry key, so an id it
		// cannot resolve must not borrow another entry's levels here either: the
		// registry spells this OpenRouter model `~deepseek/…`, and the plain id the
		// app would send gets the conservative mapping on the wire too.
		const exact = resolveReasoningEffortOutcome({
			providerId: "sakana",
			modelId: "fugu-ultra-20260615",
			effort: "high",
		})
		expect(exact?.registryModelId).toBe("fugu-ultra-20260615")

		const borrowed = resolveReasoningEffortOutcome({
			providerId: "openrouter",
			modelId: "deepseek/deepseek-flash-latest",
			effort: "max",
		})
		expect(borrowed?.registryModelId).toBeUndefined()
		expect(borrowed?.source).toBe("registry-missing-model")
		expect(borrowed?.applied).toBe("high")

		const tilde = resolveReasoningEffortOutcome({
			providerId: "openrouter",
			modelId: "~deepseek/deepseek-flash-latest",
			effort: "max",
		})
		expect(tilde?.registryModelId).toBe("~deepseek/deepseek-flash-latest")
		expect(tilde?.applied).toBe("max")
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
