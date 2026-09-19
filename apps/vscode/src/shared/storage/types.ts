/**
 * Every reasoning effort string the app is allowed to store or forward.
 *
 * This MUST stay identical to the SDK's `REASONING_LEVELS` (`@cline/shared`).
 * The SDK gateway normalizes whatever it receives against the controls the
 * model actually advertises (an unlisted model clamps `minimal`→`low` and
 * `xhigh`/`max`→`high`), so forwarding the full vocabulary is always safe — but
 * anything missing HERE gets rewritten to `medium` before it ever reaches the
 * SDK. That is how Sakana's `max` silently became `medium`.
 * `__tests__/reasoning-effort-parity.test.ts` fails the build if the two lists
 * ever drift apart again.
 */
export const OPENAI_REASONING_EFFORT_OPTIONS = ["none", "minimal", "low", "medium", "high", "xhigh", "max"] as const

export type OpenaiReasoningEffort = (typeof OPENAI_REASONING_EFFORT_OPTIONS)[number]

/** The levels that mean "send an explicit effort" — i.e. everything but `none`. */
export type ReasoningEffortValue = Exclude<OpenaiReasoningEffort, "none">

export function isOpenaiReasoningEffort(value: unknown): value is OpenaiReasoningEffort {
	return typeof value === "string" && OPENAI_REASONING_EFFORT_OPTIONS.includes(value as OpenaiReasoningEffort)
}

/**
 * Guard for the values a provider config / session may carry as an explicit
 * effort. `none` is not one of them: "no reasoning" is expressed by omitting the
 * field (or by `thinking: false`), never by sending `effort: "none"`.
 */
export function isReasoningEffortValue(value: unknown): value is ReasoningEffortValue {
	return isOpenaiReasoningEffort(value) && value !== "none"
}

export function normalizeOpenaiReasoningEffort(effort?: string): OpenaiReasoningEffort {
	const value = (effort || "medium").toLowerCase()
	return isOpenaiReasoningEffort(value) ? value : "medium"
}

export type Mode = "plan" | "act"

export interface BlobStoreSettings {
	bucket: string
	adapterType: "s3" | "r2" | "azure" | string
	accessKeyId: string
	secretAccessKey: string
	region?: string
	endpoint?: string
	accountId?: string

	/** Interval between sync attempts in milliseconds (default: 30000 = 30s) */
	intervalMs?: number
	/** Maximum number of retries before giving up on an item (default: 5) */
	maxRetries?: number
	/** Batch size - how many items to process per interval (default: 10) */
	batchSize?: number
	/** Maximum queue size before eviction (default: 1000) */
	maxQueueSize?: number
	/** Maximum age for failed items in milliseconds (default: 7 days) */
	maxFailedAgeMs?: number
	/** Whether to backfill existing unsynced items on startup (default: false) */
	backfillEnabled?: boolean
}
