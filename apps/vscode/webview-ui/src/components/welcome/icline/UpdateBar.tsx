import type { IclineUpdateBarStatus } from "@shared/ExtensionMessage"
import { EmptyRequest } from "@shared/proto/cline/common"
import { XIcon } from "lucide-react"
import React, { useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { StateServiceClient, UiServiceClient } from "@/services/grpc-client"

interface UpdateBarProps {
	status: IclineUpdateBarStatus
}

const UpdateBarRow: React.FC<{
	message: string
	primaryLabel: string
	url: string
	onDismiss: () => void
}> = ({ message, primaryLabel, url, onDismiss }) => {
	const handlePrimary = useCallback(() => {
		UiServiceClient.openUrl({ value: url }).catch(console.error)
	}, [url])

	return (
		<div className="mx-5 mb-2 rounded-md border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-inactiveSelectionBackground)] px-3 py-2.5">
			<div className="flex items-start gap-2">
				<p className="flex-1 m-0 text-sm text-[var(--vscode-foreground)] leading-snug">{message}</p>
				<button
					aria-label="Dismiss update notice"
					className="shrink-0 p-0.5 rounded hover:bg-[var(--vscode-toolbar-hoverBackground)] text-[var(--vscode-descriptionForeground)] cursor-pointer border-none bg-transparent"
					onClick={onDismiss}
					type="button">
					<XIcon className="size-3.5" />
				</button>
			</div>
			<div className="flex flex-wrap gap-2 mt-2">
				<Button onClick={handlePrimary} size="sm">
					{primaryLabel}
				</Button>
				<Button onClick={onDismiss} size="sm" variant="secondary">
					Dismiss
				</Button>
			</div>
		</div>
	)
}

export const UpdateBar: React.FC<UpdateBarProps> = ({ status }) => {
	useEffect(() => {
		StateServiceClient.refreshIclineUpdates(EmptyRequest.create()).catch(console.error)
	}, [])

	if (!status.updatesEnabled) {
		return null
	}

	const rows: React.ReactNode[] = []

	if (status.icline?.showBar) {
		rows.push(
			<UpdateBarRow
				key="icline"
				message={`iCline ${status.icline.tagName} is available (installed: ${status.currentVersion}). Download the .vsix from Releases and reinstall.`}
				onDismiss={() => {
					StateServiceClient.dismissIclineUpdate({ value: "icline" }).catch(console.error)
				}}
				primaryLabel="View Release"
				url={status.icline.htmlUrl}
			/>,
		)
	}

	if (status.upstreamCline?.showBar) {
		rows.push(
			<UpdateBarRow
				key="upstream"
				message={`Cline official released ${status.upstreamCline.tagName}. Your iCline fork (${status.currentVersion}) may benefit from an upstream sync.`}
				onDismiss={() => {
					StateServiceClient.dismissIclineUpdate({ value: "upstream" }).catch(console.error)
				}}
				primaryLabel="View Upstream"
				url={status.upstreamCline.htmlUrl}
			/>,
		)
	}

	if (rows.length === 0) {
		return null
	}

	return <div className="mt-1">{rows}</div>
}

export default UpdateBar