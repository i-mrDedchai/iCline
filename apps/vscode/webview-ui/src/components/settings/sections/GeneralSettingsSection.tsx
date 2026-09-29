import { VSCodeCheckbox, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { splitOnPlaceholder } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import PreferredLanguageSetting from "../PreferredLanguageSetting"
import Section from "../Section"
import { updateSetting } from "../utils/settingsHandlers"

interface GeneralSettingsSectionProps {
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

const GeneralSettingsSection = ({ renderSectionHeader }: GeneralSettingsSectionProps) => {
	const { telemetrySetting, remoteConfigSettings } = useExtensionState()
	const tr = useTranslation("settings")

	// The telemetry paragraph carries two links, and a translator must be free to put
	// them mid-sentence (Thai does not order that sentence like English does). The copy
	// keeps `{overview}` / `{privacy}` placeholders and the sentence is split on them,
	// so word order belongs to the translation rather than to this layout.
	const [noticeLead, noticeTail] = splitOnPlaceholder(tr("telemetryNotice"), "overview")
	const [noticeMiddle, noticeEnd] = splitOnPlaceholder(noticeTail, "privacy")

	return (
		<div>
			{renderSectionHeader("general")}
			<Section>
				<PreferredLanguageSetting />

				<div className="mb-[5px]">
					<Tooltip>
						<TooltipContent hidden={remoteConfigSettings?.telemetrySetting === undefined}>
							{tr("telemetryManaged")}
						</TooltipContent>
						<TooltipTrigger asChild>
							<div className="flex items-center gap-2 mb-[5px]">
								<VSCodeCheckbox
									checked={telemetrySetting !== "disabled"}
									disabled={remoteConfigSettings?.telemetrySetting === "disabled"}
									onChange={(e: any) => {
										const checked = e.target.checked === true
										updateSetting("telemetrySetting", checked ? "enabled" : "disabled")
									}}>
									{tr("telemetryAllow")}
								</VSCodeCheckbox>
								{!!remoteConfigSettings?.telemetrySetting && (
									<i className="codicon codicon-lock text-description text-sm" />
								)}
							</div>
						</TooltipTrigger>
					</Tooltip>

					<p className="text-sm mt-[5px] text-description">
						{noticeLead}
						<VSCodeLink
							className="text-inherit"
							href="https://docs.cline.bot/more-info/telemetry"
							style={{ fontSize: "inherit", textDecoration: "underline" }}>
							{tr("telemetryOverviewLink")}
						</VSCodeLink>
						{noticeMiddle}
						<VSCodeLink
							className="text-inherit"
							href="https://cline.bot/privacy"
							style={{ fontSize: "inherit", textDecoration: "underline" }}>
							{tr("telemetryPrivacyLink")}
						</VSCodeLink>
						{noticeEnd}
					</p>
				</div>
			</Section>
		</div>
	)
}

export default GeneralSettingsSection
