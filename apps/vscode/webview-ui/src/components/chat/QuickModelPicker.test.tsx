import { CLINE_RECOMMENDED_MODELS_FALLBACK } from "@shared/cline/recommended-models"
import { filterOpenRouterModelIds } from "@shared/utils/model-filters"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useNormalizedApiConfiguration } from "@/hooks/useNormalizedApiConfiguration"
import { useProviderListings } from "@/hooks/useProviderListings"
import { useProviderModels } from "@/hooks/useProviderModels"
import { ModelsServiceClient } from "@/services/grpc-client"
import { QuickModelPicker } from "./QuickModelPicker"

const CLINE_BILLING_CATALOG_IDS = [
	"anthropic/claude-sonnet-4.6",
	"meta-llama/llama-3.3-70b:free",
	"org/allowlisted-only:free",
	"arcee-ai/trinity-large-preview:free",
	"tool-free",
] as const

const CLINE_BILLING_ALLOWLIST = ["org/allowlisted-only:free", ...CLINE_RECOMMENDED_MODELS_FALLBACK.free.map((model) => model.id)]

const CLINE_BILLING_NAMES: Record<string, string> = {
	"anthropic/claude-sonnet-4.6": "Claude Sonnet 4.6",
	"meta-llama/llama-3.3-70b:free": "Llama 3.3 70B",
	"org/allowlisted-only:free": "Allowlisted Free",
	"arcee-ai/trinity-large-preview:free": "Trinity Large Preview",
	"tool-free": "Tool Free",
}

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
		makeUnaryRequest: vi.fn(async () => ({
			recommended: [],
			free: [
				{
					id: "org/allowlisted-only:free",
					description: "Allowlisted free model",
					tags: ["FREE"],
				},
			],
		})),
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

describe("QuickModelPicker Cline list matches Settings Usage-Billing filter", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(ModelsServiceClient.commitModelSelection).mockResolvedValue({})
		vi.mocked(useProviderListings).mockReturnValue({
			providers: [
				{ id: "xai", name: "xAI" },
				{ id: "cline", name: "Cline" },
			],
			isLoading: false,
			error: undefined,
			refresh: vi.fn(),
		} as ReturnType<typeof useProviderListings>)
		vi.mocked(useProviderModels).mockImplementation(((providerId: string) => {
			if (providerId === "cline") {
				return {
					models: Object.fromEntries(
						CLINE_BILLING_CATALOG_IDS.map((id) => [
							id,
							{ name: CLINE_BILLING_NAMES[id], supportsPromptCache: false },
						]),
					),
					defaultModelId: "anthropic/claude-sonnet-4.6",
					isLoading: false,
					isStale: false,
					error: undefined,
					refresh: vi.fn(),
					fingerprint: "cline",
				}
			}
			return mockProviderModels(providerId)
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

	it("shows filterOpenRouterModelIds(..., 'cline', allowlist), not raw catalog or isFreeModel heuristic", async () => {
		const settingsSet = new Set(filterOpenRouterModelIds([...CLINE_BILLING_CATALOG_IDS], "cline", CLINE_BILLING_ALLOWLIST))

		render(<QuickModelPicker modelDisplayName={LEFTOVER_XAI_MODEL_ID} />)
		fireEvent.click(screen.getByRole("button", { name: "Cline" }))

		await waitFor(() => {
			const visibleNames = screen
				.getAllByRole("button")
				.map((el) => el.textContent?.trim() ?? "")
				.filter((name) => Object.values(CLINE_BILLING_NAMES).some((label) => name.includes(label)))
			const visibleIds = CLINE_BILLING_CATALOG_IDS.filter((id) =>
				visibleNames.some((name) => name.includes(CLINE_BILLING_NAMES[id])),
			)

			expect(visibleIds.sort()).toEqual([...settingsSet].sort())
			expect(visibleIds).not.toContain("meta-llama/llama-3.3-70b:free")
			expect(visibleIds).toContain("org/allowlisted-only:free")
			expect(visibleIds).toContain("tool-free")
			expect(visibleIds.sort()).not.toEqual([...CLINE_BILLING_CATALOG_IDS].sort())
		})
	})

	it("puts Settings featured free models in Free with FREE badges, including ids with no :free in the name", async () => {
		vi.mocked(ModelsServiceClient.makeUnaryRequest).mockResolvedValue({
			recommended: [{ id: "openai/gpt-6-astra", name: "GPT-6 Astra", tags: ["NEW"] }],
			free: [
				{ id: "cline-free/deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", tags: ["FREE"] },
				{ id: "z-ai/glm-5.3-flash", name: "GLM-5.3-Flash", tags: ["FREE"] },
				{ id: "cline-free/solar-pro4", name: "Solar Pro 4", tags: ["FREE"] },
				{ id: "cline-free/muse-spark-1.3-contributor", name: "Muse Spark", tags: ["FREE"] },
				{ id: "poolside/laguna-s-2.1:free", name: "Laguna S 2.1", tags: ["FREE"] },
			],
		})
		vi.mocked(useProviderModels).mockImplementation(((providerId: string) => {
			if (providerId === "cline") {
				return {
					models: {
						"z-ai/glm-5.3-flash": { name: "GLM-5.3-Flash", supportsPromptCache: false },
						"aion-2.0": { name: "Aion-2.0", supportsPromptCache: false },
						"poolside/laguna-s-2.1:free": { name: "Laguna S 2.1 (free)", supportsPromptCache: false },
					},
					defaultModelId: "z-ai/glm-5.3-flash",
					isLoading: false,
					isStale: false,
					error: undefined,
					refresh: vi.fn(),
					fingerprint: "cline",
				}
			}
			return mockProviderModels(providerId)
		}) as typeof useProviderModels)

		render(<QuickModelPicker modelDisplayName="z-ai/glm-5.3-flash" />)
		fireEvent.click(screen.getByRole("button", { name: "Cline" }))

		await waitFor(() => {
			expect(screen.getByText("Free")).toBeInTheDocument()
			expect(screen.getByRole("button", { name: /DeepSeek V4.1 Flash/ })).toHaveTextContent("FREE")
			expect(screen.getByRole("button", { name: /GLM-5.3-Flash/ })).toHaveTextContent("FREE")
			expect(screen.getByRole("button", { name: /Solar Pro 4/ })).toHaveTextContent("FREE")
			expect(screen.getByRole("button", { name: /Muse Spark/ })).toHaveTextContent("FREE")
			expect(screen.getByRole("button", { name: /Laguna S 2.1/ })).toHaveTextContent("FREE")
			expect(screen.getByRole("button", { name: /GPT-6 Astra/ })).toHaveTextContent("NEW")
			expect(screen.getByRole("button", { name: /Aion-2.0/ })).toBeInTheDocument()
		})
	})
})
