/**
 * The Appearance tab's accent model.
 *
 * The stored setting holds a *choice id*, never a color: resolution lives in
 * `resolveAppearanceAccent`, so an unknown or missing id degrades to the
 * token default instead of rendering unreadable copy. Every choice follows
 * the editor theme (no fixed hex), which is what keeps contrast correct in
 * both light and dark modes without a theme detector.
 */
import type { AppearanceStringKey } from "@/i18n/namespaces/appearance"

/** The ids the Appearance tab offers. `"theme"` is the default: follow the editor theme. */
export type AppearanceAccentId = "theme" | "green" | "blue" | "cyan" | "teal" | "purple" | "yellow" | "orange"

/** The surfaces whose accent the user can tune. One CSS variable each. */
export type AppearanceToken = "completed" | "reply" | "cline"

/** The CSS variable each tunable surface reads. */
export const TOKEN_CSS_VARS: Record<AppearanceToken, string> = {
	completed: "--color-completed",
	reply: "--color-reply",
	cline: "--color-cline",
}

/** What a named choice resolves to, everywhere. Theme variables, never hex. */
const THEME_ACCENTS: Record<Exclude<AppearanceAccentId, "theme">, string> = {
	green: "var(--vscode-charts-green)",
	blue: "var(--vscode-charts-blue)",
	cyan: "var(--vscode-terminal-ansiCyan)",
	teal: "var(--vscode-terminal-ansiTeal)",
	purple: "var(--vscode-charts-purple)",
	yellow: "var(--vscode-charts-yellow)",
	orange: "var(--vscode-charts-orange)",
}

/**
 * What `"theme"` (and any unknown id) resolves to per token — the
 * pre-Appearance behavior, kept in one place so the default can never drift
 * from what the stylesheet declares.
 */
const TOKEN_DEFAULTS: Record<AppearanceToken, string> = {
	completed: "var(--vscode-charts-blue)",
	reply: "var(--vscode-charts-purple)",
	cline: "#9663F1",
}

/** All ids the UI may offer, in display order. */
export const APPEARANCE_CHOICES: AppearanceAccentId[] = ["theme", "green", "blue", "cyan", "teal", "purple", "yellow", "orange"]

export function resolveAppearanceAccent(token: AppearanceToken, choice: string | undefined): string {
	if (!choice || choice === "theme") {
		return TOKEN_DEFAULTS[token]
	}
	return THEME_ACCENTS[choice as Exclude<AppearanceAccentId, "theme">] ?? TOKEN_DEFAULTS[token]
}

/**
 * Surface opacity (the per-row slider, 0–100, 50 = the pre-opacity look).
 * Returns the multiplier for the surface's own fill/border ratios:
 * below 50 fades the tint, above 50 deepens it. Out-of-range or missing
 * values degrade to 50 instead of rendering an invisible (or invalid) tint.
 * Copy always stays full-strength — only the tint breathes.
 */
export function resolveAppearanceOpacity(value: number | undefined): number {
	if (typeof value !== "number" || Number.isNaN(value)) {
		return 1
	}
	return Math.min(2, Math.max(0, value / 50))
}

/**
 * A tinted fill/border for a surface: `baseRatio` is the surface's own mix
 * share at slider 50 (completed bg 0.1 / border 0.2, reply bg 0.1 / border
 * 0.3, brand 1), `opacity` the stored 0–100 slider value, `accent` the
 * already-resolved accent for the token. The alpha is clamped to [0, 1] so
 * the result is always valid CSS (an over-100% brand just stays solid).
 */
export function resolveAppearanceFill(accent: string, baseRatio: number, opacity: number | undefined): string {
	const alpha = Math.min(1, Math.max(0, baseRatio * resolveAppearanceOpacity(opacity)))
	const pct = Math.round(alpha * 1000) / 10
	return `color-mix(in srgb, ${accent} ${pct}%, transparent)`
}

/**
 * The palette the icon picker offers, in display order. The stored setting
 * holds the character itself (or `"none"`); `"check"` keeps the legacy
 * lucide check. Names live in the `appearance` namespace (`iconName<Key>`).
 */
export interface AppearanceIconOption {
	char: string
	nameKey: AppearanceStringKey
}

export const APPEARANCE_ICONS: AppearanceIconOption[] = [
	{ char: "✓", nameKey: "iconNameCheck" },
	{ char: "✅", nameKey: "iconNameCheckBox" },
	{ char: "🎉", nameKey: "iconNameParty" },
	{ char: "⭐", nameKey: "iconNameStar" },
	{ char: "🏁", nameKey: "iconNameFlag" },
	{ char: "🚀", nameKey: "iconNameRocket" },
	{ char: "💎", nameKey: "iconNameGem" },
	{ char: "🔥", nameKey: "iconNameFire" },
	{ char: "⚡", nameKey: "iconNameBolt" },
	{ char: "🏆", nameKey: "iconNameTrophy" },
	{ char: "✨", nameKey: "iconNameSparkles" },
	{ char: "🎯", nameKey: "iconNameTarget" },
]

/** Default icons for the two titled surfaces (the mock-approved look). */
export const DEFAULT_COMPLETED_ICON = "🎉"
export const DEFAULT_REPLY_ICON = "⭐"

/**
 * Fill/border CSS variables each tinted surface reads (alpha precomputed by
 * `useAppearanceVars`, so surfaces stay declarative). The brand token reuses
 * `--color-cline` itself with its alpha baked in — the badge/button/alert
 * `cline` variants keep working untouched, and nothing else reads that var
 * expecting it solid.
 */
export const TOKEN_FILL_VARS: Record<Exclude<AppearanceToken, "cline">, { bg: string; border: string }> = {
	completed: { bg: "--color-completed-bg", border: "--color-completed-border" },
	reply: { bg: "--color-reply-bg", border: "--color-reply-border" },
}
