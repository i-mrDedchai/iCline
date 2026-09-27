import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * `resolveSessionKnownModels` exists so two consumers — the session factory
 * (which stores the map as `providerConfig.knownModels`, the entries the SDK
 * gateway resolves models against) and `reasoning-effort-decision` (which
 * answers "what will this Effort level really send?") — cannot drift apart.
 * These cases pin the call it makes to `resolveProviderConfig`, because those
 * exact arguments decide which catalogs join the merge.
 */
const mocks = vi.hoisted(() => ({
	resolveProviderConfig: vi.fn(),
	getProviderSettingsManager: vi.fn(),
	resolveDataDir: vi.fn(() => "/tmp/cline-test-data"),
}))

vi.mock("@cline/core", () => ({ resolveProviderConfig: mocks.resolveProviderConfig }))
vi.mock("./provider-migration", () => ({ getProviderSettingsManager: mocks.getProviderSettingsManager }))
vi.mock("./legacy-state-reader", () => ({ resolveDataDir: mocks.resolveDataDir }))

import { resolveSessionKnownModels } from "./model-known-models"

beforeEach(() => {
	mocks.resolveProviderConfig.mockReset()
	mocks.getProviderSettingsManager.mockReset()
	mocks.resolveDataDir.mockClear()
})

describe("resolveSessionKnownModels", () => {
	it("resolves through the pipeline the session factory hands the gateway", async () => {
		const knownModels = { "some/model": { id: "some/model", name: "Some" } }
		mocks.resolveProviderConfig.mockResolvedValue({ modelId: "some/model", knownModels })

		const resolved = await resolveSessionKnownModels({
			sdkProviderId: "cline",
			modelId: "some/model",
			apiKey: "token",
			baseUrl: "https://example.test/v1",
		})

		expect(resolved).toBe(knownModels)
		// The flags decide which catalogs join the merge (`loadLatestOnInit` is
		// what puts live-catalog-only models — and their reasoning controls — in);
		// the config shape decides which auth-scoped catalogs load.
		expect(mocks.resolveProviderConfig).toHaveBeenCalledWith(
			"cline",
			{ loadLatestOnInit: true, loadPrivateOnAuth: true, failOnError: false },
			{ providerId: "cline", modelId: "some/model", apiKey: "token", baseUrl: "https://example.test/v1" },
		)
	})

	it("warms the provider settings manager so user models join the merge", async () => {
		mocks.resolveProviderConfig.mockResolvedValue({})

		await resolveSessionKnownModels({ sdkProviderId: "openai-compatible" })

		// Constructing the settings manager loads providers.json and models.json
		// into the @cline/llms registry — the user's custom-model overrides only
		// reach the merge through this side effect.
		expect(mocks.resolveDataDir).toHaveBeenCalled()
		expect(mocks.getProviderSettingsManager).toHaveBeenCalledWith("/tmp/cline-test-data")
		expect(mocks.resolveProviderConfig).toHaveBeenCalledWith("openai-compatible", expect.anything(), {
			providerId: "openai-compatible",
			modelId: "",
		})
	})

	it("lets resolution failures reach the caller", async () => {
		// The session factory turns this into a logged warning and keeps going;
		// callers own their failure policy, the helper must not swallow.
		const lookupError = new Error("catalog unavailable")
		mocks.resolveProviderConfig.mockRejectedValue(lookupError)

		await expect(resolveSessionKnownModels({ sdkProviderId: "anthropic" })).rejects.toThrow("catalog unavailable")
	})

	it("returns undefined when resolution yields no map", async () => {
		mocks.resolveProviderConfig.mockResolvedValue(undefined)

		await expect(resolveSessionKnownModels({ sdkProviderId: "anthropic" })).resolves.toBeUndefined()
	})
})
