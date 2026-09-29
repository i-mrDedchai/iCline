import { LANGUAGE_OPTIONS } from "@shared/Languages"
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import React from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useTranslation } from "@/i18n/useTranslation"
import { updateSetting } from "./utils/settingsHandlers"

/**
 * General Settings → Preferred Language.
 *
 * The options are the display names themselves, not copy: the stored value IS the
 * display string (`"Thai - ไทย"`), and the host matches on it to pick the language it
 * tells the model to answer in. Translating them would break that lookup and would
 * also be wrong on its own terms — a language list is readable precisely because each
 * name is written in its own language. So they are rendered from the shared list
 * (`@shared/Languages`) rather than being retyped here, which is what keeps this
 * dropdown, the tag resolution in `@/i18n/locales`, and the host in one order.
 */
const PreferredLanguageSetting: React.FC = () => {
	const { preferredLanguage } = useExtensionState()
	const tr = useTranslation("settings")

	const handleLanguageChange = (newLanguage: string) => {
		updateSetting("preferredLanguage", newLanguage)
	}

	return (
		<div style={{}}>
			<label className="block mb-1 text-base font-medium" htmlFor="preferred-language-dropdown">
				{tr("preferredLanguageLabel")}
			</label>
			<VSCodeDropdown
				currentValue={preferredLanguage || "English"}
				id="preferred-language-dropdown"
				onChange={(e: any) => {
					handleLanguageChange(e.target.value)
				}}
				style={{ width: "100%" }}>
				{LANGUAGE_OPTIONS.map((language) => (
					<VSCodeOption key={language.key} value={language.display}>
						{language.display}
					</VSCodeOption>
				))}
			</VSCodeDropdown>
			<p className="text-sm text-description mt-1">{tr("preferredLanguageHint")}</p>
		</div>
	)
}

export default React.memo(PreferredLanguageSetting)
