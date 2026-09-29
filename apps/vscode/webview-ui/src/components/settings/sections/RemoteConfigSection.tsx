import { EmptyRequest } from "@shared/proto/index.cline"
import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { useEffect, useRef, useState } from "react"
import { RemoteConfigToggle } from "@/components/account/RemoteConfigToggle"
import { useClineAuth } from "@/context/ClineAuthContext"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { formatString, splitOnPlaceholder } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import { StateServiceClient } from "@/services/grpc-client"
import Section from "../Section"

interface RemoteConfigSectionProps {
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

function BaseRemoteConfigSection({ renderSectionHeader, children }: React.PropsWithChildren<RemoteConfigSectionProps>) {
	return (
		<div>
			{renderSectionHeader("remote-config")}
			<Section>{children}</Section>
		</div>
	)
}

const AUTOMATIC_DELAY_MS = 30000

function RefreshButton() {
	const tr = useTranslation("settings")
	const [isLoading, setIsLoading] = useState(false)
	const [retryIn, setRetryIn] = useState<number | null>(null)
	const intervalRef = useRef<NodeJS.Timeout>()

	useEffect(() => {
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current)
			}
		}
	}, [])

	const onRefresh = () => {
		setIsLoading(true)
		StateServiceClient.refreshRemoteConfig(EmptyRequest.create()).finally(() => {
			setIsLoading(false)
			setRetryIn(AUTOMATIC_DELAY_MS / 1000)

			intervalRef.current = setInterval(() => {
				setRetryIn((old) => {
					if (old && old > 0) return old - 1

					intervalRef.current && clearInterval(intervalRef.current)
					return null
				})
			}, 1000)
		})
	}

	return (
		<VSCodeButton
			className={`w-full rounded-xs ${isLoading ? "animate-pulse" : ""}`}
			disabled={isLoading || (retryIn !== null && retryIn > 0)}
			onClick={() => onRefresh()}>
			{tr("remoteRefresh")}{" "}
			{retryIn !== null && retryIn > 0 && <>{formatString(tr, "remoteRetryIn", { seconds: retryIn })}</>}
		</VSCodeButton>
	)
}

interface SettingRowProps {
	label: string
	value: string | number | boolean | undefined | null
	isSecret?: boolean
}

function SettingRow({ label, value, isSecret }: SettingRowProps) {
	const tr = useTranslation("settings")
	const displayValue = (() => {
		if (value === undefined || value === null) {
			return <span className="text-description italic">{tr("remoteNotConfiguredValue")}</span>
		}
		if (typeof value === "boolean") {
			return value ? (
				<span className="text-green-500">{tr("remoteValueEnabled")}</span>
			) : (
				<span className="text-description">{tr("remoteValueDisabled")}</span>
			)
		}
		if (isSecret && typeof value === "string" && value.length > 0) {
			return <span className="font-mono text-xs">{"•".repeat(Math.min(value.length, 20))}</span>
		}
		return <span className="font-mono text-xs break-all">{String(value)}</span>
	})()

	const isLongValue = typeof value === "string" && value.length > 25
	if (isLongValue) {
		return (
			<div className="flex flex-col gap-1 py-1.5 border-b border-vscode-widget-border last:border-b-0">
				<span className="text-description text-xs">{label}</span>
				<div className="pl-2 overflow-hidden text-right">{displayValue}</div>
			</div>
		)
	}

	return (
		<div className="flex justify-between items-center py-1.5 border-b border-vscode-widget-border last:border-b-0 gap-2">
			<span className="text-description text-xs shrink-0">{label}</span>
			<span className="text-right overflow-hidden text-ellipsis">{displayValue}</span>
		</div>
	)
}

interface TestButtonProps {
	label: string
	onClick: () => Promise<void>
	disabled?: boolean
	successMessage?: string
}

function TestButton({ label, onClick, disabled, successMessage }: TestButtonProps) {
	const tr = useTranslation("settings")
	const [isLoading, setIsLoading] = useState(false)
	const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
	const timeoutRef = useRef<NodeJS.Timeout>()

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	const handleClick = async () => {
		setIsLoading(true)
		setResult(null)
		try {
			await onClick()
			setResult({ success: true, message: successMessage || tr("remoteTestSuccess") })
		} catch (error) {
			setResult({ success: false, message: error instanceof Error ? error.message : tr("remoteTestFailedFallback") })
		} finally {
			setIsLoading(false)
			timeoutRef.current = setTimeout(() => setResult(null), 5000)
		}
	}

	return (
		<div className="flex items-center gap-2">
			<VSCodeButton
				appearance="secondary"
				className={isLoading ? "animate-pulse" : ""}
				disabled={disabled || isLoading}
				onClick={handleClick}>
				{isLoading ? tr("remoteTesting") : label}
			</VSCodeButton>
			{result && <span className={`text-xs ${result.success ? "text-green-500" : "text-red-500"}`}>{result.message}</span>}
		</div>
	)
}

