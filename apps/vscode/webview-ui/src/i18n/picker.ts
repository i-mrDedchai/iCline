/**
 * The `picker` namespace as the surfaces that render it see it: the Quick Picker, its
 * Options panel, the shared balloon tooltip, and the notices the picker and Settings
 * both show. The aliases below exist so those files keep reading about *picker* copy
 * rather than about the registry; anything outside that boundary should use
 * `useTranslation`/`createTranslator` with its own namespace instead of widening them.
 */
import type { TranslatedLocale } from "./locales"
import { createTranslator, formatString, type StringKey, type Translator } from "./strings"
import { useTranslation } from "./useTranslation"

export type PickerTranslator = Translator<"picker">
export type PickerStringKey = StringKey<"picker">

/** Non-React translator, for the pure helpers (`statusTooltip`, `effortClampNotice`). */
export const createPickerTranslator = (locale: TranslatedLocale): PickerTranslator => createTranslator(locale, "picker")

/** Fill the picker copy's `{name}` placeholders. */
export function formatPickerString(
	translate: PickerTranslator,
	key: PickerStringKey,
	values: Record<string, string | number>,
): string {
	return formatString(translate, key, values)
}

/** Picker copy in the user's language. */
export function usePickerStrings(): PickerTranslator {
	return useTranslation("picker")
}
