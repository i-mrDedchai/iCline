import { describe, expect, it } from "vitest"
import { CAPABILITY_COLORS, modelSupportsEffort, resolveModelCapabilities, resolveModelStatus } from "./pickerCapabilities"

const ids = (modelId: string, info?: Parameters<typeof resolveModelCapabilities>[1], options?: { effortIsSet?: boolean }) =>
	resolveModelCapabilities(modelId, info, options).map((cap) => cap.id)

describe("resolveModelCapabilities", () => {
	it("shows vision only when the model declares image support", () => {
		expect(ids("some-model", { supportsImages: true })).toContain("vision")
		expect(ids("some-model", {})).not.toContain("vision")
	})

	it("shows thinking only when the model carries a thinking config", () => {
		expect(ids("some-model", { thinkingConfig: { maxBudget: 2048 } })).toContain("thinking")
		expect(ids("some-model", { supportsReasoning: true })).not.toContain("thinking")
	})

	it("shows reasoning when the model supports it, or when an effort is already set", () => {
		expect(ids("some-model", { supportsReasoning: true })).toContain("reasoning")
		expect(ids("some-model", {}, { effortIsSet: true })).toContain("reasoning")
		expect(ids("plain-model-1", {})).not.toContain("reasoning")
	})

	// Guideline กฎที่ 2: icons with no backing metadata stay hidden — guessing would
	// put a claim in front of the user that nothing verified.
	it("never invents audio, video or training capabilities", () => {
		const everyFlag = { supportsImages: true, supportsReasoning: true, thinkingConfig: {} }
		const resolved = ids("nocturne-reasoner-voice-video", everyFlag, { effortIsSet: true })
		expect(resolved).not.toContain("audio")
		expect(resolved).not.toContain("video")
		expect(resolved).not.toContain("training")
	})

	it("keeps the guideline's accent colours", () => {
		expect(CAPABILITY_COLORS).toEqual({
			reasoning: "#c39bff",
			thinking: "#ffd166",
			vision: "#5ec8ff",
			audio: "#ff7eb6",
			video: "#ff9466",
			training: "#4de3c1",
		})
	})
})

/**
 * The Effort/Thinking POLICY lives in `@/utils/modelThinkingOptions` (shared with
 * Settings) and is pinned in its own test file; here we only cover how this module
 * turns that policy plus the live values into ROW status.
 */
