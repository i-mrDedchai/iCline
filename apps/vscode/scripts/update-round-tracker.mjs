#!/usr/bin/env node
/**
 * Keeps the newest round visible at the top of docs/icline/smoke-test-tracker.md.
 *
 * The tracker used to lag a round behind because its round sections were written
 * by hand after the pack (or not at all). This script is called by
 * `scripts/package-vsix.mjs` the moment a VSIX is packed, so version, size, build
 * label and pack time are recorded by the pack itself — a repack rewrites the same
 * block instead of appending a second one, and it never touches the hand-written
 * sections below it.
 *
 * What cannot be derived from the artifact — the smoke points the maintainer should
 * click and the check results — is passed in on the next run:
 *
 *   node scripts/update-round-tracker.mjs \
 *     --smoke "Settings → API Configuration → copy a saved key" \
 *     --smoke "Chat → final reply card → copy sits on the header row" \
 *     --tests "webview vitest 80 files / 904 tests · e2e 33/33"
 *
 * Values from an earlier run are preserved when the matching flag is omitted, so
 * `--smoke`/`--tests` can be added after the pack without losing the pack data.
 *
 * Flags:
 *   --vsix <path>     artifact to describe (default: dist/<base>-<version>.vsix)
 *   --version <v>     override the version read from package.json
 *   --smoke <text>    smoke point; repeat the flag for several
 *   --tests <text>    one check result; repeat the flag for several
 *   --status <text>   status line (default: ⏳ รอ smoke, or the previous value)
 *   --tracker <path>  tracker file (default: <repo>/docs/icline/smoke-test-tracker.md)
 *   --dry-run         print the block instead of writing the file
 */
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extRoot = path.join(__dirname, "..")
const repoRoot = path.resolve(extRoot, "..", "..")
const TRACKER_PATH = path.join(repoRoot, "docs", "icline", "smoke-test-tracker.md")
const ROUND_START = "<!-- icline:round:start -->"
const ROUND_END = "<!-- icline:round:end -->"
const DEFAULT_STATUS = "⏳ รอ smoke"

/** Absolute path, but relative to the repo root when it lives inside it. */
function displayPath(absolute) {
	const rel = path.relative(repoRoot, absolute)
	if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
		return rel.split(path.sep).join("/")
	}
	return absolute.split(path.sep).join("/")
}

function parseArgs(argv) {
	const args = { smoke: [], tests: [] }
	for (let i = 0; i < argv.length; i++) {
		const key = argv[i]
		const next = () => argv[++i]
		switch (key) {
			case "--vsix":
				args.vsix = next()
				break
			case "--version":
				args.version = next()
				break
			case "--smoke":
				args.smoke.push(next())
				break
			case "--tests":
				args.tests.push(next())
				break
			case "--status":
				args.status = next()
				break
			case "--tracker":
				args.tracker = next()
				break
			case "--dry-run":
				args.dryRun = true
				break
			case "--help":
			case "-h":
				args.help = true
				break
			default:
				if (key.startsWith("-")) {
					throw new Error(`Unknown flag: ${key}`)
				}
		}
	}
	return args
}

/** `dev build 5 · fix.6` from the generated About metadata, when present. */
function readBuildLabel() {
	const metaPath = path.join(extRoot, "webview-ui", "src", "icline", "build-metadata.ts")
	if (!fs.existsSync(metaPath)) {
		return undefined
	}
	const match = /devBuildLabel:\s*"([^"]+)"/.exec(fs.readFileSync(metaPath, "utf-8"))
	return match?.[1]
}

function formatStamp(date) {
	const pad = (n) => String(n).padStart(2, "0")
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function sha1(file) {
	return crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex")
}

function bullets(items, emptyText) {
	const lines = items.map((item) => String(item).replace(/\r?\n/g, " ").trim()).filter(Boolean)
	if (lines.length === 0) {
		return `- ${emptyText}`
	}
	return lines.map((line) => `- ${line}`).join("\n")
}

/** Pull the maintained-by-hand fields out of the block we are about to replace. */
function readPreviousBlock(tracker) {
	const start = tracker.indexOf(ROUND_START)
	const end = tracker.indexOf(ROUND_END)
	if (start === -1 || end === -1 || end < start) {
		return { smoke: [], tests: [], status: undefined }
	}
	const block = tracker.slice(start + ROUND_START.length, end)

	const status = /\|\s*สถานะ\s*\|\s*(.+?)\s*\|/.exec(block)?.[1]
	const section = (heading) => {
		const from = block.indexOf(heading)
		if (from === -1) {
			return []
		}
		const rest = block.slice(from + heading.length)
		const stop = rest.search(/\n\*\*|<!--/) // next section heading or the end marker
		const body = stop === -1 ? rest : rest.slice(0, stop)
		return body
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.startsWith("- ") && line !== `- ${EMPTY_SMOKE}` && line !== `- ${EMPTY_TESTS}`)
			.map((line) => line.slice(2).trim())
	}
	return { smoke: section("**จุด smoke**"), tests: section("**ผลตรวจ**"), status }
}

