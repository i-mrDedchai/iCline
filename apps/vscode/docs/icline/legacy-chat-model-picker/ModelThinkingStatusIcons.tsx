import { Brain, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ModelThinkingStatus } from "./chatModelPickerUtils"

export function ModelThinkingStatusIcons({ status }: { status: ModelThinkingStatus }) {
	if (status.builtin) {
		return (
			<span className="inline-flex items-center gap-0.5 shrink-0 text-(--vscode-terminal-ansiCyan)" title={status.tooltip}>
				<Sparkles size={11} strokeWidth={2.25} />
			</span>
		)
	}

	if (!status.configurable) {
		return null
	}

	return (
		<span
			className={cn(
				"inline-flex items-center gap-0.5 shrink-0",
				status.enabled ? "text-(--vscode-terminal-ansiBlue)" : "text-(--vscode-descriptionForeground) opacity-50",
			)}
			title={status.tooltip}>
			<Brain size={11} strokeWidth={2.25} />
			{status.effortShort && status.effortShort !== "—" ? (
				<span className="text-[9px] font-semibold leading-none min-w-[10px] text-center">{status.effortShort}</span>
			) : null}
		</span>
	)
}