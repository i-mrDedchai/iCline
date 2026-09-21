/**
 * The single source of truth for "which models get Effort levels, and which get a
 * Thinking token budget".
 *
 * Before this module every surface decided for itself: Settings had the rule inline
 * in ~15 provider components (some id-based, some metadata-based, some with hardcoded
 * model lists) and the Quick Picker had a fourth variant — so the two could show
 * different controls for the same model. Both now call
 * `resolveModelThinkingOptions`, and the answers are asserted equal in
 * `modelThinkingOptions.test.ts` and in the picker's own tests.
 *
 * Two rules of construction, both deliberate:
 *
 *  1. **Provider rules are faithful.** Each entry reproduces what that provider's
 *     Settings form does today (see the per-provider notes). Providers that ship a
 *     hardcoded model list keep it — as a *fallback* for models the catalog does not
 *     describe. When the catalog DOES describe the model (`thinkingConfig`, and for
 *     Anthropic-style providers `supportsThinkingLevel`), the metadata wins: a
 *     control is shown exactly when the model really supports it.
 *  2. **Controls stay reachable.** A model that already carries a stored/live effort
 *     or budget keeps its control even if no other rule matches, so the user can
 *     always change or clear what is set.
 *
 * `source` fields exist for tests and bug reports: they say *why* a control appeared.
 */
import { isOpenaiReasoningEffort, OPENAI_REASONING_EFFORT_OPTIONS, type OpenaiReasoningEffort } from "@shared/storage/types"
import { isClaudeOpusAdaptiveThinkingModel, supportsReasoningEffortForModel } from "@shared/utils/reasoning-support"

/** Structural subset of `ModelInfo` the policy reads. */
export interface ModelThinkingInfo {
	supportsReasoning?: boolean
	thinkingConfig?: { supportsThinkingLevel?: boolean; maxBudget?: number } | null
	/** OCA publishes the effort levels a model accepts. */
	reasoningEffortOptions?: readonly unknown[]
}

export interface ModelThinkingInput {
	/** Catalog/provider id, lower-cased internally (e.g. `anthropic`, `openai-native`). */
	providerId: string
	modelId: string
	modelInfo?: ModelThinkingInfo | null
	/** This model already has an EFFORT set — keep the effort control reachable. */
	effortIsSet?: boolean
	/** This model already has a thinking BUDGET set — keep the budget control reachable. */
	budgetIsSet?: boolean
}

export type ModelThinkingEffortSource =
	| "adaptive-thinking"
	| "model-id"
	| "declared-reasoning"
	| "thinking-level"
	| "provider-always"
	| "stored-preference"

export type ModelThinkingBudgetSource = "thinking-config" | "provider-known-model" | "declared-reasoning" | "stored-preference"

export interface ModelThinkingOptions {
	/** Effort levels (Low/Medium/High/Max) make sense for this model. */
	showEffort: boolean
	/** A thinking token budget can be set for this model. */
	showThinkingBudget: boolean
	/** Reasoning is baked into the model variant — no control applies. */
	builtinReasoning: boolean
	effortSource: ModelThinkingEffortSource | null
	budgetSource: ModelThinkingBudgetSource | null
}

/*
 * ---------------------------------------------------------------------------
 * Effort LEVELS: which values a provider's control offers
 * ---------------------------------------------------------------------------
 * The second half of the same truth. Deciding that a model gets an Effort control
 * used to say nothing about what the control contained: every Settings form passed
 * its own array literal to `ReasoningEffortSelector` (the adaptive set was written out
 * six times) and the Sakana form hardcoded three `<VSCodeOption>`s. The sets below are
 * provider metadata; every dropdown — Settings, the Sakana/Oca pickers and the Quick
 * Picker's Options panel — renders them, so no surface can offer a level another one
 * lacks, or a label nobody else uses.
 */

/** One selectable Effort level: what gets stored, how Settings labels it, its row badge. */
export interface EffortLevel {
	/** Value written to `*ModeReasoningEffort` / the provider's reasoning settings. */
	value: string
	/** Label the Settings dropdown shows ("X-High", not "Xhigh"). */
	label: string
	/** Compact badge the Quick Picker row shows ("" = no badge). */
	short: string
	/** The level that means "reasoning off" — surfaces with their own switch skip it. */
	isOff?: boolean
}

export type EffortLevelSetId = "openai" | "adaptive-thinking" | "sakana" | "model-declared"

