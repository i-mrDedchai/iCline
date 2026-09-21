import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ModelsServiceClient } from "@/services/grpc-client"
import {
	clearReasoningEffortOutcomeCache,
	readReasoningEffortLevels,
	useReasoningEffortOutcome,
} from "./useReasoningEffortOutcome"

vi.mock("@/services/grpc-client", () => ({
	ModelsServiceClient: {
		resolveReasoningEffort: vi.fn(),
	},
}))

const resolveReasoningEffort = vi.mocked(ModelsServiceClient.resolveReasoningEffort)

type Request = { providerId: string; modelId?: string; effort: string; thinkingBudgetTokens?: number }

/** The host's answer shape, as the generated client would deliver it. */
function answer(request: Request, applied: string | undefined, clamped: boolean) {
	return {
		providerId: request.providerId,
		modelId: request.modelId ?? "",
		requested: request.effort,
		applied,
		supportedEfforts: applied === undefined ? [] : [applied],
		reason: clamped ? "nearest-supported" : "exact",
		clamped,
		suppressedByBudget: false,
		source: "sdk-registry",
	} as Awaited<ReturnType<typeof ModelsServiceClient.resolveReasoningEffort>>
}

describe("useReasoningEffortOutcome", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		clearReasoningEffortOutcomeCache()
	})

	it("asks the host once and reports the clamp it answers", async () => {
		resolveReasoningEffort.mockImplementation(async (request: Request) => answer(request, "xhigh", true))

		const { result } = renderHook(() =>
			useReasoningEffortOutcome({ providerId: "sakana", modelId: "fugu-ultra", effort: "max" }),
		)

		expect(result.current).toBeUndefined()
		await waitFor(() => expect(result.current?.applied).toBe("xhigh"))
		expect(result.current).toMatchObject({ requested: "max", reason: "nearest-supported", clamped: true })
		expect(resolveReasoningEffort).toHaveBeenCalledTimes(1)
	})

	it("serves a repeated question from the cache instead of the host", async () => {
		resolveReasoningEffort.mockImplementation(async (request: Request) => answer(request, "xhigh", true))

		const first = renderHook(() => useReasoningEffortOutcome({ providerId: "sakana", modelId: "fugu-ultra", effort: "max" }))
		await waitFor(() => expect(first.result.current?.clamped).toBe(true))
		first.unmount()

		const second = renderHook(() => useReasoningEffortOutcome({ providerId: "sakana", modelId: "fugu-ultra", effort: "max" }))
		await waitFor(() => expect(second.result.current?.clamped).toBe(true))
		expect(resolveReasoningEffort).toHaveBeenCalledTimes(1)
	})

	it("never renders one model's answer for another", async () => {
		// The first answer resolves later than the second: a naive implementation shows
		// the in-flight model's clamp under the cursor for the newly hovered one.
		const deferred: ((value: unknown) => void)[] = []
		resolveReasoningEffort.mockImplementation(
			(request: Request) =>
				new Promise((resolve) => {
					deferred.push(() => resolve(answer(request, request.modelId === "slow" ? "xhigh" : "medium", true)))
				}),
		)

		const { result, rerender } = renderHook(
			({ modelId }: { modelId: string }) => useReasoningEffortOutcome({ providerId: "sakana", modelId, effort: "max" }),
			{ initialProps: { modelId: "slow" } },
		)

		rerender({ modelId: "fast" })
		deferred[1]?.({})
		await waitFor(() => expect(result.current?.applied).toBe("medium"))
		// The slow model's answer arrives after its question left the screen.
		deferred[0]?.({})
		await Promise.resolve()
		expect(result.current?.applied).toBe("medium")
	})

	it("asks nothing when there is no model to ask about", () => {
		renderHook(() => useReasoningEffortOutcome({ providerId: "sakana", modelId: "", effort: "max" }))
		renderHook(() => useReasoningEffortOutcome({ providerId: "", modelId: "fugu-ultra", effort: "max" }))

		expect(resolveReasoningEffort).not.toHaveBeenCalled()
	})

	it("asks about `none`/no level too — the answer names the model's levels", async () => {
		// The question is not only "what does this selection send": a control drawing its
		// list needs the model's own levels BEFORE anything is set. Gating the ask on a
		// level already being set is what made the panel unable to name a level it did
		// not already hold.
		resolveReasoningEffort.mockImplementation(async (request: Request) => ({
			providerId: request.providerId,
			modelId: request.modelId ?? "",
			requested: request.effort,
			supportedEfforts: ["low", "high", "max"],
			reason: "not-applicable",
			clamped: false,
			suppressedByBudget: false,
			source: "sdk-registry",
		}))

		const { result } = renderHook(() =>
			useReasoningEffortOutcome({ providerId: "cline", modelId: "z-ai/glm-5.3-flash", effort: "none" }),
		)

		await waitFor(() => expect(resolveReasoningEffort).toHaveBeenCalledTimes(1))
		expect(result.current?.supportedEfforts).toEqual(["low", "high", "max"])
		expect(result.current?.clamped).toBe(false)
	})

	/**
	 * The level in force and the model's levels are two different questions, and the
	 * Thinking switch only ever changes the first. Answering both from one key meant a
	 * toggle dropped the model's levels on the floor for as long as the new question
	 * took — the Options panel fell back to the provider vocabulary (six generic levels
	 * and a clamp notice for a level the model takes) and then snapped back, which is
	 * the visible jump reported from dev.6-fix.27 on several models.
	 */
	it("carries the model's levels across a level change instead of falling back to the vocabulary", async () => {
		resolveReasoningEffort.mockImplementation((async (request: Request) => {
			if (request.effort === "none") {
				// The switch's own question is still on the wire.
				return new Promise(() => {})
			}
			return {
				providerId: request.providerId,
				modelId: request.modelId ?? "",
				requested: request.effort,
				applied: request.effort,
				supportedEfforts: ["low", "high", "max"],
				reason: "exact",
				clamped: false,
				suppressedByBudget: false,
				source: "sdk-registry",
			}
		}) as unknown as typeof ModelsServiceClient.resolveReasoningEffort)

		const { result, rerender } = renderHook(
			({ effort }: { effort: string }) =>
				useReasoningEffortOutcome({ providerId: "cline", modelId: "z-ai/glm-5.3-flash", effort }),
			{ initialProps: { effort: "low" } },
		)
		await waitFor(() => expect(result.current?.supportedEfforts).toEqual(["low", "high", "max"]))

		rerender({ effort: "none" })
		// Immediately — not after the host answers — the model's own levels.
		expect(result.current?.supportedEfforts).toEqual(["low", "high", "max"])
		// …and nothing is claimed about a level whose answer has not arrived.
		expect(result.current).toMatchObject({ requested: "none", applied: undefined, clamped: false, suppressedByBudget: false })
		expect(result.current?.reason).toBe("not-applicable")
	})

	it("keeps saying a toggle-only model has no level control, across the toggle", async () => {
		// This reason is a fact about the MODEL (the registry carries it with no levels
		// at all), so it has to survive the switch moving — otherwise the panel offers
		// six levels it must not, mid-click.
		resolveReasoningEffort.mockImplementation((async (request: Request) => {
			if (request.effort === "none") {
				return new Promise(() => {})
			}
			return {
				providerId: request.providerId,
				modelId: request.modelId ?? "",
				requested: request.effort,
				supportedEfforts: [],
				reason: "no-effort-control",
				clamped: false,
				suppressedByBudget: false,
				source: "sdk-registry",
			}
		}) as unknown as typeof ModelsServiceClient.resolveReasoningEffort)

		const { result, rerender } = renderHook(
			({ effort }: { effort: string }) =>
				useReasoningEffortOutcome({ providerId: "cline", modelId: "some/toggle-only", effort }),
			{ initialProps: { effort: "high" } },
		)
		await waitFor(() => expect(result.current?.reason).toBe("no-effort-control"))

		rerender({ effort: "none" })
		expect(result.current).toMatchObject({ supportedEfforts: [], reason: "no-effort-control", source: "sdk-registry" })
	})

	it("remembers the model's levels for a caller that cannot use a hook", async () => {
		// The Thinking switch's click handler decides which level an ON switch lands on,
		// and it asks while that very click is changing the level — so it needs the
		// model's levels, not the answer to the question it is invalidating.
		resolveReasoningEffort.mockImplementation((async (request: Request) => ({
			providerId: request.providerId,
			modelId: request.modelId ?? "",
			requested: request.effort,
			supportedEfforts: ["low", "high", "max"],
			reason: "not-applicable",
			clamped: false,
			suppressedByBudget: false,
			source: "sdk-registry",
		})) as unknown as typeof ModelsServiceClient.resolveReasoningEffort)

		expect(readReasoningEffortLevels({ providerId: "cline", modelId: "z-ai/glm-5.3-flash" })).toBeUndefined()
		const { result } = renderHook(() =>
			useReasoningEffortOutcome({ providerId: "cline", modelId: "z-ai/glm-5.3-flash", effort: "none" }),
		)
		await waitFor(() => expect(result.current?.supportedEfforts).toEqual(["low", "high", "max"]))
		expect(readReasoningEffortLevels({ providerId: "cline", modelId: "z-ai/glm-5.3-flash" })).toEqual({
			supportedEfforts: ["low", "high", "max"],
			source: "sdk-registry",
		})
		// A model nothing has asked about yet is unknown, not level-less.
		expect(readReasoningEffortLevels({ providerId: "cline", modelId: "never/asked" })).toBeUndefined()
		expect(readReasoningEffortLevels({ providerId: "cline" })).toBeUndefined()
	})

	it("stays silent when the host call fails", async () => {
		resolveReasoningEffort.mockRejectedValue(new Error("host unavailable"))

		const { result } = renderHook(() =>
			useReasoningEffortOutcome({ providerId: "sakana", modelId: "fugu-ultra", effort: "max" }),
		)

		await waitFor(() => expect(resolveReasoningEffort).toHaveBeenCalledTimes(1))
		expect(result.current).toBeUndefined()
	})

	it("carries the thinking budget into the question", async () => {
		resolveReasoningEffort.mockImplementation(async (request: Request) => answer(request, "xhigh", true))

		renderHook(() =>
			useReasoningEffortOutcome({
				providerId: "sakana",
				modelId: "fugu-ultra",
				effort: "max",
				thinkingBudgetTokens: 4096,
			}),
		)

		await waitFor(() =>
			expect(resolveReasoningEffort).toHaveBeenCalledWith(
				expect.objectContaining({
					providerId: "sakana",
					modelId: "fugu-ultra",
					effort: "max",
					thinkingBudgetTokens: 4096,
				}),
			),
		)
	})
})
