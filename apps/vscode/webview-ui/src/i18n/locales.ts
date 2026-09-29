/**
 * Locale resolution for every user-visible string in the webview.
 *
 * iCline ships exactly one language setting — General Settings → Preferred
 * Language (`preferredLanguage`) — and the host reads it for a different purpose
 * as well (telling the model which language to answer in). This module is the
 * webview side of that setting: it turns the display name the setting stores into
 * a locale tag, then decides which locale copy actually renders in.
 *
 * Two steps, deliberately separate:
 *   1. `resolveLocale` maps the preference (or, when it is unset, the language
 *      VS Code itself runs in) onto one of the 19 tags `Languages.ts` offers.
 *   2. `resolveTranslatedLocale` narrows that to a locale we have copy for,
 *      falling back to the English source. A language we can name but have not
 *      translated must render English — never a blank, never a raw key.
 *
 * Step 2 is what keeps "we know your language" and "we speak your language"
 * apart, so adding a translation is a one-line change and asking for a language
 * we do not have yet degrades instead of breaking.
 *
 * Kept React-free so vitest can pin it without a renderer.
 */
import { findLanguageKey, LANGUAGE_OPTIONS, type LanguageKey } from "@shared/Languages"

/** Every language the Settings picker can produce, as a tag. */
export type LocaleTag = LanguageKey

export const LOCALE_TAGS: readonly LocaleTag[] = LANGUAGE_OPTIONS.map((option) => option.key)

/** Locales that have copy. `en` is the source of truth a namespace must cover. */
export const TRANSLATED_LOCALES = ["en", "th"] as const
export type TranslatedLocale = (typeof TRANSLATED_LOCALES)[number]
export const SOURCE_LOCALE: TranslatedLocale = "en"

export interface LocaleInputs {
	/** General Settings → Preferred Language (e.g. "Thai - ไทย"). */
	preferredLanguage?: string
	/** The language VS Code runs in (e.g. "th-TH", "en-US"). */
	systemLanguage?: string
}

/** The tag behind a stored display name, or undefined when it is not one of ours. */
export function localeFromPreference(preferredLanguage: string | undefined): LocaleTag | undefined {
	return findLanguageKey(preferredLanguage)
}

/**
 * The tag behind a BCP-47 language tag, matched case-insensitively: exactly
 * first, then by primary subtag when that is unambiguous — `th-TH` resolves to
 * `th`, while a bare `zh` does not, because `zh-CN` and `zh-TW` both claim it.
 */
export function localeFromTag(tag: string | undefined): LocaleTag | undefined {
	if (!tag) {
		return undefined
	}
	const normalized = tag.trim().toLowerCase().replace(/_/g, "-")
	if (!normalized) {
		return undefined
	}
	const exact = LOCALE_TAGS.find((candidate) => candidate.toLowerCase() === normalized)
	if (exact) {
		return exact
	}
	const primary = normalized.split("-")[0]
	const matches = LOCALE_TAGS.filter((candidate) => candidate.toLowerCase().split("-")[0] === primary)
	return matches.length === 1 ? matches[0] : undefined
}

/** An explicit preference wins, then the language VS Code runs in, then English. */
export function resolveLocale(input: LocaleInputs = {}): LocaleTag {
	return localeFromPreference(input.preferredLanguage) ?? localeFromTag(input.systemLanguage) ?? SOURCE_LOCALE
}

export function isTranslatedLocale(locale: LocaleTag): locale is TranslatedLocale {
	return (TRANSLATED_LOCALES as readonly string[]).includes(locale)
}

/** The locale to render copy in: the resolved one when translated, else English. */
export function resolveTranslatedLocale(input: LocaleInputs = {}): TranslatedLocale {
	const locale = resolveLocale(input)
	return isTranslatedLocale(locale) ? locale : SOURCE_LOCALE
}

/** Reads the two locale inputs the webview actually has, then resolves. */
export function resolveTranslatedLocaleFromEnvironment(preferredLanguage?: string): TranslatedLocale {
	const systemLanguage =
		typeof navigator !== "undefined" && typeof navigator.language === "string" ? navigator.language : undefined
	return resolveTranslatedLocale({ preferredLanguage, systemLanguage })
}
