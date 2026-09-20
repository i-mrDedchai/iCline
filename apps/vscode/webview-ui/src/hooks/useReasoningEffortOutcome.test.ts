import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ModelsServiceClient } from "@/services/grpc-client"
import { clearReasoningEffortOutcomeCache, useReasoningEffortOutcome } from "./useReasoningEffortOutcome"

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

	it("asks nothing for `none` or an empty level — the app forwards no effort there", () => {
		renderHook(() => useReasoningEffortOutcome({ providerId: "sakana", modelId: "fugu-ultra", effort: "none" }))
		renderHook(() => useReasoningEffortOutcome({ providerId: "sakana", modelId: "fugu-ultra", effort: "" }))
		renderHook(() => useReasoningEffortOutcome({ providerId: "sakana", modelId: "", effort: "max" }))

		expect(resolveReasoningEffort).not.toHaveBeenCalled()
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
