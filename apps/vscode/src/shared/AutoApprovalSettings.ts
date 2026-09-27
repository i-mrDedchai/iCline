export interface AutoApprovalSettings {
	// Version for race condition prevention (incremented on every change)
	version: number
	// Legacy field - kept for backward compatibility with older extension versions
	// Auto-approve is now always enabled by default
	enabled: boolean
	// Legacy field - kept for backward compatibility with older extension versions
	// Favorites feature has been removed
	favorites: string[]
	// Legacy field - kept for backward compatibility with older extension versions
	// Max requests limit feature has been removed
	maxRequests: number
	// Individual action permissions
	actions: {
		readFiles: boolean // Read files and directories
		readFilesExternally?: boolean // Legacy field - kept for backward compatibility with older extension versions
		editFiles: boolean // Edit files
		editFilesExternally?: boolean // Legacy field - kept for backward compatibility with older extension versions
		executeSafeCommands?: boolean // Execute commands
		executeAllCommands?: boolean // Legacy field - kept for backward compatibility with older extension versions
		useBrowser: boolean // Use browser
		useMcp: boolean // Use MCP servers
		teamReads?: boolean // Auto-approve read-only calls from teammates/sub-agents and the read-only team tools
		teamWrites?: boolean // Auto-approve write-type calls from teammates/sub-agents (edits, commands) and the mutating team tools
	}
	// Global settings
	enableNotifications: boolean // Show notifications for approval and task completion
}

export const DEFAULT_AUTO_APPROVAL_SETTINGS: AutoApprovalSettings = {
	version: 1,
	enabled: true, // Legacy field - always true by default
	favorites: [], // Legacy field - kept as empty array
	maxRequests: 20, // Legacy field - kept for backward compatibility
	actions: {
		readFiles: true,
		readFilesExternally: true,
		editFiles: true,
		editFilesExternally: true,
		executeSafeCommands: false,
		executeAllCommands: true,
		useBrowser: true,
		useMcp: true,
		// Reads pass freely inside a team (as readFiles does for the session's own
		// agent); writes stay behind the switch so a team of agents cannot flood the
		// workspace with changes nobody agreed to.
		teamReads: true,
		teamWrites: false,
	},
	enableNotifications: false,
}
