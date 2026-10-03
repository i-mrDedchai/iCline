import type { ClineMessage } from "@shared/ExtensionMessage"
import { describe, expect, it } from "vitest"
import {
	canRestoreWorkspaceFromMessage,
	filterVisibleMessages,
	groupLowStakesTools,
	isFinalReplyText,
	isToolGroup,
} from "./messageUtils"

const createTextMessage = (ts: number, text: string): ClineMessage => ({
	type: "say",
	say: "text",
	text,
	ts,
})

const createToolMessage = (ts: number, tool: string): ClineMessage => ({
	type: "say",
	say: "tool",
	text: JSON.stringify({ tool, path: "src/file.ts" }),
	ts,
})

const createReasoningMessage = (ts: number, text: string): ClineMessage => ({
	type: "say",
	say: "reasoning",
	text,
	ts,
})

const createUserFeedbackMessage = (ts: number, text: string): ClineMessage => ({
	type: "say",
	say: "user_feedback",
	text,
	ts,
})

const createTaskMessage = (ts: number, text: string): ClineMessage => ({
	type: "say",
	say: "task",
	text,
	ts,
})

const createAskMessage = (
	ts: number,
	ask: "followup" | "plan_mode_respond",
	options: string[],
	selected?: string,
): ClineMessage => ({
	type: "ask",
	ask,
	text: JSON.stringify(
		ask === "followup" ? { question: "Pick one", options, selected } : { response: "Pick one", options, selected },
	),
	ts,
})

const createApiReqMessage = (ts: number, text = JSON.stringify({ request: "GET /" })): ClineMessage => ({
	type: "say",
	say: "api_req_started",
	text,
	ts,
})

const createCompletionMessage = (ts: number, text: string): ClineMessage => ({
	type: "say",
	say: "completion_result",
	text,
	ts,
})

const createInfoMessage = (ts: number, text: string): ClineMessage => ({
	type: "say",
	say: "info",
	text,
	ts,
})

describe("filterVisibleMessages", () => {
	it("hides exact user feedback echoes for selected follow-up options", () => {
		const askMessage = createAskMessage(1, "followup", ["Use this", "Use that"], "Use this")
		const visible = filterVisibleMessages([askMessage, createUserFeedbackMessage(2, "Use this")])

		expect(visible).toEqual([askMessage])
	})

	it("hides exact option echoes when selected has not been persisted on the ask row yet", () => {
		const askMessage = createAskMessage(1, "followup", ["Use this", "Use that"])
		const visible = filterVisibleMessages([askMessage, createUserFeedbackMessage(2, "Use this")])

		expect(visible).toEqual([askMessage])
	})

	it("hides exact user feedback echoes for plan-mode response options", () => {
		const askMessage = createAskMessage(1, "plan_mode_respond", ["Plan it", "Do it"], "Plan it")
		const visible = filterVisibleMessages([askMessage, createUserFeedbackMessage(2, "Plan it")])

		expect(visible).toEqual([askMessage])
	})

	it("keeps custom user feedback that extends a selected option", () => {
		const askMessage = createAskMessage(1, "followup", ["Use this", "Use that"], "Use this")
		const userMessage = createUserFeedbackMessage(2, "Use this: include tests")
		const visible = filterVisibleMessages([askMessage, userMessage])

		expect(visible).toEqual([askMessage, userMessage])
	})

	it("keeps exact option feedback when it includes attachments", () => {
		const askMessage = createAskMessage(1, "followup", ["Use this", "Use that"], "Use this")
		const userMessage: ClineMessage = {
			...createUserFeedbackMessage(2, "Use this"),
			images: ["data:image/png;base64,abc"],
		}
		const visible = filterVisibleMessages([askMessage, userMessage])

		expect(visible).toEqual([askMessage, userMessage])
	})
})

describe("canRestoreWorkspaceFromMessage", () => {
	it("allows restore for user messages that start runs, but not ask answers", () => {
		const messages = [
			createTaskMessage(1, "start"),
			createAskMessage(2, "followup", ["src/index.ts"]),
			createTextMessage(3, "Which file should I inspect?"),
			createUserFeedbackMessage(4, "src/index.ts"),
			createUserFeedbackMessage(5, "next task"),
		]

		expect(canRestoreWorkspaceFromMessage(messages, 1)).toBe(true)
		expect(canRestoreWorkspaceFromMessage(messages, 4)).toBe(false)
		expect(canRestoreWorkspaceFromMessage(messages, 5)).toBe(true)
		expect(canRestoreWorkspaceFromMessage(messages, 999)).toBe(false)
	})
})