export interface ProviderEffortLevels {
	/** Which metadata entry answered — for tests and bug reports. */
	id: EffortLevelSetId
	/** Ordered exactly as the dropdowns show them. */
	levels: readonly EffortLevel[]
	/** Level selected when the model has nothing stored. */
	default: string
	/** A provider whose default depends on the model (Sakana: Fugu Ultra → X-High). */
	defaultFor?: (modelId: string) => string
	/** Label the Settings control carries. */
	label: string
	/** Settings help text under the control. */
	description: string
}

/**
 * How each stored value is presented. Typed as a `Record` over the shared
 * vocabulary, so a level added on the storage/SDK side cannot reach the UI without
 * a label here — the compiler asks for one.
 */
const EFFORT_LEVEL_PRESENTATION: Record<OpenaiReasoningEffort, Omit<EffortLevel, "value">> = {
	none: { label: "None", short: "—", isOff: true },
	minimal: { label: "Minimal", short: "Min" },
	low: { label: "Low", short: "L" },
	medium: { label: "Medium", short: "M" },
	high: { label: "High", short: "H" },
	xhigh: { label: "X-High", short: "X" },
	max: { label: "Max", short: "Max" },
}

/**
 * The OpenAI-style set: every value the app can store, built from the shared
 * vocabulary rather than a second hand-written list. Offering the full set here is
 * deliberate — the SDK clamps a level the selected model does not advertise, and a
 * narrower list would hide levels the user can legitimately store (Sakana's `max`,
 * a catalog's `minimal`) or invent a second vocabulary for the same field.
 */
export const OPENAI_EFFORT_LEVELS: readonly EffortLevel[] = OPENAI_REASONING_EFFORT_OPTIONS.map((value) => ({
	value,
	...EFFORT_LEVEL_PRESENTATION[value],
}))

/** Sakana maps three levels itself (`high`/`xhigh`/`max`) — its own vocabulary. */
export const SAKANA_EFFORT_LEVELS: readonly EffortLevel[] = [
	{ value: "high", label: "High", short: "H" },
	{ value: "xhigh", label: "X-High", short: "X" },
	{ value: "max", label: "Max", short: "M" },
]

const EFFORT_LEVEL_SETS: Record<Exclude<EffortLevelSetId, "model-declared">, ProviderEffortLevels> = {
	openai: {
		id: "openai",
		levels: OPENAI_EFFORT_LEVELS,
		default: "medium",
		label: "Reasoning Effort",
		description: "Higher effort improves depth, but uses more tokens.",
	},
	"adaptive-thinking": {
		id: "adaptive-thinking",
		levels: OPENAI_EFFORT_LEVELS,
		default: "none",
		label: "Adaptive Thinking",
		description: "Use None to disable adaptive thinking. Higher effort increases response detail and token usage.",
	},
	sakana: {
		id: "sakana",
		levels: SAKANA_EFFORT_LEVELS,
		default: "high",
		defaultFor: (modelId) => (modelId.toLowerCase().startsWith("fugu-ultra") ? "xhigh" : "high"),
		label: "Reasoning Effort",
		description: "Fugu Ultra defaults to X-High. Higher effort improves depth but uses more tokens.",
	},
}

/**
 * One level a catalog published, presented the same way the shared vocabulary is — a
 * published `xhigh` reads "X-High" (not "Xhigh") and a published `none` stays the OFF
 * level, so the panel does not offer "None" as a button next to the Thinking switch.
 */
function catalogEffortLevel(value: string): EffortLevel {
	if (isOpenaiReasoningEffort(value)) {
		return { value, ...EFFORT_LEVEL_PRESENTATION[value] }
	}
	const capitalized = value.charAt(0).toUpperCase() + value.slice(1)
	return { value, label: capitalized, short: capitalized }
}

/**
 * The levels a control should offer, including the STORED one when the provider's set
 * does not contain it.
 *
 * Effort is stored once per mode, so switching providers leaves the previous level
 * behind (Sakana has no `minimal`, OCA publishes only what its catalog lists) and the
 * request carries it regardless. A control that hid it would name a level that is not
 * the one in force; keeping it is what lets an Effort-clamp notice describe the same
 * value the user is looking at. A stored value outside the shared vocabulary is
 * ignored — the control cannot name it.
 */
