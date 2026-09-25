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
		// ask_question and spawn_agent have no switch, so the settings must not
		// claim to decide them: the SDK decides, and the guard answers no.
		const everythingOn = settingsWithOnly("readFiles")
		expect(isToolAutoApproved("ask_question", everythingOn)).toBe(false)
		expect(isToolAutoApproved("spawn_agent", everythingOn)).toBe(false)
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