function OtelSettingsSection() {
	const { remoteConfigSettings } = useExtensionState()
	const tr = useTranslation("settings")

	const otelEnabled = remoteConfigSettings?.openTelemetryEnabled
	const hasOtelConfig =
		otelEnabled !== undefined ||
		remoteConfigSettings?.openTelemetryOtlpEndpoint !== undefined ||
		remoteConfigSettings?.openTelemetryMetricsExporter !== undefined ||
		remoteConfigSettings?.openTelemetryLogsExporter !== undefined

	if (!hasOtelConfig) {
		return null
	}

	const handleTestOtel = async () => {
		const response = await StateServiceClient.testOtelConnection(EmptyRequest.create({}))
		if (!response.success) {
			throw new Error(response.error || tr("remoteTestError"))
		}
	}

	return (
		<div className="mb-4">
			<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
				<i className="codicon codicon-pulse" />
				{tr("remoteOtelTitle")}
			</h4>
			<div className="bg-vscode-textBlockQuote-background rounded p-3 mb-2">
				<SettingRow label={tr("remoteValueEnabled")} value={otelEnabled} />
				<SettingRow label={tr("remoteOtelMetricsExporter")} value={remoteConfigSettings?.openTelemetryMetricsExporter} />
				<SettingRow label={tr("remoteOtelLogsExporter")} value={remoteConfigSettings?.openTelemetryLogsExporter} />
				<SettingRow label={tr("remoteOtelProtocol")} value={remoteConfigSettings?.openTelemetryOtlpProtocol} />
				<SettingRow label={tr("remoteOtelEndpoint")} value={remoteConfigSettings?.openTelemetryOtlpEndpoint} />
				{remoteConfigSettings?.openTelemetryOtlpMetricsEndpoint && (
					<SettingRow
						label={tr("remoteOtelMetricsEndpoint")}
						value={remoteConfigSettings?.openTelemetryOtlpMetricsEndpoint}
					/>
				)}
				{remoteConfigSettings?.openTelemetryOtlpLogsEndpoint && (
					<SettingRow
						label={tr("remoteOtelLogsEndpoint")}
						value={remoteConfigSettings?.openTelemetryOtlpLogsEndpoint}
					/>
				)}
				{remoteConfigSettings?.openTelemetryOtlpHeaders && (
					<SettingRow
						label={tr("remoteOtelHeaders")}
						value={formatString(tr, "remoteOtelHeadersCount", {
							count: Object.keys(remoteConfigSettings.openTelemetryOtlpHeaders).length,
						})}
					/>
				)}
				{remoteConfigSettings?.openTelemetryMetricExportInterval && (
					<SettingRow
						label={tr("remoteOtelMetricExportInterval")}
						value={`${remoteConfigSettings.openTelemetryMetricExportInterval}ms`}
					/>
				)}
				{remoteConfigSettings?.openTelemetryOtlpInsecure !== undefined && (
					<SettingRow label={tr("remoteOtelInsecure")} value={remoteConfigSettings?.openTelemetryOtlpInsecure} />
				)}
				{remoteConfigSettings?.openTelemetryLogBatchSize && (
					<SettingRow label={tr("remoteOtelLogBatchSize")} value={remoteConfigSettings?.openTelemetryLogBatchSize} />
				)}
				{remoteConfigSettings?.openTelemetryLogBatchTimeout && (
					<SettingRow
						label={tr("remoteOtelLogBatchTimeout")}
						value={`${remoteConfigSettings.openTelemetryLogBatchTimeout}ms`}
					/>
				)}
				{remoteConfigSettings?.openTelemetryLogMaxQueueSize && (
					<SettingRow
						label={tr("remoteOtelLogMaxQueueSize")}
						value={remoteConfigSettings?.openTelemetryLogMaxQueueSize}
					/>
				)}
			</div>

			{otelEnabled && (
				<div className="flex gap-2 flex-wrap">
					<TestButton
						disabled={!remoteConfigSettings?.openTelemetryMetricsExporter}
						label={tr("remoteOtelTestButton")}
						onClick={handleTestOtel}
						successMessage={tr("remoteOtelTestSuccess")}
					/>
				</div>
			)}
		</div>
	)
}

