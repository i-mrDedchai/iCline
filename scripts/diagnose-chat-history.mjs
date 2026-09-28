#!/usr/bin/env node
/**
 * iCline chat-history diagnostics.
 *
 * Scans a sessions directory (default: ~/.cline/data/sessions) for abnormal
 * turns and prints a summary report:
 *
 *   - turn-cut-mid-run      turn ends mid-flight (open tool calls at EOF, or a
 *                           user turn that never received any assistant reply)
 *   - missing-tool-result   tool_use without a matching tool_result
 *   - output-limit-truncated  assistant message reached the output-token limit
 *                           (the runtime then continues or drops the turn)
 *   - refusal               assistant declined the task with no tool activity
 *   - parse-error           unreadable session file
 *
 * Session file shape (`*.messages.json`):
 *   { version, updated_at, agent, sessionId, origin, messages, system_prompt }
 *   message: { id, role, content[{type: text|thinking|tool_use|tool_result}], ts,
 *              modelInfo?, metrics?{inputTokens, outputTokens, ...} }
 *
 * Usage:
 *   node scripts/diagnose-chat-history.mjs [options]
 *
 * Options:
 *   --dir <path>        sessions root (default: ~/.cline/data/sessions)
 *   --out <file>        write a Markdown report to this file
 *   --json              print the findings as JSON instead of text
 *   --output-limit <n>  token count that counts as "hit the output limit"
 *                       (default: 30000)
 *   --verbose           list every finding (default caps each category)
 *   --summary           print only the Thai executive summary (severity-ranked
 *                       top issues and top sessions) — alias: --fix
 *   --strict            exit 1 when any finding is reported
 */

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import process from "node:process"

const REFUSAL_PATTERNS = [
	/\bi (?:can(?:no|')t|won(?:no|')t|am (?:not|unable to) (?:going to)?) (?:help|assist|comply|do that|do this)\b/i,
	/\bi(?:'m| am) sorry,? (?:but )?i can(?:no|')t\b/i,
	/\bi cannot (?:help|assist|comply) with\b/i,
	/\bmust (?:refuse|decline)\b/i,
	/\bas an ai(?: language model)?,? i can(?:no|')t\b/i,
	// Sub-agents that lose their tools stop with this shape (smoke 2026-09-28).
	/\bi lack (?:a |an )?[\w/-]*(?:tool|terminal|access)\b/i,
	/ไม่(?:สามารถ|ขอ)(?:ช่วย|ทำตาม|ทำได้|ดำเนินการ|ปฏิบัติ)/,
	/ขออภัย.{0,20}(?:ไม่สามารถ|ไม่ขอ)/,
	/ไม่สามารถ(?:ช่วย|ทำตาม|ทำได้|ดำเนินการ)/,
	/(?:ไม่มี|ขาด)เครื่องมือ/,
	/จึงต้องหยุด/,
]

/**
 * Severity model: every finding kind maps to a Thai-labelled severity level and
 * a numeric score used to rank top issues / top sessions in the executive
 * summary.
 */
const SEVERITY_BY_KIND = {
	"parse-error": { level: "critical", th: "วิกฤต", icon: "🔴", score: 3 },
	"turn-cut-mid-run": { level: "high", th: "สูง", icon: "🟠", score: 2 },
	"missing-tool-result": { level: "high", th: "สูง", icon: "🟠", score: 2 },
	refusal: { level: "medium", th: "ปานกลาง", icon: "🟡", score: 1 },
	"output-limit-truncated": { level: "medium", th: "ปานกลาง", icon: "🟡", score: 1 },
}

const KIND_ADVICE_TH = {
	"turn-cut-mid-run": "เทิร์นตายกลางงาน — ตรวจว่ามีแถวแจ้ง \"turn truncated, continuing\" / interrupted-turn ขึ้นหรือไม่ และ resume แล้วงานเดินต่อได้จริง",
	"missing-tool-result": "tool_use ไม่มีผลลัพธ์คืน — เทิร์นถูกตัดกลางเครื่องมือ ควรตรวจก่อนสั่งงานต่อ",
	"output-limit-truncated": "โมเดลชนเพดาน output — ยืนยันว่า continuation + thinking cap ทำงาน และงานไม่ตายกลาง thinking",
	refusal: "โมเดลปฏิเสธงาน — ตรวจ tool list ของ sub-agent และสวิตช์ auto-approve",
	"parse-error": "ไฟล์เซสชันอ่านไม่ได้ — ข้อมูลประวัติอาจเสียหาย",
}

function parseArgs(argv) {
	const options = {
		dir: join(homedir(), ".cline", "data", "sessions"),
		out: undefined,
		json: false,
		outputLimit: 30_000,
		verbose: false,
		summary: false,
		strict: false,
	}
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i]
		switch (arg) {
			case "--dir":
				options.dir = resolve(argv[++i] ?? "")
				break
			case "--out":
				options.out = resolve(argv[++i] ?? "")
				break
			case "--json":
				options.json = true
				break
			case "--output-limit": {
				const value = Number(argv[++i])
				if (!Number.isFinite(value) || value <= 0) {
					throw new Error("--output-limit requires a positive number")
				}
				options.outputLimit = value
				break
			}
			case "--verbose":
				options.verbose = true
				break
			case "--summary":
			case "--fix":
				options.summary = true
				break
			case "--strict":
				options.strict = true
				break
			case "--help":
			case "-h":
				options.help = true
				break
			default:
				throw new Error(`Unknown option: ${arg}`)
		}
	}
	return options
}

