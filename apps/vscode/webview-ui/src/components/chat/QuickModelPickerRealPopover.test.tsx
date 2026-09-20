import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useNormalizedApiConfiguration } from "@/hooks/useNormalizedApiConfiguration"
import { useProviderListings } from "@/hooks/useProviderListings"
import { useProviderModels } from "@/hooks/useProviderModels"
import { clearReasoningEffortOutcomeCache } from "@/hooks/useReasoningEffortOutcome"
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

/**
 * The configuration writes are spied through `vi.hoisted` so a test can assert what the
 * composer's Options popover really sends for the ACTIVE model (the status-button test).
 */
const handlerSpies = vi.hoisted(() => ({
	handleModeFieldChange: vi.fn(async () => undefined),
	handleModeFieldsChange: vi.fn(async () => undefined),
}))

vi.mock("@/components/settings/utils/useApiConfigurationHandlers", () => ({
	useApiConfigurationHandlers: () => handlerSpies,
}))

vi.mock("@/services/grpc-client", () => ({
	ModelsServiceClient: {
		commitModelSelection: vi.fn(),
		// Host answer for "what will this Effort really send?": by default the level is
		// sent as chosen, so unrelated assertions keep seeing no notice. Tests that
		// exercise the clamp override this with a real downgrade.
		resolveReasoningEffort: vi.fn(async (request: { providerId: string; modelId?: string; effort: string }) => ({
			providerId: request.providerId,
			modelId: request.modelId ?? "",
			requested: request.effort,
			applied: request.effort,
			supportedEfforts: [request.effort],
			reason: "exact",
			clamped: false,
			suppressedByBudget: false,
			source: "sdk-registry",
		})),
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
		// The clamp answers are cached per provider::model::effort for the whole module
		// registry, so a test must not inherit another test's answer.
		clearReasoningEffortOutcomeCache()
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

	/** The status readout of the composer chip (the trigger), not of a row. */
	const readChip = () => {
		const chip = document.querySelector("[data-icline-model-status]") as HTMLElement | null
		return {
			caps: chip
				? [...chip.querySelectorAll("[data-icline-capability]")].map((el) => el.getAttribute("data-icline-capability"))
				: [],
			states: chip
				? [...chip.querySelectorAll("[data-icline-capability][data-icline-state]")].map((el) =>
						el.getAttribute("data-icline-state"),
					)
				: [],
			effort: chip?.querySelector("[data-icline-effort]")?.getAttribute("data-icline-effort") ?? null,
			effortShort: chip?.querySelector("[data-icline-effort]")?.textContent ?? null,
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

	it("shows the active model's readout on the composer chip, matching its row", async () => {
		// The composer chip carries the same readout as the picker's rows, so the
		// effort/reasoning state is visible without opening the picker (smoke 2026-09-20:
		// the row had icons and the chip showed a bare model name).
		const activeModelId = "grok-4.6-reasoner"
		const models = { [activeModelId]: { name: "Grok Reasoner", supportsReasoning: true, supportsImages: true } }
		vi.mocked(useProviderModels).mockImplementation(((providerId: string) => ({
			models: providerId === "xai" ? models : {},
			defaultModelId: providerId === "xai" ? activeModelId : "",
			isLoading: false,
			isStale: false,
			error: undefined,
			refresh: vi.fn(),
			fingerprint: providerId,
		})) as typeof useProviderModels)
		vi.mocked(useExtensionState).mockReturnValue({
			mode: "act",
			apiConfiguration: {
				actModeApiProvider: "xai",
				actModeApiModelId: activeModelId,
				actModeReasoningEffort: "high",
			},
			providerModelsByProvider: { xai: { models } },
		} as ReturnType<typeof useExtensionState>)
		vi.mocked(useNormalizedApiConfiguration).mockReturnValue({
			selectedProvider: "xai",
			selectedModelId: activeModelId,
			selectedModelInfo: models[activeModelId],
		})

		render(<QuickModelPicker modelDisplayName={activeModelId} />)
		await waitFor(() => expect(readChip().caps).toEqual(["reasoning", "vision"]))
		expect(readChip()).toMatchObject({ states: ["on"], effort: "high", effortShort: "H" })

		// The row for the same model reports the very same thing.
		fireEvent.click(screen.getByRole("button", { name: new RegExp(activeModelId) }))
		await waitFor(() => expect(readStatus(activeModelId).rowExists).toBe(true))
		expect(readStatus(activeModelId)).toMatchObject({ rowStates: ["on"], rowEffort: "high" })
		const row = document.querySelector(`[data-icline-model-id="${activeModelId}"]`) as HTMLElement
		expect(
			[...row.querySelectorAll("[data-icline-capability]")].map((el) => el.getAttribute("data-icline-capability")),
		).toEqual(readChip().caps)
	})

	it("splits the composer chip: the status button opens Options for the ACTIVE model", async () => {
		// Smoke 2026-09-20: the readout was glued to the model-name button, so changing the
		// Effort of the model already in use meant opening the model list and finding its row.
		// The readout is its own button now, and it opens the same Options surface for the
		// ACTIVE model — Thinking/Effort without a model switch.
		const activeModelId = "grok-4.6-reasoner"
		const models = { [activeModelId]: { name: "Grok Reasoner", supportsReasoning: true, supportsImages: true } }
		vi.mocked(useProviderModels).mockImplementation(((providerId: string) => ({
			models: providerId === "xai" ? models : {},
			defaultModelId: providerId === "xai" ? activeModelId : "",
			isLoading: false,
			isStale: false,
			error: undefined,
			refresh: vi.fn(),
			fingerprint: providerId,
		})) as typeof useProviderModels)
		vi.mocked(useExtensionState).mockReturnValue({
			mode: "act",
			apiConfiguration: {
				actModeApiProvider: "xai",
				actModeApiModelId: activeModelId,
				actModeReasoningEffort: "high",
			},
			providerModelsByProvider: { xai: { models } },
		} as ReturnType<typeof useExtensionState>)
		vi.mocked(useNormalizedApiConfiguration).mockReturnValue({
			selectedProvider: "xai",
			selectedModelId: activeModelId,
			selectedModelInfo: models[activeModelId],
		})

		render(<QuickModelPicker modelDisplayName={activeModelId} />)

		// The readout is NOT inside the model-name button any more.
		const trigger = document.querySelector("[data-icline-model-trigger]") as HTMLElement
		expect(trigger).not.toBeNull()
		await waitFor(() => expect(document.querySelector("[data-icline-model-status-button]")).not.toBeNull())
		const statusButton = document.querySelector("[data-icline-model-status-button]") as HTMLElement
		expect(trigger.contains(statusButton)).toBe(false)
		expect(trigger.querySelector("[data-icline-model-status]")).toBeNull()
		expect(statusButton.querySelector("[data-icline-model-status]")).not.toBeNull()

		// Both click targets in the chip show the hand cursor, like the four VSCodeButton
		// icons next to them (plain <button> gets the OS arrow — request of 2026-09-20).
		expect(trigger.className).toContain("cursor-pointer")
		expect(statusButton.className).toContain("cursor-pointer")

		// Clicking the readout opens the Options surface for the model in use…
		fireEvent.click(statusButton)
		const panel = () => document.querySelector("[data-icline-status-options]")
		await waitFor(() => expect(panel()).not.toBeNull())
		expect(panel()?.textContent).toContain("Options")
		// …whose LEFT edge is anchored to the button's left edge (`align="start"`), not to
		// its right edge: `align="end"` slid the 236px panel left of the icon that opened
		// it. jsdom's default pane (1024px) is wide enough for that rule, so the left-edge
		// anchor is what this render must produce; the narrow fallback has its own test
		// below. Radix publishes the resolved alignment as `data-align`.
		expect(panel()?.getAttribute("data-align")).toBe("start")
		// Effort levels are click targets too, in both Options surfaces.
		expect((panel()?.querySelector("[data-icline-effort-option]") as HTMLElement).className).toContain("cursor-pointer")
		// The hand cursor covers the whole Options body, not only its Effort rows: the model
		// id, the gaps and the capability readout are part of the same menu (request of
		// 2026-09-20). The popover wrapper carries it, and so does the panel itself so the
		// hover panel inside the model list draws it too.
		expect(panel()?.className).toContain("cursor-pointer")
		expect((panel()?.querySelector("[data-icline-options-panel]") as HTMLElement).className).toContain("cursor-pointer")
		expect(panel()?.querySelector("[data-icline-options-model-id]")?.textContent).toBe(activeModelId)
		expect(panel()?.querySelector("[data-icline-thinking-switch]")?.getAttribute("data-icline-thinking-switch")).toBe("on")
		expect(panel()?.querySelector("[data-icline-effort-selected]")?.getAttribute("data-icline-effort-option")).toBe("high")
		// …and NOT the model list (that stays the model-name button's job).
		expect(document.querySelector("[data-icline-quick-picker]")).toBeNull()

		// A level picked here writes through to the ACTIVE model's running configuration —
		// the same write Settings makes — and never commits a model selection.
		const maxLevel = panel()?.querySelector('[data-icline-effort-option="max"]') as HTMLElement
		expect(maxLevel).not.toBeNull()
		fireEvent.click(maxLevel)
		await waitFor(() =>
			expect(handlerSpies.handleModeFieldChange).toHaveBeenCalledWith(
				{ plan: "planModeReasoningEffort", act: "actModeReasoningEffort" },
				"max",
				"act",
			),
		)
		expect(ModelsServiceClient.commitModelSelection).not.toHaveBeenCalled()
		// The chip's own readout follows immediately (session state, not a stale push).
		await waitFor(() => expect(readChip().effort).toBe("max"))
	})

	it("hands the cursor over the whole model menu, not only its rows", async () => {
		// Request of 2026-09-20: inside the picker every part is part of the menu, so the OS
		// arrow must not come back over the headers, the footer or the empty space between
		// them — only over the one thing that is typed into, the search field.
		render(<QuickModelPicker modelDisplayName={LEFTOVER_XAI_MODEL_ID} />)
		fireEvent.click(screen.getByRole("button", { name: new RegExp(LEFTOVER_XAI_MODEL_ID) }))

		await waitFor(() => expect(document.querySelector("[data-icline-quick-picker]")).not.toBeNull())
		const picker = document.querySelector("[data-icline-quick-picker]") as HTMLElement
		expect(picker.className).toContain("cursor-pointer")
		expect((document.querySelector('[data-icline-provider="xai"] button') as HTMLElement).className).toContain(
			"cursor-pointer",
		)
		expect((picker.querySelector("input") as HTMLElement).className).toContain("cursor-text")
	})

	it("moves the Options anchor from the button's left edge to its right one in a squeezed pane", async () => {
		// The two rules of the position fix (request of 2026-09-20): the left edge is the
		// rule while the pane can hold the 236px panel beside the button, and the older
		// right-edge anchoring comes back only when it cannot — so a squeezed sidebar still
		// shows the whole panel instead of losing it off the side of the pane.
		const activeModelId = "grok-4.6-reasoner"
		const models = { [activeModelId]: { name: "Grok Reasoner", supportsReasoning: true, supportsImages: true } }
		vi.mocked(useProviderModels).mockImplementation(((providerId: string) => ({
			models: providerId === "xai" ? models : {},
			defaultModelId: providerId === "xai" ? activeModelId : "",
			isLoading: false,
			isStale: false,
			error: undefined,
			refresh: vi.fn(),
			fingerprint: providerId,
		})) as typeof useProviderModels)
		vi.mocked(useExtensionState).mockReturnValue({
			mode: "act",
			apiConfiguration: {
				actModeApiProvider: "xai",
				actModeApiModelId: activeModelId,
				actModeReasoningEffort: "high",
			},
			providerModelsByProvider: { xai: { models } },
		} as ReturnType<typeof useExtensionState>)
		vi.mocked(useNormalizedApiConfiguration).mockReturnValue({
			selectedProvider: "xai",
			selectedModelId: activeModelId,
			selectedModelInfo: models[activeModelId],
		})

		render(<QuickModelPicker modelDisplayName={activeModelId} />)
		await waitFor(() => expect(document.querySelector("[data-icline-model-status-button]")).not.toBeNull())
		const statusButton = document.querySelector("[data-icline-model-status-button]") as HTMLElement
		// jsdom lays nothing out, so pin what the side is decided from: where the button sits
		// inside the pane. 640px into jsdom's 1024px pane leaves room for the panel to start
		// there — the ~930px working pane this rule was asked for.
		statusButton.getBoundingClientRect = () => ({ left: 640, right: 672, width: 32 }) as DOMRect

		fireEvent.click(statusButton)
		const panel = () => document.querySelector("[data-icline-status-options]")
		await waitFor(() => expect(panel()).not.toBeNull())
		expect(panel()?.getAttribute("data-align")).toBe("start")

		// Now the same thing a squeezed pane does to this button: it ends up near the pane's
		// right edge, too close to it for the panel to start there. The panel is re-anchored
		// while it is open, which is what dragging the sidebar produces.
		statusButton.getBoundingClientRect = () => ({ left: 1000, right: 1032, width: 32 }) as DOMRect
		fireEvent(window, new Event("resize"))
		await waitFor(() => expect(panel()?.getAttribute("data-align")).toBe("end"))

		// …and back to the left-edge anchor once there is room again.
		statusButton.getBoundingClientRect = () => ({ left: 640, right: 672, width: 32 }) as DOMRect
		fireEvent(window, new Event("resize"))
		await waitFor(() => expect(panel()?.getAttribute("data-align")).toBe("start"))
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

	it("says what will really be sent when the model cannot take the marked level", async () => {
		// The user's Sakana case: Fugu Ultra advertises high/xhigh, so picking Max sends
		// X-High. The panel used to show Max selected and nothing else — the downgrade
		// only surfaced in the provider's own answer.
		//
		// Start from a clean model-preference store: other tests in this file write
		// per-model effort into it, and a leftover `max` would open the panel already
		// clamped (and add an effort badge to the row's accessible name).
		localStorage.clear()
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
					models: { fugu: { name: "Fugu", supportsReasoning: true } },
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
		vi.mocked(ModelsServiceClient.resolveReasoningEffort).mockImplementation((async (request: {
			providerId: string
			modelId?: string
			effort: string
		}) => ({
			providerId: request.providerId,
			modelId: request.modelId ?? "",
			requested: request.effort,
			applied: request.effort === "max" ? "xhigh" : request.effort,
			supportedEfforts: ["high", "xhigh"],
			reason: request.effort === "max" ? "nearest-supported" : "exact",
			clamped: request.effort === "max",
			suppressedByBudget: false,
			source: "sdk-registry",
		})) as unknown as typeof ModelsServiceClient.resolveReasoningEffort)

		render(<QuickModelPicker modelDisplayName={LEFTOVER_XAI_MODEL_ID} />)
		fireEvent.click(screen.getByRole("button", { name: new RegExp(LEFTOVER_XAI_MODEL_ID) }))
		fireEvent.click(await screen.findByRole("button", { name: "Sakana" }))
		fireEvent.pointerMove(await screen.findByRole("button", { name: /^Fugu\b/ }))
		await waitFor(() => expect(readStatus("fugu").panelModelId).toBe("fugu"))

		const notice = () => document.querySelector("[data-icline-picker-options] [data-icline-effort-clamp]")
		// A level the model accepts says nothing: silence is the normal state.
		expect(notice()).toBeNull()

		fireEvent.click(document.querySelector('[data-icline-picker-options] [data-icline-effort-option="max"]') as HTMLElement)
		await waitFor(() => expect(notice()).not.toBeNull())
		expect(notice()?.getAttribute("data-icline-effort-clamp")).toBe("nearest-supported")
		expect(notice()?.textContent).toContain("Max → X-High")
		// The row keeps showing what the user picked — the notice is the explanation,
		// not a silent rewrite of the selection.
		expect(readStatus("fugu")).toMatchObject({ panelSelectedEffort: "max" })

		// Going back to a level the model does take removes the notice.
		fireEvent.click(document.querySelector('[data-icline-picker-options] [data-icline-effort-option="high"]') as HTMLElement)
		await waitFor(() => expect(notice()).toBeNull())
	})

	it("stays quiet while a thinking budget is what actually goes out", async () => {
		mockReasoningProviderModels()
		vi.mocked(ModelsServiceClient.resolveReasoningEffort).mockImplementation((async (request: {
			providerId: string
			modelId?: string
			effort: string
		}) => ({
			providerId: request.providerId,
			modelId: request.modelId ?? "",
			requested: request.effort,
			applied: "high",
			supportedEfforts: ["low", "medium", "high"],
			reason: "nearest-supported",
			clamped: true,
			// A stored budget means the app sends the budget, not this effort: claiming
			// a level is in force here would be a false statement.
			suppressedByBudget: true,
			source: "sdk-registry",
		})) as unknown as typeof ModelsServiceClient.resolveReasoningEffort)

		render(<QuickModelPicker modelDisplayName={LEFTOVER_XAI_MODEL_ID} />)
		fireEvent.click(screen.getByRole("button", { name: new RegExp(LEFTOVER_XAI_MODEL_ID) }))
		fireEvent.click(await screen.findByRole("button", { name: "Jan" }))
		fireEvent.pointerMove(await screen.findByRole("button", { name: /Jan Reasoner/ }))
		await waitFor(() => expect(readStatus("jan-reasoner").panelModelId).toBe("jan-reasoner"))
		fireEvent.click(document.querySelector('[data-icline-picker-options] [data-icline-effort-option="max"]') as HTMLElement)

		await waitFor(() => expect(ModelsServiceClient.resolveReasoningEffort).toHaveBeenCalled())
		expect(document.querySelector("[data-icline-picker-options] [data-icline-effort-clamp]")).toBeNull()
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
