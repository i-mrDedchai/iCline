import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { OPENAI_REASONING_EFFORT_OPTIONS } from "@shared/storage/types"
import { describe, expect, it } from "vitest"
import { resolveModelCapabilities } from "@/icline/pickerCapabilities"
import {
	declaredEffortDefault,
	defaultEffortValue,
	effortBadge,
	firstOnEffortValue,
	hasThinkingBudgetConfig,
	hasThinkingConfig,
	normalizeEffortValue,
	OPENAI_COMPATIBLE_POLICY_ID,
	resolveEffortLevels,
	resolveModelThinkingOptions,
} from "../modelThinkingOptions"

const options = (
	providerId: string,
	modelId: string,
	modelInfo?: Parameters<typeof resolveModelThinkingOptions>[0]["modelInfo"],
	effortIsSet?: boolean,
) => resolveModelThinkingOptions({ providerId, modelId, modelInfo, effortIsSet })

describe("resolveModelThinkingOptions — provider rules", () => {
	it("xAI: effort only where its variants take one, built-in reasoning reported as such", () => {
		expect(options("xai", "grok-3-mini")).toMatchObject({ showEffort: true, effortSource: "model-id" })
		expect(options("xai", "grok-4-non-reasoning")).toMatchObject({
			showEffort: false,
			showThinkingBudget: false,
			builtinReasoning: false,
		})
		expect(options("xai", "grok-4.20-reasoning")).toMatchObject({ builtinReasoning: true, showEffort: false })
		expect(options("xai", "grok-4.20-multi-agent").builtinReasoning).toBe(true)
	})

	it("anthropic: adaptive models get effort, older ones get the budget (list or catalog)", () => {
		expect(options("anthropic", "claude-opus-4.6")).toMatchObject({ showEffort: true, showThinkingBudget: false })
		expect(options("anthropic", "claude-3-7-sonnet-20250219")).toMatchObject({
			showEffort: false,
			showThinkingBudget: true,
			budgetSource: "provider-known-model",
		})
		// Catalog-declared budget wins even for an id the list does not carry.
		expect(options("anthropic", "claude-new-thing", { thinkingConfig: { maxBudget: 4096 } })).toMatchObject({
			showThinkingBudget: true,
			budgetSource: "thinking-config",
		})
		expect(options("anthropic", "claude-opus-4.6-future", { thinkingConfig: { supportsThinkingLevel: true } })).toMatchObject(
			{
				showEffort: true,
				showThinkingBudget: false,
			},
		)
	})

	it("bedrock and claude-code keep their own budget lists", () => {
		expect(options("bedrock", "anthropic.claude-3-7-sonnet-20250219-v1:0").showThinkingBudget).toBe(true)
		expect(options("claude-code", "claude-sonnet-4-20250514").showThinkingBudget).toBe(true)
		expect(options("bedrock", "some-other-model").showThinkingBudget).toBe(false)
	})

	it("gateways: effort for OpenAI-style ids, otherwise a Claude budget", () => {
		for (const providerId of ["openrouter", "vercel-ai-gateway"]) {
			expect(options(providerId, "openai/gpt-5.6")).toMatchObject({ showEffort: true, showThinkingBudget: false })
			expect(options(providerId, "anthropic/claude-3.7-sonnet")).toMatchObject({
				showEffort: false,
				showThinkingBudget: true,
			})
		}
	})

	it("zenmux shows both controls independently", () => {
		expect(options("zenmux", "openai/gpt-5.6", { thinkingConfig: { maxBudget: 1000 } })).toMatchObject({
			showEffort: true,
			showThinkingBudget: true,
		})
	})

	it("vertex routes by the catalog's thinkingLevel flag, then the budget", () => {
		expect(options("vertex", "claude-opus-4-20250514", { supportsReasoning: true, thinkingConfig: {} })).toMatchObject({
			showEffort: false,
			showThinkingBudget: true,
		})
		expect(
			options("vertex", "gemini-3-pro", {
				supportsReasoning: true,
				thinkingConfig: { supportsThinkingLevel: true },
			}),
		).toMatchObject({ showEffort: true, showThinkingBudget: false })
	})

	it("oca needs published effort levels; its budget comes from the catalog", () => {
		expect(options("oca", "gpt-5", { supportsReasoning: true, reasoningEffortOptions: ["low", "high"] })).toMatchObject({
			showEffort: true,
		})
		expect(options("oca", "gpt-5", { supportsReasoning: true, reasoningEffortOptions: [] }).showEffort).toBe(false)
		expect(options("oca", "claude", { thinkingConfig: {} }).showThinkingBudget).toBe(true)
	})

	it("litellm treats a reasoning flag as a budget model (its Settings rule)", () => {
		expect(options("litellm", "some-proxy-model", { supportsReasoning: true })).toMatchObject({
			showEffort: false,
			showThinkingBudget: true,
		})
	})

	it("openai-native and openai-codex decide from the id heuristics", () => {
		expect(options("openai-native", "gpt-5.6").showEffort).toBe(true)
		expect(options("openai-codex", "o3-mini").showEffort).toBe(true)
		expect(options("openai-native", "gpt-4o").showEffort).toBe(true)
	})

	it("the generic OpenAI-compatible form always offers effort", () => {
		expect(options(OPENAI_COMPATIBLE_POLICY_ID, "anything-at-all").effortSource).toBe("provider-always")
		expect(options(OPENAI_COMPATIBLE_POLICY_ID, "anything-at-all").showThinkingBudget).toBe(false)
	})

	it("unknown providers fall back to the picker's long-standing heuristic", () => {
		expect(options("some-new-provider", "deepseek-v4-reasoner").showEffort).toBe(true)
		expect(options("some-new-provider", "claude-sonnet-4-6").showEffort).toBe(true)
		expect(options("some-new-provider", "jan-local-7b", { thinkingConfig: { maxBudget: 2048 } })).toMatchObject({
			showEffort: false,
			showThinkingBudget: true,
		})
		expect(options("some-new-provider", "jan-local-7b")).toMatchObject({
			showEffort: false,
			showThinkingBudget: false,
		})
	})

	it("keeps a stored value reachable — each control for its own value", () => {
		expect(options("some-new-provider", "jan-local-7b", undefined, true)).toMatchObject({
			showEffort: true,
			effortSource: "stored-preference",
		})
		// A stored BUDGET must not turn into an effort control, and vice versa.
		expect(
			resolveModelThinkingOptions({ providerId: "some-new-provider", modelId: "jan-local-7b", budgetIsSet: true }),
		).toMatchObject({ showEffort: false, showThinkingBudget: true, budgetSource: "stored-preference" })
		// A built-in reasoning model with a stored value becomes configurable again.
		expect(options("xai", "grok-4.20-reasoning", undefined, true).builtinReasoning).toBe(false)
	})
})

