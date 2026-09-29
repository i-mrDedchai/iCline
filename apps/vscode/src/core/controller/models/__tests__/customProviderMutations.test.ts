import { beforeEach, describe, expect, it, vi } from "vitest"
import { createCustomProvider } from "../createCustomProvider"
import { deleteCustomProvider } from "../deleteCustomProvider"
import { updateCustomProvider } from "../updateCustomProvider"

const mocks = vi.hoisted(() => ({
	addLocalProvider: vi.fn(),
	updateLocalProvider: vi.fn(),
	deleteLocalProvider: vi.fn(),
	setCustomProviderModelsCache: vi.fn(),
}))

vi.mock("@cline/core", () => ({
	addLocalProvider: mocks.addLocalProvider,
	updateLocalProvider: mocks.updateLocalProvider,
	deleteLocalProvider: mocks.deleteLocalProvider,
	deriveEndpointModelsUrl: (baseUrl?: string) =>
		baseUrl && baseUrl.startsWith("http") ? `${baseUrl.replace(/\/+$/, "")}/models` : undefined,
}))

vi.mock("@/sdk/provider-migration", () => ({
	getProviderSettingsManager: () => ({}) as never,
}))

vi.mock("@/core/storage/StateManager", () => ({
	StateManager: {
		get: () => ({
			setCustomProviderModelsCache: mocks.setCustomProviderModelsCache,
		}),
	},
}))

interface FakeListing {
	id: string
	name?: string
	isCustom?: boolean
}

function makeController(options: { listings?: FakeListing[]; apiConfiguration?: Record<string, unknown> } = {}) {
	const invalidateProviderListings = vi.fn()
	const setApiConfiguration = vi.fn()
	const handleApiConfigurationChanged = vi.fn()
	const postStateToWebview = vi.fn(async () => {})
	const readSelection = vi.fn(() => undefined)
	const controller = {
		getProviderCatalog: () => ({
			listProviders: async () =>
				(options.listings ?? []).map((listing) => ({
					id: listing.id,
					name: listing.name ?? listing.id,
					isCustom: listing.isCustom ?? false,
					defaultModelId: undefined,
					allowsCustomModelIds: true,
					usageCostDisplay: "show",
				})),
			invalidateProviderListings,
		}),
		getProviderConfigStore: () => ({ readSelection }),
		stateManager: {
			getApiConfiguration: vi.fn(() => options.apiConfiguration),
			setApiConfiguration,
		},
		handleApiConfigurationChanged,
		postStateToWebview,
	}
	return {
		controller: controller as never,
		invalidateProviderListings,
		setApiConfiguration,
		handleApiConfigurationChanged,
		postStateToWebview,
	}
}

