import {
	applyGrok46OfficialContextWindow,
	asXaiSubscriptionIncludedModelInfo,
	GROK_46_CONTEXT_WINDOW,
	isGrok46ModelId,
	xaiModels,
} from "@shared/api"
import { describe, expect, it } from "vitest"

describe("Grok 4.6 official context window", () => {
	it("matches xAI docs (500k, not Grok 4.20's 2M)", () => {
		expect(xaiModels["grok-4.6"].contextWindow).toBe(GROK_46_CONTEXT_WINDOW)
		expect(GROK_46_CONTEXT_WINDOW).toBe(500_000)
	})

	it("recognizes native and OpenRouter-style ids", () => {
		expect(isGrok46ModelId("grok-4.6")).toBe(true)
		expect(isGrok46ModelId("x-ai/grok-4.6")).toBe(true)
		expect(isGrok46ModelId("GROK-4.6")).toBe(true)
		expect(isGrok46ModelId("grok-4.5")).toBe(false)
		expect(isGrok46ModelId("grok-4.20")).toBe(false)
	})

	it("rewrites a stale 2M snapshot", () => {
		const rewritten = applyGrok46OfficialContextWindow("grok-4.6", {
			supportsPromptCache: true,
			contextWindow: 2_000_000,
		})
		expect(rewritten.contextWindow).toBe(500_000)
	})
})

describe("asXaiSubscriptionIncludedModelInfo", () => {
	it("does not keep a stale 2M grok-4.6 subscription cache", () => {
		const result = asXaiSubscriptionIncludedModelInfo("grok-4.6", {
			name: "Grok 4.6",
			contextWindow: 2_000_000,
			supportsPromptCache: true,
			inputPrice: 2,
			outputPrice: 6,
		})
		expect(result.contextWindow).toBe(500_000)
		expect(result.inputPrice).toBe(0)
		expect(result.outputPrice).toBe(0)
	})
})
