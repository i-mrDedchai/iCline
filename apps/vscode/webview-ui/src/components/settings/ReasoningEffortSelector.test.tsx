import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { clearReasoningEffortOutcomeCache } from "@/hooks/useReasoningEffortOutcome"
import { ModelsServiceClient } from "@/services/grpc-client"
import ReasoningEffortSelector from "./ReasoningEffortSelector"

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: vi.fn(),
}))

vi.mock("./utils/useApiConfigurationHandlers", () => ({
	useApiConfigurationHandlers: () => ({
		handleModeFieldChange: vi.fn(),
	}),
}))

vi.mock("@/services/grpc-client", () => ({
	ModelsServiceClient: {
		resolveReasoningEffort: vi.fn(),
	},
}))

const resolveReasoningEffort = vi.mocked(ModelsServiceClient.resolveReasoningEffort)

function setState(reasoningEffort: string | undefined, thinkingBudgetTokens?: number) {
	vi.mocked(useExtensionState).mockReturnValue({
		apiConfiguration: { actModeReasoningEffort: reasoningEffort, actModeThinkingBudgetTokens: thinkingBudgetTokens },
		preferredLanguage: undefined,
	} as unknown as ReturnType<typeof useExtensionState>)
}

/** The host answers what the SDK will really send for the requested level. */
function hostAnswers(applied: string, clamped: boolean, reason = "nearest-supported") {
	resolveReasoningEffort.mockImplementation((async (request: { providerId: string; modelId?: string; effort: string }) => ({
		providerId: request.providerId,
		modelId: request.modelId ?? "",
		requested: request.effort,
		applied,
		supportedEfforts: ["high", "xhigh"],
		reason,
		clamped,
		suppressedByBudget: false,
		source: "sdk-registry",
	})) as unknown as typeof ModelsServiceClient.resolveReasoningEffort)
}

const SAKANA = { providerId: "sakana", modelId: "fugu-ultra", modelInfo: { supportsReasoning: true } }

describe("ReasoningEffortSelector", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		clearReasoningEffortOutcomeCache()
	})

	it("tells the user what will really be sent when the model clamps the level", async () => {
		setState("max")
		hostAnswers("xhigh", true)

		render(<ReasoningEffortSelector currentMode="act" {...SAKANA} />)

		await waitFor(() => expect(document.querySelector("[data-icline-effort-clamp]")).not.toBeNull())
		expect(document.querySelector("[data-icline-effort-clamp]")?.textContent).toContain("Max → X-High")
		expect(resolveReasoningEffort).toHaveBeenCalledWith(
			expect.objectContaining({ providerId: "sakana", modelId: "fugu-ultra", effort: "max" }),
		)
	})

	it("says nothing when the level is sent as chosen", async () => {
		setState("high")
		hostAnswers("high", false, "exact")

		render(<ReasoningEffortSelector currentMode="act" {...SAKANA} />)

		await waitFor(() => expect(resolveReasoningEffort).toHaveBeenCalled())
		expect(document.querySelector("[data-icline-effort-clamp]")).toBeNull()
	})

	it("keeps a level stored by another provider selected, and asks about that level", async () => {
		// Sakana's control offers High/X-High/Max; a `medium` left over from a previous
		// provider is still what the request carries, so the control must show it rather
		// than display one level while sending another.
		setState("medium")
		hostAnswers("high", true)

		render(<ReasoningEffortSelector currentMode="act" {...SAKANA} />)

		expect(screen.getByRole("combobox").textContent).toContain("Medium")
		await waitFor(() => expect(resolveReasoningEffort).toHaveBeenCalledWith(expect.objectContaining({ effort: "medium" })))
		// The notice names the same level the control is showing, not the set's default.
		expect(document.querySelector("[data-icline-effort-clamp]")?.textContent).toContain("Medium → High")
	})

	it("claims nothing while reasoning is off — and still asks which levels the model takes", async () => {
		// The ask is not only "what does this level send". The host also answers with the
		// model's OWN levels (`supportedEfforts`), and a control that draws its list needs
		// them before anything is set — gating the question on a level already being set
		// is what left the Quick Picker's panel unable to name a level it did not hold
		// (smoke 2026-09-21). Being off changes the ANSWER, not the question.
		setState("none")
		// `none` forwards no effort at all: the answer names the model's levels and has
		// no downgrade to report (`applied` stays undefined).
		resolveReasoningEffort.mockImplementation((async (request: { providerId: string; modelId?: string; effort: string }) => ({
			providerId: request.providerId,
			modelId: request.modelId ?? "",
			requested: request.effort,
			supportedEfforts: ["high", "xhigh"],
			reason: "not-applicable",
			clamped: false,
			suppressedByBudget: false,
			source: "sdk-registry",
		})) as unknown as typeof ModelsServiceClient.resolveReasoningEffort)

		render(<ReasoningEffortSelector currentMode="act" {...SAKANA} />)

		await waitFor(() => expect(resolveReasoningEffort).toHaveBeenCalledWith(expect.objectContaining({ effort: "none" })))
		// Silence is the promise that matters: nothing is sent for `none`, so nothing is
		// claimed about a level.
		expect(document.querySelector("[data-icline-effort-clamp]")).toBeNull()
	})
})
