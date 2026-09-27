import { type AutoApprovalSettings, DEFAULT_AUTO_APPROVAL_SETTINGS } from "@shared/AutoApprovalSettings"
import { describe, expect, it, vi } from "vitest"
import type { McpHub } from "@/services/mcp/McpHub"
import { buildToolPolicies, isToolAutoApproved } from "./sdk-tool-policies"

describe("isToolAutoApproved — YOLO mode", () => {
	it("auto-approves every governed tool while YOLO mode is on", () => {
		// YOLO is documented as "no approval required", and core's own yolo policy
		// preset (`createToolPoliciesWithPreset`) sets autoApprove for every tool.
		expect(isToolAutoApproved("run_commands", DEFAULT_AUTO_APPROVAL_SETTINGS, undefined, true)).toBe(true)
		expect(isToolAutoApproved("editor", DEFAULT_AUTO_APPROVAL_SETTINGS, undefined, true)).toBe(true)
		expect(isToolAutoApproved("read_files", DEFAULT_AUTO_APPROVAL_SETTINGS, undefined, true)).toBe(true)
		expect(isToolAutoApproved("some_server__some_tool", DEFAULT_AUTO_APPROVAL_SETTINGS, undefined, true)).toBe(true)
	})

	it("still refuses unapproved tools when YOLO mode is off", () => {
		expect(isToolAutoApproved("run_commands", DEFAULT_AUTO_APPROVAL_SETTINGS, undefined, false)).toBe(false)
	})

	it("forces auto-approve into the SDK policy map while YOLO mode is on", () => {
		const mcpHub = {
			getServers: () => [{ name: "srv", tools: [{ name: "tool" }] }],
		} as unknown as McpHub

		const policies = buildToolPolicies(DEFAULT_AUTO_APPROVAL_SETTINGS, mcpHub, true)

		expect(policies.run_commands).toEqual({ autoApprove: true })
		expect(policies.editor).toEqual({ autoApprove: true })
		expect(policies.srv__tool).toEqual({ autoApprove: true })
	})

	it("defers every governed tool to the live guard when YOLO mode is off", () => {
		const mcpHub = {
			getServers: () => [{ name: "srv", tools: [{ name: "tool" }] }],
		} as unknown as McpHub

		const policies = buildToolPolicies(DEFAULT_AUTO_APPROVAL_SETTINGS, mcpHub, false)

		expect(policies.run_commands).toEqual({ autoApprove: false })
		expect(policies.srv__tool).toEqual({ autoApprove: false })
	})
})

// The switches the AutoApproveBar/menu actually exposes (ACTION_METADATA) and the
// tools each one governs. Keep this table in step with the menu: a tool listed
// under a switch but not approved by it is exactly the "I ticked it and it still
// asked" bug.
const MENU_SWITCHES = {
	readFiles: ["read_files", "read_file", "list_files", "list_code_definition_names", "search_codebase", "search_files"],
	editFiles: ["editor", "replace_in_file", "write_to_file", "apply_patch", "delete_file"],
	executeSafeCommands: ["run_commands", "execute_command"],
	useBrowser: ["fetch_web_content", "web_fetch", "web_search"],
} as const

type MenuSwitch = keyof typeof MENU_SWITCHES

function settingsWithOnly(enabled: MenuSwitch): AutoApprovalSettings {
	return {
		...DEFAULT_AUTO_APPROVAL_SETTINGS,
		actions: {
			readFiles: false,
			editFiles: false,
			executeSafeCommands: false,
			useBrowser: false,
			useMcp: false,
			...(enabled ? { [enabled]: true } : {}),
		},
	}
}

