import type { AgentResult } from "@cline/shared"

/**
 * Visible notices for turns that end — or linger — without telling the user
 * anything. The fix.31-33 smoke run showed turns dying silently (the user had
 * to ask "มีปัญหาอะไรมั้ยครับ" to learn anything), so every abnormal quiet spot
 * now surfaces what happened and what to do next.
 */

/** A turn that finished but produced no assistant output and ran no tools. */
export const EMPTY_TURN_NOTICE = 'ไม่ได้รับคำตอบจากโมเดลในเทิร์นนี้ (empty response) — ไม่มีอะไรถูกดำเนินการ ลองพิมพ์ "ทำต่อ" เพื่อเริ่มเทิร์นใหม่'

/** No session events for a long stretch while a turn is still running. */
export function buildTurnStallNotice(thresholdMinutes: number): string {
	return `ยังไม่มีความคืบหน้าจาก Agent นาน ${thresholdMinutes} นาที — ถ้าคำสั่งใน terminal ยังรันอยู่ (เช่น build ยาวๆ) รอต่อได้เลย แต่ถ้าดูเหมือนค้าง ให้กด Stop แล้วพิมพ์ "ทำต่อ" เพื่อเริ่มเทิร์นใหม่`
}

export type TurnResultShape = Pick<AgentResult, "text" | "toolCalls" | "finishReason">

/**
 * True when a completed turn produced nothing at all: no final text and no
 * tool calls. Aborted/error turns are excluded — those surface through their
 * own paths. This is the "silent end" of the fix.31-33 smoke run: the model
 * request finished empty and the chat stayed quiet.
 */
export function isEmptyTurnResult(result: TurnResultShape | undefined): boolean {
	if (!result) {
		return false
	}
	return result.finishReason === "completed" && result.text.trim() === "" && result.toolCalls.length === 0
}

export interface TurnStallWatchdogOptions {
	/** Quiet period after which onStall fires. */
	thresholdMs: number
	/** Called at most once per start() when the threshold is crossed. */
	onStall: () => void
}

/**
 * Fires onStall once if no touch() arrives within thresholdMs of start().
 * Touches reset the deadline. A watchdog for the "silent stall": while a turn
 * runs, tool/command progress produces session events; ten quiet minutes means
 * either a legitimately long command (the notice says waiting is fine) or a
 * wedged one (the notice says how to recover).
 */
export class TurnStallWatchdog {
	private timer: ReturnType<typeof setTimeout> | undefined
	private running = false

	constructor(private readonly options: TurnStallWatchdogOptions) {}

	start(): void {
		this.running = true
		this.arm()
	}

	touch(): void {
		if (!this.running) {
			return
		}
		this.arm()
	}

	stop(): void {
		this.running = false
		if (this.timer !== undefined) {
			clearTimeout(this.timer)
			this.timer = undefined
		}
	}

	private arm(): void {
		if (this.timer !== undefined) {
			clearTimeout(this.timer)
		}
		this.timer = setTimeout(() => {
			this.timer = undefined
			this.running = false
			this.options.onStall()
		}, this.options.thresholdMs)
	}
}
