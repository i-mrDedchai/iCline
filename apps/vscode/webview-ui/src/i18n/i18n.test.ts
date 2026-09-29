import { describe, expect, it } from "vitest"
import { resolvePickerLocale } from "./pickerLocale"
import { createPickerTranslator, PICKER_STRINGS, type PickerStringKey } from "./pickerStrings"

const EN_KEYS = Object.keys(PICKER_STRINGS.en) as PickerStringKey[]
const TH_KEYS = Object.keys(PICKER_STRINGS.th) as PickerStringKey[]

describe("picker string map", () => {
	// The guideline requires tooltip/label copy to go through the map; a key that
	// exists in one locale only is the failure mode that ships half-translated UI.
	it("covers exactly the same keys in every locale", () => {
		expect([...TH_KEYS].sort()).toEqual([...EN_KEYS].sort())
	})

	it("has no empty translation in any locale", () => {
		for (const [locale, table] of Object.entries(PICKER_STRINGS)) {
			for (const [key, value] of Object.entries(table)) {
				expect(value, `${locale}.${key} must not be empty`).toBeTruthy()
			}
		}
	})

	it("keeps the capability colours' labels distinct per locale", () => {
		const labels = ["capLabelReasoning", "capLabelThinking", "capLabelVision"] as const
		for (const locale of ["en", "th"] as const) {
			const values = labels.map((key) => PICKER_STRINGS[locale][key])
			expect(new Set(values).size, `${locale} capability labels must be unique`).toBe(values.length)
		}
	})
})

describe("createPickerTranslator", () => {
	it("returns Thai copy for the Thai locale and English for English", () => {
		expect(createPickerTranslator("th")("sectionFree")).toBe(PICKER_STRINGS.th.sectionFree)
		expect(createPickerTranslator("en")("sectionFree")).toBe("Free")
	})

	it("falls back to English rather than blank copy for an unknown key", () => {
		const translate = createPickerTranslator("th")
		expect(translate("notAKey" as PickerStringKey)).toBe("notAKey")
	})
})

describe("resolvePickerLocale", () => {
	it("honours an explicit Thai language setting", () => {
		expect(resolvePickerLocale({ preferredLanguage: "Thai - ไทย" })).toBe("th")
	})

	it("follows the VS Code language when the setting is untouched", () => {
		expect(resolvePickerLocale({ systemLanguage: "th" })).toBe("th")
		expect(resolvePickerLocale({ systemLanguage: "th-TH" })).toBe("th")
		expect(resolvePickerLocale({ systemLanguage: "en-US" })).toBe("en")
	})

	it("lets the Thai setting win over an English VS Code", () => {
		expect(resolvePickerLocale({ preferredLanguage: "Thai - ไทย", systemLanguage: "en-US" })).toBe("th")
	})

	it("defaults to English when nothing identifies a language", () => {
		expect(resolvePickerLocale()).toBe("en")
		expect(resolvePickerLocale({ preferredLanguage: "", systemLanguage: "" })).toBe("en")
	})

	it("does not mistake an unrelated language for Thai", () => {
		expect(resolvePickerLocale({ preferredLanguage: "Turkish - Türkçe", systemLanguage: "tr-TR" })).toBe("en")
	})
})
