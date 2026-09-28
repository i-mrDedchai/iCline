import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CustomProviderManager } from "./CustomProviderManager"

const mocks = vi.hoisted(() => ({
	refresh: vi.fn(async () => {}),
	providers: [] as Array<Record<string, unknown>>,
	createCustomProvider: vi.fn(),
	updateCustomProvider: vi.fn(),
	deleteCustomProvider: vi.fn(),
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
})
