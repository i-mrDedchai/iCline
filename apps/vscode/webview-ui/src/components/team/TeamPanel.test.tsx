import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { TeamServiceClient } from "@/services/grpc-client"
import { TeamPanel } from "./TeamPanel"

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: vi.fn(),
}))

vi.mock("@/services/grpc-client", () => ({
	TeamServiceClient: {
		getTeamState: vi.fn(),
		spawnTeamMember: vi.fn(),
		shutdownTeamMember: vi.fn(),
	},
}))

// fix.49b: `useTranslation` reads the locale from `ExtensionStateContext`, which
// this spec never provides. Mock the hook so the component renders the English
// source (the same values the assertions below were written against) — the
// locale tables themselves are pinned by `src/i18n/i18n.test.ts`.
vi.mock("@/i18n/useTranslation", () => ({
	useTranslation: () => (key: string) => key,
}))
vi.mock("@/i18n/strings", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/i18n/strings")>()
	return {
		...actual,
		formatString: (_tr: (key: string) => string, key: string, values: Record<string, string | number>) =>
			actual.formatString(((k: string) => k) as never, key as never, values),
		splitOnPlaceholder: actual.splitOnPlaceholder,
	}
})

const activeTeamState = {
	active: true,
	teamId: "team-1",
	teamName: "demo-team",
	members: [
		{
			agentId: "lead",
			role: "lead",
			description: "coordinates the work",
			status: "idle",
			modelId: "",
			providerId: "",
		},
		{
			agentId: "alice",
			role: "teammate",
			description: "writes the tests",
			status: "running",
			modelId: "anthropic/claude-sonnet-4.6",
			providerId: "openrouter",
		},
	],
	mailbox: [
		{
			id: "m2",
			fromAgentId: "alice",
			toAgentId: "lead",
			subject: "done",
			body: "tests are green",
			sentAt: "2026-09-26T03:00:00Z",
			read: false,
		},
		{
			id: "m1",
			fromAgentId: "lead",
			toAgentId: "alice",
			subject: "please write tests",
			body: "cover the parser",
			sentAt: "2026-09-26T02:00:00Z",
			read: true,
		},
	],
	unreadMessages: 1,
	openTasks: 2,
	activeRuns: 1,
}

const inactiveTeamState = {
	...activeTeamState,
	active: false,
	members: [],
	mailbox: [],
	unreadMessages: 0,
	openTasks: 0,
	activeRuns: 0,
}

const openRouterModels = {
	"anthropic/claude-sonnet-4.6": { name: "Claude Sonnet 4.6", supportsPromptCache: true },
	"org/free-model": { name: "Free Model", supportsPromptCache: true },
}

describe("TeamPanel", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(useExtensionState).mockReturnValue({ openRouterModels } as any)
		vi.mocked(TeamServiceClient.getTeamState).mockResolvedValue(activeTeamState as any)
		vi.mocked(TeamServiceClient.spawnTeamMember).mockResolvedValue({ ok: true, error: "" } as any)
		vi.mocked(TeamServiceClient.shutdownTeamMember).mockResolvedValue({ ok: true, error: "" } as any)
	})

	it("shows the inactive empty state when the session has no team runtime", async () => {
		vi.mocked(TeamServiceClient.getTeamState).mockResolvedValue(inactiveTeamState as any)

		render(<TeamPanel onDone={() => {}} />)

		expect(await screen.findByText("teamInactive")).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "teamSpawn" })).not.toBeInTheDocument()
	})

	it("renders the topology, member models, and the mailbox", async () => {
		render(<TeamPanel onDone={() => {}} />)

		// Topology: lead plus teammate, with role/status and the per-agent model
		expect(await screen.findByText("lead")).toBeInTheDocument()
		expect(screen.getByText("alice")).toBeInTheDocument()
		expect(screen.getByText("running")).toBeInTheDocument()
		expect(screen.getByText("Claude Sonnet 4.6")).toBeInTheDocument()

		// Mailbox: both messages visible, newest first, with the unread count
		expect(screen.getByText("done")).toBeInTheDocument()
		expect(screen.getByText("tests are green")).toBeInTheDocument()
		expect(screen.getByText("please write tests")).toBeInTheDocument()
		expect(screen.getByText(/1 unread/i)).toBeInTheDocument()
	})

	it("spawns a teammate with the selected model", async () => {
		render(<TeamPanel onDone={() => {}} />)
		await screen.findByText("alice")

		fireEvent.change(screen.getByLabelText("teamAgentIdLabel"), { target: { value: "bob" } })
		fireEvent.change(screen.getByLabelText("teamRoleLabel"), { target: { value: "fix the flaky tests" } })
		fireEvent.change(screen.getByLabelText("teamModelFieldLabel"), { target: { value: "anthropic/claude-sonnet-4.6" } })
		fireEvent.click(screen.getByRole("button", { name: "teamSpawn" }))

		await waitFor(() =>
			expect(TeamServiceClient.spawnTeamMember).toHaveBeenCalledWith({
				agentId: "bob",
				rolePrompt: "fix the flaky tests",
				modelId: "anthropic/claude-sonnet-4.6",
				providerId: "openrouter",
			}),
		)
	})

	it("spawns with the inherited connection when no model is selected", async () => {
		render(<TeamPanel onDone={() => {}} />)
		await screen.findByText("alice")

		fireEvent.change(screen.getByLabelText("teamAgentIdLabel"), { target: { value: "bob" } })
		fireEvent.change(screen.getByLabelText("teamRoleLabel"), { target: { value: "help out" } })
		fireEvent.click(screen.getByRole("button", { name: "teamSpawn" }))

		await waitFor(() =>
			expect(TeamServiceClient.spawnTeamMember).toHaveBeenCalledWith({
				agentId: "bob",
				rolePrompt: "help out",
				modelId: "",
				providerId: "",
			}),
		)
	})

	it("shows spawn failures inline", async () => {
		vi.mocked(TeamServiceClient.spawnTeamMember).mockResolvedValue({ ok: false, error: "team is full" } as any)

		render(<TeamPanel onDone={() => {}} />)
		await screen.findByText("alice")

		fireEvent.change(screen.getByLabelText("teamAgentIdLabel"), { target: { value: "bob" } })
		fireEvent.change(screen.getByLabelText("teamRoleLabel"), { target: { value: "help out" } })
		fireEvent.click(screen.getByRole("button", { name: "teamSpawn" }))

		expect(await screen.findByText("team is full")).toBeInTheDocument()
	})

	it("shuts down a teammate by agent id", async () => {
		render(<TeamPanel onDone={() => {}} />)
		await screen.findByText("alice")

		fireEvent.click(screen.getByRole("button", { name: /shutdown alice/i }))

		await waitFor(() =>
			expect(TeamServiceClient.shutdownTeamMember).toHaveBeenCalledWith({
				agentId: "alice",
				reason: expect.any(String),
			}),
		)
	})
})
