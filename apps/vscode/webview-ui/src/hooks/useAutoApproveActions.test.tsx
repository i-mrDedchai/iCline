import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ACTION_METADATA } from "@/components/chat/auto-approve-menu/constants"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { StateServiceClient } from "@/services/grpc-client"
import { useAutoApproveActions } from "./useAutoApproveActions"

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: vi.fn(),
}))

vi.mock("@/services/grpc-client", () => ({
	StateServiceClient: {
		updateAutoApprovalSettings: vi.fn(async () => {}),
	},
}))

function makeSettings(actions: Record<string, boolean>) {
	return {
		version: 3,
		enabled: true,
		favorites: [],
		maxRequests: 20,
		actions: {
			readFiles: true,
			editFiles: true,
			executeSafeCommands: false,
			useBrowser: true,
			useMcp: true,
			teamReads: true,
			teamWrites: false,
			...actions,
		},
		enableNotifications: false,
	}
}

describe("team auto-approve switches", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("lists Team reads and Team writes in the auto-approve menu", () => {
		const teamReads = ACTION_METADATA.find((action) => action.id === "teamReads")
		const teamWrites = ACTION_METADATA.find((action) => action.id === "teamWrites")

		expect(teamReads?.label).toBe("Team reads")
		expect(teamWrites?.label).toBe("Team writes")
	})

	it("reads the team switches from the settings", () => {
		vi.mocked(useExtensionState).mockReturnValue({
			autoApprovalSettings: makeSettings({ teamReads: true, teamWrites: false }),
		} as any)

		const { result } = renderHook(() => useAutoApproveActions())
		const teamReads = ACTION_METADATA.find((action) => action.id === "teamReads")!
		const teamWrites = ACTION_METADATA.find((action) => action.id === "teamWrites")!

		expect(result.current.isChecked(teamReads)).toBe(true)
		expect(result.current.isChecked(teamWrites)).toBe(false)
	})

	it("persists the team budget with a bumped version", async () => {
		vi.mocked(useExtensionState).mockReturnValue({
			autoApprovalSettings: makeSettings({}),
		} as any)

		const { result } = renderHook(() => useAutoApproveActions())

		await result.current.updateTeamBudget({ maxAgents: 2, maxTokensPerTurn: 50000 })

		expect(StateServiceClient.updateAutoApprovalSettings).toHaveBeenCalledWith(
			expect.objectContaining({
				version: 4,
				teamBudget: { maxAgents: 2, maxTokensPerTurn: 50000 },
			}),
		)
	})

	it("persists a team switch toggle with a bumped version", async () => {
		vi.mocked(useExtensionState).mockReturnValue({
			autoApprovalSettings: makeSettings({ teamReads: true, teamWrites: false }),
		} as any)

		const { result } = renderHook(() => useAutoApproveActions())
		const teamWrites = ACTION_METADATA.find((action) => action.id === "teamWrites")!

		await result.current.updateAction(teamWrites, true)

		expect(StateServiceClient.updateAutoApprovalSettings).toHaveBeenCalledWith(
			expect.objectContaining({
				version: 4,
				actions: expect.objectContaining({ teamWrites: true, teamReads: true }),
			}),
		)
	})
})
