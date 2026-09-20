import { describe, expect, it } from "vitest"
import { type BackgroundTask, backgroundTaskBadge, backgroundTaskNotice } from "./backgroundTaskBadge"

const task = (overrides: Partial<BackgroundTask> = {}): BackgroundTask => ({
	taskId: "task-1",
	title: "Refactor the parser",
	isRunning: false,
	awaitingApproval: false,
	...overrides,
})

describe("backgroundTaskBadge", () => {
	it("says Working while the agent is executing a turn", () => {
		const badge = backgroundTaskBadge(task({ isRunning: true }))
		expect(badge.label).toBe("Working")
		expect(badge.icon).toBe("codicon-loading")
	})

	it("says Waiting when the task is blocked on a question, even though it also counts as running", () => {
		// A task awaiting an answer is \"working\" as far as the run flag goes, but the user needs to
		// know it is their turn to act — that is the difference between waiting and being busy.
		const badge = backgroundTaskBadge(task({ isRunning: true, awaitingApproval: true }))
		expect(badge.label).toBe("Waiting")
		expect(badge.icon).toBe("codicon-bell")
	})

	it("says Done when the turn ended while the user was away", () => {
		const badge = backgroundTaskBadge(task({ isRunning: false, awaitingApproval: false }))
		expect(badge.label).toBe("Done")
		expect(badge.icon).toBe("codicon-check")
		expect(badge.description).toContain("finished")
	})
})

describe("backgroundTaskNotice", () => {
	it("names the task in each state", () => {
		expect(backgroundTaskNotice(task({ isRunning: true }), false)).toBe(
			"Still working in the background: Refactor the parser",
		)
		expect(backgroundTaskNotice(task({ isRunning: true, awaitingApproval: true }), false)).toBe(
			"Waiting for your answer: Refactor the parser",
		)
		expect(backgroundTaskNotice(task(), false)).toBe("Finished in the background: Refactor the parser")
	})

	it("falls back to a name when the state carried no title", () => {
		expect(backgroundTaskNotice(task({ title: undefined, isRunning: true }), false)).toContain("Untitled task")
	})

	it("explains what happens to a queued task, and why a blocked one waits for the answer", () => {
		expect(backgroundTaskNotice(task({ isRunning: true }), true)).toContain("your next task starts when it finishes")
		// A task waiting on a question will not finish on its own, so promising \"when it finishes\"
		// would be a promise the host cannot keep (a queue only starts from idle).
		expect(backgroundTaskNotice(task({ isRunning: true, awaitingApproval: true }), true)).toContain(
			"your next task waits until you answer it",
		)
	})

	it("says nothing about a queue when nothing is queued", () => {
		expect(backgroundTaskNotice(task({ isRunning: true }), false)).not.toContain("next task")
	})
})
