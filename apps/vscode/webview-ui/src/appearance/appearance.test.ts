import { describe, expect, it } from "vitest"
import {
	APPEARANCE_CHOICES,
	APPEARANCE_ICONS,
	DEFAULT_COMPLETED_ICON,
	DEFAULT_REPLY_ICON,
	resolveAppearanceAccent,
	resolveAppearanceFill,
	resolveAppearanceOpacity,
} from "./appearance"

describe("resolveAppearanceAccent", () => {
	it("resolves each token's theme default", () => {
		expect(resolveAppearanceAccent("completed", "theme")).toBe("var(--vscode-charts-blue)")
		expect(resolveAppearanceAccent("reply", "theme")).toBe("var(--vscode-charts-purple)")
		expect(resolveAppearanceAccent("cline", "theme")).toBe("#9663F1")
	})

	it("treats a missing choice as the theme default", () => {
		expect(resolveAppearanceAccent("completed", undefined)).toBe("var(--vscode-charts-blue)")
		expect(resolveAppearanceAccent("reply", "")).toBe("var(--vscode-charts-purple)")
	})

	it("degrades an unknown id to the token default instead of garbage", () => {
		expect(resolveAppearanceAccent("completed", "hot-pink")).toBe("var(--vscode-charts-blue)")
		expect(resolveAppearanceAccent("reply", "hot-pink")).toBe("var(--vscode-charts-purple)")
		expect(resolveAppearanceAccent("cline", "hot-pink")).toBe("#9663F1")
	})

	it("resolves every named choice to a theme variable", () => {
		expect(resolveAppearanceAccent("completed", "green")).toBe("var(--vscode-charts-green)")
		expect(resolveAppearanceAccent("reply", "blue")).toBe("var(--vscode-charts-blue)")
		expect(resolveAppearanceAccent("cline", "cyan")).toBe("var(--vscode-terminal-ansiCyan)")
		expect(resolveAppearanceAccent("completed", "teal")).toBe("var(--vscode-terminal-ansiTeal)")
		expect(resolveAppearanceAccent("reply", "purple")).toBe("var(--vscode-charts-purple)")
	})

	it("offers exactly the choices the tab renders", () => {
		expect(APPEARANCE_CHOICES).toEqual(["theme", "green", "blue", "cyan", "teal", "purple", "yellow", "orange"])
	})

	it("resolves the warm choices to theme variables", () => {
		expect(resolveAppearanceAccent("completed", "yellow")).toBe("var(--vscode-charts-yellow)")
		expect(resolveAppearanceAccent("reply", "orange")).toBe("var(--vscode-charts-orange)")
	})
})

describe("resolveAppearanceOpacity", () => {
	it("treats slider 50 as the pre-opacity look", () => {
		expect(resolveAppearanceOpacity(50)).toBe(1)
	})

	it("fades below 50 and deepens above, clamped at double", () => {
		expect(resolveAppearanceOpacity(0)).toBe(0)
		expect(resolveAppearanceOpacity(25)).toBe(0.5)
		expect(resolveAppearanceOpacity(100)).toBe(2)
	})

	it("degrades missing or garbage values to the default look", () => {
		expect(resolveAppearanceOpacity(undefined)).toBe(1)
		expect(resolveAppearanceOpacity(Number.NaN)).toBe(1)
	})
})

describe("resolveAppearanceFill", () => {
	it("reproduces the pre-opacity ratios at slider 50", () => {
		expect(resolveAppearanceFill("var(--vscode-charts-blue)", 0.1, 50)).toBe(
			"color-mix(in srgb, var(--vscode-charts-blue) 10%, transparent)",
		)
		expect(resolveAppearanceFill("var(--vscode-charts-blue)", 0.2, 50)).toBe(
			"color-mix(in srgb, var(--vscode-charts-blue) 20%, transparent)",
		)
	})

	it("scales with the slider and clamps at fully opaque", () => {
		expect(resolveAppearanceFill("#9663F1", 0.1, 100)).toBe("color-mix(in srgb, #9663F1 20%, transparent)")
		expect(resolveAppearanceFill("#9663F1", 1, 100)).toBe("color-mix(in srgb, #9663F1 100%, transparent)")
		expect(resolveAppearanceFill("#9663F1", 0.1, 0)).toBe("color-mix(in srgb, #9663F1 0%, transparent)")
	})
})

describe("appearance icons", () => {
	it("offers twelve picker options", () => {
		expect(APPEARANCE_ICONS).toHaveLength(12)
	})

	it("defaults to the mock-approved icons", () => {
		expect(DEFAULT_COMPLETED_ICON).toBe("🎉")
		expect(DEFAULT_REPLY_ICON).toBe("⭐")
	})
})
