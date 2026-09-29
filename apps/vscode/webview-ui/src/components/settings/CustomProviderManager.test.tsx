import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CustomProviderManager } from "./CustomProviderManager"

const mocks = vi.hoisted(() => ({
	refresh: vi.fn(async () => {}),
	providers: [] as Array<Record<string, unknown>>,
	createCustomProvider: vi.fn(),
	updateCustomProvider: vi.fn(),
	deleteCustomProvider: vi.fn(),
	refreshOpenAiModels: vi.fn(),
}))

vi.mock("@/hooks/useProviderListings", () => ({
	useProviderListings: () => ({
		providers: mocks.providers,
		refresh: mocks.refresh,
		isLoading: false,
		error: undefined,
	}),
}))

vi.mock("@/services/grpc-client", () => ({
	ModelsServiceClient: {
		createCustomProvider: mocks.createCustomProvider,
		updateCustomProvider: mocks.updateCustomProvider,
		deleteCustomProvider: mocks.deleteCustomProvider,
		refreshOpenAiModels: mocks.refreshOpenAiModels,
	},
}))

function fillField(testId: string, value: string) {
	fireEvent.change(screen.getByTestId(testId), { target: { value } })
}

describe("CustomProviderManager", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.providers = [
			{ id: "anthropic", name: "Anthropic", isCustom: false },
			{ id: "gw-one", name: "Gateway One", isCustom: true, defaultModelId: "m-1" },
		]
		mocks.createCustomProvider.mockResolvedValue({ providers: [] })
		mocks.updateCustomProvider.mockResolvedValue({ providers: [] })
		mocks.deleteCustomProvider.mockResolvedValue({ providers: [] })
		mocks.refreshOpenAiModels.mockResolvedValue({ values: ["auto-m1", "auto-m2"] })
	})

	it("lists only user-created providers and hides built-ins", () => {
		render(<CustomProviderManager />)
		expect(screen.getByTestId("custom-provider-row-gw-one")).toBeTruthy()
		expect(screen.queryByTestId("custom-provider-row-anthropic")).toBeNull()
	})

	it("creates a provider with split model ids and refreshes the listings", async () => {
		render(<CustomProviderManager />)
		fireEvent.click(screen.getByTestId("custom-provider-add"))
		fillField("custom-provider-id", "GW-Two")
		fillField("custom-provider-name", "Gateway Two")
		fillField("custom-provider-base-url", "https://two.example/v1")
		fillField("custom-provider-api-key", "sk-2")
		// A single-line input normalizes newlines away, so ids are comma-separated.
		fillField("custom-provider-models", "m-1, m-2, m-3")
		fireEvent.click(screen.getByTestId("custom-provider-save"))

		await waitFor(() => expect(mocks.createCustomProvider).toHaveBeenCalledTimes(1))
		expect(mocks.createCustomProvider.mock.calls[0][0]).toMatchObject({
			providerId: "gw-two",
			name: "Gateway Two",
			baseUrl: "https://two.example/v1",
			apiKey: "sk-2",
			models: ["m-1", "m-2", "m-3"],
		})
		await waitFor(() => expect(mocks.refresh).toHaveBeenCalled())
	})

	it("surfaces a rejected mutation as a visible error instead of a silent failure", async () => {
		mocks.createCustomProvider.mockRejectedValue(new Error('provider "gw-one" already exists'))
		render(<CustomProviderManager />)
		fireEvent.click(screen.getByTestId("custom-provider-add"))
		fillField("custom-provider-id", "gw-one")
		fillField("custom-provider-name", "Dup")
		fillField("custom-provider-base-url", "https://dup.example/v1")
		fillField("custom-provider-models", "m-1")
		fireEvent.click(screen.getByTestId("custom-provider-save"))

		await waitFor(() => expect(screen.getByTestId("custom-provider-error").textContent).toContain("already exists"))
		expect(screen.getByTestId("custom-provider-form")).toBeTruthy()
	})

	it("edits a provider through the pre-filled form", async () => {
		render(<CustomProviderManager />)
		fireEvent.click(screen.getByTestId("custom-provider-edit-gw-one"))
		fillField("custom-provider-name", "Renamed Gateway")
		fireEvent.click(screen.getByTestId("custom-provider-save"))

		await waitFor(() => expect(mocks.updateCustomProvider).toHaveBeenCalledTimes(1))
		expect(mocks.updateCustomProvider.mock.calls[0][0]).toMatchObject({
			providerId: "gw-one",
			name: "Renamed Gateway",
		})
	})

	it("deletes only after the two-step confirmation", async () => {
		render(<CustomProviderManager />)
		fireEvent.click(screen.getByTestId("custom-provider-delete-gw-one"))
		expect(mocks.deleteCustomProvider).not.toHaveBeenCalled()
		fireEvent.click(screen.getByTestId("custom-provider-delete-confirm-gw-one"))

		await waitFor(() => expect(mocks.deleteCustomProvider).toHaveBeenCalledTimes(1))
		expect(mocks.deleteCustomProvider.mock.calls[0][0]).toMatchObject({ value: "gw-one" })
	})

	// fix.43: the form no longer makes the user type model ids from memory — it can ask the
	// endpoint. The request must carry the form's OWN baseUrl/apiKey (not whatever provider is
	// active), because the whole point is fetching before the provider has been saved.
	it("fetches models from the form's endpoint and fills the model list", async () => {
		render(<CustomProviderManager />)
		fireEvent.click(screen.getByTestId("custom-provider-add"))
		fillField("custom-provider-base-url", "https://api.example/v1")
		fillField("custom-provider-api-key", "sk-test")
		fillField("custom-provider-id", "my-gw")

		fireEvent.click(screen.getByTestId("custom-provider-fetch-models"))

		await waitFor(() => expect(mocks.refreshOpenAiModels).toHaveBeenCalledTimes(1))
		expect(mocks.refreshOpenAiModels.mock.calls[0][0]).toMatchObject({
			providerId: "my-gw",
			baseUrl: "https://api.example/v1",
			apiKey: "sk-test",
		})
		await waitFor(() => {
			const modelsInput = screen.getByTestId("custom-provider-models") as HTMLInputElement
			expect(modelsInput.value).toContain("auto-m1")
			expect(modelsInput.value).toContain("auto-m2")
		})
	})

	it("keeps the manual model list when a fetch is refused, and will not fetch without a base URL", async () => {
		mocks.refreshOpenAiModels.mockRejectedValue(new Error("401 Unauthorized"))
		render(<CustomProviderManager />)
		fireEvent.click(screen.getByTestId("custom-provider-add"))
		fillField("custom-provider-models", "hand-typed-model")

		// No base URL yet: the action must explain itself instead of calling the host.
		fireEvent.click(screen.getByTestId("custom-provider-fetch-models"))
		expect(mocks.refreshOpenAiModels).not.toHaveBeenCalled()
		await waitFor(() =>
			expect(screen.getByTestId("custom-provider-models") as HTMLInputElement).toHaveProperty("value", "hand-typed-model"),
		)

		// With a base URL the host is asked, and its refusal must not wipe what the user typed.
		fillField("custom-provider-base-url", "https://api.example/v1")
		fireEvent.click(screen.getByTestId("custom-provider-fetch-models"))
		await waitFor(() => expect(mocks.refreshOpenAiModels).toHaveBeenCalledTimes(1))
		await waitFor(() =>
			expect(screen.getByTestId("custom-provider-models") as HTMLInputElement).toHaveProperty("value", "hand-typed-model"),
		)
	})

	// The rarely-wanted options used to make every visit long; they now cost one click, and the
	// toggle has to genuinely unmount them or the saving is cosmetic.
	it("hides the advanced options until the toggle asks for them", () => {
		render(<CustomProviderManager />)
		fireEvent.click(screen.getByTestId("custom-provider-add"))

		expect(screen.queryByTestId("custom-provider-models-source-url")).toBeNull()
		fireEvent.click(screen.getByTestId("custom-provider-advanced-toggle"))
		expect(screen.getByTestId("custom-provider-models-source-url")).toBeTruthy()
		expect(screen.getByTestId("custom-provider-header-add")).toBeTruthy()
	})

	// Once ids exist the default model becomes a picker, so the common path is a choice rather
	// than a memory test — but an off-catalog id must still be typeable.
	it("offers the model ids as a default-model dropdown while keeping free text", () => {
		render(<CustomProviderManager />)
		fireEvent.click(screen.getByTestId("custom-provider-add"))
		fillField("custom-provider-models", "m-a, m-b")

		const select = screen.getByTestId("custom-provider-default-model-select") as HTMLSelectElement
		expect(Array.from(select.options).map((option) => option.value)).toEqual(["", "m-a", "m-b"])
		expect(screen.getByTestId("custom-provider-default-model")).toBeTruthy()
	})
})
