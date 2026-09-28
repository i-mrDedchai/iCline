import { OpenAiModelsRequest } from "@shared/proto/cline/models"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { refreshOpenAiModels } from "../refreshOpenAiModels"

const mocks = vi.hoisted(() => ({
	axiosGet: vi.fn(),
	readProviderConfig: vi.fn(),
	setModelsCache: vi.fn(),
	setCustomProviderModelsCache: vi.fn(),
}))

vi.mock("axios", () => ({
	default: {
		get: mocks.axiosGet,
		isAxiosError: vi.fn(() => false),
	},
}))

vi.mock("@/shared/net", () => ({
	getAxiosSettings: () => ({}),
}))

vi.mock("@/core/storage/StateManager", () => ({
	StateManager: {
		get: () => ({
			setModelsCache: mocks.setModelsCache,
			setCustomProviderModelsCache: mocks.setCustomProviderModelsCache,
		}),
	},
}))

vi.mock("@/shared/services/Logger", () => ({
	Logger: {
		error: vi.fn(),
		log: vi.fn(),
		warn: vi.fn(),
	},
}))

function makeController() {
	return {
		getProviderConfigStore: () => ({
			read: mocks.readProviderConfig,
		}),
	} as unknown as Parameters<typeof refreshOpenAiModels>[0]
}

describe("refreshOpenAiModels", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.axiosGet.mockResolvedValue({
			data: {
				data: [{ id: "model-alpha" }, { id: "model-beta" }, { id: "model-alpha" }],
			},
		})
	})

	it("fetches and dedupes the model list using the stored provider config", async () => {
		mocks.readProviderConfig.mockReturnValue({
			baseUrl: "http://localhost:1234/v1",
			apiKey: "secret-key",
			headers: { "x-custom": "yes" },
		})

		const response = await refreshOpenAiModels(makeController(), OpenAiModelsRequest.create({ providerId: "openai" }))

		expect(response.values).toEqual(["model-alpha", "model-beta"])
		expect(mocks.axiosGet).toHaveBeenCalledWith(
			"http://localhost:1234/v1/models",
			expect.objectContaining({
				headers: {
					"x-custom": "yes",
					Authorization: "Bearer secret-key",
					"x-api-key": "secret-key",
				},
			}),
		)
	})

	it("strips trailing slashes from the base URL before appending /models", async () => {
		mocks.readProviderConfig.mockReturnValue({ baseUrl: "http://localhost:1234/v1/" })

		await refreshOpenAiModels(makeController(), OpenAiModelsRequest.create({ providerId: "openai" }))

		expect(mocks.axiosGet).toHaveBeenCalledWith("http://localhost:1234/v1/models", expect.anything())
	})

	it("returns an empty list when no base URL is configured", async () => {
		mocks.readProviderConfig.mockReturnValue({})

		const response = await refreshOpenAiModels(makeController(), OpenAiModelsRequest.create({ providerId: "openai" }))

		expect(response.values).toEqual([])
		expect(mocks.axiosGet).not.toHaveBeenCalled()
	})

	it("returns an empty list when the request fails", async () => {
		mocks.readProviderConfig.mockReturnValue({ baseUrl: "http://localhost:1234/v1" })
		mocks.axiosGet.mockRejectedValue(new Error("boom"))

		const response = await refreshOpenAiModels(makeController(), OpenAiModelsRequest.create({ providerId: "openai" }))

		expect(response.values).toEqual([])
	})

	// The live models cache is what makes the Settings "Context:" row show a
	// custom gateway's OWN declared limits: model-info resolution treats the
	// cache as authoritative base metadata (readBaseModelInfoForProvider), so
	// `gpt-5.6-sol` sold by a reseller shows that reseller's context window
	// instead of a blank or the cross-catalog majority ("Context ไม่แสดงเลย" smoke report).
	it("mirrors the endpoint's declared model limits into the live models cache", async () => {
		mocks.readProviderConfig.mockReturnValue({ baseUrl: "http://localhost:1234/v1", apiKey: "secret-key" })
		mocks.axiosGet.mockResolvedValue({
			data: {
				data: [
					{
						id: "gpt-5.6-sol",
						name: "GPT 5.6 SOL",
						context_length: 444_444,
						top_provider: { max_completion_tokens: 64_000 },
					},
				],
			},
		})

		const response = await refreshOpenAiModels(
			makeController(),
			OpenAiModelsRequest.create({ providerId: "openai-compatible" }),
		)

		expect(response.values).toEqual(["gpt-5.6-sol"])
		expect(mocks.setModelsCache).toHaveBeenCalledWith("openAiCompatible", {
			"gpt-5.6-sol": {
				name: "GPT 5.6 SOL",
				contextWindow: 444_444,
				maxTokens: 64_000,
				supportsPromptCache: false,
			},
		})
		expect(mocks.setCustomProviderModelsCache).not.toHaveBeenCalled()
		// Reading /models on a gated gateway needs the key too — both spellings
		// go out, matching the SDK's model-source fetcher.
		expect(mocks.axiosGet).toHaveBeenCalledWith(
			"http://localhost:1234/v1/models",
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: "Bearer secret-key",
					"x-api-key": "secret-key",
				}),
			}),
		)
	})

	it("clears the live models cache when the request fails so a previous endpoint's limits cannot linger", async () => {
		mocks.readProviderConfig.mockReturnValue({ baseUrl: "http://localhost:1234/v1" })
		mocks.axiosGet.mockRejectedValue(new Error("401 Unauthorized"))

		await refreshOpenAiModels(makeController(), OpenAiModelsRequest.create({ providerId: "openai-compatible" }))

		expect(mocks.setModelsCache).toHaveBeenCalledWith("openAiCompatible", {})
	})

	it("mirrors declared limits into the per-id bucket for a user-created custom provider", async () => {
		// Custom gateways have arbitrary provider ids — no fixed cache slot can
		// name them — so they get a per-id bucket with the same declared-limits
		// contract as the openai-compatible family.
		mocks.readProviderConfig.mockReturnValue({ baseUrl: "http://localhost:1234/v1", apiKey: "gw-key" })
		mocks.axiosGet.mockResolvedValue({
			data: {
				data: [{ id: "gw-model-1", context_length: 555_555, max_output_tokens: 32_000 }],
			},
		})

		const response = await refreshOpenAiModels(makeController(), OpenAiModelsRequest.create({ providerId: "my-gateway" }))

		expect(response.values).toEqual(["gw-model-1"])
		expect(mocks.setCustomProviderModelsCache).toHaveBeenCalledWith("my-gateway", {
			"gw-model-1": {
				name: "gw-model-1",
				contextWindow: 555_555,
				maxTokens: 32_000,
				supportsPromptCache: false,
			},
		})
		expect(mocks.setModelsCache).not.toHaveBeenCalled()
	})

	it("clears the custom provider's bucket when the request fails", async () => {
		mocks.readProviderConfig.mockReturnValue({ baseUrl: "http://localhost:1234/v1" })
		mocks.axiosGet.mockRejectedValue(new Error("401 Unauthorized"))

		await refreshOpenAiModels(makeController(), OpenAiModelsRequest.create({ providerId: "my-gateway" }))

		expect(mocks.setCustomProviderModelsCache).toHaveBeenCalledWith("my-gateway", {})
	})
})