export function levelsWithStoredEffort(levels: readonly EffortLevel[], storedEffort?: string | null): readonly EffortLevel[] {
	const value = storedEffort?.trim()
	if (!value || !isOpenaiReasoningEffort(value)) {
		return levels
	}
	if (levels.some((level) => level.value === value)) {
		return levels
	}
	return [...levels, catalogEffortLevel(value)]
}

/**
 * Presentation for one stored Effort value — the shared vocabulary's own label
 * ("X-High", not "Xhigh"), a capitalised label for values a catalog invented.
 *
 * Used where a level has to be named OUTSIDE a dropdown built from `EffortLevel`s (the
 * Effort-clamp notice, a provider's control offering a level stored by another
 * provider), so no surface can spell a level differently from the one that set it.
 */
export function effortLevelForValue(value: string): EffortLevel {
	return catalogEffortLevel(value)
}

/**
 * OCA (and, through `resolveEffortLevels`, any provider whose catalog publishes them)
 * declares the levels each model accepts; the catalog IS the metadata here, so the
 * labels are derived from the published values rather than kept in a second list.
 */
function declaredEffortLevels(info?: ModelThinkingInfo | null): ProviderEffortLevels | null {
	const values = (info?.reasoningEffortOptions ?? []).filter((value): value is string => typeof value === "string")
	if (values.length === 0) {
		return null
	}
	return {
		id: "model-declared",
		levels: values.map(catalogEffortLevel),
		default: values[0],
		label: "Reasoning Effort",
		description: "Higher effort improves depth, but uses more tokens.",
	}
}

/** The level chosen for a model with nothing stored yet. */
export function defaultEffortValue(levels: ProviderEffortLevels, modelId: string): string {
	return levels.defaultFor?.(modelId) ?? levels.default
}

/**
 * Where an on/off switch lands when it turns reasoning ON with nothing remembered: the
 * first level that is not the off level (an endpoint whose empty state is `none` must
 * still switch to a real level, not back to `none`).
 */
export function firstOnEffortValue(levels: ProviderEffortLevels): string {
	return levels.levels.find((level) => !level.isOff)?.value ?? levels.default
}

/** Is this the level that switches reasoning off? (`none` for OpenAI-style sets.) */
export function isOffEffortLevel(levels: ProviderEffortLevels, value?: string | null): boolean {
	return levels.levels.some((level) => level.value === value && level.isOff === true)
}

/** The level to show for a stored value: the stored one when the set knows it. */
export function normalizeEffortValue(levels: ProviderEffortLevels, value?: string | null, fallback?: string): string {
	if (value && levels.levels.some((level) => level.value === value)) {
		return value
	}
	return fallback ?? levels.default
}

/**
 * The level the provider's own catalog asks for when a model is selected — or
 * `undefined` when it publishes none, meaning "do not write an effort at all" (OCA
 * used to write `reasoningEffortOptions[0]` in two places; this is the same rule).
 */
export function declaredEffortDefault(
	providerId: string,
	modelId: string,
	modelInfo?: ModelThinkingInfo | null,
): string | undefined {
	const levels = resolveEffortLevels({ providerId, modelId, modelInfo })
	return levels.id === "model-declared" ? levels.default : undefined
}

/** Row badge for a stored level ("" when the set does not know the value). */
export function effortBadge(levels: ProviderEffortLevels, value?: string | null): string {
	return levels.levels.find((level) => level.value === value)?.short ?? ""
}

/**
 * The levels the control for this model should offer.
 *
 * Derived from the SAME policy as "does it have a control at all": an adaptive-thinking
 * model gets the labelled Adaptive Thinking set, everything else gets its provider's set
 * (Sakana's own three levels, the catalog's published ones for OCA, else OpenAI's).
 */
export function resolveEffortLevels(input: ModelThinkingInput): ProviderEffortLevels {
	const ctx = policyContext(input)
	const policy = policyFor(input.providerId)
	const declared = policy.effortLevels?.(ctx)
	if (declared) {
		return declared
	}
	const base =
		policy.effort?.(ctx) === "adaptive-thinking"
			? EFFORT_LEVEL_SETS["adaptive-thinking"]
			: EFFORT_LEVEL_SETS[policy.effortLevelSet ?? "openai"]
	// The catalog beats the generic set: when the model publishes the levels it
	// accepts, show those instead of guessing. This only refines the OpenAI-style
	// set — `adaptive-thinking` and Sakana's set are the provider's own contract.
	if (base.id === "openai") {
		const fromCatalog = declaredEffortLevels(ctx.info)
		if (fromCatalog) {
			return fromCatalog
		}
	}
	return policy.effortDefault ? { ...base, default: policy.effortDefault } : base
}

