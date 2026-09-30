import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import {
	APPEARANCE_CHOICES,
	type AppearanceAccentId,
	type AppearanceToken,
	resolveAppearanceAccent,
} from "@/appearance/appearance"
import { useExtensionState } from "@/context/ExtensionStateContext"
import type { AppearanceStringKey } from "@/i18n/namespaces/appearance"
import { useTranslation } from "@/i18n/useTranslation"
import Section from "../Section"
import { updateSetting } from "../utils/settingsHandlers"

interface AppearanceSectionProps {
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

interface AccentRow {
	token: AppearanceToken
	settingKey: "appearanceCompletedAccent" | "appearanceReplyAccent" | "appearanceBrandAccent"
	labelKey: AppearanceStringKey
	hintKey: AppearanceStringKey
	current: string | undefined
}

const CHOICE_LABEL_KEYS: Record<AppearanceAccentId, AppearanceStringKey> = {
	theme: "choiceTheme",
	green: "choiceGreen",
	blue: "choiceBlue",
	cyan: "choiceCyan",
	teal: "choiceTeal",
	purple: "choicePurple",
}

/**
 * Settings → Appearance. Three accent rows (Completed box, final-reply card,
 * brand chrome), each a swatch radio group over the shared choice catalog.
 * The stored value is a choice id (`updateSetting` carries it to the host
 * like any other setting); the swatch dot shows the exact value the choice
 * resolves to for that row's token, so "theme" previews as that token's own
 * default rather than as one shared color.
 */
const AppearanceSection = ({ renderSectionHeader }: AppearanceSectionProps) => {
	const { appearanceCompletedAccent, appearanceReplyAccent, appearanceBrandAccent } = useExtensionState()
	const tr = useTranslation("appearance")

	const rows: AccentRow[] = [
		{
			token: "completed",
			settingKey: "appearanceCompletedAccent",
			labelKey: "completedLabel",
			hintKey: "completedHint",
			current: appearanceCompletedAccent,
		},
		{
			token: "reply",
			settingKey: "appearanceReplyAccent",
			labelKey: "replyLabel",
			hintKey: "replyHint",
			current: appearanceReplyAccent,
		},
		{
			token: "cline",
			settingKey: "appearanceBrandAccent",
			labelKey: "brandLabel",
			hintKey: "brandHint",
			current: appearanceBrandAccent,
		},
	]

	const resetAll = () => {
		updateSetting("appearanceCompletedAccent", "theme")
		updateSetting("appearanceReplyAccent", "theme")
		updateSetting("appearanceBrandAccent", "theme")
	}

	return (
		<div>
			{renderSectionHeader("appearance")}
			<Section>
				<p className="text-sm text-description mt-1 mb-3">{tr("description")}</p>
				{rows.map((row) => (
					<div className="mb-4" key={row.token}>
						<div className="block mb-1 text-base font-medium">{tr(row.labelKey)}</div>
						<div aria-label={tr(row.labelKey)} className="flex items-center gap-2 flex-wrap" role="radiogroup">
							{APPEARANCE_CHOICES.map((choice) => {
								const selected = (row.current ?? "theme") === choice
								return (
									<button
										aria-checked={selected}
										aria-label={tr(CHOICE_LABEL_KEYS[choice])}
										className="flex flex-col items-center gap-1 p-1 rounded-sm cursor-pointer bg-transparent border-0"
										key={choice}
										onClick={() => updateSetting(row.settingKey, choice)}
										role="radio"
										title={tr(CHOICE_LABEL_KEYS[choice])}
										type="button">
										<span
											className="flex items-center justify-center rounded-full"
											style={{
												width: 26,
												height: 26,
												background: resolveAppearanceAccent(row.token, choice),
												outline: selected
													? "2px solid var(--vscode-focusBorder)"
													: "1px solid var(--vscode-panel-border)",
												outlineOffset: 2,
												color: "var(--vscode-button-foreground)",
												fontSize: 14,
												fontWeight: 700,
											}}>
											{selected ? "✓" : ""}
										</span>
										<span className="text-xs text-description">{tr(CHOICE_LABEL_KEYS[choice])}</span>
									</button>
								)
							})}
						</div>
						<p className="text-sm text-description mt-1">{tr(row.hintKey)}</p>
					</div>
				))}
				<VSCodeButton appearance="secondary" onClick={resetAll}>
					{tr("resetAll")}
				</VSCodeButton>
			</Section>
		</div>
	)
}

export default AppearanceSection
