import type { ClineMessage } from "@shared/ExtensionMessage"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it } from "vitest"
import SubagentStatusRow from "./SubagentStatusRow"

// jsdom has no layout: make every prompt div report clamped overflow so the
// "Show more" affordance becomes visible.
beforeAll(() => {
	Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
		configurable: true,
		get: () => 200,
	})
	Object.defineProperty(HTMLElement.prototype, "clientHeight", {
		configurable: true,
		get: () => 40,
	})
})

function buildMessage(prompt: string): ClineMessage {
	return {
		ts: 1,
		type: "say",
		say: "use_subagents",
		text: JSON.stringify({ prompts: [prompt] }),
		partial: false,
	} as unknown as ClineMessage
}

describe("SubagentStatusRow prompt expander", () => {
	it("expands with Show more and collapses again with Show less", () => {
		const prompt = "Write rain.js implementing the RainEngine canvas engine"
		render(<SubagentStatusRow isLast={false} message={buildMessage(prompt)} />)

		const showMore = screen.getByRole("button", {
			name: "Show full subagent prompt",
		})
		expect(showMore).toBeDefined()

		fireEvent.click(showMore)
		// Expanded: the collapse affordance must exist — the row previously
		// stayed expanded with no way back.
		const showLess = screen.getByRole("button", {
			name: "Hide full subagent prompt",
		})
		expect(showLess).toBeDefined()
		expect(screen.queryByRole("button", { name: "Show full subagent prompt" })).toBeNull()

		fireEvent.click(showLess)
		expect(screen.getByRole("button", { name: "Show full subagent prompt" })).toBeDefined()
		expect(screen.queryByRole("button", { name: "Hide full subagent prompt" })).toBeNull()
	})
})