/**
 * Narrow a provider's set to the levels the HOST says this model really takes.
 *
 * The sets above are provider VOCABULARIES. For a provider like `cline` the OpenAI set
 * is right about the shape of the control (an effort value) and wrong about which
 * values exist: `z-ai/glm-5.3-flash` advertises `low`/`high`/`max`, and the Options
 * panel offered it six levels (smoke 2026-09-21, dev.6-fix.26). The host answers with
 * `supportedEfforts` from `decideReasoningEffort` — the same function the request path
 * clamps with — so a list built from it cannot name a level the model will not be sent.
 *
 * An EMPTY answer leaves the set alone on purpose. The catalog may simply not carry
 * the model (`registry-missing-model`); "no entry" is not "no levels", and narrowing
 * on it would hide levels the model really takes. A **toggle-only** model is the one
 * case worth saying out loud, and the panel says it from `reason` instead.
 *
 * The stored level is kept even when the answer does not name it, so the marked level
 * and the clamp notice keep describing the same value.
 */
export function withSupportedEfforts(
	levels: ProviderEffortLevels,
	supportedEfforts?: readonly string[] | null,
	storedEffort?: string | null,
): ProviderEffortLevels {
	const values = (supportedEfforts ?? []).map((value) => value.trim()).filter((value) => value.length > 0)
	if (values.length === 0) {
		return levels
	}
	const declared = values.map(catalogEffortLevel)
	return {
		...levels,
		levels: levelsWithStoredEffort(declared, storedEffort),
		// What an ON switch lands on with nothing remembered: the model's own first real
		// level (`low`), not the generic vocabulary's (`minimal`).
		default: values[0],
	}
}

/** Providers whose Settings form always offers effort (custom/compatible endpoints). */
export const OPENAI_COMPATIBLE_POLICY_ID = "openai-compatible"

/** Anthropic thinking-budget models (moved verbatim from AnthropicProvider). */
export const ANTHROPIC_THINKING_BUDGET_MODELS = [
	"claude-sonnet-4-6",
	"claude-3-7-sonnet-20250219",
	"claude-sonnet-4-20250514",
	"claude-opus-4-20250514",
	"claude-opus-4-1-20250805",
	"claude-sonnet-4-5-20250929",
	"claude-haiku-4-5-20251001",
] as const

/** Bedrock thinking-budget models (moved verbatim from BedrockProvider). */
export const BEDROCK_THINKING_BUDGET_MODELS = [
	"anthropic.claude-sonnet-4-6",
	"anthropic.claude-3-7-sonnet-20250219-v1:0",
	"anthropic.claude-sonnet-4-20250514-v1:0",
	"anthropic.claude-sonnet-4-5-20250929-v1:0",
	"anthropic.claude-opus-4-1-20250805-v1:0",
	"anthropic.claude-opus-4-20250514-v1:0",
	"anthropic.claude-haiku-4-5-20251001-v1:0",
] as const

/** Claude Code thinking-budget models (moved verbatim from ClaudeCodeProvider). */
export const CLAUDE_CODE_THINKING_BUDGET_MODELS = [
	...ANTHROPIC_THINKING_BUDGET_MODELS,
	"sonnet",
	"sonnet[1m]",
	"claude-fable-5[1m]",
	"claude-opus-4-8[1m]",
	"claude-opus-4-7[1m]",
	"claude-sonnet-4-6[1m]",
	"claude-sonnet-4-5-20250929[1m]",
	"claude-opus-4-6[1m]",
	"opus",
	"opus[1m]",
] as const

/** Qwen models that take a thinking budget (moved verbatim from QwenProvider). */
export const QWEN_THINKING_BUDGET_MODELS = [
	"qwen3-235b-a22b",
	"qwen3-32b",
	"qwen3-30b-a3b",
	"qwen3-14b",
	"qwen3-8b",
	"qwen3-4b",
	"qwen3-1.7b",
	"qwen3-0.6b",
	"qwen-plus-latest",
	"qwen-turbo-latest",
] as const

