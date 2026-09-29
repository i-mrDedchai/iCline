export type LanguageKey =
	| "en"
	| "ar"
	| "pt-BR"
	| "cs"
	| "fr"
	| "de"
	| "hi"
	| "hu"
	| "it"
	| "ja"
	| "ko"
	| "pl"
	| "pt-PT"
	| "ru"
	| "zh-CN"
	| "es"
	| "zh-TW"
	| "th"
	| "tr"

export type LanguageDisplay =
	| "English"
	| "Arabic - العربية"
	| "Portuguese - Português (Brasil)"
	| "Czech - Čeština"
	| "French - Français"
	| "German - Deutsch"
	| "Hindi - हिन्दी"
	| "Hungarian - Magyar"
	| "Italian - Italiano"
	| "Japanese - 日本語"
	| "Korean - 한국어"
	| "Polish - Polski"
	| "Portuguese - Português (Portugal)"
	| "Russian - Русский"
	| "Simplified Chinese - 简体中文"
	| "Spanish - Español"
	| "Traditional Chinese - 繁體中文"
	| "Thai - ไทย"
	| "Turkish - Türkçe"

export const DEFAULT_LANGUAGE_SETTINGS: LanguageKey = "en"

/** Every language the picker offers, in the order it shows them. */
export const LANGUAGE_OPTIONS: ReadonlyArray<{ key: LanguageKey; display: LanguageDisplay }> = [
	{ key: "en", display: "English" },
	{ key: "ar", display: "Arabic - العربية" },
	{ key: "pt-BR", display: "Portuguese - Português (Brasil)" },
	{ key: "cs", display: "Czech - Čeština" },
	{ key: "fr", display: "French - Français" },
	{ key: "de", display: "German - Deutsch" },
	{ key: "hi", display: "Hindi - हिन्दी" },
	{ key: "hu", display: "Hungarian - Magyar" },
	{ key: "it", display: "Italian - Italiano" },
	{ key: "ja", display: "Japanese - 日本語" },
	{ key: "ko", display: "Korean - 한국어" },
	{ key: "pl", display: "Polish - Polski" },
	{ key: "pt-PT", display: "Portuguese - Português (Portugal)" },
	{ key: "ru", display: "Russian - Русский" },
	{ key: "zh-CN", display: "Simplified Chinese - 简体中文" },
	{ key: "es", display: "Spanish - Español" },
	{ key: "zh-TW", display: "Traditional Chinese - 繁體中文" },
	{ key: "th", display: "Thai - ไทย" },
	{ key: "tr", display: "Turkish - Türkçe" },
]

/**
 * The key for a display name the picker actually offers, or undefined when the
 * string is not one of ours. Distinct from `getLanguageKey`, which folds an
 * unknown value into English: a caller that must tell "chose English" apart from
 * "chose something we cannot place" needs this one.
 */
export function findLanguageKey(display: string | undefined): LanguageKey | undefined {
	if (!display) {
		return undefined
	}
	return LANGUAGE_OPTIONS.find((option) => option.display === display)?.key
}

export function getLanguageKey(display: LanguageDisplay | undefined): LanguageKey {
	return findLanguageKey(display) ?? DEFAULT_LANGUAGE_SETTINGS
}
