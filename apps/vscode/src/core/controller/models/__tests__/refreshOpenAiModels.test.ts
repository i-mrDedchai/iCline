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
		// Realistic enough for the auth ladder to read the status off a
		// rejection (the real isAxiosError checks the same marker property).
		isAxiosError: (error: unknown) => Boolean(error && typeof error === "object" && "isAxiosError" in error),
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
		// REGRESSION (fix.40): the first attempt must be exactly the
		// pre-fix.40 request — custom headers + Bearer, nothing else. fix.40
		// forced `x-api-key` onto every request, and gateways that validate
		// that header against a different credential table refuse the request
		// outright — silently emptying this list ("รายการโมเดลหายไปหมด").
		expect(mocks.axiosGet).toHaveBeenCalledTimes(1)
		expect(mocks.axiosGet).toHaveBeenCalledWith(
			"http://localhost:1234/v1/models",
			expect.objectContaining({
				headers: {
					"x-custom": "yes",
					Authorization: "Bearer secret-key",
				},
			}),
		)
	})

	it("adds x-api-key only after the Bearer way is refused", async () => {
		mocks.readProviderConfig.mockReturnValue({ baseUrl: "http://localhost:1234/v1", apiKey: "secret-key" })
		mocks.axiosGet.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })

		const response = await refreshOpenAiModels(makeController(), OpenAiModelsRequest.create({ providerId: "openai" }))

		expect(response.values).toEqual(["model-alpha", "model-beta"])
		expect(mocks.axiosGet).toHaveBeenCalledTimes(2)
		// Attempt #1: Bearer only…
		expect((mocks.axiosGet.mock.calls[0][1] as { headers: Record<string, string> }).headers["x-api-key"]).toBeUndefined()
		// …attempt #2: the alternative spelling is added as a retry.
		expect((mocks.axiosGet.mock.calls[1][1] as { headers: Record<string, string> }).headers["x-api-key"]).toBe("secret-key")
	})

	it("does not escalate to x-api-key on non-auth failures", async () => {
		mocks.readProviderConfig.mockReturnValue({ baseUrl: "http://localhost:1234/v1", apiKey: "secret-key" })
		mocks.axiosGet.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } })

		await expect(
			refreshOpenAiModels(makeController(), OpenAiModelsRequest.create({ providerId: "openai" })),
		).rejects.toThrow()
		expect(mocks.axiosGet).toHaveBeenCalledTimes(1)
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

	it("surfaces the fetch failure instead of returning a silent empty list", async () => {
		// The silent `values: []` of fix.40 made "the endpoint refused or is
		// unreachable" indistinguishable from "the extension lost my models".
		// The webview renders this rejection next to the model dropdown.
		mocks.readProviderConfig.mockReturnValue({ baseUrl: "http://localhost:1234/v1" })
		mocks.axiosGet.mockRejectedValue(new Error("boom"))

		await expect(refreshOpenAiModels(makeController(), OpenAiModelsRequest.create({ providerId: "openai" }))).rejects.toThrow(
			"boom",
		)
	})

	it("keeps the legacy id scrape as a fallback for shapes the metadata extractor cannot describe", async () => {
		// The model dropdown must never hold fewer models than the pre-fix.40
		// scraper returned: an id like `7` (non-string) is no metadata to the
		// extractor but is still a selectable model id to the form.
		mocks.readProviderConfig.mockReturnValue({ baseUrl: "http://localhost:1234/v1" })
		mocks.axiosGet.mockResolvedValue({
			data: {
				data: [{ id: 7 }, { id: "known-model" }],
			},
		})

		const response = await refreshOpenAiModels(makeController(), OpenAiModelsRequest.create({ providerId: "openai" }))

		expect(response.values).toEqual(["known-model", "7"])
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
		expect(mocks.axiosGet).toHaveBeenCalledWith(
			"http://localhost:1234/v1/models",
			expect.objectContaining({
				headers: expect.not.objectContaining({
					"x-api-key": "secret-key",
				}),
			}),
		)
	})

	it("clears the live models cache when the request fails so a previous endpoint's limits cannot linger", async () => {
		mocks.readProviderConfig.mockReturnValue({ baseUrl: "http://localhost:1234/v1" })
		mocks.axiosGet.mockRejectedValue(new Error("401 Unauthorized"))

		await expect(
			refreshOpenAiModels(makeController(), OpenAiModelsRequest.create({ providerId: "openai-compatible" })),
		).rejects.toThrow("401 Unauthorized")

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

		await expect(
			refreshOpenAiModels(makeController(), OpenAiModelsRequest.create({ providerId: "my-gateway" })),
		).rejects.toThrow("401 Unauthorized")

		expect(mocks.setCustomProviderModelsCache).toHaveBeenCalledWith("my-gateway", {})
	})
})