/** Gateway catalogs where a Claude model can carry a thinking budget. */
export const CLAUDE_THINKING_BUDGET_MODEL_FRAGMENTS = [
	"claude-haiku-4.5",
	"claude-4.5-haiku",
	"claude-sonnet-4.6",
	"claude-sonnet-4-6",
	"claude-4.6-sonnet",
	"claude-sonnet-4.5",
	"claude-sonnet-4",
	"claude-opus-4.1",
	"claude-opus-4",
	"claude-3-7-sonnet",
	"claude-3.7-sonnet",
	"claude-3.7-sonnet:thinking",
] as const

/** Requesty's budget rule (its Settings form names one model family). */
export const REQUESTY_THINKING_BUDGET_MODEL_FRAGMENTS = ["claude-3-7-sonnet"] as const

/** Model families whose ids name their reasoning behaviour (the picker's old heuristic). */
export function modelIdLooksReasoning(modelId: string): boolean {
	const id = modelId.toLowerCase()
	return (
		id.includes("reason") ||
		id.includes("thinking") ||
		id.includes("o1") ||
		id.includes("o3") ||
		id.includes("o4") ||
		id.includes("opus") ||
		id.includes("sonnet-4") ||
		id.includes("grok-3-mini") ||
		id.includes("composer")
	)
}

/**
 * The catalog describes a thinking budget for this model. Presence is enough (the
 * Settings forms test `thinkingConfig !== undefined`), except for models that route
 * thinking through LEVELS instead — those are an effort control, not a budget.
 */
export function hasThinkingConfig(info?: ModelThinkingInfo | null): boolean {
	const config = info?.thinkingConfig
	return !!config && config.supportsThinkingLevel !== true
}

/**
 * Same question, strict form: the config carries real budget keys. Used where an
 * empty config must NOT light up (e.g. showing a thinking output price in
 * `ModelInfoView`).
 */
export function hasThinkingBudgetConfig(info?: ModelThinkingInfo | null): boolean {
	const config = info?.thinkingConfig
	return !!config && Object.keys(config).length > 0
}

const includesAny = (haystackLower: string, needles: readonly string[]) =>
	needles.some((needle) => haystackLower.includes(needle.toLowerCase()))

const inList = (modelId: string, list: readonly string[]) => list.includes(modelId)

interface PolicyContext {
	modelId: string
	modelIdLower: string
	info?: ModelThinkingInfo | null
	effortIsSet: boolean
	budgetIsSet: boolean
}

interface ProviderThinkingPolicy {
	/** Effort levels apply — returns why, or null. */
	effort?: (ctx: PolicyContext) => ModelThinkingEffortSource | null
	/** A thinking budget applies — returns why, or null. */
	budget?: (ctx: PolicyContext) => ModelThinkingBudgetSource | null
	/** Reasoning is baked in: no control at all. */
	builtin?: (ctx: PolicyContext) => boolean
	/** Budget is suppressed whenever effort applies (gateway catalogs do this). */
	budgetOnlyWithoutEffort?: boolean
	/**
	 * WHICH levels the effort control offers when `effort` matches.
	 * Defaults to the OpenAI-style set; adaptive-thinking models override it above.
	 */
	effortLevelSet?: Exclude<EffortLevelSetId, "model-declared">
	/**
	 * What the control shows when the model has nothing stored, when that differs from
	 * the set's own default — an unconfigured endpoint is OFF ("none"), not "medium".
	 */
	effortDefault?: string
	/** Levels the provider's own catalog publishes (OCA), when it has any. */
	effortLevels?: (ctx: PolicyContext) => ProviderEffortLevels | null
	/** Note kept next to the rule so the next reader knows where it came from. */
	note?: string
}

const adaptiveEffort = (ctx: PolicyContext): ModelThinkingEffortSource | null =>
	isClaudeOpusAdaptiveThinkingModel(ctx.modelId) ? "adaptive-thinking" : null

const modelIdEffort = (ctx: PolicyContext): ModelThinkingEffortSource | null =>
	supportsReasoningEffortForModel(ctx.modelId) ? "model-id" : null

const declaredReasoningEffort = (ctx: PolicyContext): ModelThinkingEffortSource | null =>
	ctx.info?.supportsReasoning === true ? "declared-reasoning" : null

const thinkingLevelEffort = (ctx: PolicyContext): ModelThinkingEffortSource | null =>
	ctx.info?.thinkingConfig?.supportsThinkingLevel === true ? "thinking-level" : null

const thinkingConfigBudget = (ctx: PolicyContext): ModelThinkingBudgetSource | null =>
	hasThinkingConfig(ctx.info) ? "thinking-config" : null

