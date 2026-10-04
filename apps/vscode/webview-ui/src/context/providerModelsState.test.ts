import type { ProviderModelsResponse } from "@shared/proto/cline/models"
import { describe, expect, it, vi } from "vitest"
import type { ModelInfo } from "../../../src/shared/api"
import { type ProviderModelsState, reduceProviderModelsResponse } from "./providerModelsState"

const SPARK_1M = { contextWindow: 1_048_576, supportsPromptCache: false } as ModelInfo

function successEntry(): ProviderModelsState {
	return {
		providerId: "cline",
		models: { "cline-free/muse-spark-1.3-contributor": SPARK_1M },
		defaultModelId: "cline-free/muse-spark-1.3-contributor",
		configFingerprint: "fp-1",
		requestId: "req-1",
		source: "sdk-dynamic",
		fetchedAt: 1_000,
		isLoading: false,
		isStale: false,
	}
}

function failureResponse(requestId: string, fetchedAt: number): ProviderModelsResponse {
	return {
		providerId: "cline",
		requestId,
		configFingerprint: "fp-1",
		fetchedAt,
		ok: false,
		models: {},
		error: { kind: "unknown", message: "gateway timeout" },
	}
}

describe("reduceProviderModelsResponse", () => {
	it("keeps last-good models when a refresh fails (never adopts the failure)", () => {
		const prev = { cline: successEntry() }
		const next = reduceProviderModelsResponse(prev, "req-2", failureResponse("req-2", 2_000))

		const entry = next.cline
		expect(entry).toBeDefined()
		// The 1M catalog data survives: models, default, fingerprint, fetchedAt.
		expect(entry?.models["cline-free/muse-spark-1.3-contributor"]?.contextWindow).toBe(1_048_576)
		expect(entry?.defaultModelId).toBe("cline-free/muse-spark-1.3-contributor")
		expect(entry?.configFingerprint).toBe("fp-1")
		expect(entry?.fetchedAt).toBe(1_000)
		// …while the failure is recorded honestly for the stale affordances.
		expect(entry?.requestId).toBe("req-2")
		expect(entry?.isLoading).toBe(false)
		expect(entry?.isStale).toBe(true)
		expect(entry?.error).toBe("gateway timeout")
	})

	it("records an empty entry when the very first fetch fails (no last-good to keep)", () => {
		const next = reduceProviderModelsResponse({}, "req-1", failureResponse("req-1", 500))

		const entry = next.cline
		expect(entry?.models).toEqual({})
		expect(entry?.error).toBe("gateway timeout")
		expect(entry?.isLoading).toBe(false)
	})

	it("a later success replaces the stale-flagged entry and clears the flag", () => {
		const stale = { cline: { ...successEntry(), isStale: true, error: "gateway timeout" } }
		const next = reduceProviderModelsResponse(stale, "req-3", {
			providerId: "cline",
			requestId: "req-3",
			configFingerprint: "fp-2",
			fetchedAt: 3_000,
			ok: true,
			models: {},
			defaultModelId: "cline-free/solar-pro4",
			source: "sdk-dynamic",
		})

		const entry = next.cline
		expect(entry?.defaultModelId).toBe("cline-free/solar-pro4")
		expect(entry?.configFingerprint).toBe("fp-2")
		expect(entry?.fetchedAt).toBe(3_000)
		expect(entry?.isStale).toBe(false)
		expect(entry?.error).toBeUndefined()
	})

	it("drops responses whose requestId is no longer latest", () => {
		const prev = { cline: successEntry() }
		const debug = vi.spyOn(console, "debug").mockImplementation(() => {})
		try {
			const next = reduceProviderModelsResponse(prev, "req-2", failureResponse("req-1", 2_000))
			expect(next).toBe(prev)
		} finally {
			debug.mockRestore()
		}
	})
})