function usage() {
	return readFileSync(new URL(import.meta.url), "utf8").split("*/")[0].replace(/^\/\*\*?/gm, "").trim()
}

function listSessionFiles(root) {
	const files = []
	const walk = (dir) => {
		let entries
		try {
			entries = readdirSync(dir, { withFileTypes: true })
		} catch {
			return
		}
		for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
			const full = join(dir, entry.name)
			if (entry.isDirectory()) {
				walk(full)
			} else if (entry.name.endsWith(".messages.json")) {
				files.push(full)
			}
		}
	}
	walk(root)
	return files
}

function textOf(message) {
	const parts = []
	for (const item of message?.content ?? []) {
		if (typeof item === "string") {
			parts.push(item)
		} else if (item?.type === "text" && typeof item.text === "string") {
			parts.push(item.text)
		}
	}
	return parts.join("\n")
}

function isUserTaskInput(message) {
	if (message?.role !== "user") {
		return false
	}
	return (message?.content ?? []).some(
		(item) => typeof item === "string" || item?.type === "text",
	)
}

function analyzeSession(file, doc, options) {
	const findings = []
	const messages = Array.isArray(doc?.messages) ? doc.messages : []
	const openToolCalls = new Map() // tool_use id -> { name, messageIndex }

	let turnStart = -1
	let turnSawToolActivity = false
	let turnSawAssistantText = false
	let turnRefusalSnippet = undefined

	const closeTurn = (endIndex) => {
		if (turnStart < 0) {
			return
		}
		if (!turnSawAssistantText && !turnSawToolActivity) {
			findings.push({
				kind: "turn-cut-mid-run",
				detail: `user turn at message ${turnStart} never received an assistant reply`,
				messageIndex: turnStart,
			})
		} else if (turnRefusalSnippet !== undefined && !turnSawToolActivity) {
			findings.push({
				kind: "refusal",
				detail: `assistant declined the task: "${turnRefusalSnippet}"`,
				messageIndex: turnStart,
			})
		}
		turnStart = -1
		turnSawToolActivity = false
		turnSawAssistantText = false
		turnRefusalSnippet = undefined
		void endIndex
	}

	for (let index = 0; index < messages.length; index += 1) {
		const message = messages[index]
		if (isUserTaskInput(message)) {
			closeTurn(index)
			turnStart = index
		}
		const outputTokens = message?.metrics?.outputTokens
		if (
			typeof outputTokens === "number" &&
			Number.isFinite(outputTokens) &&
			outputTokens >= options.outputLimit
		) {
			findings.push({
				kind: "output-limit-truncated",
				detail: `message ${index} (${message?.id ?? "?"}) hit the output limit (outputTokens=${outputTokens})`,
				messageIndex: index,
			})
		}
		for (const item of message?.content ?? []) {
			if (item?.type === "tool_use" && typeof item.id === "string") {
				openToolCalls.set(item.id, { name: item.name ?? "?", messageIndex: index })
				turnSawToolActivity = true
			} else if (item?.type === "tool_result" && typeof item.tool_use_id === "string") {
				openToolCalls.delete(item.tool_use_id)
				turnSawToolActivity = true
			} else if (item?.type === "text" && message?.role === "assistant") {
				turnSawAssistantText = true
				const text = typeof item.text === "string" ? item.text : ""
				if (turnRefusalSnippet === undefined) {
					for (const pattern of REFUSAL_PATTERNS) {
						const match = text.match(pattern)
						if (match) {
							const at = text.indexOf(match[0])
							turnRefusalSnippet = text.slice(Math.max(0, at - 20), at + match[0].length + 20).replace(/\s+/g, " ")
							break
						}
					}
				}
			}
		}
	}
	closeTurn(messages.length)

	for (const [toolUseId, info] of openToolCalls) {
		findings.push({
			kind: "missing-tool-result",
			detail: `tool_use "${info.name}" (${toolUseId}) at message ${info.messageIndex} has no tool_result`,
			messageIndex: info.messageIndex,
		})
		// The turn that ended with an unfulfilled tool call died mid-run.
		findings.push({
			kind: "turn-cut-mid-run",
			detail: `turn at message ${info.messageIndex} ended waiting for tool "${info.name}"`,
			messageIndex: info.messageIndex,
		})
	}

	if (messages.length === 0) {
		findings.push({ kind: "turn-cut-mid-run", detail: "session has no messages", messageIndex: -1 })
	}

	return findings
}

