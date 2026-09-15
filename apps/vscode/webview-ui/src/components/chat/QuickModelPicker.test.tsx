import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
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

// Keep picker content in the DOM so ModelRow pointerdown can be fired without
// Radix dismissing the portal the way the VS Code webview does on click.
vi.mock("@/components/ui/popover", () => ({
	Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	PopoverTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

const JAN_MODEL_ID = "jan-local-7b"
const LEFTOVER_XAI_MODEL_ID = "grok-composer-2.5-fast"

function mockProviderModels(providerId: string) {
	if (providerId === "jan") {
		return {
			models: {
				[JAN_MODEL_ID]: { name: "Jan Local 7B", supportsPromptCache: false },
			},
			defaultModelId: JAN_MODEL_ID,
			isLoading: false,
			isStale: false,
			error: undefined,
			refresh: vi.fn(),
			fingerprint: "jan",
		}
	}
	if (providerId === "xai") {
		return {
			models: {
				[LEFTOVER_XAI_MODEL_ID]: { name: "Grok Composer 2.5 Fast", supportsPromptCache: false },
			},
			defaultModelId: LEFTOVER_XAI_MODEL_ID,
			isLoading: false,
			isStale: false,
			error: undefined,
			refresh: vi.fn(),
			fingerprint: "xai",
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
}

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
if (typeof window !== "undefined" && typeof (window as unknown as { PointerEvent?: unknown }).PointerEvent === "undefined") {
	Object.defineProperty(window, "PointerEvent", { value: PointerEventPolyfill })
}
if (
	typeof globalThis !== "undefined" &&
	typeof (globalThis as unknown as { PointerEvent?: unknown }).PointerEvent === "undefined"
) {
	Object.defineProperty(globalThis, "PointerEvent", { value: PointerEventPolyfill })
}

/** ModelRow commits on pointerdown so the popover cannot unmount before click. */
function pointerDown(target: HTMLElement, button: number) {
	fireEvent(
		target,
		new PointerEventPolyfill("pointerdown", {
			bubbles: true,
			cancelable: true,
			button,
			buttons: button === 0 ? 1 : button,
		}),
	)
}

describe("QuickModelPicker", () => {
	beforeEach(() => {
		vi.clearAllMocks()
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
		vi.mocked(useProviderModels).mockImplementation(((providerId: string) =>
			mockProviderModels(providerId)) as typeof useProviderModels)
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

	it("pointerdown on a model of a non-active provider commits that providerId+modelId", async () => {
		render(<QuickModelPicker modelDisplayName={LEFTOVER_XAI_MODEL_ID} />)

		fireEvent.click(screen.getByRole("button", { name: "Jan" }))

		const janModel = await screen.findByRole("button", { name: "Jan Local 7B" })
		pointerDown(janModel, 0)

		await waitFor(() => expect(ModelsServiceClient.commitModelSelection).toHaveBeenCalledTimes(1))
		expect(ModelsServiceClient.commitModelSelection).toHaveBeenCalledWith(
			expect.objectContaining({
				providerId: "jan",
				mode: "act",
				modelId: JAN_MODEL_ID,
			}),
		)
	})

	it("does not commit on non-primary pointerdown", async () => {
		render(<QuickModelPicker modelDisplayName={LEFTOVER_XAI_MODEL_ID} />)

		fireEvent.click(screen.getByRole("button", { name: "Jan" }))
		const janModel = await screen.findByRole("button", { name: "Jan Local 7B" })
		pointerDown(janModel, 2)

		expect(ModelsServiceClient.commitModelSelection).not.toHaveBeenCalled()
	})
})
