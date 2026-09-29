import { useMemo } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { createPickerTranslator, type PickerTranslator, resolvePickerLocaleFromEnvironment } from "./pickerStrings"

/**
 * Picker copy bound to General Settings → Preferred Language, falling back to the
 * language VS Code runs in (see `resolvePickerLocale`).
 */
export function usePickerStrings(): PickerTranslator {
	const { preferredLanguage } = useExtensionState()
	return useMemo(() => createPickerTranslator(resolvePickerLocaleFromEnvironment(preferredLanguage)), [preferredLanguage])
}
