import type { AutoApprovalSettings } from "@shared/AutoApprovalSettings"
import type { McpHub } from "@/services/mcp/McpHub"

/**
 * Build SDK `toolPolicies` for tools governed by Cline's auto-approval UI.
 *
 * The SDK defaults unlisted tools to auto-approved. For tools controlled by
 * AutoApproveBar/MCP per-tool settings, force the SDK to call
 * `requestToolApproval`; the approval callback then evaluates the latest
 * settings and either silently approves or shows the approval UI. This keeps
 * active sessions in sync when the user toggles auto-approval mid-task.
 */
/**
 * Sub-agent and team tools: `spawn_agent` runs a whole sub-agent and the
 * `team_*` tools manage teammates, tasks, mailboxes and outcomes. The SDK
 * auto-approves tools this map does not list, so they must be listed the moment
 * the feature settings can enable them — otherwise a spawn or a teammate
 * message would happen without a single prompt. They carry no auto-approve
 * switch on purpose: without YOLO the live guard (`isToolAutoApproved`) answers
 * no for them, so every call asks. Mirrors `TEAM_TOOL_NAMES` in
 * @cline/core `extensions/tools/team/team-tools.ts`, kept literal because this
 * layer cannot import core as a value in tests.
 */
const SUB_AGENT_AND_TEAM_TOOLS = [
	"spawn_agent",
	"team_spawn_teammate",
	"team_shutdown_teammate",
	"team_status",
	"team_task",
	"team_run_task",
	"team_cancel_run",
	"team_list_runs",
	"team_await_runs",
	"team_send_message",
	"team_broadcast",
	"team_read_mailbox",
	"team_mission_log",
	"team_cleanup",
	"team_create_outcome",
	"team_attach_outcome_fragment",
	"team_review_outcome_fragment",
	"team_finalize_outcome",
	"team_list_outcomes",
]

export function buildToolPolicies(
	_settings: AutoApprovalSettings,
	mcpHub?: McpHub,
	/** YOLO mode: "no approval required", so approve up front. */
	yoloMode = false,
): Record<string, { enabled?: boolean; autoApprove?: boolean }> {
	const policies: Record<string, { enabled?: boolean; autoApprove?: boolean }> = {}

	// YOLO mode means every governed tool is approved without asking. Core has the
	// same contract in its own yolo policy preset (`createToolPoliciesWithPreset`),
	// which the VSCode adapter does not go through — without this the policies keep
	// forcing `autoApprove: false` and the live guard has nothing to fall back on,
	// so commands keep prompting with YOLO switched on.
	const policy = yoloMode ? { autoApprove: true } : { autoApprove: false }

	const set = (tools: string[]) => {
		for (const tool of tools) {
			policies[tool] = policy
		}
	}

	set(["read_files", "read_file", "list_files", "list_code_definition_names", "search_codebase", "search_files"])
	set(["editor", "replace_in_file", "write_to_file", "apply_patch", "delete_file"])
	set(["run_commands", "execute_command"])
	set(["fetch_web_content", "web_fetch", "web_search"])
	set(SUB_AGENT_AND_TEAM_TOOLS)

	if (mcpHub) {
		for (const server of mcpHub.getServers()) {
			for (const tool of server.tools ?? []) {
				const sdkName = `${server.name}__${tool.name}`
				policies[sdkName] = policy
			}
		}
	}

	return policies
}

/**
 * Evaluate the current UI auto-approval settings for a single SDK tool name.
 * Used both when building initial SDK policies and as a live guard in the
 * approval callback, so changes from the AutoApproveBar are respected even if
 * an SDK session was created before the toggle changed.
 */
export function isToolAutoApproved(
	toolName: string,
	settings: AutoApprovalSettings,
	mcpHub?: McpHub,
	/** YOLO mode bypasses every per-action toggle. */
	yoloMode = false,
): boolean {
	if (yoloMode) {
		return true
	}
	if (isReadTool(toolName)) {
		return !!settings.actions.readFiles
	}
	if (isEditTool(toolName)) {
		return !!settings.actions.editFiles
	}
	if (isCommandTool(toolName)) {
		return !!settings.actions.executeSafeCommands
	}
	if (isBrowserTool(toolName)) {
		return !!settings.actions.useBrowser
	}

	const mcpTool = parseMcpToolName(toolName)
	if (mcpTool) {
		if (!settings.actions.useMcp || !mcpHub) {
			return false
		}
		const server = mcpHub.getServers().find((entry) => entry.name === mcpTool.serverName)
		const tool = server?.tools?.find((entry) => entry.name === mcpTool.toolName)
		return !!tool?.autoApprove
	}

	return false
}

function isReadTool(toolName: string): boolean {
	return ["read_files", "read_file", "list_files", "list_code_definition_names", "search_codebase", "search_files"].includes(
		toolName,
	)
}

export function isEditTool(toolName: string): boolean {
	return ["editor", "replace_in_file", "write_to_file", "apply_patch", "delete_file"].includes(toolName)
}

function isCommandTool(toolName: string): boolean {
	return toolName === "run_commands" || toolName === "execute_command"
}

function isBrowserTool(toolName: string): boolean {
	return toolName === "fetch_web_content" || toolName === "web_fetch" || toolName === "web_search"
}

function parseMcpToolName(toolName: string): { serverName: string; toolName: string } | undefined {
	const separatorIndex = toolName.indexOf("__")
	if (separatorIndex <= 0) return undefined
	const serverName = toolName.substring(0, separatorIndex)
	const mcpToolName = toolName.substring(separatorIndex + 2)
	if (!mcpToolName) return undefined
	return { serverName, toolName: mcpToolName }
}
