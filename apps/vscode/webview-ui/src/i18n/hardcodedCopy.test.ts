import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * The guard that keeps a migrated surface migrated.
 *
 * Moving copy into `@/i18n` is a one-time edit, but nothing stops the next change
 * from typing a new English label straight into the JSX — and the regression is
 * invisible until someone switches the interface language and finds one line still
 * in English. So every file listed here is scanned for user-visible text that is not
 * coming from a translator: JSX text nodes, and the attributes screen readers and
 * tooltips read out (`title`, `placeholder`, `aria-label`, `label`).
 *
 * Add a file to `MIGRATED` in the same commit that migrates it. The list is the
 * worklist too: what is not on it yet is simply not migrated yet, not exempt
 * forever.
 */
const MIGRATED = [
	"components/settings/PreferredLanguageSetting.tsx",
	"components/settings/sections/GeneralSettingsSection.tsx",
	// Migrated in the picker round; kept here so a new English string cannot slip in
	// beside the translator that is already in use.
	"components/chat/ModelOptionsPanel.tsx",
	"components/chat/ModelStatusIcons.tsx",
	"components/chat/QuickModelPicker.tsx",
	"components/common/OrgProviderPolicyNotice.tsx",
	"components/common/ReasoningEffortNotice.tsx",
	"components/settings/ReasoningEffortSelector.tsx",
]

/**
 * Files allowed to contain copy-like literals for reasons that are not translation
 * problems. `PreferredLanguageSetting` renders the language list, whose entries ARE
 * the stored values ("Thai - ไทย") rather than copy; those come from `@shared/Languages`
 * and therefore never appear as literals here, so it needs no exemption — this list
 * stays empty until something genuinely does.
 */
const EXEMPT: ReadonlyArray<string> = []

const SRC_DIR = join(__dirname, "..")

/** Text sitting directly between two tags, e.g. `>Download<`. */
const JSX_TEXT = />[^<>{}\n]*[A-Za-z][^<>{}\n]*</g
/** A user-facing attribute given a literal instead of a translated expression. */
const LITERAL_ATTRIBUTE = /\b(title|placeholder|aria-label|label)=(["'])[^"'{}\n]{3,}\2/g
/** Anything that looks like a word: rejects `</div>`, `>=`, punctuation-only nodes. */
const LOOKS_LIKE_COPY = /[A-Za-z]{2}/
/**
 * The two heuristics that keep TypeScript out of a text scan, both pinned by the
 * `scan itself` test below:
 * - `Set<PickerStringKey> = new Set<…>` looks exactly like `>text<` to a regex, so a
 *   text node with an operator in it is type syntax, not copy.
 * - `</p>` and `/>` leave empty or punctuation-only nodes, and copy starts with a
 *   letter, a digit or an opening quote rather than with a closer.
 */
const LOOKS_LIKE_TYPE_SYNTAX = /[=<>]/
const STARTS_LIKE_COPY = /^[A-Za-z0-9"'(]/

function violations(file: string): string[] {
	const source = readFileSync(join(SRC_DIR, file), "utf8")
	const found: string[] = []
	for (const match of source.match(JSX_TEXT) ?? []) {
		const text = match.slice(1, -1).trim()
		if (STARTS_LIKE_COPY.test(text) && !LOOKS_LIKE_TYPE_SYNTAX.test(text) && LOOKS_LIKE_COPY.test(text)) {
			found.push(`text node: ${text}`)
		}
	}
	for (const match of source.match(LITERAL_ATTRIBUTE) ?? []) {
		found.push(`attribute: ${match}`)
	}
	return found
}

describe("migrated surfaces carry no hardcoded copy", () => {
	for (const file of MIGRATED) {
		if (EXEMPT.includes(file)) {
			continue
		}

		it(`${file} renders only translated user-visible strings`, () => {
			expect(violations(file)).toEqual([])
		})

		it(`${file} goes through the i18n core`, () => {
			const source = readFileSync(join(SRC_DIR, file), "utf8")
			expect(source, "must import from @/i18n").toMatch(/from "@\/i18n\//)
		})
	}
})

describe("the scan itself", () => {
	it("catches a text node, an attribute and a translated expression alike", () => {
		const source = `
			const Bad = () => <button title="Save changes">Save changes</button>
			const Good = () => <button title={tr("save")}>{tr("save")}</button>
			const Numbers = () => <span>{count}</span>
		`
		const found: string[] = []
		for (const match of source.match(JSX_TEXT) ?? []) {
			const text = match.slice(1, -1).trim()
			if (STARTS_LIKE_COPY.test(text) && !LOOKS_LIKE_TYPE_SYNTAX.test(text) && LOOKS_LIKE_COPY.test(text)) {
				found.push(text)
			}
		}
		const attributes = source.match(LITERAL_ATTRIBUTE) ?? []
		expect(found).toEqual(["Save changes"])
		expect(attributes).toEqual(['title="Save changes"'])
	})

	it("does not mistake TypeScript for copy", () => {
		const source = `
			const NAMES: ReadonlySet<PickerStringKey> = new Set<PickerStringKey>(["effortMax"])
			const Node = () => <span className="text-xs" />
		`
		const found: string[] = []
		for (const match of source.match(JSX_TEXT) ?? []) {
			const text = match.slice(1, -1).trim()
			if (STARTS_LIKE_COPY.test(text) && !LOOKS_LIKE_TYPE_SYNTAX.test(text) && LOOKS_LIKE_COPY.test(text)) {
				found.push(text)
			}
		}
		expect(found).toEqual([])
	})
})