describe("groupLowStakesTools", () => {
	it("keeps text that arrives after a low-stakes tool group by finalizing the group first", () => {
		const grouped = groupLowStakesTools([
			createTextMessage(1, "Initial text"),
			createToolMessage(2, "readFile"),
			createTextMessage(3, "Post-tool summary text"),
		])

		expect(grouped).toHaveLength(3)
		expect(grouped[0]).toMatchObject({ type: "say", say: "text", text: "Initial text" })
		expect(isToolGroup(grouped[1])).toBe(true)
		expect(grouped[2]).toMatchObject({ type: "say", say: "text", text: "Post-tool summary text" })
	})

	it("keeps text when no low-stakes tool group is active", () => {
		const grouped = groupLowStakesTools([
			createTextMessage(1, "Initial text"),
			createToolMessage(2, "editedExistingFile"),
			createTextMessage(3, "Follow-up text"),
		])

		expect(grouped).toHaveLength(3)
		expect(grouped[0]).toMatchObject({ type: "say", say: "text", text: "Initial text" })
		expect(grouped[1]).toMatchObject({ type: "say", say: "tool" })
		expect(grouped[2]).toMatchObject({ type: "say", say: "text", text: "Follow-up text" })
	})

	it("keeps standalone reasoning when no low-stakes tool group follows", () => {
		const grouped = groupLowStakesTools([
			createReasoningMessage(1, "Thinking through options"),
			createTextMessage(2, "Answer text"),
		])

		expect(grouped).toHaveLength(2)
		expect(grouped[0]).toMatchObject({ type: "say", say: "reasoning", text: "Thinking through options" })
		expect(grouped[1]).toMatchObject({ type: "say", say: "text", text: "Answer text" })
	})

	it("keeps standalone reasoning before a non-low-stakes tool", () => {
		const grouped = groupLowStakesTools([
			createReasoningMessage(1, "Thinking through options"),
			createToolMessage(2, "editedExistingFile"),
		])

		expect(grouped).toHaveLength(2)
		expect(grouped[0]).toMatchObject({ type: "say", say: "reasoning", text: "Thinking through options" })
		expect(grouped[1]).toMatchObject({ type: "say", say: "tool" })
	})

	it("keeps reasoning visible when low-stakes tool group starts immediately after", () => {
		const grouped = groupLowStakesTools([createReasoningMessage(1, "Planning next read"), createToolMessage(2, "readFile")])

		expect(grouped).toHaveLength(2)
		expect(grouped[0]).toMatchObject({ type: "say", say: "reasoning", text: "Planning next read" })
		expect(isToolGroup(grouped[1])).toBe(true)
	})
})

describe("isFinalReplyText", () => {
	it("badges the last complete text", () => {
		const messages = [createUserFeedbackMessage(1, "hi"), createTextMessage(2, "hello")]
		expect(isFinalReplyText(messages[1], messages)).toBe(true)
	})

	it("keeps the header after a new user message (F4b)", () => {
		const messages = [
			createUserFeedbackMessage(1, "first"),
			createTextMessage(2, "first reply"),
			createUserFeedbackMessage(3, "second"),
			createTextMessage(4, "second reply"),
		]
		expect(isFinalReplyText(messages[1], messages)).toBe(true)
		expect(isFinalReplyText(messages[3], messages)).toBe(true)
	})

	it("keeps the header before a completion result", () => {
		const messages = [
			createUserFeedbackMessage(1, "go"),
			createTextMessage(2, "done"),
			createCompletionMessage(3, "all done"),
		]
		expect(isFinalReplyText(messages[1], messages)).toBe(true)
	})

	it("withholds the header from mid-turn narration", () => {
		const narrative = createTextMessage(2, "I'll read the file first")
		for (const continuation of [
			createToolMessage(3, "readFile"),
			createReasoningMessage(3, "thinking"),
			createTextMessage(3, "more narration"),
			createAskMessage(3, "followup", ["a"]),
		]) {
			expect(isFinalReplyText(narrative, [createUserFeedbackMessage(1, "go"), narrative, continuation])).toBe(false)
		}
		// A quiet api_req_started renders nothing (filterVisibleMessages drops
		// it), so like the old isLast rule the header shows transiently until a
		// real continuation lands and takes it away again.
		expect(isFinalReplyText(narrative, [createUserFeedbackMessage(1, "go"), narrative, createApiReqMessage(3)])).toBe(true)
		expect(
			isFinalReplyText(narrative, [
				createUserFeedbackMessage(1, "go"),
				narrative,
				createApiReqMessage(3),
				createToolMessage(4, "readFile"),
			]),
		).toBe(false)
	})

	it("sees through a quiet trailing api_req the render hides (e2e: costless api_req after final text)", () => {
		const reply = createTextMessage(2, "final reply")
		const messages = [createUserFeedbackMessage(1, "go"), reply, createApiReqMessage(3)]
		expect(isFinalReplyText(reply, messages)).toBe(true)
	})

	it("treats an api_req carrying an error as same-turn activity", () => {
		const reply = createTextMessage(2, "reply before cancel")
		const errored = createApiReqMessage(3, JSON.stringify({ request: "GET /", cancelReason: "user" }))
		expect(isFinalReplyText(reply, [createUserFeedbackMessage(1, "go"), reply, errored])).toBe(false)
	})

	it("sees through incidental rows to the turn boundary", () => {
		const messages = [
			createUserFeedbackMessage(1, "go"),
			createTextMessage(2, "done"),
			createInfoMessage(3, "retrying"),
			createUserFeedbackMessage(4, "next"),
		]
		expect(isFinalReplyText(messages[1], messages)).toBe(true)
	})

	it("rejects partial texts, non-texts, and strangers", () => {
		const partial = { ...createTextMessage(2, "streaming"), partial: true }
		const messages = [createUserFeedbackMessage(1, "go"), partial]
		expect(isFinalReplyText(partial, messages)).toBe(false)
		expect(isFinalReplyText(createUserFeedbackMessage(1, "go"), messages)).toBe(false)
		expect(isFinalReplyText(createTextMessage(999, "ghost"), messages)).toBe(false)
	})
})