describe("custom provider mutations", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.addLocalProvider.mockResolvedValue({ providerId: "gw-one", modelsCount: 1 })
		mocks.updateLocalProvider.mockResolvedValue({ providerId: "gw-one", modelsCount: 1 })
		mocks.deleteLocalProvider.mockResolvedValue({ providerId: "gw-one" })
	})

	it("createCustomProvider normalizes the id, delegates to core and runs the bookkeeping", async () => {
		const { controller, invalidateProviderListings } = makeController({ listings: [{ id: "gw-one", isCustom: true }] })

		const response = await createCustomProvider(controller, {
			providerId: "  GW-One ",
			name: " Gateway One ",
			baseUrl: "https://gw.example/v1",
			apiKey: "sk-1",
			headers: { "x-team": "a" },
			models: ["m-1", "m-2"],
			defaultModelId: "m-2",
			modelsSourceUrl: undefined,
			timeoutMs: undefined,
		} as never)

		expect(mocks.addLocalProvider).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				providerId: "gw-one",
				name: "Gateway One",
				baseUrl: "https://gw.example/v1",
				apiKey: "sk-1",
				headers: { "x-team": "a" },
				models: ["m-1", "m-2"],
				defaultModelId: "m-2",
			}),
		)
		expect(invalidateProviderListings).toHaveBeenCalledTimes(1)
		expect(mocks.setCustomProviderModelsCache).toHaveBeenCalledWith("gw-one", {})
		expect(response.providers.map((provider: { id: string }) => provider.id)).toEqual(["gw-one"])
	})

	it("createCustomProvider rejects invalid ids and incomplete forms before touching core", async () => {
		const { controller } = makeController()

		await expect(
			createCustomProvider(controller, { providerId: "Bad Id", name: "x", baseUrl: "https://x", models: ["m"] } as never),
		).rejects.toThrow(/invalid custom provider id/)
		await expect(
			createCustomProvider(controller, { providerId: "gw-one", name: "", baseUrl: "https://x", models: ["m"] } as never),
		).rejects.toThrow("name is required")
		await expect(
			createCustomProvider(controller, { providerId: "gw-one", name: "x", baseUrl: "", models: ["m"] } as never),
		).rejects.toThrow("baseUrl is required")
		// Without explicit models a source URL is required (core refuses an
		// empty model list). baseUrl that cannot derive a models URL also fails.
		await expect(
			createCustomProvider(controller, { providerId: "gw-one", name: "x", baseUrl: "not-a-url", models: [] } as never),
		).rejects.toThrow(/at least one model/)
		expect(mocks.addLocalProvider).not.toHaveBeenCalled()
	})

	it("updateCustomProvider keeps the stored key when the key field is blank (write-only credential)", async () => {
		const { controller } = makeController({ listings: [{ id: "gw-one", isCustom: true }] })

		await updateCustomProvider(controller, {
			providerId: "gw-one",
			name: "Renamed",
			baseUrl: undefined,
			apiKey: "   ",
			headers: {},
			models: [],
		} as never)

		expect(mocks.updateLocalProvider).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				providerId: "gw-one",
				name: "Renamed",
				apiKey: undefined,
				models: undefined,
			}),
		)
	})

	it("update and delete refuse built-in providers at the host", async () => {
		const { controller } = makeController({ listings: [{ id: "anthropic", isCustom: false }] })

		await expect(
			updateCustomProvider(controller, { providerId: "anthropic", headers: {}, models: [] } as never),
		).rejects.toThrow("built-in")
		await expect(deleteCustomProvider(controller, { value: "anthropic" } as never)).rejects.toThrow("built-in")
		expect(mocks.updateLocalProvider).not.toHaveBeenCalled()
		expect(mocks.deleteLocalProvider).not.toHaveBeenCalled()
	})

	it("deleteCustomProvider falls back to the other mode's provider when the deleted one was active", async () => {
		const { controller, setApiConfiguration, handleApiConfigurationChanged, postStateToWebview } = makeController({
			listings: [{ id: "gw-one", isCustom: true }],
			apiConfiguration: {
				planModeApiProvider: "openai-compatible",
				actModeApiProvider: "gw-one",
				actModeApiModelId: "m-1",
			},
		})

		await deleteCustomProvider(controller, { value: "gw-one" } as never)

		expect(mocks.deleteLocalProvider).toHaveBeenCalledWith(expect.anything(), { providerId: "gw-one" })
		expect(setApiConfiguration).toHaveBeenCalledTimes(1)
		const saved = setApiConfiguration.mock.calls[0][0] as Record<string, unknown>
		expect(saved.actModeApiProvider).toBe("openai-compatible")
		expect(saved.planModeApiProvider).toBe("openai-compatible")
		expect(handleApiConfigurationChanged).toHaveBeenCalledTimes(1)
		expect(postStateToWebview).toHaveBeenCalledTimes(1)
		expect(mocks.setCustomProviderModelsCache).toHaveBeenCalledWith("gw-one", {})
	})

	it("deleteCustomProvider falls back to anthropic when the deleted provider was active in both modes", async () => {
		const { controller, setApiConfiguration } = makeController({
			listings: [{ id: "gw-one", isCustom: true }],
			apiConfiguration: {
				planModeApiProvider: "gw-one",
				actModeApiProvider: "gw-one",
			},
		})

		await deleteCustomProvider(controller, { value: "gw-one" } as never)

		const saved = setApiConfiguration.mock.calls[0][0] as Record<string, unknown>
		expect(saved.planModeApiProvider).toBe("anthropic")
		expect(saved.actModeApiProvider).toBe("anthropic")
	})
})
