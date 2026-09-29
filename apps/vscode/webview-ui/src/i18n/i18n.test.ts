import { LANGUAGE_OPTIONS } from "@shared/Languages"
import { describe, expect, it } from "vitest"
import {
	LOCALE_TAGS,
	localeFromPreference,
	localeFromTag,
	resolveLocale,
	resolveTranslatedLocale,
	SOURCE_LOCALE,
	TRANSLATED_LOCALES,
	type TranslatedLocale,
} from "./locales"
import { pickerStrings } from "./namespaces/picker"
import { createPickerTranslator, formatPickerString, type PickerStringKey } from "./picker"
import { createTranslator, NAMESPACES, type Namespace, splitOnPlaceholder } from "./strings"

const NAMESPACE_NAMES = Object.keys(NAMESPACES) as Namespace[]

describe("namespace tables", () => {
	// The guideline requires tooltip/label copy to go through a table; a key that
	// exists in one locale only is the failure mode that ships half-translated UI.
	// Checked for every namespace, so a new one cannot be added untranslated.
	it("covers exactly the same keys in every locale of every namespace", () => {
		for (const namespace of NAMESPACE_NAMES) {
			const english = Object.keys(NAMESPACES[namespace].en).sort()
			for (const locale of TRANSLATED_LOCALES) {
				const keys = Object.keys(NAMESPACES[namespace][locale] ?? {}).sort()
				expect(keys, `${namespace}.${locale} must cover ${namespace}.en`).toEqual(english)
			}
		}
	})

	it("has no empty translation in any locale", () => {
		for (const namespace of NAMESPACE_NAMES) {
			for (const locale of TRANSLATED_LOCALES) {
				for (const [key, value] of Object.entries(NAMESPACES[namespace][locale] ?? {})) {
					expect(value, `${namespace}.${locale}.${key} must not be empty`).toBeTruthy()
				}
			}
		}
	})

	// A translation that drops or renames a `{name}` marker renders the marker itself —
	// or silently loses the value it stood for. A reviewer reading tables by eye will not
	// catch it; this does, for every key of every namespace.
	it("keeps the same placeholder names in every locale", () => {
		const placeholders = (text: string) => (text.match(/\{(\w+)\}/g) ?? []).sort()
		for (const namespace of NAMESPACE_NAMES) {
			for (const [key, english] of Object.entries(NAMESPACES[namespace].en)) {
				for (const locale of TRANSLATED_LOCALES) {
					const table = NAMESPACES[namespace][locale] as Record<string, string> | undefined
					expect(placeholders(table?.[key] ?? ""), `${namespace}.${locale}.${key}`).toEqual(placeholders(english))
				}
			}
		}
	})

	it("keeps the picker's capability colours' labels distinct per locale", () => {
		const labels = ["capLabelReasoning", "capLabelThinking", "capLabelVision"] as const
		for (const locale of TRANSLATED_LOCALES) {
			const values = labels.map((key) => pickerStrings[locale][key])
			expect(new Set(values).size, `${locale} capability labels must be unique`).toBe(values.length)
		}
	})
})

describe("createTranslator", () => {
	it("returns Thai copy for Thai and English for English", () => {
		expect(createTranslator("th", "picker")("sectionFree")).toBe(pickerStrings.th.sectionFree)
		expect(createTranslator("en", "picker")("sectionFree")).toBe("Free")
	})

	it("falls back to English rather than blank copy for an unknown key", () => {
		expect(createPickerTranslator("th")("notAKey" as PickerStringKey)).toBe("notAKey")
	})

	it("fills placeholders and leaves an unfilled one visible", () => {
		const translate = createPickerTranslator("en")
		expect(formatPickerString(translate, "effortClampNearest", { requested: "Max", applied: "High" })).toBe(
			"Max → High · this model does not accept Max, so High is sent",
		)
		expect(formatPickerString(translate, "effortClampNearest", { requested: "Max" })).toContain("{applied}")
	})
})

/**
 * Sentences that carry links are composed from placeholders, so the copy itself has to
 * stay composable: a translation that mistypes a placeholder leaks `{quickFixes}` to
 * the screen, and one that drops it silently reorders the sentence. Asserting the
 * composed result per locale catches both, and pins the English source's wording.
 */
