/**
 * The string registry: every namespace of copy the webview can render, and the
 * translator that picks a locale out of it.
 *
 * A namespace owns one table per translated locale and describes one surface (the
 * Quick Picker and its shared notices are `picker`; the Settings section added in
 * the next round gets its own). Keeping them separate is what makes the tables
 * reviewable — one flat map of every string in the app would be a merge conflict
 * magnet and would carry no clue about where a key belongs.
 *
 * `en` is the source of truth: the key set is derived from it, every other locale
 * must cover it exactly (enforced in `i18n.test.ts`), and anything missing at
 * runtime falls back through locale → English → the key itself, so no code path
 * can render blank copy.
 */
import type { TranslatedLocale } from "./locales"
import { appearanceStrings } from "./namespaces/appearance"
import { customizeStrings } from "./namespaces/customize"
import { pickerStrings } from "./namespaces/picker"
import { providersStrings } from "./namespaces/providers"
import { quickStartStrings } from "./namespaces/quickStart"
import { settingsStrings } from "./namespaces/settings"
import { surfacesStrings } from "./namespaces/surfaces"

/** A namespace's copy: a complete table per locale the core can render. */
export type NamespaceTables<Keys extends string = string> = Record<TranslatedLocale, Record<Keys, string>>

export const NAMESPACES = {
	appearance: appearanceStrings,
	customize: customizeStrings,
	picker: pickerStrings,
	providers: providersStrings,
	quickStart: quickStartStrings,
	settings: settingsStrings,
	surfaces: surfacesStrings,
}

export type Namespace = keyof typeof NAMESPACES
export type StringKey<N extends Namespace> = keyof (typeof NAMESPACES)[N]["en"] & string
export type Translator<N extends Namespace> = (key: StringKey<N>) => string

/** A translator for one namespace in one locale. */
export function createTranslator<N extends Namespace>(locale: TranslatedLocale, namespace: N): Translator<N> {
	const tables = NAMESPACES[namespace] as NamespaceTables
	const english = tables.en
	// A locale listed as translated before its table lands degrades to English
	// instead of rendering nothing.
	const localized = tables[locale] ?? english
	return ((key: string) => localized[key] ?? english[key] ?? key) as Translator<N>
}

/**
 * Fill `{name}` placeholders in a translated string. A missing value is left as the
 * literal placeholder rather than rendering "undefined" — a visibly incomplete
 * sentence is easier to fix than a plausible wrong one.
 */
export function formatString<N extends Namespace>(
	translate: Translator<N>,
	key: StringKey<N>,
	values: Record<string, string | number>,
): string {
	return translate(key).replace(/\{(\w+)\}/g, (placeholder, name: string) =>
		values[name] !== undefined ? String(values[name]) : placeholder,
	)
}

/**
 * Split a translated sentence on one `{name}` placeholder, so a link (or any element)
 * can be interleaved into it and each language keeps its own word order.
 *
 * The alternative — several keys glued together in the component — freezes English
 * word order into the layout, which reads as broken prose in languages that put the
 * link somewhere else. A translator who drops the placeholder still gets a whole
 * sentence back rather than a crash: the link lands after it.
 */
export function splitOnPlaceholder(text: string, name: string): [before: string, after: string] {
	const token = `{${name}}`
	const index = text.indexOf(token)
	return index === -1 ? [text, ""] : [text.slice(0, index), text.slice(index + token.length)]
}