function loadSessions(files, options) {
	const sessions = []
	for (const file of files) {
		let doc
		try {
			doc = JSON.parse(readFileSync(file, "utf8"))
		} catch (error) {
			sessions.push({
				file,
				sessionId: "?",
				agent: "?",
				parentThreadId: undefined,
				messageCount: 0,
				updatedAt: undefined,
				findings: [{ kind: "parse-error", detail: error instanceof Error ? error.message : String(error), messageIndex: -1 }],
			})
			continue
		}			sessions.push({
				file,
				sessionId: doc?.sessionId ?? "?",
				agent: doc?.agent ?? "?",
				parentThreadId: doc?.origin?.parentThreadId,
				messageCount: Array.isArray(doc?.messages) ? doc.messages.length : 0,
				updatedAt: doc?.updated_at,
				findings: analyzeSession(file, doc, options),
			})
	}
	for (const session of sessions) {
		for (const finding of session.findings) {
			finding.severity =
				SEVERITY_BY_KIND[finding.kind] ?? { level: "medium", th: "ปานกลาง", icon: "🟡", score: 1 }
		}
	}
	return sessions
}

function summarize(sessions) {
	const counts = {}
	for (const session of sessions) {
		for (const finding of session.findings) {
			counts[finding.kind] = (counts[finding.kind] ?? 0) + 1
		}
	}
	return counts
}

function rankFindings(sessions) {
	const severityCounts = { critical: 0, high: 0, medium: 0 }
	const perKind = new Map()
	const perSession = []
	for (const session of sessions) {
		let score = 0
		const kinds = new Map()
		for (const finding of session.findings) {
			severityCounts[finding.severity.level] = (severityCounts[finding.severity.level] ?? 0) + 1
			score += finding.severity.score
			kinds.set(finding.kind, (kinds.get(finding.kind) ?? 0) + 1)
			const bucket = perKind.get(finding.kind) ?? { kind: finding.kind, count: 0, score: 0 }
			bucket.count += 1
			bucket.score += finding.severity.score
			perKind.set(finding.kind, bucket)
		}
		if (score > 0) {
			perSession.push({
				sessionId: session.sessionId,
				agent: session.agent,
				score,
				count: session.findings.length,
				kinds: [...kinds.entries()].map(([kind, count]) => ({ kind, count })),
			})
		}
	}
	const topIssues = [...perKind.values()].sort((a, b) => b.score - a.score || b.count - a.count)
	const topSessions = perSession
		.sort((a, b) => b.score - a.score || b.count - a.count)
		.slice(0, 5)
	return { severityCounts, topIssues, topSessions }
}

function renderExecutiveSummary(sessions, counts, rankings) {
	const lines = []
	const totalFindings = Object.values(counts).reduce((a, b) => a + b, 0)
	const flagged = sessions.filter((session) => session.findings.length > 0).length
	lines.push("📊 สรุปผู้บริหาร (Executive Summary)")
	lines.push(`- สแกนเซสชัน ${sessions.length} ไฟล์ · พบความผิดปกติ ${totalFindings} รายการ ใน ${flagged} เซสชัน`)
	if (totalFindings === 0) {
		lines.push("- ✅ ไม่พบเทิร์นผิดปกติ — สุขภาพประวัติแชทอยู่ในเกณฑ์ดี")
		return lines.join("\n")
	}
	const sc = rankings.severityCounts
	lines.push(`- ระดับความร้ายแรง: วิกฤต ${sc.critical ?? 0} · สูง ${sc.high ?? 0} · ปานกลาง ${sc.medium ?? 0}`)
	lines.push("")
	lines.push("อันดับปัญหาสำคัญ (top issues)")
	rankings.topIssues.forEach((issue, index) => {
		const sev = SEVERITY_BY_KIND[issue.kind] ?? { th: "ปานกลาง", icon: "🟡" }
		lines.push(`  ${index + 1}. ${sev.icon} [${sev.th}] ${issue.kind} ×${issue.count} (คะแนน ${issue.score})`)
		if (KIND_ADVICE_TH[issue.kind]) {
			lines.push(`     ${KIND_ADVICE_TH[issue.kind]}`)
		}
	})
	lines.push("")
	lines.push("เซสชันที่ควรตรวจก่อน (top sessions)")
	rankings.topSessions.forEach((entry, index) => {
		const kindText = entry.kinds.map((k) => `${k.kind} ×${k.count}`).join(", ")
		lines.push(`  ${index + 1}. ${entry.sessionId} (${entry.agent}) — คะแนน ${entry.score} · ${kindText}`)
	})
	return lines.join("\n")
}

