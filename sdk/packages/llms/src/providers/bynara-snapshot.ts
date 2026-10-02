import type { ModelInfo } from "../catalog/types"
/**
 * NaraRouter (Bynara) static model catalog snapshot.
 *
 * Source: live GET https://router.bynara.id/v1/models (Bearer key),
 * captured 2026-10-02 - 57 entries, minus agnes-video-v2.0 (a video
 * generation model, not a chat model, so it stays out of the picker).
 * Field mapping from the gateway payload: name verbatim,
 * context_window -> contextWindow + maxInputTokens, vision ->
 * "images" capability, reasoning -> "reasoning" capability.
 * Base capabilities are always streaming + tools (same convention as the
 * SDK's private-source builder).
 *
 * Pricing is USD per 1M tokens converted from the gateway's IDR prices
 * (input/output/cache_read_idr_per_1m) at ~16,500 IDR/USD, the approximate
 * market rate on 2026-10-02, rounded to 3 significant figures. Models the
 * gateway declares at exactly 0 carry { input: 0, output: 0 } (honestly
 * free). Treat the paid figures as gateway-rate approximations, not
 * bank-grade FX.
 *
 * This snapshot is what the Settings dropdown and Quick Picker show with
 * NO key saved. A keyed fetch of the same /v1/models endpoint enriches /
 * extends it at runtime, so drift self-heals the moment a key is stored.
 * Re-snapshot with a healthy key when the gateway announces new models.
 */
export const BYNARA_SNAPSHOT_DATE = "2026-10-02"
export const BYNARA_DEFAULT_MODEL_ID = "mimo-v2.5-free"

/**
 * Which dashboard shelf a model sits on. The gateway's /v1/models payload
 * carries NO tier signal — this mapping was read off the NaraRouter
 * dashboard model tables ("Free models" / "Free for paid users" /
 * "PAYG Models", month precision {@link BYNARA_TIERS_MONTH}) and must be
 * re-read by a human whenever the dashboard moves models between shelves.
 *
 * "free" does NOT mean price zero: several Free-plan models carry real
 * PAYG rates (agnes-2.5-flash, agnes-3-flash, longcat-2.5) — "free" means
 * usable on the Free plan quota at no extra cost. "bonus" models have real
 * rates too but are served free while the account holds the qualifying
 * credit balance (the dashboard's "Hold above Rp…" badge; the threshold
 * itself drifts — Rp15,000 vs Rp35,000 was seen for the same model — so it
 * is described, never hardcoded). Only "payg" is billed per token, period.
 *
 * Model multipliers (2x, 0.01x, …) affect plan-quota burn only, never PAYG
 * billing, so they are deliberately not modeled here.
 */
export type BynaraModelTier = "free" | "bonus" | "payg"
export const BYNARA_TIERS_MONTH = "2026-10"
export const BYNARA_MODEL_TIERS: Record<string, BynaraModelTier> = {
	"agnes-2.5-flash": "free",
	"agnes-3-flash": "free",
	jev: "free",
	"laguna-s-2.1": "free",
	"ling-3.0-flash-fin-free": "free",
	"ling-3.0-flash-sante-free": "free",
	"longcat-2.5": "free",
	"nemotron-3-super-free": "free",
	"nemotron-3-ultra-free": "free",
	"nemotron-3.5-lightning-free": "free",
	"space-bunny-alpha": "free",
	"space-bunny-alpha-bynara": "free",
	"mimo-v2.5-free": "bonus",
	"mimo-v2.6-flash-free": "bonus",
	"muse-spark-1.3-contributor-free": "bonus",
	"step-5-preview": "bonus",
	"stepfun-3.7-flash": "bonus",
}

export function bynaraTierOf(modelId: string): BynaraModelTier {
	return BYNARA_MODEL_TIERS[modelId] ?? "payg"
}

