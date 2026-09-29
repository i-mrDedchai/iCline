import { Button } from "@/components/ui/button"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useTranslation } from "@/i18n/useTranslation"
import { StateServiceClient } from "@/services/grpc-client"
import Section from "../Section"

interface DebugSectionProps {
	onResetState: (resetGlobalState?: boolean) => Promise<void>
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

const DebugSection = ({ onResetState, renderSectionHeader }: DebugSectionProps) => {
	const { setShowWelcome } = useExtensionState()
	const tr = useTranslation("settings")
	return (
		<div>
			{renderSectionHeader("debug")}
			<Section>
				<Button onClick={() => onResetState()} variant="error">
					{tr("debugResetWorkspace")}
				</Button>
				<Button onClick={() => onResetState(true)} variant="error">
					{tr("debugResetGlobal")}
				</Button>
				<p className="text-xs mt-[5px] text-(--vscode-descriptionForeground)">{tr("debugResetDescription")}</p>
			</Section>
			<Section>
				<Button
					onClick={async () =>
						await StateServiceClient.setWelcomeViewCompleted({ value: false })
							.catch(() => {})
							.finally(() => setShowWelcome(true))
					}
					variant="secondary">
					{tr("debugResetOnboarding")}
				</Button>
			</Section>
		</div>
	)
}

export default DebugSection
