/**
 * Guard for the iCline menu conventions (`@/icline/menuPopover`).
 *
 * Documented rules rot: the reason the anchoring rule, the hand cursor and the text caret
 * are a module is so the NEXT menu surface cannot quietly do its own thing. Three of those
 * four claims cannot be seen from a rendered DOM — jsdom has no layout for the anchoring,
 * and Tailwind classes are not compiled into it, so a class check would only ever assert
 * that the class name is in the string. So this guard reads the SOURCE of every menu
 * surface instead and fails on:
 *
 *  1. a `<PopoverContent …data-icline-…>` surface — the project's own marker for "this is
 *     an iCline surface" — that does not carry `MENU_SURFACE_CLASS` (rule 2: the hand over
 *     the whole menu, not just its rows);
 *  2. such a surface that does not take its `align` from the shared hook (rule 1: the edge
 *     has to be decided from the pane, never hard-coded);
 *  3. a surface that does not import `@/icline/menuPopover` at all — the tell that it was
 *     written without knowing the conventions exist;
 *  4. an `<input>` inside a surface that does not carry `MENU_TEXT_FIELD_CLASS` (rule 3:
 *     the field keeps the text caret the wrapper's hand cursor would otherwise swallow).
 *
 * The scan is liveness-checked at the bottom: a scan that finds nothing must fail loudly
 * rather than pass, which is how conventions guards usually die.
 */
import { readdirSync, readFileSync } from "node:fs"
import * as path from "node:path"
import { describe, expect, it } from "vitest"
import { MENU_SURFACE_CLASS, MENU_TEXT_FIELD_CLASS } from "./menuPopover"

const SRC_ROOT = path.resolve(__dirname, "..")

/** Files that are not menus: the popover primitive itself, its stories, and any test. */
const NOT_A_SURFACE = [/(^|[\\/])ui[\\/]popover\.tsx$/, /\.stories\./, /\.(test|spec)\./]

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			return sourceFiles(full)
		}
		if (!entry.name.endsWith(".tsx") && !entry.name.endsWith(".ts")) {
			return []
		}
		return NOT_A_SURFACE.some((pattern) => pattern.test(full)) ? [] : [full]
	})
}

/**
 * Text of every `<Tag …>` opening tag in a file. JSX-aware enough for this codebase: it
 * tracks quotes and brace depth, so a `>` inside a string, an arrow function or a
 * comparison in an attribute expression does not end the tag early.
 */
function findOpeningTags(source: string, tag: string): string[] {
	const tags: string[] = []
	const needle = `<${tag}`
	let index = source.indexOf(needle)
	while (index !== -1) {
		let depth = 0
		let quote: string | null = null
		let end = -1
		for (let i = index + needle.length; i < source.length; i++) {
			const char = source[i]
			if (quote) {
				if (char === quote) {
					quote = null
				}
				continue
			}
			if (char === '"' || char === "'" || char === "`") {
				quote = char
				continue
			}
			if (char === "{") {
				depth++
				continue
			}
			if (char === "}") {
				depth--
				continue
			}
			if (char === ">" && depth === 0) {
				end = i
				break
			}
		}
		if (end === -1) {
			break
		}
		tags.push(source.slice(index, end + 1))
		index = source.indexOf(needle, end)
	}
	return tags
}

interface MenuSurface {
	file: string
	tag: string
}

/** Every iCline menu surface in the webview: a PopoverContent tagged `data-icline-*`. */
function findMenuSurfaces(): MenuSurface[] {
	return sourceFiles(SRC_ROOT).flatMap((file) => {
		const source = readFileSync(file, "utf-8")
		return findOpeningTags(source, "PopoverContent")
			.filter((tag) => tag.includes("data-icline-"))
			.map((tag) => ({ file: path.relative(SRC_ROOT, file), tag }))
	})
}

describe("iCline menu conventions", () => {
	it("finds the menu surfaces at all — a scan that sees nothing must not pass", () => {
		const surfaces = findMenuSurfaces()
		// Two today: the model list and the composer's Options popover, both in the picker. A
		// third is welcome — this assertion is here so a broken scan cannot masquerade as a
		// green guard, and so the constant below is reviewed when the set changes.
		expect(surfaces.length).toBeGreaterThanOrEqual(2)
		expect(surfaces.map((surface) => surface.file)).toContain(path.join("components", "chat", "QuickModelPicker.tsx"))
	})

	it("gives every menu the hand cursor over its whole body", () => {
		for (const { file, tag } of findMenuSurfaces()) {
			expect(tag, `${file}: menu body must carry MENU_SURFACE_CLASS`).toMatch(
				new RegExp(`MENU_SURFACE_CLASS|${MENU_SURFACE_CLASS}`),
			)
		}
	})

	it("takes each menu's edge from the pane, never from a hard-coded align", () => {
		for (const { file, tag } of findMenuSurfaces()) {
			expect(tag, `${file}: align must come from useMenuPopoverAnchor`).toMatch(/align=\{/)
			expect(tag, `${file}: align must not be a literal`).not.toMatch(/align="(start|end|center)"/)
		}
	})

	it("keeps the text caret in a menu's fields", () => {
		for (const file of sourceFiles(SRC_ROOT)) {
			const source = readFileSync(file, "utf-8")
			if (!findOpeningTags(source, "PopoverContent").some((tag) => tag.includes("data-icline-"))) {
				continue
			}
			for (const tag of findOpeningTags(source, "input")) {
				expect(tag, `${path.relative(SRC_ROOT, file)}: menu fields must carry MENU_TEXT_FIELD_CLASS`).toMatch(
					new RegExp(`MENU_TEXT_FIELD_CLASS|${MENU_TEXT_FIELD_CLASS}`),
				)
			}
		}
	})

	it("imports the shared module in every file that renders a menu", () => {
		for (const { file } of findMenuSurfaces()) {
			const source = readFileSync(path.join(SRC_ROOT, file), "utf-8")
			expect(source, `${file}: must import @/icline/menuPopover`).toMatch(/from "@\/icline\/menuPopover"/)
		}
	})
})
