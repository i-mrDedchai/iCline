import type { ClineApiReqInfo, ClineMessage } from "@shared/ExtensionMessage"
import { getLastApiReqTotalTokens } from "@shared/getApiMetrics"

export interface CompactSidecarLike {
	source_message_count: number
	messages: readonly unknown[]
}

export function estimatePostCompactTokens(lastTotal: number, messagesBefore: number, messagesAfter: number): number {
	const ratio = messagesBefore > 0 ? Math.min(1, Math.max(0.05, messagesAfter / messagesBefore)) : 0.5
	return Math.max(1, Math.round(lastTotal * ratio))
}

export function buildPostCompactUsageMessage(estimated: number, ts: number = Date.now()): ClineMessage {
	const usage: ClineApiReqInfo = {
		tokensIn: estimated,
		tokensOut: 0,
		cacheWrites: 0,
		cacheReads: 0,
		cost: 0,
		excludeFromTotals: true,
	}
	return {
		ts,
		type: "say",
		say: "api_req_started",
		text: JSON.stringify(usage),
		partial: false,
	}
}

/**
 * Canonical SDK transcripts stay pre-compact. The live bar estimate is a
 * synthetic `api_req_started` row that is not part of that transcript, so
 * history reopen must re-apply it from the persisted compaction sidecar.
 */
export function applyDurablePostCompactEstimate(
	messages: ClineMessage[],
	compaction: CompactSidecarLike | undefined | null,
): ClineMessage[] {
	if (!compaction || compaction.messages.length === 0) {
		return messages
	}
	if (lastUsageIsPostCompactEstimate(messages)) {
		return messages
	}
	const lastTotal = getLastApiReqTotalTokens(messages)
	if (lastTotal <= 0) {
		return messages
	}
	const estimated = estimatePostCompactTokens(lastTotal, compaction.source_message_count, compaction.messages.length)
	if (lastTotal <= estimated) {
		return messages
	}
	return [...messages, buildPostCompactUsageMessage(estimated)]
}

function lastUsageIsPostCompactEstimate(messages: ClineMessage[]): boolean {
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i]
		if (msg.type !== "say" || msg.say !== "api_req_started" || !msg.text) {
			continue
		}
		try {
			const parsed = JSON.parse(msg.text) as ClineApiReqInfo
			return parsed.excludeFromTotals === true
		} catch {
			return false
		}
	}
	return false
}