const EMPTY_SMOKE = '_ยังไม่ได้ระบุ — เพิ่มด้วย `--smoke "..."`_'
const EMPTY_TESTS = '_ยังไม่ได้ระบุ — เพิ่มด้วย `--tests "..."`_'

function renderBlock({ version, vsix, size, hash, label, packedAt, status, smoke, tests }) {
	const rows = [
		`| VSIX | \`${displayPath(vsix)}\` |`,
		`| ขนาด | ${size.toLocaleString("en-US")} B · sha1 \`${hash.slice(0, 12)}\` |`,
		label ? `| ป้าย About | \`${label}\` |` : undefined,
		`| แพ็กเมื่อ | ${packedAt} |`,
		`| สถานะ | ${status} |`,
	]
		.filter(Boolean)
		.join("\n")

	return [
		ROUND_START,
		"> 🤖 บล็อกนี้เขียนโดย `apps/vscode/scripts/update-round-tracker.mjs` ทุกครั้งที่แพ็ก VSIX — อย่าแก้มือ",
		"> (ข้อมูลแพ็กมาจากไฟล์จริง; จุด smoke/ผลตรวจเติมด้วย `--smoke` / `--tests`)",
		"",
		`## 🔖 รอบล่าสุด — \`${version}\``,
		"",
		"|  |  |",
		"|---|---|",
		rows,
		"",
		"**จุด smoke**",
		bullets(smoke, EMPTY_SMOKE),
		"",
		"**ผลตรวจ**",
		bullets(tests, EMPTY_TESTS),
		ROUND_END,
	].join("\n")
}

/** Replace the managed block in place, or put it at the top when there is none yet. */
export function upsertRoundBlock(tracker, block) {
	const start = tracker.indexOf(ROUND_START)
	const end = tracker.indexOf(ROUND_END)
	if (start !== -1 && end !== -1 && end > start) {
		const before = tracker.slice(0, start)
		const after = tracker.slice(end + ROUND_END.length)
		return `${before}${block}${after}`
	}
	return `${block}\n\n${tracker.replace(/^\uFEFF/, "")}`
}

function main() {
	const args = parseArgs(process.argv.slice(2))
	if (args.help) {
		console.log(
			fs
				.readFileSync(fileURLToPath(import.meta.url), "utf-8")
				.split("*/")[0]
				.replace(/^#!.*\n/, ""),
		)
		return
	}

	const pkg = JSON.parse(fs.readFileSync(path.join(extRoot, "package.json"), "utf-8"))
	const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "icline-docs.manifest.json"), "utf-8"))
	const version = args.version || pkg.version
	const base = manifest.vsixFileName || manifest.extensionId || "i-mrdedchai.iCline"
	const vsixPath = path.resolve(args.vsix || path.join(extRoot, "dist", `${base}-${version}.vsix`))
	const trackerPath = path.resolve(args.tracker || TRACKER_PATH)

	if (!fs.existsSync(vsixPath)) {
		console.error(`No VSIX at ${displayPath(vsixPath)} — pack first, or pass --vsix <path>`)
		process.exit(1)
	}
	if (!fs.existsSync(trackerPath)) {
		console.error(`No tracker at ${displayPath(trackerPath)} — pass --tracker <path>`)
		process.exit(1)
	}

	const stat = fs.statSync(vsixPath)
	const tracker = fs.readFileSync(trackerPath, "utf-8")
	// A repack must keep whatever the maintainer already filled in, so flags win and
	// the previous block is the fallback.
	const previous = readPreviousBlock(tracker)
	const block = renderBlock({
		version,
		vsix: vsixPath,
		size: stat.size,
		hash: sha1(vsixPath),
		label: readBuildLabel(),
		packedAt: formatStamp(stat.mtime),
		status: args.status || previous.status || DEFAULT_STATUS,
		smoke: args.smoke.length > 0 ? args.smoke : previous.smoke,
		tests: args.tests.length > 0 ? args.tests : previous.tests,
	})

	if (args.dryRun) {
		console.log(block)
		return
	}

	const next = upsertRoundBlock(tracker, block)
	if (next === tracker) {
		console.log(`Round block already current for ${version}`)
		return
	}
	fs.writeFileSync(trackerPath, next)
	console.log(`Recorded ${version} in ${displayPath(trackerPath)} (${stat.size.toLocaleString("en-US")} B)`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main()
}
