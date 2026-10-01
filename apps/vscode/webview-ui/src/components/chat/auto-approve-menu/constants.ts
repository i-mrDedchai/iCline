import type { QuickStartStringKey } from "@/i18n/namespaces/quickStart"
import { ActionMetadata } from "./types"

/**
 * fix.48: the checkbox rows + the collapsed bar name actions by *id*, and the
 * components resolve the visible words from the `quickStart` namespace
 * (`autoApproveAction_<id>` / `autoApproveShort_<id>`). The English source
 * stays here as the fallback so a missing table entry renders English, never a
 * raw key — and the ids (not the words) are what the host persists.
 */
export const ACTION_METADATA: ActionMetadata[] = [
	{
		id: "readFiles",
		label: "Read files",
		labelKey: "autoApproveAction_readFiles",
		shortName: "Read",
		shortKey: "autoApproveShort_readFiles",
		icon: "codicon-search",
	},
	{
		id: "editFiles",
		label: "Edit files",
		labelKey: "autoApproveAction_editFiles",
		shortName: "Edit",
		shortKey: "autoApproveShort_editFiles",
		icon: "codicon-edit",
	},
	{
		id: "executeSafeCommands",
		label: "Execute commands",
		labelKey: "autoApproveAction_executeSafeCommands",
		shortName: "Commands",
		shortKey: "autoApproveShort_executeSafeCommands",
		icon: "codicon-terminal",
	},
	{
		id: "useBrowser",
		label: "Fetch web content",
		labelKey: "autoApproveAction_useBrowser",
		shortName: "Web Fetch",
		shortKey: "autoApproveShort_useBrowser",
		icon: "codicon-globe",
	},
	{
		id: "useMcp",
		label: "Use MCP servers",
		labelKey: "autoApproveAction_useMcp",
		shortName: "MCP",
		shortKey: "autoApproveShort_useMcp",
		icon: "codicon-server",
	},
	{
		id: "teamReads",
		label: "Team reads",
		labelKey: "autoApproveAction_teamReads",
		shortName: "Team Reads",
		shortKey: "autoApproveShort_teamReads",
		icon: "codicon-eye",
	},
	{
		id: "teamWrites",
		label: "Team writes",
		labelKey: "autoApproveAction_teamWrites",
		shortName: "Team Writes",
		shortKey: "autoApproveShort_teamWrites",
		icon: "codicon-organization",
	},
	{
		id: "enableNotifications",
		label: "Show notifications",
		labelKey: "autoApproveAction_enableNotifications",
		shortName: "Notifications",
		shortKey: "autoApproveShort_enableNotifications",
		icon: "codicon-bell",
	},
]

/**
 * Every action id must have a label + short key in the `quickStart` namespace.
 * The three `*Externally` / `executeAllCommands` ids are legacy host fields with
 * no checkbox row — they reuse the sibling they were split from, so a stale stored
 * setting still names something readable.
 */
export const AUTO_APPROVE_LABEL_KEYS: Record<ActionMetadata["id"], QuickStartStringKey> = {
	readFiles: "autoApproveAction_readFiles",
	readFilesExternally: "autoApproveAction_readFiles",
	editFiles: "autoApproveAction_editFiles",
	editFilesExternally: "autoApproveAction_editFiles",
	executeSafeCommands: "autoApproveAction_executeSafeCommands",
	executeAllCommands: "autoApproveAction_executeSafeCommands",
	useBrowser: "autoApproveAction_useBrowser",
	useMcp: "autoApproveAction_useMcp",
	teamReads: "autoApproveAction_teamReads",
	teamWrites: "autoApproveAction_teamWrites",
	enableNotifications: "autoApproveAction_enableNotifications",
}

export const AUTO_APPROVE_SHORT_KEYS: Record<ActionMetadata["id"], QuickStartStringKey> = {
	readFiles: "autoApproveShort_readFiles",
	readFilesExternally: "autoApproveShort_readFiles",
	editFiles: "autoApproveShort_editFiles",
	editFilesExternally: "autoApproveShort_editFiles",
	executeSafeCommands: "autoApproveShort_executeSafeCommands",
	executeAllCommands: "autoApproveShort_executeSafeCommands",
	useBrowser: "autoApproveShort_useBrowser",
	useMcp: "autoApproveShort_useMcp",
	teamReads: "autoApproveShort_teamReads",
	teamWrites: "autoApproveShort_teamWrites",
	enableNotifications: "autoApproveShort_enableNotifications",
}