/**
 * Stitch a two-link sentence together exactly as its component does: split the notice on
 * its first placeholder, split the remainder on the second, and put the labels between
 * the pieces. The component and this helper must agree, which is what makes the
 * assertions below meaningful.
 */
function composeLinkedSentence(title: string, notice: string, labels: [string, string], placeholders: [string, string]): string {
	const [beforeFirst, afterFirst] = splitOnPlaceholder(notice, placeholders[0])
	const [between, afterSecond] = splitOnPlaceholder(afterFirst, placeholders[1])
	return `${title} ${beforeFirst}${labels[0]}${between}${labels[1]}${afterSecond}`.trim()
}

const TERMINAL_SENTENCE_PLACEHOLDERS: [string, string] = ["quickFixes", "guide"]

describe("sentences with inline links", () => {
	it("keeps the English terminal sentence in one readable order", () => {
		const translate = createTranslator("en", "settings")
		expect(
			composeLinkedSentence(
				translate("terminalIssuesTitle"),
				translate("terminalIssuesNotice"),
				[translate("terminalIssuesQuickFixes"), translate("terminalIssuesGuide")],
				TERMINAL_SENTENCE_PLACEHOLDERS,
			),
		).toBe("Having terminal issues? Check our Terminal Quick Fixes or the Complete Troubleshooting Guide.")
	})

	// Every locale has to compose the same way: a translation that mistypes a placeholder
	// leaks `{quickFixes}` onto the screen, and the sentence is the thing a user reads.
	for (const locale of TRANSLATED_LOCALES) {
		it(`composes the terminal sentence in ${locale} without leaking a placeholder`, () => {
			const translate = createTranslator(locale, "settings")
			const composed = composeLinkedSentence(
				translate("terminalIssuesTitle"),
				translate("terminalIssuesNotice"),
				[translate("terminalIssuesQuickFixes"), translate("terminalIssuesGuide")],
				TERMINAL_SENTENCE_PLACEHOLDERS,
			)
			expect(composed).not.toMatch(/\{\w+\}/)
			expect(composed).toContain(translate("terminalIssuesQuickFixes"))
			expect(composed).toContain(translate("terminalIssuesGuide"))
		})
	}

	it("keeps the English telemetry sentence in one readable order", () => {
		const translate = createTranslator("en", "settings")
		expect(
			composeLinkedSentence(
				"",
				translate("telemetryNotice"),
				[translate("telemetryOverviewLink"), translate("telemetryPrivacyLink")],
				["overview", "privacy"],
			),
		).toBe(
			"Help improve Cline by sending usage data and error reports. No code, prompts, or personal information are ever sent. See our telemetry overview and privacy policy for more details.",
		)
	})
})

describe("locale tags", () => {
	it("names every language the Settings picker can produce", () => {
		// The two lists must not drift: a language the picker offers but no tag exists
		// for would silently render English forever.
		expect([...LOCALE_TAGS].sort()).toEqual(LANGUAGE_OPTIONS.map((option) => option.key).sort())
		expect(new Set(LOCALE_TAGS).size).toBe(LOCALE_TAGS.length)
	})

	it("translates into a subset of those tags", () => {
		for (const locale of TRANSLATED_LOCALES) {
			expect(LOCALE_TAGS, `${locale} must be a tag the picker can produce`).toContain(locale)
		}
		expect(TRANSLATED_LOCALES).toContain(SOURCE_LOCALE)
	})
})

describe("localeFromPreference", () => {
	it("maps the stored display names, including non-English ones", () => {
		expect(localeFromPreference("English")).toBe("en")
		expect(localeFromPreference("Thai - ไทย")).toBe("th")
		expect(localeFromPreference("Japanese - 日本語")).toBe("ja")
		expect(localeFromPreference("Portuguese - Português (Brasil)")).toBe("pt-BR")
		expect(localeFromPreference("Portuguese - Português (Portugal)")).toBe("pt-PT")
	})

	it("does not invent a language for a value that is not one of ours", () => {
		expect(localeFromPreference("Klingon")).toBeUndefined()
		expect(localeFromPreference("")).toBeUndefined()
		expect(localeFromPreference(undefined)).toBeUndefined()
	})
})

