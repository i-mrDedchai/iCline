import { describe, expect, it } from "vitest"
import { APPEARANCE_CHOICES, resolveAppearanceAccent } from "./appearance"

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
		expect(APPEARANCE_CHOICES).toEqual(["theme", "green", "blue", "cyan", "teal", "purple"])
	})
})
