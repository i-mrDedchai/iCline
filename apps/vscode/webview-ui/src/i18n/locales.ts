/**
 * Locale resolution for the picker i18n layer, kept React-free so vitest can pin it.
 *
 * The lockup asks for a language setting that defaults to the VS Code display
 * language and lets English/Thai be chosen explicitly. iCline already ships exactly
 * one language setting — General Settings → Preferred Language (`preferredLanguage`,
 * which the host also uses to tell the model which language to speak). Rather than
 * introduce a second, near-identical setting, the picker reads that one and treats
 * an unset/English value as "follow VS Code".
 */

export const PICKER_LOCALES = ["en", "th"] as const

export type PickerLocale = (typeof PICKER_LOCALES)[number]

export interface PickerLocaleInputs {
	/** General Settings → Preferred Language (e.g. "Thai - ไทย"). */
	preferredLanguage?: string
	/** VS Code's own UI language tag (e.g. "th", "th-TH", "en-US"). */
	systemLanguage?: string
}

/** Matches the language tag/display-name prefixes that mean Thai. */
const THAI_PATTERN = /^(th\b|th-|thai)/i

function isThai(value: string | undefined): boolean {
	if (!value) {
		return false
	}
	const normalized = value.trim()
	if (!normalized) {
		return false
	}
	// "Thai - ไทย" (the display name) and "th-TH" (a tag) both start with th/thai.
	return THAI_PATTERN.test(normalized.replace(/^"|"$/g, ""))
}

export function isSupportedPickerLocale(value: string | undefined): value is PickerLocale {
	return value === "en" || value === "th"
}

/**
 * Priority: an explicit Thai preference wins, then the language VS Code runs in,
 * then English. English stays the fallback because the extension's own copy is
 * English-first (translation is additive, never a requirement to read the UI).
 */
export function resolvePickerLocale(input: PickerLocaleInputs = {}): PickerLocale {
	if (isThai(input.preferredLanguage)) {
		return "th"
	}
	if (isThai(input.systemLanguage)) {
		return "th"
	}
	return "en"
}
