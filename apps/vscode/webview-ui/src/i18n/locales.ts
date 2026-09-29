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

/**
 * Locales that have copy. `en` is the source of truth a namespace must cover.
 *
 * Adding a language is meant to be exactly three edits: this list, one table per
 * namespace (`namespaces/*.ts`), and nothing else — the tests then demand that the
 * new table covers every key, and the Settings picker already offers the language.
 * Languages the picker offers but this list does not name keep rendering English.
 */
export const TRANSLATED_LOCALES = ["en", "th", "ja", "zh-CN"] as const
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
 * Spellings a system may report that mean one specific tag. `zh` and `zh-Hans` are
 * simplified by convention, `zh-Hant` is traditional; without these a bare Chinese
 * tag would be ambiguous and fall through to English.
 */
const TAG_ALIASES: Record<string, LocaleTag> = {
	zh: "zh-CN",
	"zh-hans": "zh-CN",
	"zh-hant": "zh-TW",
}

/**
 * The tag behind a BCP-47 language tag, matched case-insensitively and from the most
 * specific spelling down: `zh-Hans-CN` finds the `zh-Hans` alias, `th-TH` finds the
 * `th` tag, and only when nothing matches is the primary subtag consulted — and then
 * only if it is unambiguous. A bare `pt` is deliberately left unresolved because
 * `pt-BR` and `pt-PT` both claim it and picking one would be a guess.
 */
export function localeFromTag(tag: string | undefined): LocaleTag | undefined {
	if (!tag) {
		return undefined
	}
	const normalized = tag.trim().toLowerCase().replace(/_/g, "-")
	if (!normalized) {
		return undefined
	}
	const parts = normalized.split("-")
	for (let length = parts.length; length >= 1; length -= 1) {
		const candidate = parts.slice(0, length).join("-")
		const alias = TAG_ALIASES[candidate]
		if (alias) {
			return alias
		}
		const exact = LOCALE_TAGS.find((known) => known.toLowerCase() === candidate)
		if (exact) {
			return exact
		}
	}
	const primary = parts[0]
	const matches = LOCALE_TAGS.filter((known) => known.toLowerCase().split("-")[0] === primary)
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
