import { describe, it } from "bun:test"
import { REASONING_LEVELS } from "@cline/shared"
import { expect } from "chai"
import { isReasoningEffortValue, OPENAI_REASONING_EFFORT_OPTIONS } from "../types"

/**
 * The app used to keep its own 5-value effort vocabulary while the SDK accepted
 * 7. Everything the app did not recognize was rewritten to `medium`, so Sakana's
 * `max` (and any `minimal` from a catalog that publishes it) silently became
 * Medium before the request left the host, and `xhigh` was dropped at the last
 * gate. These tests pin the app list to the SDK's so that class of silent
 * downgrade cannot come back.
 */
describe("reasoning effort vocabulary matches the SDK", () => {
	it("stores exactly the SDK's reasoning levels, in the same order", () => {
		expect([...OPENAI_REASONING_EFFORT_OPTIONS]).to.deep.equal([...REASONING_LEVELS])
	})

	it("treats every SDK effort but `none` as forwardable", () => {
		const forwardable = OPENAI_REASONING_EFFORT_OPTIONS.filter((value) => value !== "none")
		for (const value of forwardable) {
			expect(isReasoningEffortValue(value)).to.equal(true)
		}
		expect(isReasoningEffortValue("none")).to.equal(false)
		expect(isReasoningEffortValue("ultra")).to.equal(false)
		expect(isReasoningEffortValue(undefined)).to.equal(false)
	})
})