const BYNARA_TIER_DESCRIPTIONS: Record<Exclude<BynaraModelTier, "payg">, string> = {
	free: "NaraRouter Free-plan model: usable on the Free plan quota at no extra cost.",
	bonus:
		"NaraRouter bonus model: served free while the account holds the qualifying credit balance (threshold varies — see the NaraRouter dashboard).",
}
export function buildBynaraModels(): Record<string, ModelInfo> {
	const models: Record<string, ModelInfo> = {
		"agnes-2.5-flash": {
			id: "agnes-2.5-flash",
			name: "Agnes 2.5 Flash",
			contextWindow: 512000,
			maxInputTokens: 512000,
			capabilities: ["streaming","tools","images","reasoning"],
			pricing: { input: 0.00606, output: 0.0121, cacheRead: 0.000606 },
			status: "active",
		},
		"agnes-3-flash": {
			id: "agnes-3-flash",
			name: "Agnes 3 Flash",
			contextWindow: 512000,
			maxInputTokens: 512000,
			capabilities: ["streaming","tools","images","reasoning"],
			pricing: { input: 0.0121, output: 0.0242, cacheRead: 0.00121 },
			status: "active",
		},
		"claude-fable-5.1": {
			id: "claude-fable-5.1",
			name: "Claude Fable 5.1",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 3.22, output: 16.1, cacheRead: 0.262 },
			status: "active",
		},
		"claude-opus-4.8": {
			id: "claude-opus-4.8",
			name: "Claude Opus 4.8",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 1.61, output: 8.04, cacheRead: 0.282 },
			status: "active",
		},
		"claude-opus-5": {
			id: "claude-opus-5",
			name: "Claude Opus 5",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 1.61, output: 8.04, cacheRead: 0.282 },
			status: "active",
		},
		"claude-opus-5.5": {
			id: "claude-opus-5.5",
			name: "Claude Opus 5.5",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 1.09, output: 4.32, cacheRead: 0.23 },
			status: "active",
		},
		"claude-sonnet-5": {
			id: "claude-sonnet-5",
			name: "Claude Sonnet 5",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.651, output: 3.25, cacheRead: 0.126 },
			status: "active",
		},
		"claude-sonnet-5.5": {
			id: "claude-sonnet-5.5",
			name: "Claude Sonnet 5.5",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.654, output: 3.27, cacheRead: 0.0957 },
			status: "active",
		},
		"deepseek-v4-flash-alibaba": {
			id: "deepseek-v4-flash-alibaba",
			name: "Deepseek v4 Flash 0731 Alibaba",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.138, output: 0.218, cacheRead: 0.0642 },
			status: "active",
		},
		"deepseek-v4-flash-vision-exp": {
			id: "deepseek-v4-flash-vision-exp",
			name: "DeepSeek V4 Flash Vision (exp)",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.0474, output: 0.142, cacheRead: 0.00536 },
			status: "active",
		},
		"deepseek-v4-pro-alibaba": {
			id: "deepseek-v4-pro-alibaba",
			name: "Deepseek v4 Pro 0813 Alibaba",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools"],
			pricing: { input: 1.96, output: 2.75, cacheRead: 0.271 },
			status: "active",
		},
		"deepseek-v4.1-flash": {
			id: "deepseek-v4.1-flash",
			name: "Deepseek v4.1 Flash",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images","reasoning"],
			pricing: { input: 0.0503, output: 0.189, cacheRead: 0.00428 },
			status: "active",
		},
		"gemini-3.1-pro-high": {
			id: "gemini-3.1-pro-high",
			name: "Gemini 3.1 Pro High",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.107, output: 0.642, cacheRead: 0.0168 },
			status: "active",
		},
		"gemini-3.8-flash-high": {
			id: "gemini-3.8-flash-high",
			name: "Gemini 3.8 Flash High",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.0401, output: 0.201, cacheRead: 0.00644 },
			status: "active",
		},
		"glm-5.2": {
			id: "glm-5.2",
			name: "GLM 5.2",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","reasoning"],
			pricing: { input: 0.192, output: 0.64, cacheRead: 0.048 },
			status: "active",
		},
		"glm-5.3": {
			id: "glm-5.3",
			name: "GLM 5.3",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","reasoning"],
			pricing: { input: 0.448, output: 1.41, cacheRead: 0.0832 },
			status: "active",
		},
		"glm-5.3-flash": {
			id: "glm-5.3-flash",
			name: "GLM 5.3 Flash",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images","reasoning"],
			pricing: { input: 0.0323, output: 0.108, cacheRead: 0.0108 },
			status: "active",
		},
		"gpt-5.6-luna": {
			id: "gpt-5.6-luna",
			name: "GPT 5.6 Luna",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.0216, output: 0.13, cacheRead: 0.00649 },
			status: "active",
		},
		"gpt-5.6-sol": {
			id: "gpt-5.6-sol",
			name: "GPT 5.6 Sol",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.621, output: 4.27, cacheRead: 0.177 },
			status: "active",
		},
		"gpt-5.6-terra": {
			id: "gpt-5.6-terra",
			name: "GPT 5.6 Terra",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images","reasoning"],
			pricing: { input: 0.322, output: 1.93, cacheRead: 0.0928 },
			status: "active",
		},
		"gpt-6-astra": {
			id: "gpt-6-astra",
			name: "GPT 6 Astra",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 1.54, output: 6.48, cacheRead: 0.215 },
			status: "active",
		},
		"gpt-6-luna": {
			id: "gpt-6-luna",
			name: "GPT 6 Luna",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.0154, output: 0.0541, cacheRead: 0.00324 },
			status: "active",
		},
		"gpt-6-sol": {
			id: "gpt-6-sol",
			name: "GPT 6 SOL",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.327, output: 1.63, cacheRead: 0.0448 },
			status: "active",
		},
		"gpt-6.1-sol": {
			id: "gpt-6.1-sol",
			name: "GPT 6.1 Sol",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.327, output: 1.63, cacheRead: 0.0388 },
			status: "active",
		},
		"jev": {
			id: "jev",
			name: "Jev",
			contextWindow: 32000,
			maxInputTokens: 32000,
			capabilities: ["streaming","tools"],
			pricing: { input: 0, output: 0 },
			status: "active",
		},
		"kimi-k2.7-code": {
			id: "kimi-k2.7-code",
			name: "Kimi K2.7-code",
			contextWindow: 262000,
			maxInputTokens: 262000,
			capabilities: ["streaming","tools","images","reasoning"],
			pricing: { input: 0.227, output: 1.03, cacheRead: 0.119 },
			status: "active",
		},
		"kimi-k3": {
			id: "kimi-k3",
			name: "Kimi K3",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images","reasoning"],
			pricing: { input: 0.965, output: 4.83, cacheRead: 0.157 },
			status: "active",
		},
		"laguna-s-2.1": {
			id: "laguna-s-2.1",
			name: "Laguna S 2.1",
			contextWindow: 262000,
			maxInputTokens: 262000,
			capabilities: ["streaming","tools","reasoning"],
			pricing: { input: 0, output: 0 },
			status: "active",
		},
		"ling-3.0-flash-fin-free": {
			id: "ling-3.0-flash-fin-free",
			name: "Ling 3.0 Flash Fin Free",
			contextWindow: 262000,
			maxInputTokens: 262000,
			capabilities: ["streaming","tools"],
			pricing: { input: 0, output: 0 },
			status: "active",
		},
		"ling-3.0-flash-sante-free": {
			id: "ling-3.0-flash-sante-free",
			name: "Ling 3.0 Flash Sante Free",
			contextWindow: 262000,
			maxInputTokens: 262000,
			capabilities: ["streaming","tools","reasoning"],
			pricing: { input: 0, output: 0 },
			status: "active",
		},
		"longcat-2.5": {
			id: "longcat-2.5",
			name: "LongCat 2.5",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","reasoning"],
			pricing: { input: 0.407, output: 3.25, cacheRead: 0.0407 },
			status: "active",
		},
		"mimo-v2.5": {
			id: "mimo-v2.5",
			name: "MiMo v2.5",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.0225, output: 0.0451, cacheRead: 0.000935 },
			status: "active",
		},
		"mimo-v2.5-free": {
			id: "mimo-v2.5-free",
			name: "Mimo v2.5 Free",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.0149, output: 0.0299, cacheRead: 0.000299 },
			status: "active",
		},
		"mimo-v2.6-flash": {
			id: "mimo-v2.6-flash",
			name: "MiMo V2.6 Flash",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.0453, output: 0.0906, cacheRead: 0.00212 },
			status: "active",
		},
		"mimo-v2.6-flash-free": {
			id: "mimo-v2.6-flash-free",
			name: "Mimo v2.6 Flash Free",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.0453, output: 0.0906, cacheRead: 0.00212 },
			status: "active",
		},
		"mimo-v2.6-pro": {
			id: "mimo-v2.6-pro",
			name: "MiMo V2.6 Pro",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images","reasoning"],
			pricing: { input: 0.142, output: 0.283, cacheRead: 0.00238 },
			status: "active",
		},
		"minimax-m3": {
			id: "minimax-m3",
			name: "MiniMax M3",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.161, output: 0.642, cacheRead: 0.0321 },
			status: "active",
		},
		"muse-spark-1.2": {
			id: "muse-spark-1.2",
			name: "Muse Spark 1.2",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.269, output: 0.915, cacheRead: 0.0323 },
			status: "active",
		},
		"muse-spark-1.2-contributor": {
			id: "muse-spark-1.2-contributor",
			name: "Muse Spark 1.2 Contributor",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.0214, output: 0.0427, cacheRead: 0.00164 },
			status: "active",
		},
		"muse-spark-1.3": {
			id: "muse-spark-1.3",
			name: "Muse Spark 1.3",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.269, output: 0.915, cacheRead: 0.0323 },
			status: "active",
		},
		"muse-spark-1.3-contributor": {
			id: "muse-spark-1.3-contributor",
			name: "Muse Spark 1.3 Contributor",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.0214, output: 0.0427, cacheRead: 0.00164 },
			status: "active",
		},
		"muse-spark-1.3-contributor-free": {
			id: "muse-spark-1.3-contributor-free",
			name: "Muse Spark 1.3 Contributor Free",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images","reasoning"],
			pricing: { input: 0.0214, output: 0.0427, cacheRead: 0.00103 },
			status: "active",
		},
		"nemotron-3-super-free": {
			id: "nemotron-3-super-free",
			name: "Nemotron 3 Super Free",
			contextWindow: 262000,
			maxInputTokens: 262000,
			capabilities: ["streaming","tools","reasoning"],
			pricing: { input: 0, output: 0 },
			status: "active",
		},
		"nemotron-3-ultra-free": {
			id: "nemotron-3-ultra-free",
			name: "Nemotron 3 Ultra Free",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","reasoning"],
			pricing: { input: 0, output: 0 },
			status: "active",
		},
		"nemotron-3.5-lightning-free": {
			id: "nemotron-3.5-lightning-free",
			name: "Nemotron 3.5 Lightning",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","reasoning"],
			pricing: { input: 0, output: 0 },
			status: "active",
		},
		"qwen3.8-27b": {
			id: "qwen3.8-27b",
			name: "Qwen 3.8 27B",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools"],
			pricing: { input: 0.0686, output: 0.817, cacheRead: 0.0481 },
			status: "active",
		},
		"qwen3.8-flash": {
			id: "qwen3.8-flash",
			name: "Qwen 3.8 Flash",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images","reasoning"],
			pricing: { input: 0.0402, output: 0.126, cacheRead: 0.00776 },
			status: "active",
		},
		"qwen3.8-max": {
			id: "qwen3.8-max",
			name: "Qwen3.8-Max",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 0.644, output: 1.93, cacheRead: 0.0805 },
			status: "active",
		},
		"qwen3.8-max-alibaba": {
			id: "qwen3.8-max-alibaba",
			name: "Qwen3.8-Max Alibaba",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images"],
			pricing: { input: 2.18, output: 6.54, cacheRead: 0.218 },
			status: "active",
		},
		"space-bunny-alpha": {
			id: "space-bunny-alpha",
			name: "Space Bunny Alpha",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images","reasoning"],
			pricing: { input: 0, output: 0 },
			status: "active",
		},
		"space-bunny-alpha-bynara": {
			id: "space-bunny-alpha-bynara",
			name: "Space Bunny Alpha byNara",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images","reasoning"],
			pricing: { input: 0, output: 0 },
			status: "active",
		},
		"step-5-preview": {
			id: "step-5-preview",
			name: "Step 5 Preview",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","images","reasoning"],
			pricing: { input: 0.108, output: 0.325, cacheRead: 0.0103 },
			status: "active",
		},
		"stepfun-3.7-flash": {
			id: "stepfun-3.7-flash",
			name: "Stepfun 3.7 Flash",
			contextWindow: 262000,
			maxInputTokens: 262000,
			capabilities: ["streaming","tools","images","reasoning"],
			pricing: { input: 0.0439, output: 0.252, cacheRead: 0.00878 },
			status: "active",
		},
		"deepseek-v4-flash": {
			id: "deepseek-v4-flash",
			name: "DeepSeek v4 Flash 0731",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools"],
			pricing: { input: 0.0208, output: 0.0577, cacheRead: 0.00634 },
			status: "active",
		},
		"deepseek-v4-pro": {
			id: "deepseek-v4-pro",
			name: "DeepSeek v4 Pro 0813",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools","reasoning"],
			pricing: { input: 0.358, output: 1.07, cacheRead: 0.0725 },
			status: "active",
		},
		"mimo-v2.5-pro": {
			id: "mimo-v2.5-pro",
			name: "MiMo v2.5 Pro",
			contextWindow: 1000000,
			maxInputTokens: 1000000,
			capabilities: ["streaming","tools"],
			pricing: { input: 0.0933, output: 0.187, cacheRead: 0.0012 },
			status: "active",
		},
	}
	// Surface the dashboard shelf in Settings (ModelInfoView renders
	// description): a Free-plan model with a real PAYG rate must not look
	// identical to a billed one, and a bonus model must carry its hold
	// condition where the user picks the model — not just in the docs.
	for (const [id, info] of Object.entries(models)) {
		const tier = bynaraTierOf(id)
		if (tier !== "payg") {
			info.description = BYNARA_TIER_DESCRIPTIONS[tier]
		}
	}
	return models
}