describe("auto-approve matrix — every menu switch maps to the tools it governs", () => {
	for (const [menuSwitch, governedTools] of Object.entries(MENU_SWITCHES) as Array<[MenuSwitch, readonly string[]]>) {
		it(`approves only the ${menuSwitch} tools when that switch alone is on`, () => {
			const settings = settingsWithOnly(menuSwitch)
			const otherTools = Object.entries(MENU_SWITCHES)
				.filter(([name]) => name !== menuSwitch)
				.flatMap(([, tools]) => tools)

			for (const tool of governedTools) {
				expect([tool, isToolAutoApproved(tool, settings)]).toEqual([tool, true])
			}
			for (const tool of otherTools) {
				expect([tool, isToolAutoApproved(tool, settings)]).toEqual([tool, false])
			}
		})
	}

	it("approves every menu-governed tool once YOLO mode is on", () => {
		const settings = settingsWithOnly("readFiles")
		for (const tools of Object.values(MENU_SWITCHES)) {
			for (const tool of tools) {
				expect([tool, isToolAutoApproved(tool, settings, undefined, true)]).toEqual([tool, true])
			}
		}
	})

	it("leaves a tool the menu does not govern to the SDK's own default", () => {
		// ask_question has no switch, so the settings must not claim to decide it:
		// the SDK decides, and the guard answers no. spawn_agent has a switch now
		// (team writes) and this settings object leaves it off, so it also answers no.
		const everythingOn = settingsWithOnly("readFiles")
		expect(isToolAutoApproved("ask_question", everythingOn)).toBe(false)
		expect(isToolAutoApproved("spawn_agent", everythingOn)).toBe(false)
	})
})

// Multi-agent work is where approval fatigue and runaway writes both live: a
// team of agents multiplies every prompt and every write. The team switches
// split that surface by mutability — reads pass freely, writes stay behind the
// switch — and they govern delegated agents' plain tools too, not just the
// team_* management tools.
describe("granular team auto-approve — reads vs writes", () => {
	function teamSettings(overrides: Partial<AutoApprovalSettings["actions"]>): AutoApprovalSettings {
		return {
			...DEFAULT_AUTO_APPROVAL_SETTINGS,
			actions: {
				...DEFAULT_AUTO_APPROVAL_SETTINGS.actions,
				readFiles: false,
				editFiles: false,
				executeSafeCommands: false,
				useBrowser: false,
				useMcp: false,
				...overrides,
			},
		}
	}

	it("lets a teammate's reads through with team reads on but keeps its writes asking", () => {
		const settings = teamSettings({ teamReads: true, teamWrites: false })

		expect(isToolAutoApproved("read_files", settings, undefined, false, "teammate")).toBe(true)
		expect(isToolAutoApproved("search_codebase", settings, undefined, false, "teammate")).toBe(true)
		expect(isToolAutoApproved("editor", settings, undefined, false, "teammate")).toBe(false)
		expect(isToolAutoApproved("run_commands", settings, undefined, false, "teammate")).toBe(false)
	})

	it("approves delegated writes only when team writes is on", () => {
		const settings = teamSettings({ teamReads: true, teamWrites: true })

		expect(isToolAutoApproved("editor", settings, undefined, false, "teammate")).toBe(true)
		expect(isToolAutoApproved("run_commands", settings, undefined, false, "subagent")).toBe(true)
		expect(isToolAutoApproved("editor", settings, undefined, false, "subagent")).toBe(true)
	})

	it("treats a delegated web fetch as a read", () => {
		const readsOn = teamSettings({ teamReads: true, teamWrites: false })
		const readsOff = teamSettings({ teamReads: false, teamWrites: true })

		expect(isToolAutoApproved("fetch_web_content", readsOn, undefined, false, "teammate")).toBe(true)
		expect(isToolAutoApproved("web_search", readsOn, undefined, false, "subagent")).toBe(true)
		expect(isToolAutoApproved("fetch_web_content", readsOff, undefined, false, "teammate")).toBe(false)
	})

	it("splits the lead's team tools into reads and writes", () => {
		const readsOnly = teamSettings({ teamReads: true, teamWrites: false })
		const writesOnly = teamSettings({ teamReads: false, teamWrites: true })

		expect(isToolAutoApproved("team_status", readsOnly, undefined, false)).toBe(true)
		expect(isToolAutoApproved("team_read_mailbox", readsOnly, undefined, false)).toBe(true)
		expect(isToolAutoApproved("team_list_runs", readsOnly, undefined, false)).toBe(true)
		expect(isToolAutoApproved("team_send_message", readsOnly, undefined, false)).toBe(false)
		expect(isToolAutoApproved("spawn_agent", readsOnly, undefined, false)).toBe(false)

		expect(isToolAutoApproved("team_send_message", writesOnly, undefined, false)).toBe(true)
		expect(isToolAutoApproved("team_spawn_teammate", writesOnly, undefined, false)).toBe(true)
		expect(isToolAutoApproved("spawn_agent", writesOnly, undefined, false)).toBe(true)
		expect(isToolAutoApproved("team_status", writesOnly, undefined, false)).toBe(false)
	})

	it("keeps the session's own tools on their per-action switches", () => {
		const settings = teamSettings({ teamReads: true, teamWrites: false, editFiles: true })

		// No callerKind means the session's own agent: the team switches must not
		// widen what the read/edit switches govern.
		expect(isToolAutoApproved("editor", settings, undefined, false)).toBe(true)
		expect(isToolAutoApproved("read_files", settings, undefined, false)).toBe(false)
		expect(isToolAutoApproved("run_commands", settings, undefined, false, "session")).toBe(false)
	})

	it("lets YOLO override the team switches like every other switch", () => {
		const settings = teamSettings({ teamReads: false, teamWrites: false })

		expect(isToolAutoApproved("editor", settings, undefined, true, "teammate")).toBe(true)
		expect(isToolAutoApproved("team_send_message", settings, undefined, true)).toBe(true)
	})
})

