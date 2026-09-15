import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useNormalizedApiConfiguration } from "@/hooks/useNormalizedApiConfiguration"
import { useProviderListings } from "@/hooks/useProviderListings"
import { useProviderModels } from "@/hooks/useProviderModels"
import { ModelsServiceClient } from "@/services/grpc-client"
import { QuickModelPicker } from "./QuickModelPicker"

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: vi.fn(),
}))

vi.mock("@/hooks/useNormalizedApiConfiguration", () => ({
	useNormalizedApiConfiguration: vi.fn(),
}))

vi.mock("@/hooks/useProviderListings", () => ({
	useProviderListings: vi.fn(),
}))

vi.mock("@/hooks/useProviderModels", () => ({
	useProviderModels: vi.fn(),
}))

vi.mock("@/components/settings/utils/useApiConfigurationHandlers", () => ({
	useApiConfigurationHandlers: () => ({
		handleModeFieldChange: vi.fn(),
	}),
}))

vi.mock("@/services/grpc-client", () => ({
	ModelsServiceClient: {
		commitModelSelection: vi.fn(),
	},
}))

// NOTE: intentionally NO mock for @/components/ui/popover — this file proves
// the real Radix Popover path (disablePortal + inside-gesture guards) still
// delivers pointerdown to the row so commitModelSelection fires.

/** jsdom in this vitest setup has no PointerEvent; ModelRow reads event.button. */
class PointerEventPolyfill extends MouseEvent {
	pointerId: number
	pointerType: string
	isPrimary: boolean
	constructor(type: string, init: MouseEventInit & { pointerId?: number; pointerType?: string; isPrimary?: boolean } = {}) {
		super(type, init)
		this.pointerId = init.pointerId ?? 1
		this.pointerType = init.pointerType ?? "mouse"
		this.isPrimary = init.isPrimary ?? true
	}
}
if (
	typeof globalThis !== "undefined" &&
	typeof (globalThis as unknown as { PointerEvent?: unknown }).PointerEvent === "undefined"
) {
	Object.defineProperty(globalThis, "PointerEvent", { value: PointerEventPolyfill })
}

const JAN_MODEL_ID = "jan-local-7b"
const LEFTOVER_XAI_MODEL_ID = "grok-composer-2.5-fast"

describe("QuickModelPicker real Popover", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubGlobal(
			"ResizeObserver",
			class ResizeObserver {
				observe() {}
				unobserve() {}
				disconnect() {}
			},
		)
		vi.mocked(ModelsServiceClient.commitModelSelection).mockResolvedValue({})
		vi.mocked(useProviderListings).mockReturnValue({
			providers: [
				{ id: "xai", name: "xAI" },
				{ id: "jan", name: "Jan" },
			],
			isLoading: false,
			error: undefined,
			refresh: vi.fn(),
		} as ReturnType<typeof useProviderListings>)
		vi.mocked(useProviderModels).mockImplementation(((providerId: string) => {
			if (providerId === "jan") {
				return {
					models: { [JAN_MODEL_ID]: { name: "Jan Local 7B", supportsPromptCache: false } },
					defaultModelId: JAN_MODEL_ID,
					isLoading: false,
					isStale: false,
					error: undefined,
					refresh: vi.fn(),
					fingerprint: "jan",
				}
			}
			return {
				models: {},
				defaultModelId: "",
				isLoading: false,
				isStale: false,
				error: undefined,
				refresh: vi.fn(),
				fingerprint: "",
			}
		}) as typeof useProviderModels)
		vi.mocked(useExtensionState).mockReturnValue({
			mode: "act",
			apiConfiguration: {
				actModeApiProvider: "xai",
				actModeApiModelId: LEFTOVER_XAI_MODEL_ID,
			},
			providerModelsByProvider: {},
		} as ReturnType<typeof useExtensionState>)
		vi.mocked(useNormalizedApiConfiguration).mockReturnValue({
			selectedProvider: "xai",
			selectedModelId: LEFTOVER_XAI_MODEL_ID,
			selectedModelInfo: { supportsPromptCache: false },
		})
	})

	it("pointerdown on a Jan model commits via the REAL Radix popover (no dismiss-before-commit)", async () => {
		render(<QuickModelPicker modelDisplayName={LEFTOVER_XAI_MODEL_ID} />)

		// Open the real popover through the trigger.
		fireEvent.click(screen.getByRole("button", { name: new RegExp(LEFTOVER_XAI_MODEL_ID) }))
		fireEvent.click(await screen.findByRole("button", { name: "Jan" }))

		const janModel = await screen.findByRole("button", { name: "Jan Local 7B" })
		// Simulate a document-capture outside-pointerdown arriving at the row
		// first (the VS Code webview failure): stopPropagation in ModelRow must
		// keep it from dismissing before commit.
		fireEvent(
			janModel,
			new PointerEventPolyfill("pointerdown", {
				bubbles: true,
				cancelable: true,
				button: 0,
				buttons: 1,
			}),
		)

		await waitFor(() => expect(ModelsServiceClient.commitModelSelection).toHaveBeenCalledTimes(1))
		expect(ModelsServiceClient.commitModelSelection).toHaveBeenCalledWith(
			expect.objectContaining({ providerId: "jan", mode: "act", modelId: JAN_MODEL_ID }),
		)
	})
})