/**
 * The levels a control offers used to be UI knowledge: the adaptive set was spelled out
 * in six components and Sakana's three levels lived in its own `<VSCodeOption>`s. They
 * are provider metadata now, and these are the entries every dropdown renders.
 */
describe("effort LEVELS are provider metadata", () => {
	const levelsFor = (providerId: string, modelId: string, modelInfo?: Parameters<typeof resolveEffortLevels>[0]["modelInfo"]) =>
		resolveEffortLevels({ providerId, modelId, modelInfo })

	it("OpenAI-style providers offer exactly the shared enum's levels", () => {
		const levels = levelsFor("openai-native", "gpt-5.6")
		expect(levels.id).toBe("openai")
		expect(levels.levels.map((level) => level.value)).toEqual([...OPENAI_REASONING_EFFORT_OPTIONS])
		expect(levels.default).toBe("medium")
		expect(levels.label).toBe("Reasoning Effort")
	})

	it("adaptive-thinking models get the labelled set whose empty state is off", () => {
		const levels = levelsFor("anthropic", "claude-opus-4.6")
		expect(levels.id).toBe("adaptive-thinking")
		expect(levels.label).toBe("Adaptive Thinking")
		expect(levels.default).toBe("none")
		expect(levels.levels.filter((level) => level.isOff).map((level) => level.value)).toEqual(["none"])
	})

	it("Sakana offers its own three levels, with a per-model default", () => {
		const levels = levelsFor("sakana", "fugu")
		expect(levels.id).toBe("sakana")
		expect(levels.levels.map((level) => level.value)).toEqual(["high", "xhigh", "max"])
		expect(levels.levels.map((level) => level.label)).toEqual(["High", "X-High", "Max"])
		// No off level: the picker's switch is the off, and the control is always there.
		expect(levels.levels.some((level) => level.isOff)).toBe(false)
		expect(options("sakana", "fugu").showEffort).toBe(true)
		// Fugu Ultra prefers X-High — provider data, not a component's if-statement.
		expect(defaultEffortValue(levels, "fugu")).toBe("high")
		expect(defaultEffortValue(levels, "fugu-ultra")).toBe("xhigh")
		expect(defaultEffortValue(levels, "fugu-ultra-20260615")).toBe("xhigh")
		// A value outside the OpenAI vocabulary still normalizes and badges.
		expect(effortBadge(levels, "max")).toBe("M")
		expect(normalizeEffortValue(levels, "medium", defaultEffortValue(levels, "fugu"))).toBe("high")
	})

	it("OCA's levels are whatever its own catalog published", () => {
		const info = { supportsReasoning: true, reasoningEffortOptions: ["minimal", "low", "high"] }
		const levels = levelsFor("oca", "gpt-5", info)
		expect(levels.id).toBe("model-declared")
		expect(levels.levels.map((level) => level.value)).toEqual(["minimal", "low", "high"])
		expect(levels.levels[0].label).toBe("Minimal")
		expect(declaredEffortDefault("oca", "gpt-5", info)).toBe("minimal")
		// A model the catalog lists no levels for writes no effort at all.
		expect(declaredEffortDefault("oca", "gpt-5", { supportsReasoning: true, reasoningEffortOptions: [] })).toBeUndefined()
	})

	it("an unconfigured custom endpoint shows None, not a claimed Medium", () => {
		const levels = levelsFor(OPENAI_COMPATIBLE_POLICY_ID, "anything-at-all")
		expect(levels.default).toBe("none")
		// Switching reasoning ON must land on a real level, never back on the off state.
		// The set starts at `minimal` now that the app stores the SDK's full vocabulary.
		expect(firstOnEffortValue(levels)).toBe("minimal")
	})

	it("a catalog that publishes the levels wins over the generic set, whatever the provider", () => {
		const info = { supportsReasoning: true, reasoningEffortOptions: ["minimal", "low", "high", "xhigh"] }
		const levels = levelsFor("openrouter", "some-gateway-model", info)
		expect(levels.id).toBe("model-declared")
		expect(levels.levels.map((level) => level.value)).toEqual(["minimal", "low", "high", "xhigh"])
		// Published values are presented with the shared wording, not raw ids.
		expect(levels.levels.map((level) => level.label)).toEqual(["Minimal", "Low", "High", "X-High"])
	})

	it("a published `none` stays the OFF level, so the panel never offers it as a button", () => {
		const levels = levelsFor("openrouter", "some-gateway-model", {
			supportsReasoning: true,
			reasoningEffortOptions: ["none", "low", "high"],
		})
		expect(levels.levels.filter((level) => level.isOff).map((level) => level.value)).toEqual(["none"])
		expect(firstOnEffortValue(levels)).toBe("low")
	})

	it("Sakana's own vocabulary is a provider contract, so a catalog does not replace it", () => {
		const levels = levelsFor("sakana", "fugu", {
			supportsReasoning: true,
			reasoningEffortOptions: ["low", "medium"],
		})
		expect(levels.id).toBe("sakana")
	})
})