function PromptUploadingSection() {
	const { remoteConfigSettings } = useExtensionState()
	const tr = useTranslation("settings")

	const blobStoreConfig = remoteConfigSettings?.blobStoreConfig
	if (!blobStoreConfig) {
		return null
	}

	const handleTestPromptUploading = async () => {
		const response = await StateServiceClient.testPromptUploading(EmptyRequest.create({}))
		if (!response.success) {
			throw new Error(response.error || tr("remoteTestError"))
		}
	}

	return (
		<div className="mb-4">
			<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
				<i className="codicon codicon-cloud-upload" />
				{tr("remotePromptUploadTitle")}
			</h4>
			<div className="bg-vscode-textBlockQuote-background rounded p-3 mb-2">
				<SettingRow label={tr("remotePromptStorageType")} value={blobStoreConfig.adapterType?.toUpperCase()} />
				<SettingRow label={tr("remotePromptBucket")} value={blobStoreConfig.bucket} />
				<SettingRow label={tr("remotePromptRegion")} value={blobStoreConfig.region} />
				{blobStoreConfig.endpoint && <SettingRow label={tr("remotePromptEndpoint")} value={blobStoreConfig.endpoint} />}
				{blobStoreConfig.accountId && (
					<SettingRow label={tr("remotePromptAccountId")} value={blobStoreConfig.accountId} />
				)}
				<SettingRow isSecret label={tr("remotePromptAccessKeyId")} value={blobStoreConfig.accessKeyId} />
				<SettingRow isSecret label={tr("remotePromptSecretAccessKey")} value={blobStoreConfig.secretAccessKey} />
				{blobStoreConfig.intervalMs && (
					<SettingRow label={tr("remotePromptSyncInterval")} value={`${blobStoreConfig.intervalMs}ms`} />
				)}
				{blobStoreConfig.batchSize && (
					<SettingRow label={tr("remotePromptBatchSize")} value={blobStoreConfig.batchSize} />
				)}
				{blobStoreConfig.maxRetries && (
					<SettingRow label={tr("remotePromptMaxRetries")} value={blobStoreConfig.maxRetries} />
				)}
				{blobStoreConfig.maxQueueSize && (
					<SettingRow label={tr("remotePromptMaxQueueSize")} value={blobStoreConfig.maxQueueSize} />
				)}
				<SettingRow label={tr("remotePromptBackfillEnabled")} value={blobStoreConfig.backfillEnabled} />
			</div>

			<TestButton label={tr("remotePromptTestUpload")} onClick={handleTestPromptUploading} />
		</div>
	)
}

export function RemoteConfigSection({ renderSectionHeader }: RemoteConfigSectionProps) {
	const { remoteConfigSettings, optOutOfRemoteConfig } = useExtensionState()
	const { activeOrganization } = useClineAuth()
	const tr = useTranslation("settings")

	// The sentence points at the dashboard; splitting on the placeholder keeps the link
	// where the translation puts it.
	const [notConfiguredBefore, notConfiguredAfter] = splitOnPlaceholder(tr("remoteNotConfiguredNotice"), "dashboard")

	if (optOutOfRemoteConfig) {
		return (
			<BaseRemoteConfigSection renderSectionHeader={renderSectionHeader}>
				<div className="flex flex-col justify-center gap-4">
					<h3>{tr("remoteOptedOutNotice")}</h3>

					<RemoteConfigToggle activeOrganization={activeOrganization} />
				</div>
			</BaseRemoteConfigSection>
		)
	}

	if (!remoteConfigSettings || Object.keys(remoteConfigSettings).length === 0) {
		return (
			<BaseRemoteConfigSection renderSectionHeader={renderSectionHeader}>
				<div className="flex flex-col justify-center gap-4">
					<h3>
						{notConfiguredBefore}
						<VSCodeLink href="https://app.cline.bot/dashboard/organization?tab=settings">
							{tr("remoteDashboardLink")}
						</VSCodeLink>
						{notConfiguredAfter}
					</h3>

					<RefreshButton />
				</div>
			</BaseRemoteConfigSection>
		)
	}

	return (
		<BaseRemoteConfigSection renderSectionHeader={renderSectionHeader}>
			<div className="flex flex-col gap-2">
				<p className="text-description text-xs mb-2">{tr("remoteManagedNotice")}</p>

				<OtelSettingsSection />
				<PromptUploadingSection />

				<div className="mt-2">
					<RefreshButton />
				</div>
			</div>
		</BaseRemoteConfigSection>
	)
}
