#!/usr/bin/env node
/**
 * iCline VSIX compare.
 *
 * Compares two VSIX builds file-by-file (size + sha1 of the extracted entries)
 * and diffs the human-readable string literals of their JS bundles, so a new
 * build can be audited against the previous one the way the smoke rounds do:
 * which files changed, what strings appeared/disappeared, and whether specific
 * markers are present on either side.
 *
 * Usage:
 *   node scripts/compare-vsix.mjs <a.vsix> <b.vsix> [options]
 *
 * Options:
 *   --marker <string>   report presence of this string in both bundles
 *                       (repeatable)
 *   --literals <n>      max literal-diff rows shown per bundle per direction
 *                       (default: 40)
 *   --json              print the full result as JSON instead of text
 *   --keep              keep the temporary extract directories
 *   --help
 *
 * Notes:
 *   - readable literals are quote-delimited strings of 14+ characters that
 *     contain spaces and look like prose (minified code slices are filtered
 *     out heuristically), so the diff shows user-visible messages rather than
 *     renamed identifiers.
 *   - bundles whose sha1 matches are reported as identical and skipped in the
 *     literal diff.
 */

import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative, resolve } from "node:path"
import process from "node:process"

const BUNDLE_PATHS = [
	"extension/dist/extension.js",
	"extension/webview-ui/build/assets/index.js",
]

function parseArgs(argv) {
	const positional = []
	const options = { markers: [], literals: 40, json: false, keep: false }
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i]
		switch (arg) {
			case "--marker":
				options.markers.push(argv[++i] ?? "")
				break
			case "--literals": {
				const value = Number(argv[++i])
				if (!Number.isInteger(value) || value <= 0) {
					throw new Error("--literals requires a positive integer")
				}
				options.literals = value
				break
			}
			case "--json":
				options.json = true
				break
			case "--keep":
				options.keep = true
				break
			case "--help":
			case "-h":
				options.help = true
				break
			default:
				if (arg.startsWith("--")) {
					throw new Error(`Unknown option: ${arg}`)
				}
				positional.push(arg)
		}
	}
	return { positional, options }
}

function usage() {
	return readFileSync(new URL(import.meta.url), "utf8").split("*/")[0].replace(/^\/\*\*?/gm, "").trim()
}

function extract(vsix, dest) {
	execFileSync("unzip", ["-o", "-q", vsix, "-d", dest], { stdio: "pipe" })
}

function walk(dir) {
	const files = []
	const visit = (current) => {
		for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
			const full = join(current, entry.name)
			if (entry.isDirectory()) {
				visit(full)
			} else {
				files.push(full)
			}
		}
	}
	visit(dir)
	return files
}

function sha1(file) {
	return createHash("sha1").update(readFileSync(file)).digest("hex")
}

