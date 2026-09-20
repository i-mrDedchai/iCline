/**
 * How the one task that is alive in the background announces itself.
 *
 * Three states, because "a task you are not looking at is still going" means three different
 * things to the user: it is working, it is waiting for an answer, or it finished while they were
 * away. Collapsing those into one pill would make the badge lie — the whole point of showing it
 * is that its presence is trustworthy (see `docs/icline/ui-guidelines.md`, rule 9).
 */

export type BackgroundTask = {
	taskId: string
	/** The task's conversation title, when the state carried one. */
	title?: string
	/** The agent is executing a turn. False means it only waits for the user, or has finished. */
	isRunning: boolean
	/** It asked a question/approval that the user has not been shown yet. */
	awaitingApproval: boolean
}

export type BackgroundTaskBadge = {
	/** Short text on the pill. */
	label: string
	/** Codicon class; the caller adds the spin animation for `codicon-loading`. */
	icon: string
	/** Sentence for the pill's tooltip. */
	description: string
}

const UNTITLED = "Untitled task"

export function backgroundTaskBadge(task: BackgroundTask): BackgroundTaskBadge {
	if (task.awaitingApproval) {
		return { label: "Waiting", icon: "codicon-bell", description: "This task is waiting for your answer" }
	}
	if (task.isRunning) {
		return { label: "Working", icon: "codicon-loading", description: "This task is still working" }
	}
	// Parked, idle, and waiting on nothing: the turn ended while the user was elsewhere.
	return { label: "Done", icon: "codicon-check", description: "This task finished while you were away" }
}

/**
 * One line naming the task, for the notice above the Recent list.
 *
 * `queued` appends what happens to the task the user asked for while this one was busy. A task
 * blocked on a question is not going anywhere on its own, so its queued successor waits for the
 * answer rather than for a turn that cannot finish.
 */
export function backgroundTaskNotice(task: BackgroundTask, queued: boolean): string {
	const name = task.title ?? UNTITLED
	if (task.awaitingApproval) {
		const head = `Waiting for your answer: ${name}`
		return queued ? `${head} — your next task waits until you answer it` : head
	}
	if (task.isRunning) {
		const head = `Still working in the background: ${name}`
		return queued ? `${head} — your next task starts when it finishes` : head
	}
	return `Finished in the background: ${name}`
}
