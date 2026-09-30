/**
 * The Appearance tab's accent model.
 *
 * The stored setting holds a *choice id*, never a color: resolution lives in
 * `resolveAppearanceAccent`, so an unknown or missing id degrades to the
 * token default instead of rendering unreadable copy. Every choice follows
 * the editor theme (no fixed hex), which is what keeps contrast correct in
 * both light and dark modes without a theme detector.
 */

/** The ids the Appearance tab offers. `"theme"` is the default: follow the editor theme. */
export type AppearanceAccentId = "theme" | "green" | "blue" | "cyan" | "teal" | "purple"

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
export const APPEARANCE_CHOICES: AppearanceAccentId[] = ["theme", "green", "blue", "cyan", "teal", "purple"]

export function resolveAppearanceAccent(token: AppearanceToken, choice: string | undefined): string {
	if (!choice || choice === "theme") {
		return TOKEN_DEFAULTS[token]
	}
	return THEME_ACCENTS[choice as Exclude<AppearanceAccentId, "theme">] ?? TOKEN_DEFAULTS[token]
}