describe("localeFromTag", () => {
	it("matches exactly, case-insensitively, in either separator style", () => {
		expect(localeFromTag("en-US")).toBe("en")
		expect(localeFromTag("th-TH")).toBe("th")
		expect(localeFromTag("pt-BR")).toBe("pt-BR")
		expect(localeFromTag("pt_br")).toBe("pt-BR")
		expect(localeFromTag("zh-TW")).toBe("zh-TW")
	})

	it("falls back to the primary subtag only when that is unambiguous", () => {
		expect(localeFromTag("th")).toBe("th")
		expect(localeFromTag("fr-CA")).toBe("fr")
		// pt-BR and pt-PT both claim `pt`, and no alias settles it, so a bare `pt`
		// must not be guessed at.
		expect(localeFromTag("pt")).toBeUndefined()
	})

	it("resolves the Chinese spellings a system may report", () => {
		expect(localeFromTag("zh")).toBe("zh-CN")
		expect(localeFromTag("zh-Hans")).toBe("zh-CN")
		expect(localeFromTag("zh-Hans-CN")).toBe("zh-CN")
		expect(localeFromTag("zh-Hant")).toBe("zh-TW")
		expect(localeFromTag("zh-TW")).toBe("zh-TW")
	})

	it("ignores tags it does not know", () => {
		expect(localeFromTag("kl-GL")).toBeUndefined()
		expect(localeFromTag("")).toBeUndefined()
		expect(localeFromTag(undefined)).toBeUndefined()
	})
})

describe("resolveLocale", () => {
	it("honours an explicit language setting", () => {
		expect(resolveLocale({ preferredLanguage: "Thai - ไทย" })).toBe("th")
	})
})

describe("resolveTranslatedLocale", () => {
	const cases: Array<[string, Parameters<typeof resolveTranslatedLocale>[0], TranslatedLocale]> = [
		["an explicit Thai setting", { preferredLanguage: "Thai - ไทย" }, "th"],
		["the VS Code language when the setting is untouched", { systemLanguage: "th-TH" }, "th"],
		["the explicit setting over an English VS Code", { preferredLanguage: "Thai - ไทย", systemLanguage: "en-US" }, "th"],
		["English when nothing identifies a language", {}, "en"],
		["English for empty inputs", { preferredLanguage: "", systemLanguage: "" }, "en"],
		["Japanese from the setting", { preferredLanguage: "Japanese - 日本語" }, "ja"],
		["Japanese from the VS Code language", { systemLanguage: "ja" }, "ja"],
		["Simplified Chinese from the setting", { preferredLanguage: "Simplified Chinese - 简体中文" }, "zh-CN"],
		["Simplified Chinese from an alias tag", { systemLanguage: "zh-Hans-CN" }, "zh-CN"],
		// Traditional Chinese is offered by the picker but has no table yet, so it is a
		// named language that degrades — the case the extensibility design promises.
		[
			"English for Traditional Chinese, which has no table yet",
			{ preferredLanguage: "Traditional Chinese - 繁體中文" },
			"en",
		],
		// The point of separating the two steps: we can name Turkish, we just have no
		// Turkish copy yet, and naming it must not produce blanks or raw keys.
		[
			"English for a language we know but have not translated",
			{ preferredLanguage: "Turkish - Türkçe", systemLanguage: "tr-TR" },
			"en",
		],
		["English for a tag we cannot place at all", { systemLanguage: "kl-GL" }, "en"],
	]

	for (const [name, input, expected] of cases) {
		it(`resolves to ${expected} for ${name}`, () => {
			expect(resolveTranslatedLocale(input)).toBe(expected)
		})
	}

	it("keeps the tag it resolved even when it cannot be rendered", () => {
		// "we know your language" must stay distinguishable from "we do not" — the
		// Settings summary and any future partial-locale notice both need the tag.
		expect(resolveLocale({ preferredLanguage: "Korean - 한국어" })).toBe("ko")
		expect(resolveTranslatedLocale({ preferredLanguage: "Korean - 한국어" })).toBe("en")
	})
})