describe("thinking-config predicates", () => {
	it("hasThinkingConfig: presence, unless the model routes thinking through levels", () => {
		expect(hasThinkingConfig({ thinkingConfig: {} })).toBe(true)
		expect(hasThinkingConfig({ thinkingConfig: { maxBudget: 2048 } })).toBe(true)
		expect(hasThinkingConfig({ thinkingConfig: { supportsThinkingLevel: true } })).toBe(false)
		expect(hasThinkingConfig(undefined)).toBe(false)
	})

	it("hasThinkingBudgetConfig: the strict form used for price readouts", () => {
		expect(hasThinkingBudgetConfig({ thinkingConfig: {} })).toBe(false)
		expect(hasThinkingBudgetConfig({ thinkingConfig: { maxBudget: 2048 } })).toBe(true)
	})
})

/**
 * The point of the shared module: one answer for both surfaces. These pairs are the
 * cases where Settings and the Quick Picker used to disagree — the picker's id
 * heuristic claimed effort for every Claude id while Settings offered a budget.
 */
describe("Settings and the Quick Picker resolve the same model identically", () => {
	it("agrees on Anthropic budget models and adaptive models", () => {
		const budgetModel = { supportsReasoning: true, thinkingConfig: { maxBudget: 4096 } }
		for (const providerId of ["anthropic", "claude-code", "bedrock"]) {
			const decision = options(providerId, "claude-sonnet-4-20250514", budgetModel)
			expect(decision.showThinkingBudget).toBe(true)
			expect(decision.showEffort).toBe(false)
		}
		const adaptive = options("anthropic", "claude-opus-4.6", budgetModel)
		expect(adaptive.showEffort).toBe(true)
	})

	it("never claims effort from a Claude id that Settings only gives a budget", () => {
		const status = resolveModelCapabilities("claude-sonnet-4-20250514", {
			supportsReasoning: true,
			thinkingConfig: { maxBudget: 4096 },
		})
		// Capabilities describe the model; the CONTROLS (status.support) come from the
		// shared policy and no longer follow the "sonnet-4" id heuristic.
		expect(status.map((cap) => cap.id)).toContain("reasoning")
		expect(options("anthropic", "claude-sonnet-4-20250514", { thinkingConfig: { maxBudget: 4096 } }).showEffort).toBe(false)
	})
})