/** Budget only from the provider's own list (its form has no metadata check). */
const listBudget =
	(list: readonly string[]) =>
	(ctx: PolicyContext): ModelThinkingBudgetSource | null =>
		inList(ctx.modelId, list) || includesAny(ctx.modelIdLower, list) ? "provider-known-model" : null

/** Budget from the provider's list, or from the catalog when it declares one. */
const listOrConfigBudget =
	(list: readonly string[]) =>
	(ctx: PolicyContext): ModelThinkingBudgetSource | null =>
		hasThinkingConfig(ctx.info) ? "thinking-config" : listBudget(list)(ctx)

/**
 * The table. Each entry documents the Settings form it reproduces; providers absent
 * from it fall back to {@link DEFAULT_POLICY}.
 */
const POLICIES: Record<string, ProviderThinkingPolicy> = {
	// xAI names its variants in the id: "non reasoning" takes nothing, "reasoning"/
	// "multi-agent" already reason, "3-mini" takes an effort level.
	xai: {
		builtin: (ctx) => /reasoning|multi-agent/.test(ctx.modelIdLower) && !/non[- ]?reasoning/.test(ctx.modelIdLower),
		effort: (ctx) => {
			if (/non[- ]?reasoning/.test(ctx.modelIdLower)) {
				return null
			}
			return modelIdEffort(ctx) ?? modelIdEffortFallback(ctx)
		},
		note: "xAI variant naming; effort comes from the id heuristics",
	},

	// Settings: adaptive-thinking models get the Adaptive Thinking selector, the rest
	// get a budget slider (list, or anything the catalog describes).
	anthropic: {
		effort: adaptiveEffort,
		budget: (ctx) => (adaptiveEffort(ctx) ? null : listOrConfigBudget(ANTHROPIC_THINKING_BUDGET_MODELS)(ctx)),
	},
	bedrock: {
		effort: adaptiveEffort,
		budget: (ctx) => (adaptiveEffort(ctx) ? null : listOrConfigBudget(BEDROCK_THINKING_BUDGET_MODELS)(ctx)),
	},
	"claude-code": {
		// Its Settings form has no adaptive branch: budget models only.
		budget: listOrConfigBudget(CLAUDE_CODE_THINKING_BUDGET_MODELS),
	},
	qwen: { budget: listOrConfigBudget(QWEN_THINKING_BUDGET_MODELS) },
	"qwen-code": { budget: listOrConfigBudget(QWEN_THINKING_BUDGET_MODELS) },

	// Sakana's Fugu models all take an effort level, in the provider's OWN vocabulary
	// (High / X-High / Max) with a per-model default — hence the shared set, not ours.
	sakana: {
		effort: () => "provider-always",
		effortLevelSet: "sakana",
		note: "Fugu models take Sakana's own High/X-High/Max set",
	},

	// Gateways: effort for the OpenAI-style ids, otherwise a Claude budget.
	openrouter: {
		effort: (ctx) => adaptiveEffort(ctx) ?? modelIdEffort(ctx),
		budget: (ctx) => listOrConfigBudget(CLAUDE_THINKING_BUDGET_MODEL_FRAGMENTS)(ctx),
		budgetOnlyWithoutEffort: true,
	},
	"vercel-ai-gateway": {
		effort: (ctx) => adaptiveEffort(ctx) ?? modelIdEffort(ctx),
		budget: (ctx) => listOrConfigBudget(CLAUDE_THINKING_BUDGET_MODEL_FRAGMENTS)(ctx),
		budgetOnlyWithoutEffort: true,
	},
	requesty: { budget: listOrConfigBudget(REQUESTY_THINKING_BUDGET_MODEL_FRAGMENTS) },

	// ZenMux shows both, independently: effort by id, budget when the catalog says so.
	zenmux: {
		effort: modelIdEffort,
		budget: thinkingConfigBudget,
		budgetOnlyWithoutEffort: false,
	},

	// Cline's own catalogs: adaptive thinking, else the catalog's reasoning flag.
	cline: {
		effort: (ctx) => adaptiveEffort(ctx) ?? declaredReasoningEffort(ctx),
	},

	// Vertex routes by the catalog's thinkingLevel flag, then the budget.
	vertex: {
		effort: (ctx) => adaptiveEffort(ctx) ?? thinkingLevelEffort(ctx),
		budget: (ctx) =>
			thinkingLevelEffort(ctx) || adaptiveEffort(ctx)
				? null
				: ctx.info?.supportsReasoning === true && hasThinkingConfig(ctx.info)
					? "thinking-config"
					: null,
	},

	// OCA publishes per-model effort levels; a budget is separate.
	oca: {
		effort: (ctx) =>
			ctx.info?.supportsReasoning === true && (ctx.info.reasoningEffortOptions?.length ?? 0) > 0
				? "declared-reasoning"
				: null,
		effortLevels: (ctx) => declaredEffortLevels(ctx.info),
		budget: thinkingConfigBudget,
		budgetOnlyWithoutEffort: false,
	},

	// LiteLLM proxies Anthropic-style endpoints: a reasoning flag means a budget.
	litellm: {
		budget: (ctx) => (declaredReasoningEffort(ctx) || hasThinkingConfig(ctx.info) ? "declared-reasoning" : null),
	},

	// OpenAI-native forms: effort is decided by the id heuristics only.
	"openai-native": { effort: (ctx) => modelIdEffort(ctx) ?? modelIdEffortFallback(ctx) },
	"openai-codex": { effort: (ctx) => modelIdEffort(ctx) ?? modelIdEffortFallback(ctx) },

	// The generic OpenAI-compatible form lets the user pick an effort for any model
	// (it cannot know what the endpoint supports). Nothing stored means NOT configured,
	// so its control shows None rather than claiming Medium is in force.
	[OPENAI_COMPATIBLE_POLICY_ID]: { effort: () => "provider-always", effortDefault: "none" },
	openai: { effort: () => "provider-always" },
}