/** Quote-delimited strings that read like prose rather than minified code. */
function readableLiterals(file) {
	const source = readFileSync(file, "utf8")
	const out = new Set()
	// Escaped pairs (\u2014, \" …) are part of the string content — esbuild
	// escapes non-ASCII prose, so a plain "no backslashes" class truncates every
	// Thai/em-dash message mid-string.
	const re = /["'`]((?:\\.|[^"'`\\])*)["'`]/g
	let match
	while ((match = re.exec(source))) {
		// Strip template-literal interpolations (often renamed by the minifier);
		// the residue is the readable prose worth diffing. A trailing unclosed
		// interpolation is stripped too (the capture ends at the delimiter).
		const value = match[1].replace(/\$\{[^}]*\}?/g, " ").trim()
		if (value.length < 14 || !value.includes(" ")) {
			continue
		}
		const words = value.split(/\s+/).filter(Boolean)
		if (words.length < 3) {
			continue
		}
		// Filter minified-code slices: code keywords and punctuation-dense text.
		if (/throw|return ?\{|case |function |=>|void 0/.test(value)) {
			continue
		}
		if (!/^[A-Za-z0-9"'\u0E00-\u0E7F]/.test(value)) {
			continue
		}
		// Prose carries little code punctuation; minified slices carry a lot.
		const codeChars = (value.match(/[(){}\[\]<>;=+*\/&|]/g) ?? []).length
		if (codeChars / value.length > 0.08) {
			continue
		}
		out.add(value)
	}
	return out
}

function indexTree(root) {
	const map = new Map()
	for (const file of walk(root)) {
		const rel = relative(root, file).replaceAll("\\", "/")
		const stat = statSync(file)
		map.set(rel, { size: stat.size, sha1: sha1(file) })
	}
	return map
}

function compareTrees(aRoot, bRoot) {
	const a = indexTree(aRoot)
	const b = indexTree(bRoot)
	const rels = [...new Set([...a.keys(), ...b.keys()])].sort()
	const files = []
	for (const rel of rels) {
		const left = a.get(rel)
		const right = b.get(rel)
		let status
		if (left && !right) status = "only-in-a"
		else if (!left && right) status = "only-in-b"
		else if (left.sha1 === right.sha1) status = "same"
		else status = "changed"
		files.push({ path: rel, status, a: left, b: right })
	}
	const counts = { same: 0, changed: 0, "only-in-a": 0, "only-in-b": 0 }
	for (const entry of files) {
		counts[entry.status] += 1
	}
	return { files, counts }
}

function readVersion(root) {
	try {
		return JSON.parse(readFileSync(join(root, "extension", "package.json"), "utf8")).version
	} catch {
		return undefined
	}
}

function compareBundles(aRoot, bRoot, options) {
	const bundles = []
	for (const rel of BUNDLE_PATHS) {
		const left = join(aRoot, rel)
		const right = join(bRoot, rel)
		if (!existsSync(left) && !existsSync(right)) {
			continue
		}
		const entry = { path: rel, presentIn: { a: existsSync(left), b: existsSync(right) } }
		if (existsSync(left) && existsSync(right)) {
			const aSha = sha1(left)
			const bSha = sha1(right)
			entry.identical = aSha === bSha
			if (!entry.identical) {
				const aLits = readableLiterals(left)
				const bLits = readableLiterals(right)
				const added = [...bLits].filter((x) => !aLits.has(x)).sort()
				const removed = [...aLits].filter((x) => !bLits.has(x)).sort()
				entry.literalDiff = {
					aCount: aLits.size,
					bCount: bLits.size,
					addedCount: added.length,
					removedCount: removed.length,
					added: added.slice(0, options.literals),
					removed: removed.slice(0, options.literals),
				}
			}
			entry.markers = options.markers.map((marker) => ({
				marker,
				a: left && readFileSync(left, "utf8").includes(marker),
				b: right && readFileSync(right, "utf8").includes(marker),
			}))
		}
		bundles.push(entry)
	}
	return bundles
}

function formatSize(n) {
	return n === undefined ? "?" : n.toLocaleString("en-US")
}

function renderText(result, options) {
	const lines = []
	lines.push("VSIX compare")
	lines.push(`  a: ${result.a.path} (${formatSize(result.a.size)} B · ${result.a.fileCount} files · version ${result.a.version ?? "?"})`)
	lines.push(`  b: ${result.b.path} (${formatSize(result.b.size)} B · ${result.b.fileCount} files · version ${result.b.version ?? "?"})`)
	lines.push("")
	const c = result.tree.counts
	lines.push(`Files: ${result.a.fileCount} vs ${result.b.fileCount} — same ${c.same} · changed ${c.changed} · only-in-a ${c["only-in-a"]} · only-in-b ${c["only-in-b"]}`)
	const changed = result.tree.files.filter((f) => f.status !== "same")
	if (changed.length > 0) {
		lines.push("")
		for (const file of changed.sort((x, y) => Math.abs((y.b?.size ?? 0) - (y.a?.size ?? 0)) - Math.abs((x.b?.size ?? 0) - (x.a?.size ?? 0)))) {
			if (file.status === "changed") {
				const delta = file.b.size - file.a.size
				lines.push(`  ${file.status.padEnd(10)} ${file.path}  ${formatSize(file.a.size)} → ${formatSize(file.b.size)} B (${delta >= 0 ? "+" : ""}${formatSize(delta)})`)
			} else {
				lines.push(`  ${file.status.padEnd(10)} ${file.path}  (${formatSize((file.a ?? file.b).size)} B)`)
			}
		}
	}
	lines.push("")
	lines.push("Bundle literal diff (readable strings)")
	for (const bundle of result.bundles) {
		lines.push(`  ${bundle.path}`)
		if (!bundle.presentIn.a || !bundle.presentIn.b) {
			lines.push(`    present only in ${bundle.presentIn.a ? "a" : "b"}`)
			continue
		}
		if (bundle.identical) {
			lines.push("    identical — skipped")
		} else {
			const d = bundle.literalDiff
			lines.push(`    added ${d.addedCount} · removed ${d.removedCount} (showing up to ${options.literals} each)`)
			for (const value of d.added) {
				lines.push(`      + ${value.slice(0, 140)}`)
			}
			for (const value of d.removed) {
				lines.push(`      - ${value.slice(0, 140)}`)
			}
		}
		if (bundle.markers && bundle.markers.length > 0) {
			for (const marker of bundle.markers) {
				lines.push(`    marker ${JSON.stringify(marker.marker)} — a:${marker.a ? "yes" : "no"} b:${marker.b ? "yes" : "no"}`)
			}
		}
	}
	return lines.join("\n") + "\n"
}

function main() {
	let positional
	let options
	try {
		;({ positional, options } = parseArgs(process.argv.slice(2)))
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error))
		process.exit(2)
	}
	if (options.help) {
		console.log(usage())
		return
	}
	if (positional.length !== 2) {
		console.error("Usage: node scripts/compare-vsix.mjs <a.vsix> <b.vsix> [options]")
		process.exit(2)
	}
	const [aVsix, bVsix] = positional.map((p) => resolve(p))
	for (const file of [aVsix, bVsix]) {
		if (!existsSync(file)) {
			console.error(`File not found: ${file}`)
			process.exit(2)
		}
	}
	const base = mkdtempSync(join(tmpdir(), "icline-vsix-cmp-"))
	const aRoot = join(base, "a")
	const bRoot = join(base, "b")
	try {
		extract(aVsix, aRoot)
		extract(bVsix, bRoot)
		const tree = compareTrees(aRoot, bRoot)
		const result = {
			a: { path: aVsix, size: statSync(aVsix).size, fileCount: tree.counts.same + tree.counts.changed + tree.counts["only-in-a"], version: readVersion(aRoot) },
			b: { path: bVsix, size: statSync(bVsix).size, fileCount: tree.counts.same + tree.counts.changed + tree.counts["only-in-b"], version: readVersion(bRoot) },
			tree,
			bundles: compareBundles(aRoot, bRoot, options),
		}
		if (options.json) {
			console.log(JSON.stringify(result, null, 2))
		} else {
			process.stdout.write(renderText(result, options))
		}
	} finally {
		if (options.keep) {
			console.error(`extract dirs kept at ${base}`)
		} else {
			rmSync(base, { recursive: true, force: true })
		}
	}
}

main()