function renderText(sessions, counts, options, rankings) {
	const lines = []
	lines.push(`iCline chat-history diagnostics — ${options.dir}`)
	lines.push(`sessions scanned: ${sessions.length}`)
	lines.push("")
	lines.push(renderExecutiveSummary(sessions, counts, rankings))
	lines.push("")
	lines.push("Summary")
	if (Object.keys(counts).length === 0) {
		lines.push("  ✓ no abnormal turns found")
	}
	for (const [kind, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
		lines.push(`  ${kind}: ${count}`)
	}
	lines.push("")
	const perKind = new Map()
	for (const session of sessions) {
		for (const finding of session.findings) {
			const bucket = perKind.get(finding.kind) ?? []
			bucket.push({ session, finding })
			perKind.set(finding.kind, bucket)
		}
	}
	for (const [kind, entries] of [...perKind.entries()].sort((a, b) => b[1].length - a[1].length)) {
		lines.push(`${kind} (${entries.length})`)
		const shown = options.verbose ? entries : entries.slice(0, 20)
		for (const { session, finding } of shown) {
			const label = session.agent === "subagent" ? `sub-agent${session.parentThreadId ? ` of ${session.parentThreadId}` : ""}` : session.agent
			lines.push(`  - [${label}] ${session.sessionId} · ${finding.detail}`)
		}
		if (shown.length < entries.length) {
			lines.push(`  … ${entries.length - shown.length} more (use --verbose)`)
		}
		lines.push("")
	}
	return lines.join("\n").trimEnd() + "\n"
}

function renderMarkdown(sessions, counts, options, rankings) {
	const lines = []
	lines.push("# iCline chat-history diagnostics")
	lines.push("")
	lines.push(`- sessions root: \`${options.dir}\``)
	lines.push(`- sessions scanned: ${sessions.length}`)
	lines.push(`- output-limit threshold: ${options.outputLimit} tokens`)
	lines.push("")
	lines.push("## สรุปผู้บริหาร (Executive Summary)")
	lines.push("")
	for (const line of renderExecutiveSummary(sessions, counts, rankings).split("\n").slice(1)) {
		lines.push(line.startsWith("  ") ? line.replace(/^  (\d+)\. /, "$1. ") : line)
	}
	lines.push("")
	lines.push("## Summary")
	lines.push("")
	if (Object.keys(counts).length === 0) {
		lines.push("✓ no abnormal turns found")
	}
	for (const [kind, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
		lines.push(`- **${kind}**: ${count}`)
	}
	lines.push("")
	lines.push("## Findings")
	lines.push("")
	for (const session of sessions) {
		if (session.findings.length === 0) {
			continue
		}
		lines.push(`### ${session.sessionId} (${session.agent}${session.parentThreadId ? ` → ${session.parentThreadId}` : ""})`)
		lines.push("")
		lines.push(`- file: \`${session.file}\``)
		lines.push(`- messages: ${session.messageCount}${session.updatedAt ? ` · updated ${session.updatedAt}` : ""}`)
		lines.push("")
		for (const finding of session.findings) {
			lines.push(`- **${finding.kind}** — ${finding.detail}`)
		}
		lines.push("")
	}
	return lines.join("\n")
}

function main() {
	let options
	try {
		options = parseArgs(process.argv.slice(2))
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error))
		process.exit(2)
	}
	if (options.help) {
		console.log(usage())
		return
	}
	try {
		statSync(options.dir)
	} catch {
		console.error(`Sessions directory not found: ${options.dir}`)
		process.exit(2)
	}
	const files = listSessionFiles(options.dir)
	const sessions = loadSessions(files, options)
	const counts = summarize(sessions)
	const rankings = rankFindings(sessions)

	if (options.json) {
		console.log(
			JSON.stringify(
				{
					dir: options.dir,
					outputLimit: options.outputLimit,
					counts,
					severity: rankings.severityCounts,
					topIssues: rankings.topIssues,
					topSessions: rankings.topSessions,
					sessions,
				},
				null,
				2,
			),
		)
	} else if (options.summary) {
		process.stdout.write(renderExecutiveSummary(sessions, counts, rankings) + "\n")
	} else {
		process.stdout.write(renderText(sessions, counts, options, rankings))
	}
	if (options.out) {
		mkdirSync(dirname(options.out), { recursive: true })
		writeFileSync(options.out, renderMarkdown(sessions, counts, options, rankings), "utf8")
		if (!options.json && !options.summary) {
			console.log(`\nreport written to ${options.out}`)
		}
	}
	if (options.strict && sessions.some((session) => session.findings.length > 0)) {
		process.exit(1)
	}
}

main()
