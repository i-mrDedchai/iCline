import { EmptyRequest } from "@shared/proto/cline/common"
import { AddRemoteMcpServerRequest, McpServers } from "@shared/proto/cline/mcp"
import { convertProtoMcpServersToMcpServers } from "@shared/proto-conversions/mcp/mcp-server-conversion"
import { VSCodeButton, VSCodeLink, VSCodeRadio, VSCodeRadioGroup, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useState } from "react"
import { LINKS } from "@/constants"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { splitOnPlaceholder } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import { McpServiceClient } from "@/services/grpc-client"

type TransportType = "streamableHttp" | "sse"

type AddRemoteServerFormProps = {
	onServerAdded: () => void
	onCancel?: () => void
	showEditConfiguration?: boolean
}

const AddRemoteServerForm = ({ onCancel, onServerAdded, showEditConfiguration = true }: AddRemoteServerFormProps) => {
	const [serverName, setServerName] = useState("")
	const [serverUrl, setServerUrl] = useState("")
	const [transportType, setTransportType] = useState<TransportType>("streamableHttp")
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState("")
	const { setMcpServers } = useExtensionState()
	const tr = useTranslation("customize")
	const [introBefore, introAfter] = splitOnPlaceholder(tr("mcpAddRemoteIntro"), "{here}")

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()

		if (!serverName.trim()) {
			setError(tr("mcpAddRemoteNameRequired"))
			return
		}

		if (!serverUrl.trim()) {
			setError(tr("mcpAddRemoteUrlRequired"))
			return
		}

		try {
			new URL(serverUrl)
		} catch (_err) {
			setError(tr("mcpAddRemoteUrlInvalid"))
			return
		}

		setError("")
		setIsSubmitting(true)

		try {
			const servers: McpServers = await McpServiceClient.addRemoteMcpServer(
				AddRemoteMcpServerRequest.create({
					serverName: serverName.trim(),
					serverUrl: serverUrl.trim(),
					transportType: transportType,
				}),
			)

			setIsSubmitting(false)

			const mcpServers = convertProtoMcpServersToMcpServers(servers.mcpServers)
			setMcpServers(mcpServers)

			setServerName("")
			setServerUrl("")
			onServerAdded()
		} catch (error) {
			setIsSubmitting(false)
			setError(error instanceof Error ? error.message : tr("mcpAddRemoteFailed"))
		}
	}

	return (
		<div className="p-4 px-5">
			{" "}
			<div className="text-(--vscode-foreground) mb-2">
				{introBefore}
				<VSCodeLink href={LINKS.DOCUMENTATION.REMOTE_MCP_SERVER_DOCS} style={{ display: "inline" }}>
					{tr("mcpAddRemoteHere")}
				</VSCodeLink>
				{introAfter}
			</div>
			<form onSubmit={handleSubmit}>
				<div className="mb-2">
					<VSCodeTextField
						className="w-full"
						disabled={isSubmitting}
						onChange={(e) => {
							setServerName((e.target as HTMLInputElement).value)
							setError("")
						}}
						placeholder="mcp-server"
						value={serverName}>
						{tr("mcpAddRemoteNameLabel")}
					</VSCodeTextField>
				</div>
				<div className="mb-2">
					<VSCodeTextField
						className="w-full mr-4"
						disabled={isSubmitting}
						onChange={(e) => {
							setServerUrl((e.target as HTMLInputElement).value)
							setError("")
						}}
						placeholder="https://example.com/mcp-server"
						value={serverUrl}>
						{tr("mcpAddRemoteUrlLabel")}
					</VSCodeTextField>
				</div>
				<div className="mb-3">
					<label className={`block text-sm font-medium mb-2 ${isSubmitting ? "opacity-50" : ""}`}>
						{tr("mcpTransportType")}
					</label>
					<VSCodeRadioGroup
						disabled={isSubmitting}
						onChange={(e) => {
							const value = (e.target as HTMLInputElement).value as TransportType
							setTransportType(value)
						}}
						value={transportType}>
						<VSCodeRadio checked={transportType === "streamableHttp"} value="streamableHttp">
							Streamable HTTP
						</VSCodeRadio>
						<VSCodeRadio checked={transportType === "sse"} value="sse">
							SSE (Legacy)
						</VSCodeRadio>
					</VSCodeRadioGroup>
				</div>
				{error && <div className="mb-3 text-(--vscode-errorForeground)">{error}</div>}{" "}
				<VSCodeButton className="w-full" disabled={isSubmitting} type="submit">
					{isSubmitting ? tr("mcpAddRemoteConnecting") : tr("mcpAddRemoteAdd")}
				</VSCodeButton>
				{onCancel && (
					<VSCodeButton
						appearance="secondary"
						className="w-full"
						disabled={isSubmitting}
						onClick={onCancel}
						style={{ marginTop: "8px" }}
						type="button">
						{tr("mcpAddRemoteCancel")}
					</VSCodeButton>
				)}
				{showEditConfiguration && (
					<VSCodeButton
						appearance="secondary"
						onClick={() => {
							McpServiceClient.openMcpSettings(EmptyRequest.create({})).catch((error) => {
								console.error("Error opening MCP settings:", error)
							})
						}}
						style={{ width: "100%", marginBottom: "5px", marginTop: 15 }}>
						{tr("mcpAddRemoteEditConfig")}
					</VSCodeButton>
				)}
			</form>
		</div>
	)
}

export default AddRemoteServerForm
