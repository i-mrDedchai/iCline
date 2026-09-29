import { McpDisplayMode } from "@shared/McpDisplayMode"
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import React from "react"
import { useTranslation } from "@/i18n/useTranslation"

interface McpDisplayModeDropdownProps {
	value: McpDisplayMode
	onChange: (mode: McpDisplayMode) => void
	id?: string
	className?: string
	style?: React.CSSProperties
	onClick?: (e: React.MouseEvent) => void
}

const McpDisplayModeDropdown: React.FC<McpDisplayModeDropdownProps> = ({ value, onChange, id, className, style, onClick }) => {
	const tr = useTranslation("customize")
	const handleChange = (e: any) => {
		const newMode = e.target.value as McpDisplayMode
		onChange(newMode)
	}

	return (
		<VSCodeDropdown className={className} id={id} onChange={handleChange} onClick={onClick} style={style} value={value}>
			<VSCodeOption value="plain">{tr("mcpDisplayPlain")}</VSCodeOption>
			<VSCodeOption value="rich">{tr("mcpDisplayRich")}</VSCodeOption>
			<VSCodeOption value="markdown">{tr("mcpDisplayMarkdown")}</VSCodeOption>
		</VSCodeDropdown>
	)
}

export default McpDisplayModeDropdown
