import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ModelsServiceClient } from "@/services/grpc-client"
import { useChatProviderCatalogRefresh } from "./useChatProviderCatalogRefresh"

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: vi.fn(),
}))

vi.mock("@/services/grpc-client", () => ({
	ModelsServiceClient: {
		resolveProviderModels: vi.fn(),
	},
}))

const mockUseExtensionState = vi.mocked(useExtensionState)
const mockResolveProviderModels = vi.mocked(ModelsServiceClient.resolveProviderModels)

// Stable across setChatState calls within a test, mirroring the production
// context where these callbacks are memoized — otherwise every state update
// would change the refresh identity and trigger unrelated refetches.
let startProviderModelsRequest: ReturnType<typeof vi.fn>
let applyProviderModelsResponse: ReturnType<typeof vi.fn>

function setChatState(apiConfiguration: Record<string, unknown>) {
	mockUseExtensionState.mockReturnValue({
		apiConfiguration,
		providerModelsByProvider: {},
		startProviderModelsRequest,
		applyProviderModelsResponse,
	} as unknown as ReturnType<typeof useExtensionState>)
}

describe("useChatProviderCatalogRefresh", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		startProviderModelsRequest = vi.fn()
		applyProviderModelsResponse = vi.fn()
		mockResolveProviderModels.mockResolvedValue({
			providerId: "cline",
			requestId: "req-1",
			configFingerprint: "fp",
			fetchedAt: Date.now(),
			ok: true,
			models: {},
		})
	})

	it("refreshes the active provider catalog on mount", async () => {
		setChatState({ actModeApiProvider: "cline", actModeClineModelId: "cline-free/muse-spark-1.3-conductor" })

		renderHook(() => useChatProviderCatalogRefresh("act", true))

		await waitFor(() => expect(mockResolveProviderModels).toHaveBeenCalledTimes(1))
		expect(mockResolveProviderModels).toHaveBeenCalledWith(
			expect.objectContaining({ providerId: "cline", forceRefresh: true }),
		)
	})

	it("refreshes again when the chat becomes visible after being hidden (e.g. returning from Settings)", async () => {
		setChatState({ actModeApiProvider: "cline", actModeClineModelId: "cline-free/muse-spark-1.3-conductor" })

		const { rerender } = renderHook(({ visible }: { visible: boolean }) => useChatProviderCatalogRefresh("act", visible), {
			initialProps: { visible: false },
		})

		await waitFor(() => expect(mockResolveProviderModels).toHaveBeenCalledTimes(1))

		rerender({ visible: true })

		await waitFor(() => expect(mockResolveProviderModels).toHaveBeenCalledTimes(2))
	})

	it("refreshes when the active model switches", async () => {
		setChatState({ actModeApiProvider: "cline", actModeClineModelId: "cline-free/model-a" })

		const { rerender } = renderHook(() => useChatProviderCatalogRefresh("act", true))

		await waitFor(() => expect(mockResolveProviderModels).toHaveBeenCalledTimes(1))

		setChatState({ actModeApiProvider: "cline", actModeClineModelId: "cline-free/model-b" })
		rerender()

		await waitFor(() => expect(mockResolveProviderModels).toHaveBeenCalledTimes(2))
	})

	it("does not refresh on every render while visible", async () => {
		setChatState({ actModeApiProvider: "cline", actModeClineModelId: "cline-free/model-a" })

		const { rerender } = renderHook(() => useChatProviderCatalogRefresh("act", true))

		await waitFor(() => expect(mockResolveProviderModels).toHaveBeenCalledTimes(1))

		rerender()
		rerender()

		await new Promise((resolve) => setTimeout(resolve, 50))
		expect(mockResolveProviderModels).toHaveBeenCalledTimes(1)
	})
})
