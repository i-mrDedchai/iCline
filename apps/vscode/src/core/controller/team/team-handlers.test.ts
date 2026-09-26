import type { TeamRuntimeState } from "@cline/shared"
import { describe, expect, it, vi } from "vitest"
import type { Controller } from ".."
import { getTeamState } from "./getTeamState"
import { shutdownTeamMember } from "./shutdownTeamMember"
import { spawnTeamMember } from "./spawnTeamMember"

function fixtureState(): TeamRuntimeState {
	return {
		teamId: "t_1",
		teamName: "panel-team",
		members: [
			{ agentId: "sess-1", role: "lead", status: "idle" },
			{
				agentId: "bench",
				role: "teammate",
				description: "benchmark owner",
				status: "running",
				modelId: "gpt-5.6",
				providerId: "openai",
			},
		],
		tasks: [
			{
				id: "task-1",
				title: "t",
				description: "d",
				status: "pending",
				createdBy: "lead",
				createdAt: new Date(),
				updatedAt: new Date(),
				dependsOn: [],
			},
			{
				id: "task-2",
				title: "t",
				description: "d",
				status: "completed",
				createdBy: "lead",
				createdAt: new Date(),
				updatedAt: new Date(),
				dependsOn: [],
			},
		] as TeamRuntimeState["tasks"],
		mailbox: [
			{
				id: "m1",
				teamId: "t_1",
				fromAgentId: "lead",
				toAgentId: "bench",
				subject: "hello",
				body: "first",
				sentAt: new Date("2026-09-26T01:00:00Z"),
			},
			{
				id: "m2",
				teamId: "t_1",
				fromAgentId: "bench",
				toAgentId: "lead",
				subject: "reply",
				body: "second",
				sentAt: new Date("2026-09-26T02:00:00Z"),
				readAt: new Date("2026-09-26T02:30:00Z"),
			},
		],
		missionLog: [],
		runs: [
			{ id: "r1", agentId: "bench", status: "running" },
			{ id: "r2", agentId: "bench", status: "queued" },
			{ id: "r3", agentId: "bench", status: "completed" },
		] as TeamRuntimeState["runs"],
		outcomes: [],
		outcomeFragments: [],
	}
}

function stubController(
	teamState: TeamRuntimeState | undefined,
	hooks?: {
		spawn?: ReturnType<typeof vi.fn>
		shutdown?: ReturnType<typeof vi.fn>
	},
): Controller {
	return {
		getTeamState: vi.fn(async () => teamState),
		spawnTeamMember: hooks?.spawn ?? vi.fn(async () => {}),
		shutdownTeamMember: hooks?.shutdown ?? vi.fn(async () => {}),
	} as unknown as Controller
}

describe("getTeamState handler", () => {
	it("maps the runtime state onto the proto shape", async () => {
		const result = await getTeamState(stubController(fixtureState()), {})
		expect(result.active).toBe(true)
		expect(result.teamName).toBe("panel-team")
		expect(result.members.map((m) => m.agentId)).toEqual(["sess-1", "bench"])
		// Per-agent model override survives into the topology.
		expect(result.members[1].modelId).toBe("gpt-5.6")
		expect(result.members[1].providerId).toBe("openai")
		// Mailbox is newest-first for the viewer.
		expect(result.mailbox.map((m) => m.id)).toEqual(["m2", "m1"])
		expect(result.mailbox[0].read).toBe(true)
		expect(result.mailbox[1].read).toBe(false)
		expect(result.unreadMessages).toBe(1)
		expect(result.openTasks).toBe(1)
		expect(result.activeRuns).toBe(2)
	})

	it("reports inactive when the session has no team runtime", async () => {
		const result = await getTeamState(stubController(undefined), {})
		expect(result.active).toBe(false)
		expect(result.members).toEqual([])
	})
})

describe("spawnTeamMember handler", () => {
	it("passes the per-agent model through on the spec", async () => {
		const spawn = vi.fn(async () => {})
		await spawnTeamMember(stubController(fixtureState(), { spawn }), {
			agentId: "bench",
			rolePrompt: "benchmark owner",
			modelId: "gpt-5.6",
			providerId: "openai",
		})
		expect(spawn).toHaveBeenCalledWith({
			agentId: "bench",
			rolePrompt: "benchmark owner",
			modelId: "gpt-5.6",
			providerId: "openai",
		})
	})

	it("shapes a failure into ok:false with the error text", async () => {
		const spawn = vi.fn(async () => {
			throw new Error("boom")
		})
		const result = await spawnTeamMember(stubController(fixtureState(), { spawn }), {
			agentId: "bench",
			rolePrompt: "benchmark owner",
			modelId: "",
			providerId: "",
		})
		expect(result.ok).toBe(false)
		expect(result.error).toContain("boom")
	})
})

describe("shutdownTeamMember handler", () => {
	it("passes agentId and reason through", async () => {
		const shutdown = vi.fn(async () => {})
		await shutdownTeamMember(stubController(fixtureState(), { shutdown }), {
			agentId: "bench",
			reason: "panel",
		})
		expect(shutdown).toHaveBeenCalledWith("bench", "panel")
	})

	it("shapes a failure into ok:false with the error text", async () => {
		const shutdown = vi.fn(async () => {
			throw new Error("not found")
		})
		const result = await shutdownTeamMember(stubController(fixtureState(), { shutdown }), {
			agentId: "ghost",
			reason: "",
		})
		expect(result.ok).toBe(false)
		expect(result.error).toContain("not found")
	})
})
