/**
 * Per-model capability icons and row/panel STATUS for the Quick Picker
 * (iCline UI Guidelines, กฎที่ 2), kept React-free so vitest can pin the rules.
 *
 * Two rules that matter most:
 *
 *  - an icon is rendered ONLY when real metadata backs it: audio, video and
 *    "trains on your data" have no `ModelInfo` field today, so they are declared
 *    here and deliberately never resolved.
 *  - **which controls exist is NOT decided here.** `resolveModelThinkingOptions`
 *    (`@/utils/modelThinkingOptions`) is the single shared policy used by Settings
 *    and the Quick Picker alike; this module only adds presentation on top of it —
 *    which icons a row shows, their colour for the real on/off state, the one-letter
 *    effort badge — so the row and the hover Options panel can never disagree with
 *    each other or with Settings.
 */
import {
	effortBadge,
	isOffEffortLevel,
	type ModelThinkingInfo,
	type ModelThinkingOptions,
	modelIdLooksReasoning,
	resolveEffortLevels,
	resolveModelThinkingOptions,
} from "@/utils/modelThinkingOptions"
import type { PickerStringKey } from "./i18n/pickerStrings"

/** Structural subset of `ModelInfo` this module reads (see the shared policy). */
export type ModelCapabilityLike = ModelThinkingInfo & { supportsImages?: boolean }

export type CapabilityId = "reasoning" | "thinking" | "vision" | "audio" | "video" | "training"

export interface CapabilityDefinition {
	id: CapabilityId
	/** Tooltip key — resolved through the picker string map, never inlined. */
	tooltipKey: PickerStringKey
	/** Short label key for the Options panel's capability list. */
	labelKey: PickerStringKey
}

/** Capability accent colors are part of the design lock (guideline กฎที่ 2). */
export const CAPABILITY_COLORS: Record<CapabilityId, string> = {
	reasoning: "#c39bff",
	thinking: "#ffd166",
	vision: "#5ec8ff",
	audio: "#ff7eb6",
	video: "#ff9466",
	training: "#4de3c1",
}

const DEFINITIONS: Record<CapabilityId, CapabilityDefinition> = {
	reasoning: { id: "reasoning", tooltipKey: "capReasoning", labelKey: "capLabelReasoning" },
	thinking: { id: "thinking", tooltipKey: "capThinking", labelKey: "capLabelThinking" },
	vision: { id: "vision", tooltipKey: "capVision", labelKey: "capLabelVision" },
	audio: { id: "audio", tooltipKey: "capAudio", labelKey: "capLabelAudio" },
	video: { id: "video", tooltipKey: "capVideo", labelKey: "capLabelVideo" },
	training: { id: "training", tooltipKey: "capTraining", labelKey: "capLabelTraining" },
}

/**
 * True when an effort level is meaningful for this model. Mirrors the long-standing
 * picker heuristic: declared reasoning support, a thinking budget (a model that can
 * think can reason), or an effort the user already set.
 */
export function modelSupportsEffort(modelId: string, info?: ModelCapabilityLike | null, effortIsSet?: boolean): boolean {
	if (effortIsSet) {
		return true
	}
	if (info?.supportsReasoning || info?.thinkingConfig) {
		return true
	}
	return modelIdLooksReasoning(modelId)
}

/**
 * Capabilities to show for a model, in a stable render order. `audio`, `video` and
 * `training` are absent by construction: no `ModelInfo` field populates them yet, so
 * returning them would be a guess. A capability describes the MODEL (not the current
 * setting); the on/off state travels separately in {@link ModelStatus.enabled}.
 */
export function resolveModelCapabilities(
	modelId: string,
	info?: ModelCapabilityLike | null,
	options: { effortIsSet?: boolean } = {},
): CapabilityDefinition[] {
	const found: CapabilityDefinition[] = []
	if (modelSupportsEffort(modelId, info, options.effortIsSet)) {
		found.push(DEFINITIONS.reasoning)
	}
	if (info?.thinkingConfig) {
		found.push(DEFINITIONS.thinking)
	}
	if (info?.supportsImages) {
		found.push(DEFINITIONS.vision)
	}
	return found
}

export interface ModelStatus {
	/** Which controls the Options panel may offer — from the SHARED policy. */
	support: ModelThinkingOptions
	/** Whether reasoning/thinking is ON for this model right now. */
	enabled: boolean
	/** Effective effort while it is on (undefined = off or not applicable). */
	effort: string | undefined
	/** One-letter effort badge for the row ("" = no badge). */
	effortShort: string
	/** Thinking budget in force (0 = off) — what the panel's switch toggles. */
	thinkingBudgetTokens: number
	/** Capabilities backed by real metadata, in a stable render order. */
	caps: CapabilityDefinition[]
}

/**
 * Everything the row and the Options panel need to agree on for one model.
 *
 * `reasoningEffort`/`thinkingBudgetTokens` are the values actually in force — the live
 * configuration for the active model, that model's stored preference otherwise — so
 * the icon colour, the effort badge, the switch and the selected effort level all
 * read from the same facts.
 *
 * A leftover thinking budget with no explicit effort is reported as `high`, the same
 * rule `resolveClaudeOpusAdaptiveThinking` applies for adaptive-thinking models.
 */
export function resolveModelStatus(input: {
	providerId: string
	modelId: string
	modelInfo?: ModelCapabilityLike | null
	reasoningEffort?: string
	thinkingBudgetTokens?: number
}): ModelStatus {
	const budget = input.thinkingBudgetTokens ?? 0
	// Accept the provider's OWN vocabulary: a Sakana model stores `max`, which the
	// OpenAI enum does not carry, and the row must still show it as on with its badge.
	const effortLevels = resolveEffortLevels({
		providerId: input.providerId,
		modelId: input.modelId,
		modelInfo: input.modelInfo,
	})
	const stored = input.reasoningEffort
	const explicit = effortLevels.levels.some((level) => level.value === stored) ? (stored as string) : undefined
	const explicitOn = !!explicit && !isOffEffortLevel(effortLevels, explicit)
	const support = resolveModelThinkingOptions({
		providerId: input.providerId,
		modelId: input.modelId,
		modelInfo: input.modelInfo,
		effortIsSet: explicitOn,
		budgetIsSet: budget > 0,
	})
	let effort = explicitOn ? explicit : undefined
	if (!effort && !isOffEffortLevel(effortLevels, stored) && budget > 0) {
		effort = "high"
	}
	const enabled = support.builtinReasoning
		? true
		: support.showEffort
			? !!effort
			: support.showThinkingBudget
				? budget > 0
				: false
	const caps = resolveModelCapabilities(input.modelId, input.modelInfo, { effortIsSet: support.showEffort })
	return {
		support,
		enabled,
		effort: enabled && support.showEffort ? effort : undefined,
		effortShort: support.showEffort && enabled && effort ? effortBadge(effortLevels, effort) : "",
		thinkingBudgetTokens: budget,
		caps,
	}
}