// spawn_agent runs a whole sub-agent and the team_* tools manage teammates,
// tasks, mailboxes and outcomes. The SDK auto-approves tools the policy map
// does not list, so leaving them out would let a spawn or a teammate message
// happen without a single prompt the moment the feature settings enable them.
// The policy map defers every one of them to the live guard, which decides via
// the team reads/writes switches (or YOLO).
describe("sub-agent and team tools are governed, never silently auto-approved", () => {
	const SUB_AGENT_AND_TEAM_TOOLS = [
		"spawn_agent",
		"team_spawn_teammate",
		"team_shutdown_teammate",
		"team_run_task",
		"team_send_message",
		"team_read_mailbox",
		"team_create_outcome",
	]

	it("forces the SDK to ask for every sub-agent and team tool", () => {
		const policies = buildToolPolicies(DEFAULT_AUTO_APPROVAL_SETTINGS, undefined, false)
		for (const tool of SUB_AGENT_AND_TEAM_TOOLS) {
			expect([tool, policies[tool]]).toEqual([tool, { autoApprove: false }])
		}
	})

	it("auto-approves sub-agent and team tools only under YOLO", () => {
		const policies = buildToolPolicies(DEFAULT_AUTO_APPROVAL_SETTINGS, undefined, true)
		for (const tool of SUB_AGENT_AND_TEAM_TOOLS) {
			expect([tool, policies[tool]]).toEqual([tool, { autoApprove: true }])
		}
	})
})

describe("isToolAutoApproved", () => {
	it("leaves the MCP decision to the per-tool toggle", () => {
		const mcpHub = {
			getServers: () => [{ name: "srv", tools: [{ name: "tool", autoApprove: false }] }],
		} as unknown as McpHub
		const getServers = vi.fn(mcpHub.getServers)

		expect(
			isToolAutoApproved(
				"srv__tool",
				{
					...DEFAULT_AUTO_APPROVAL_SETTINGS,
					actions: { ...DEFAULT_AUTO_APPROVAL_SETTINGS.actions, useMcp: true },
				},
				{ getServers } as unknown as McpHub,
			),
		).toBe(false)
	})

	it("does not auto-approve command tools by default", () => {
		expect(isToolAutoApproved("run_commands", DEFAULT_AUTO_APPROVAL_SETTINGS)).toBe(false)
	})

	it("uses executeSafeCommands as the single command approval flag", () => {
		const settings = {
			...DEFAULT_AUTO_APPROVAL_SETTINGS,
			actions: {
				...DEFAULT_AUTO_APPROVAL_SETTINGS.actions,
				executeSafeCommands: false,
				executeAllCommands: true,
			},
		}

		expect(isToolAutoApproved("run_commands", settings)).toBe(false)
	})
})