describe("resolveModelStatus", () => {
	it("is off until an effort is set, and reports the level when it is", () => {
		const off = resolveModelStatus({ providerId: "jan", modelId: "jan-reasoner", modelInfo: { supportsReasoning: true } })
		expect(off).toMatchObject({ enabled: false, effort: undefined, effortShort: "" })
		expect(off.caps.map((cap) => cap.id)).toContain("reasoning")

		const on = resolveModelStatus({
			providerId: "jan",
			modelId: "jan-reasoner",
			modelInfo: { supportsReasoning: true },
			reasoningEffort: "xhigh",
		})
		expect(on).toMatchObject({ enabled: true, effort: "xhigh", effortShort: "X" })
	})

	it("reads a legacy thinking budget with no effort as high, like resolveClaudeOpusAdaptiveThinking", () => {
		const status = resolveModelStatus({
			providerId: "anthropic",
			modelId: "claude-opus-4.6",
			modelInfo: { supportsReasoning: true },
			thinkingBudgetTokens: 4096,
		})
		expect(status).toMatchObject({ enabled: true, effort: "high", effortShort: "H" })
	})

	it("treats an explicit none as off even with a leftover budget", () => {
		const status = resolveModelStatus({
			providerId: "anthropic",
			modelId: "claude-opus-4.6",
			modelInfo: { supportsReasoning: true },
			reasoningEffort: "none",
			thinkingBudgetTokens: 4096,
		})
		expect(status).toMatchObject({ enabled: false, effort: undefined, effortShort: "" })
	})

	it("drives a budget model from its budget and a built-in model from nothing at all", () => {
		const budget = resolveModelStatus({
			providerId: "jan",
			modelId: "jan-local-7b",
			modelInfo: { thinkingConfig: {} },
			thinkingBudgetTokens: 2048,
		})
		expect(budget).toMatchObject({ enabled: true, effort: undefined, effortShort: "" })
		expect(budget.support.showEffort).toBe(false)
		expect(budget.caps.map((cap) => cap.id)).toContain("thinking")
		expect(
			resolveModelStatus({ providerId: "jan", modelId: "jan-local-7b", modelInfo: { thinkingConfig: {} } }).enabled,
		).toBe(false)

		const builtin = resolveModelStatus({ providerId: "xai", modelId: "grok-4.20-reasoning" })
		expect(builtin).toMatchObject({ enabled: true, effortShort: "" })
		expect(builtin.support.builtinReasoning).toBe(true)
	})

	it("keeps a model reconfigurable after its reasoning is switched OFF", () => {
		// The dev.6-fix.26 smoke round's dead end: `z-ai/glm-5.3-flash` has no catalog
		// entry in the app's own list for its id, so the ONLY trace of it being a
		// reasoning model was the effort already set. Writing the OFF level made the
		// switch disable itself and the model could never be switched back on.
		const off = resolveModelStatus({
			providerId: "cline",
			modelId: "z-ai/glm-5.3-flash",
			reasoningEffort: "none",
		})
		expect(off.enabled).toBe(false)
		expect(off.support.showEffort).toBe(true)
		expect(off.effortSource ?? off.support.effortSource).toBe("stored-preference")
		// The capability icons come back with the control, because a model that can be
		// configured is reasoned-capable whatever the setting is right now.
		expect(off.caps.map((cap) => cap.id)).toContain("reasoning")

		// A reasoning model the catalog DOES describe keeps its controls either way.
		const declared = resolveModelStatus({
			providerId: "cline",
			modelId: "z-ai/glm-5.3-flash",
			modelInfo: { supportsReasoning: true },
			reasoningEffort: "none",
		})
		expect(declared).toMatchObject({ enabled: false })
		expect(declared.support.showEffort).toBe(true)
	})

	it("a provider-level default keeps controls reachable without switching anything on", () => {
		// NaraRouter dev.4-fix.2: hovering deepseek-v4-flash (no declared
		// reasoning, provider default High configured) claimed "No capability
		// data", yet selecting it lit up Thinking + High. The ambient default
		// keeps the control and the muted icon — enabled/badge still need a
		// value in force for THIS model.
		const status = resolveModelStatus({
			providerId: "bynara",
			modelId: "deepseek-v4-flash",
			providerDefaultEffortIsSet: true,
		})
		expect(status).toMatchObject({ enabled: false, effort: undefined, effortShort: "" })
		expect(status.support.showEffort).toBe(true)
		expect(status.support.effortSource).toBe("stored-preference")
		expect(status.caps.map((cap) => cap.id)).toContain("reasoning")
	})

	it("never claims controls for a model with nothing to configure", () => {
		const status = resolveModelStatus({ providerId: "jan", modelId: "jan-local-7b", modelInfo: {} })
		expect(status).toMatchObject({ enabled: false, effort: undefined, effortShort: "" })
		expect(status.caps).toEqual([])
		expect(status.support).toMatchObject({ showEffort: false, showThinkingBudget: false, builtinReasoning: false })
	})
})

describe("modelSupportsEffort", () => {
	it("treats declared reasoning support or a thinking budget as support", () => {
		expect(modelSupportsEffort("m", { supportsReasoning: true })).toBe(true)
		expect(modelSupportsEffort("m", { thinkingConfig: {} })).toBe(true)
	})

	it("keeps the id-heuristic for well-known reasoning families", () => {
		expect(modelSupportsEffort("grok-composer-2.5-fast")).toBe(true)
		expect(modelSupportsEffort("openai/o3-mini")).toBe(true)
	})

	it("reports plain models as unsupported", () => {
		expect(modelSupportsEffort("jan-local-7b")).toBe(false)
		expect(modelSupportsEffort("jan-local-7b", { name: "Jan Local 7B" })).toBe(false)
	})
})