/**
 * Unknown providers: the Quick Picker's historical heuristic — declared reasoning, a
 * reasoning-looking id, or the OpenAI-style id policy.
 */
const DEFAULT_POLICY: ProviderThinkingPolicy = {
	effort: (ctx) => modelIdEffort(ctx) ?? modelIdEffortFallback(ctx) ?? declaredReasoningEffort(ctx),
	budget: thinkingConfigBudget,
}

function modelIdEffortFallback(ctx: PolicyContext): ModelThinkingEffortSource | null {
	return modelIdLooksReasoning(ctx.modelId) ? "model-id" : null
}

function policyFor(providerId: string): ProviderThinkingPolicy {
	const id = providerId.toLowerCase().trim()
	return POLICIES[id] ?? DEFAULT_POLICY
}

function policyContext(input: ModelThinkingInput): PolicyContext {
	return {
		modelId: input.modelId,
		modelIdLower: input.modelId.toLowerCase(),
		info: input.modelInfo,
		effortIsSet: input.effortIsSet === true,
		budgetIsSet: input.budgetIsSet === true,
	}
}

export function resolveModelThinkingOptions(input: ModelThinkingInput): ModelThinkingOptions {
	const ctx = policyContext(input)
	const policy = policyFor(input.providerId)
	const builtinReasoning = policy.builtin?.(ctx) === true && !ctx.effortIsSet && !ctx.budgetIsSet

	let effortSource: ModelThinkingEffortSource | null = null
	let budgetSource: ModelThinkingBudgetSource | null = null
	if (!builtinReasoning) {
		effortSource = policy.effort?.(ctx) ?? null
		const policyBudget = policy.budget?.(ctx) ?? null
		const budgetBlocked = policy.budgetOnlyWithoutEffort === true && effortSource !== null
		budgetSource = budgetBlocked ? null : policyBudget
		// Keep a stored value reachable when no rule matched.
		// A stored value keeps ITS control reachable — a stored budget never turns into
		// an effort control, and vice versa.
		if (ctx.effortIsSet) {
			effortSource = effortSource ?? "stored-preference"
		}
		if (ctx.budgetIsSet && budgetSource === null && !budgetBlocked) {
			budgetSource = "stored-preference"
		}
	}

	return {
		showEffort: effortSource !== null,
		showThinkingBudget: budgetSource !== null,
		builtinReasoning,
		effortSource,
		budgetSource,
	}
}

/** Provider-aware "is this one of the ids the provider's own list calls a budget model?". */
export function isProviderKnownThinkingBudgetModel(providerId: string, modelId: string): boolean {
	const policy = policyFor(providerId)
	if (!policy.budget) {
		return false
	}
	return (
		policy.budget({ modelId, modelIdLower: modelId.toLowerCase(), info: null, effortIsSet: false, budgetIsSet: false }) ===
		"provider-known-model"
	)
}