/**
 * Guards that keep the policy single-sourced. These scan the Settings tree rather
 * than exercising a function, because the failure they prevent IS a second copy of
 * the rule appearing in a component.
 */
describe("the policy has exactly one home", () => {
	// Resolved from the working directory, since `import.meta.url` is not a file URL
	// under the jsdom test environment. Covers running vitest from this package or
	// from `apps/vscode`.
	const settingsDir = [process.cwd(), join(process.cwd(), "webview-ui")]
		.map((root) => join(root, "src", "components", "settings"))
		.find((dir) => existsSync(dir))
	if (!settingsDir) {
		throw new Error(`Settings directory not found from cwd ${process.cwd()}`)
	}

	const listSourceFiles = (dir: string): string[] =>
		readdirSync(dir).flatMap((entry) => {
			const full = join(dir, entry)
			if (statSync(full).isDirectory()) {
				return listSourceFiles(full)
			}
			return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : []
		})

	it("every Settings surface with an effort/budget control consults the shared policy", () => {
		const offenders = listSourceFiles(settingsDir).filter((file) => {
			const source = readFileSync(file, "utf8")
			const rendersControl = /from "(?:\.\.?\/)*(?:ThinkingBudgetSlider|ReasoningEffortSelector)"/.test(source)
			return rendersControl && !source.includes("@/utils/modelThinkingOptions")
		})
		expect(offenders).toEqual([])
	})

	it("no Settings file writes an Effort level list of its own", () => {
		// The adaptive set used to be spelled out in six provider forms; Sakana's three
		// levels lived in a seventh component. Every list now comes from
		// `@/utils/modelThinkingOptions`, so an inline array literal is a regression.
		const arrayLiteral = /\[\s*"(?:none|low|medium|high|xhigh|max|minimal)"\s*,/
		const offenders = listSourceFiles(settingsDir).filter((file) => arrayLiteral.test(readFileSync(file, "utf8")))
		expect(offenders).toEqual([])
	})

	it("no Settings file keeps its own thinking-model list", () => {
		// The ids that used to be duplicated in Anthropic/Bedrock/Claude Code forms.
		const duplicatedIds = ["claude-3-7-sonnet-20250219", "claude-sonnet-4-20250514", "anthropic.claude-sonnet-4-6"]
		const offenders = listSourceFiles(settingsDir).filter((file) => {
			const source = readFileSync(file, "utf8")
			return duplicatedIds.some((id) => source.includes(id))
		})
		expect(offenders).toEqual([])
	})
})
