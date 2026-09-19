import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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
		makeUnaryRequest: vi.fn(async () => ({
			recommended: [],
			free: [],
		})),
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

	afterEach(() => {
		vi.restoreAllMocks()
		delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView
	})

	it("pins the active provider by scrolling the picker's own list — never scrollIntoView", async () => {
		// Regression guard for the webview page-jump bug: scrollIntoView() walks
		// every scrollable ancestor (chat view, webview document), so opening the
		// picker nudged the whole page before it snapped back. The open-time pin
		// must drive list.scrollTop directly instead.
		const scrollIntoView = vi.fn()
		HTMLElement.prototype.scrollIntoView = scrollIntoView
		const setScrollTop = vi.spyOn(Element.prototype, "scrollTop", "set")

		// jsdom has no layout: pin the geometry the open-effect measures — the
		// list at top 0, the active provider's row 450px below it.
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
			if (this.hasAttribute("data-icline-picker-list")) {
				return { top: 0, height: 300 } as unknown as DOMRect
			}
			if (this.getAttribute("data-icline-provider") === "xai") {
				return { top: 450, height: 24 } as unknown as DOMRect
			}
			return { top: 0, height: 0 } as unknown as DOMRect
		})

		vi.mocked(useProviderListings).mockReturnValue({
			providers: [
				{ id: "cerebras", name: "Cerebras" },
				{ id: "xai", name: "xAI" },
				{ id: "zai", name: "Z.AI" },
			],
			isLoading: false,
			error: undefined,
			refresh: vi.fn(),
		} as ReturnType<typeof useProviderListings>)

		render(<QuickModelPicker modelDisplayName={LEFTOVER_XAI_MODEL_ID} />)
		fireEvent.click(screen.getByRole("button", { name: new RegExp(LEFTOVER_XAI_MODEL_ID) }))

		// The list's scrollTop is driven directly to the stubbed row offset…
		await waitFor(() => expect(setScrollTop).toHaveBeenCalledWith(450))
		// …and no ancestor scroll (scrollIntoView) was requested anywhere.
		expect(scrollIntoView).not.toHaveBeenCalled()
	})

	/** Reads the row/panel status attributes the picker publishes for a model. */
	const readStatus = (modelId: string) => {
		const row = document.querySelector(`[data-icline-model-id="${modelId}"]`) as HTMLElement | null
		const panel = document.querySelector("[data-icline-picker-options]") as HTMLElement | null
		const icons = row ? [...row.querySelectorAll("[data-icline-state]")] : []
		return {
			rowExists: !!row,
			rowStates: icons.map((el) => el.getAttribute("data-icline-state")),
			rowEffort: row?.querySelector("[data-icline-effort]")?.getAttribute("data-icline-effort") ?? null,
			panelModelId: panel?.querySelector("[data-icline-options-model-id]")?.textContent ?? null,
			panelSwitch: panel?.querySelector("[data-icline-thinking-switch]")?.getAttribute("data-icline-thinking-switch"),
			panelSelectedEffort:
				panel?.querySelector("[data-icline-effort-selected]")?.getAttribute("data-icline-effort-option") ?? null,
			panelText: panel?.textContent ?? "",
		}
	}

	/** Two Jan models: one declares reasoning, one is plain — for status assertions. */
	const mockReasoningProviderModels = () => {
		vi.mocked(useProviderModels).mockImplementation(((providerId: string) => {
			if (providerId === "jan") {
				return {
					models: {
						"jan-reasoner": { name: "Jan Reasoner", supportsReasoning: true, supportsImages: true },
						"jan-plain": { name: "Jan Plain" },
					},
					defaultModelId: "jan-reasoner",
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
	}

	it("renders the mock-v11 Options panel structure with the hovered model's id", async () => {
		mockReasoningProviderModels()

		render(<QuickModelPicker modelDisplayName={LEFTOVER_XAI_MODEL_ID} />)
		fireEvent.click(screen.getByRole("button", { name: new RegExp(LEFTOVER_XAI_MODEL_ID) }))
		fireEvent.click(await screen.findByRole("button", { name: "Jan" }))
		fireEvent.pointerMove(await screen.findByRole("button", { name: /Jan Reasoner/ }))

		const panel = () => document.querySelector("[data-icline-picker-options]")
		await waitFor(() => expect(panel()).not.toBeNull())
		// Title + model id + the Thinking switch + the Effort levels (every value the
		// app can store, minus the OFF level the switch owns).
		expect(panel()?.textContent).toContain("Options")
		expect(panel()?.querySelector("[data-icline-options-model-id]")?.textContent).toBe("jan-reasoner")
		expect(panel()?.querySelector("[data-icline-thinking-switch]")).not.toBeNull()
		expect([...panel()!.querySelectorAll("[data-icline-effort-option]")].map((el) => el.textContent)).toEqual([
			"Minimal",
			"Low",
			"Medium",
			"High",
			"X-High",
			"Max",
		])
		// The reasoning model offers levels; a model without any declared capability does not.
		expect(panel()?.textContent).not.toContain("No effort options for this model")
	})

	it("keeps the row badge and icon state in step with the Options panel", async () => {
		mockReasoningProviderModels()

		render(<QuickModelPicker modelDisplayName={LEFTOVER_XAI_MODEL_ID} />)
		fireEvent.click(screen.getByRole("button", { name: new RegExp(LEFTOVER_XAI_MODEL_ID) }))
		fireEvent.click(await screen.findByRole("button", { name: "Jan" }))
		fireEvent.pointerMove(await screen.findByRole("button", { name: /Jan Reasoner/ }))
		await waitFor(() => expect(readStatus("jan-reasoner").panelModelId).toBe("jan-reasoner"))

		// Off by default: no badge, icons report the off state, the switch agrees.
		expect(readStatus("jan-reasoner")).toMatchObject({
			rowEffort: null,
			rowStates: ["off"],
			panelSwitch: "off",
			panelSelectedEffort: null,
		})

		// Pick a level: row badge, row icon state and panel selection all move together.
		fireEvent.click(screen.getByRole("button", { name: "High" }))
		await waitFor(() => expect(readStatus("jan-reasoner").rowEffort).toBe("high"))
		expect(readStatus("jan-reasoner")).toMatchObject({
			rowStates: ["on"],
			panelSwitch: "on",
			panelSelectedEffort: "high",
		})
		expect(document.querySelector('[data-icline-model-id="jan-reasoner"] [data-icline-effort]')?.textContent).toBe("H")

		// The Thinking switch turns it off again — again in both places at once.
		fireEvent.click(screen.getByRole("switch", { name: "Toggle thinking mode" }))
		await waitFor(() => expect(readStatus("jan-reasoner").rowEffort).toBeNull())
		expect(readStatus("jan-reasoner")).toMatchObject({ rowStates: ["off"], panelSwitch: "off", panelSelectedEffort: null })

		// …and switching it back on restores the level the user had chosen.
		fireEvent.click(screen.getByRole("switch", { name: "Toggle thinking mode" }))
		await waitFor(() => expect(readStatus("jan-reasoner").rowEffort).toBe("high"))
		expect(readStatus("jan-reasoner")).toMatchObject({ rowStates: ["on"], panelSwitch: "on", panelSelectedEffort: "high" })
	})

	it("offers the hovered PROVIDER's own effort levels, not one hardcoded set", async () => {
		// Sakana maps three levels itself (high/xhigh/max) — the shared provider metadata
		// (`@/utils/modelThinkingOptions`) names them, so the panel must list those and the
		// row badge must resolve `max`, a value outside the OpenAI vocabulary.
		vi.mocked(useProviderListings).mockReturnValue({
			providers: [
				{ id: "xai", name: "xAI" },
				{ id: "sakana", name: "Sakana" },
			],
			isLoading: false,
			error: undefined,
			refresh: vi.fn(),
		} as ReturnType<typeof useProviderListings>)
		vi.mocked(useProviderModels).mockImplementation(((providerId: string) => {
			if (providerId === "sakana") {
				return {
					models: {
						fugu: { name: "Fugu", supportsReasoning: true },
						"fugu-ultra": { name: "Fugu Ultra", supportsReasoning: true },
					},
					defaultModelId: "fugu",
					isLoading: false,
					isStale: false,
					error: undefined,
					refresh: vi.fn(),
					fingerprint: "sakana",
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

		render(<QuickModelPicker modelDisplayName={LEFTOVER_XAI_MODEL_ID} />)
		fireEvent.click(screen.getByRole("button", { name: new RegExp(LEFTOVER_XAI_MODEL_ID) }))
		fireEvent.click(await screen.findByRole("button", { name: "Sakana" }))
		fireEvent.pointerMove(await screen.findByRole("button", { name: /Fugu$/ }))
		await waitFor(() => expect(readStatus("fugu").panelModelId).toBe("fugu"))

		const options = () =>
			[...document.querySelectorAll("[data-icline-picker-options] [data-icline-effort-option]")].map((el) =>
				el.getAttribute("data-icline-effort-option"),
			)
		expect(options()).toEqual(["high", "xhigh", "max"])
		// The switch is the off, so `none` stays out of the list — as it does for OpenAI sets.
		expect(options()).not.toContain("none")
		// …and the panel says WHICH metadata entry named the levels.
		expect(document.querySelector("[data-icline-effort-set]")?.getAttribute("data-icline-effort-set")).toBe("sakana")

		const maxLevel = document.querySelector('[data-icline-picker-options] [data-icline-effort-option="max"]')
		expect(maxLevel?.textContent).toBe("Max")
		fireEvent.click(maxLevel as HTMLElement)
		await waitFor(() => expect(readStatus("fugu").rowEffort).toBe("max"))
		expect(readStatus("fugu")).toMatchObject({ panelSelectedEffort: "max", panelSwitch: "on" })
		expect(document.querySelector('[data-icline-model-id="fugu"] [data-icline-effort]')?.textContent).toBe("M")
	})

	it("hovering a model row mounts the Options panel and follows the hovered row", async () => {
		// Regression guard (fix.8 → fix.9): the delegated hover handler used to
		// be a native listener attached in a useEffect keyed on `open`. Radix
		// `Presence` mounts the popover body ONE COMMIT LATER (`send("MOUNT")`
		// from a layout effect), so that effect ran while `listRef.current` was
		// still null, early-returned, and — its deps never changing again — never
		// attached. In the real webview the Options panel never appeared. A React
		// prop is wired during render and cannot miss that mount.
		vi.mocked(useProviderModels).mockImplementation(((providerId: string) => {
			if (providerId === "jan") {
				return {
					models: {
						"jan-first": { name: "Jan First", supportsPromptCache: false },
						"jan-second": { name: "Jan Second", supportsPromptCache: false },
					},
					defaultModelId: "jan-first",
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

		render(<QuickModelPicker modelDisplayName={LEFTOVER_XAI_MODEL_ID} />)
		fireEvent.click(screen.getByRole("button", { name: new RegExp(LEFTOVER_XAI_MODEL_ID) }))
		fireEvent.click(await screen.findByRole("button", { name: "Jan" }))

		const firstRow = await screen.findByRole("button", { name: /Jan First/ })
		fireEvent.pointerMove(firstRow)

		const panel = () => document.querySelector("[data-icline-picker-options]")
		await waitFor(() => expect(panel()).not.toBeNull())
		// The panel names the model by its id (mock v11's `.mid` line).
		expect(panel()?.textContent).toContain("jan-first")

		// Moving to the next row must re-anchor the panel to THAT model.
		const secondRow = screen.getByRole("button", { name: /Jan Second/ })
		fireEvent.pointerMove(secondRow)
		await waitFor(() => expect(panel()?.textContent).toContain("jan-second"))
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
