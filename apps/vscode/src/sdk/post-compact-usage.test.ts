import type { ClineMessage } from "@shared/ExtensionMessage"
import { getLastApiReqTotalTokens } from "@shared/getApiMetrics"
import { describe, expect, it } from "vitest"
import { applyDurablePostCompactEstimate, estimatePostCompactTokens } from "./post-compact-usage"

function usageRow(tokensIn: number, extras: Record<string, unknown> = {}): ClineMessage {
	return {
		ts: tokensIn,
		type: "say",
		say: "api_req_started",
		text: JSON.stringify({ tokensIn, tokensOut: 0, cacheWrites: 0, cacheReads: 0, cost: 0, ...extras }),
		partial: false,
	}
}

describe("applyDurablePostCompactEstimate", () => {
	it("does not keep a pre-compact 100k window after a 10→2 sidecar compact", () => {
		const messages: ClineMessage[] = [{ ts: 1, type: "say", say: "task", text: "hello" }, usageRow(100_000)]
		const compacted = applyDurablePostCompactEstimate(messages, {
			source_message_count: 10,
			messages: [{}, {}],
		})

		expect(getLastApiReqTotalTokens(compacted)).toBe(estimatePostCompactTokens(100_000, 10, 2))
		expect(getLastApiReqTotalTokens(compacted)).not.toBe(100_000)
		expect(JSON.parse(compacted[compacted.length - 1].text ?? "{}").excludeFromTotals).toBe(true)
	})

	it("uses measured post-compact tokens from the sidecar when reopening history", () => {
		const messages: ClineMessage[] = [usageRow(100_000)]
		const compacted = applyDurablePostCompactEstimate(messages, {
			source_message_count: 10,
			messages: [{}, {}],
			context_usage: {
				tokens_before: 100_000,
				tokens_after: 2_345,
				max_input_tokens: 100_000,
			},
		})

		expect(getLastApiReqTotalTokens(compacted)).toBe(2_345)
	})

	it("does not append a second estimate when the live compact row is already present", () => {
		const estimated = estimatePostCompactTokens(100_000, 10, 2)
		const messages: ClineMessage[] = [usageRow(100_000), usageRow(estimated, { excludeFromTotals: true })]
		const compacted = applyDurablePostCompactEstimate(messages, {
			source_message_count: 10,
			messages: [{}, {}],
		})
		expect(compacted).toHaveLength(2)
		expect(getLastApiReqTotalTokens(compacted)).toBe(estimated)
	})

	it("leaves messages unchanged when there is no compaction sidecar", () => {
		const messages: ClineMessage[] = [usageRow(100_000)]
		expect(applyDurablePostCompactEstimate(messages, undefined)).toEqual(messages)
		expect(applyDurablePostCompactEstimate(messages, { source_message_count: 10, messages: [] })).toEqual(messages)
	})
})
