#!/usr/bin/env node
/**
 * iCline VSIX contract check.
 *
 * The smoke rounds keep repairing the same class of bug: a fix ships, the next
 * build silently loses it, and only the user's smoke run finds out (fix.40's
 * forced `x-api-key` emptied the model list; fix.42's shipped card turned out
 * unusable to look at). Every one of those rounds ended with a by-hand audit of
 * the packed VSIX — unzip, sha1 the two bundles, grep ~30 markers. This runs
 * that audit as one command so it can happen before the build is handed over
 * instead of after, and so the checks are reviewable in git rather than living
 * in a chat log.
 *
 * Usage:
 *   node scripts/verify-vsix-contracts.mjs [vsix] [options]
 *
 *   With no <vsix>, the highest fix.N build in apps/vscode/dist is used.
 *
 * Options:
 *   --vsix <path>     explicit VSIX (same as the positional argument)
 *   --dist <dir>      directory searched for the newest build
 *                     (default: apps/vscode/dist)
 *   --local <dir>     apps/vscode checkout whose build outputs are compared
 *                     byte-for-byte against the packed bundles (default: apps/vscode)
 *   --no-local        skip the byte comparison
 *   --round <name>    only run the contract table of this round (repeatable)
 *   --json            print the full result as JSON instead of text
 *   --keep            keep the temporary extract directory
 *   --help
 *
 * Exit codes: 0 all checks passed · 1 a check failed · 2 the run could not
 * happen (bad arguments, no such build) — so it can gate a pack.
 *
 * Auditing a build from an earlier round: pass --no-local, or the byte check
 * compares that round's bundles against the current checkout and reports the
 * (expected) difference as a failure. The byte check also skips itself when the
 * local build's label differs from the packed one — a plain `bun run build`
 * bakes the checked-in label ("dev build 6") while the pack bakes the fix label,
 * so any rebuild after a pack makes the two bundles genuinely different.
 */

import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, join, relative, resolve } from "node:path"
import process from "node:process"

const HOST_BUNDLE = "extension/dist/extension.js"
const WEBVIEW_BUNDLE = "extension/webview-ui/build/assets/index.js"

/**
 * The contract table.
 *
 * Each entry pins one string that must survive bundling in a given build. They
 * are deliberately *behavioral* markers — a user-visible message, a test id the
 * e2e suites drive, or an RPC/auth token that only exists when the code path is
 * present — rather than function names, which esbuild mangles (`verify at the
 * SDK dist instead` is the note every round wrote by hand).
 *
 * Add `absent: true` for a round whose whole point was a *removal* (fix.44
 * dropped a third-party gateway from the Base URL hint): the marker must then be
 * gone from the bundle, so copy a later round deleted cannot creep back in.
 *
 * `round` names the build that introduced the contract, and every entry must
 * hold in the *current* build — so `--round fix.42` asks "is what fix.42 added
 * still there", not "did fix.42 contain this exact string". Wording that a later
 * round deliberately replaced belongs to the later round, not kept here failing.
 *
 * When a round adds a contract, append it here in the same commit as the code.
 * A marker that no longer describes intended behavior should be deleted, never
 * left failing: a table with permanent noise stops being read.
 */
const CONTRACTS = [
	// --- fix.44: the Base URL hint stops advertising someone else's gateway ---
	{
		round: "fix.44",
		bundle: "webview",
		marker: "https://cleanapis.com/v1",
		absent: true,
		why: "the placeholder shows one generic example, not a named gateway",
	},

	// --- fix.43: the custom-provider card is usable and lists its own models ---
	{ round: "fix.43", bundle: "webview", marker: '"data-testid":"custom-provider-manager"', why: "the card mounts" },
	{
		round: "fix.43",
		bundle: "webview",
		marker: '"data-testid":"custom-provider-fetch-models"',
		why: "the endpoint fetch action exists",
	},
	{ round: "fix.43", bundle: "webview", marker: "Fetch models automatically", why: "the action is labelled for users" },
	{
		round: "fix.43",
		bundle: "webview",
		marker: '"data-testid":"custom-provider-advanced-toggle"',
		why: "advanced options are collapsible",
	},
	{
		round: "fix.43",
		bundle: "webview",
		marker: "Advanced Settings (Custom Headers, Models Source URL)",
		why: "collapsed options still name themselves",
	},
	{
		round: "fix.43",
		bundle: "webview",
		marker: '"data-testid":"custom-provider-default-model-select"',
		why: "known model ids are offered as a picker",
	},
	{
		round: "fix.43",
		bundle: "webview",
		marker: '"data-testid":"custom-provider-models-source-url"',
		why: "the advance section really renders",
	},
	{
		round: "fix.43",
		bundle: "webview",
		marker: "Model Configuration",
		why: "the form is grouped by intent, not by field order",
	},
	{
		round: "fix.43",
		bundle: "webview",
		marker: "Custom Providers",
		why: "the card header survived the redesign (fix.42 spelled it differently)",
	},
	{ round: "fix.43", bundle: "webview", marker: "Add Custom Provider", why: "the create action is still reachable" },
	{ round: "fix.43", bundle: "webview", marker: "Confirm Delete?", why: "deleting still needs a second click" },
	{
		round: "fix.43",
		bundle: "webview",
		marker: "Leave blank to keep stored key",
		why: "write-only API key is explained in place",
	},
	{
		round: "fix.43",
		bundle: "webview",
		marker: '"data-testid":"context-window-source"',
		why: "the Context row shows where its number came from",
	},
	{
		round: "fix.43",
		bundle: "host",
		marker: "refreshOpenAiModels",
		why: "the fetch RPC the form calls (form-supplied baseUrl/apiKey)",
	},

	// --- fix.42: multi custom-provider management ---
	{ round: "fix.42", bundle: "webview", marker: "custom-provider-row-", why: "providers are listed one row each" },
	{ round: "fix.42", bundle: "webview", marker: "custom-provider-delete-confirm-", why: "the confirm step is drivable by e2e" },
	{ round: "fix.42", bundle: "webview", marker: "provider-option-", why: "created providers reach the provider selector" },
	{ round: "fix.42", bundle: "host", marker: "createCustomProvider", why: "create RPC wired" },
	{ round: "fix.42", bundle: "host", marker: "updateCustomProvider", why: "update RPC wired" },
	{ round: "fix.42", bundle: "host", marker: "deleteCustomProvider", why: "delete RPC wired" },
	{ round: "fix.42", bundle: "host", marker: "CustomProviderMutationRequest", why: "the mutation contract survives bundling" },
	{ round: "fix.42", bundle: "host", marker: "openai-compatible", why: "the family the card registers into" },

	// --- fix.41: a custom gateway's model list must not be lost ---
	{
		round: "fix.41",
		bundle: "host",
		marker: "x-api-key",
		why: "the retry-only auth spelling exists (forced on every request is the bug)",
	},
	{
		round: "fix.41",
		bundle: "host",
		marker: "failed to fetch models from",
		why: "a refused fetch reports itself instead of an empty list",
	},

	// --- fix.40: provider-declared limits reach the Context row ---
	{ round: "fix.40", bundle: "host", marker: "context_length", why: "the endpoint's own declared context window is read" },
	{ round: "fix.40", bundle: "host", marker: "max_model_len", why: "the gateway spellings beyond OpenAI's are read too" },
	{ round: "fix.40", bundle: "host", marker: "contextWindowSource", why: "provenance is carried to the webview" },

	// --- earlier rounds, still live contracts ---
	{
		round: "fix.39",
		bundle: "host",
		marker: "turn truncated, continuing",
		why: "an output-limit continuation announces itself",
	},
	{
		round: "fix.37",
		bundle: "host",
		marker: "Tool approval required (not auto-approved)",
		why: "a stalled approval is diagnosable",
	},
	{
		round: "fix.37",
		bundle: "host",
		marker: "No replacement performed: text not found in",
		why: "the whitespace-tolerant edit retry is present",
	},
]

const VERSION_LABEL_SOURCE = "sync-icline-docs.mjs"

function parseArgs(argv) {
	const options = { dist: "apps/vscode/dist", local: "apps/vscode", localCheck: true, rounds: [], json: false, keep: false }
	const positional = []
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i]
		switch (arg) {
			case "--vsix":
				options.vsix = argv[++i]
				break
			case "--dist":
				options.dist = argv[++i]
				break
			case "--local":
				options.local = argv[++i]
				break
			case "--no-local":
				options.localCheck = false
				break
			case "--round":
				options.rounds.push(argv[++i] ?? "")
				break
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
	if (positional.length > 1) {
		throw new Error(`Expected at most one VSIX path, got ${positional.length}`)
	}
	options.vsix = options.vsix ?? positional[0]
	return options
}

function usage() {
	return readFileSync(new URL(import.meta.url), "utf8")
		.split("*/")[0]
		.split("\n")
		.filter((line) => !line.startsWith("#!"))
		.join("\n")
		.replace(/^\s*\/\*\*?/gm, "")
		.trim()
}

function sha1(file) {
	return createHash("sha1").update(readFileSync(file)).digest("hex")
}

function walk(dir) {
	const files = []
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name)
		if (entry.isDirectory()) {
			files.push(...walk(full))
		} else {
			files.push(full)
		}
	}
	return files
}

/** The newest fix.N build, so a round can check the artifact it just packed. */
function newestVsix(distDir) {
	if (!existsSync(distDir)) {
		throw new Error(`No build directory at ${distDir}`)
	}
	const candidates = readdirSync(distDir)
		.filter((name) => name.endsWith(".vsix") && name.includes("-fix."))
		.map((name) => ({ name, fix: Number.parseInt(name.match(/-fix\.(\d+)\.vsix$/)?.[1] ?? "-1", 10) }))
		.filter((entry) => Number.isFinite(entry.fix) && entry.fix >= 0)
	if (candidates.length === 0) {
		throw new Error(`No fix.N VSIX in ${distDir}`)
	}
	candidates.sort((a, b) => b.fix - a.fix)
	return join(distDir, candidates[0].name)
}

/** Every `dev build N · fix.M` label a bundle carries. */
function bundleLabels(source) {
	return new Set(source.match(/dev build \d+(?: · fix\.\d+)?/g) ?? [])
}

/** Mirrors sync-icline-docs.mjs so the label check cannot drift from the generator. */
function expectedLabel(version) {
	const devMatch = version.match(/^(.+)-dev\.(\d+)(?:-fix\.(\d+))?$/)
	if (devMatch) {
		const fixN = devMatch[3]
		return fixN ? `dev build ${devMatch[2]} · fix.${fixN}` : `dev build ${devMatch[2]}`
	}
	const fixMatch = version.match(/^(.+)-fix\.(\d+)$/)
	if (fixMatch) {
		return `fix.${fixMatch[2]}`
	}
	return version
}

function extract(vsix, dest) {
	try {
		execFileSync("unzip", ["-o", "-q", vsix, "-d", dest], { stdio: "pipe" })
	} catch (error) {
		throw new Error(`Could not extract ${vsix}: ${error.message} (is 'unzip' on PATH?)`)
	}
}

function run(options) {
	const vsix = resolve(options.vsix ?? newestVsix(resolve(options.dist)))
	if (!existsSync(vsix)) {
		throw new Error(`No VSIX at ${vsix}`)
	}
	const localRoot = resolve(options.local)

	const checks = []
	const add = (group, ok, label, detail) => checks.push({ group, ok, label, detail })

	const temp = mkdtempSync(join(tmpdir(), "icline-vsix-contracts-"))
	try {
		extract(vsix, temp)

		const manifestPath = join(temp, "extension", "package.json")
		const hostPath = join(temp, HOST_BUNDLE)
		const webviewPath = join(temp, WEBVIEW_BUNDLE)
		const version = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")).version : undefined
		// Walk the whole archive (the two VSIX root entries included), so the entry
		// count matches what `vsce` reports for the same build.
		const files = walk(temp)

		// --- structure -----------------------------------------------------
		add("structure", existsSync(manifestPath), "extension/package.json present", version ? `version ${version}` : "missing")
		add(
			"structure",
			existsSync(hostPath),
			HOST_BUNDLE.replace("extension/", ""),
			existsSync(hostPath) ? "present" : "missing",
		)
		add(
			"structure",
			existsSync(webviewPath),
			WEBVIEW_BUNDLE.replace("extension/", ""),
			existsSync(webviewPath) ? "present" : "missing",
		)
		const litter = files.filter((file) => /\.wip\.bak$|\.icline-tmp$/.test(file))
		add(
			"structure",
			litter.length === 0,
			"no pack litter (.wip.bak / .icline-tmp)",
			litter.length === 0 ? `${files.length} entries` : litter.map((f) => relative(temp, f)).join(", "),
		)

		// --- version label --------------------------------------------------
		// Read before the byte check: whether the two builds are even comparable
		// depends on the label each one baked in.
		const localWebviewPath = join(localRoot, "webview-ui", "build", "assets", "index.js")
		const localLabels = existsSync(localWebviewPath) ? bundleLabels(readFileSync(localWebviewPath, "utf8")) : new Set()
		if (version && existsSync(webviewPath)) {
			const source = readFileSync(webviewPath, "utf8")
			const expected = expectedLabel(version)
			const labels = bundleLabels(source)
			add(
				"version label",
				labels.has(expected),
				`label is "${expected}"`,
				labels.size === 0 ? "no label found" : [...labels].join(", "),
			)
			const stale = [...labels].filter((label) => label !== expected)
			add(
				"version label",
				stale.length === 0,
				"no stale label from an earlier build",
				stale.length === 0 ? `derived from ${VERSION_LABEL_SOURCE}` : stale.join(", "),
			)
		}

		// --- bytes against the local build ---------------------------------
		// The pack injects the fix label into the build metadata, so a plain
		// `bun run build` of the very same tree produces a DIFFERENT bundle than the
		// one that was packed. Comparing anyway would report every correct artifact
		// as stale from the moment anyone rebuilds, so only compare like with like.
		if (options.localCheck) {
			const target = version ? expectedLabel(version) : undefined
			const comparable = target !== undefined && localLabels.size > 0 && localLabels.has(target) && localLabels.size === 1
			if (!comparable) {
				const seen = localLabels.size > 0 ? [...localLabels].join(", ") : "no label (bundle missing?)"
				add(
					"bytes",
					true,
					"byte match",
					`skipped — the local build is labelled ${seen}, the pack labels itself ${target ?? "?"}`,
				)
			} else {
				for (const pair of [
					{ entry: hostPath, local: join(localRoot, "dist", "extension.js"), label: "extension.js" },
					{ entry: webviewPath, local: localWebviewPath, label: "webview index.js" },
				]) {
					if (!existsSync(pair.entry) || !existsSync(pair.local)) {
						add("bytes", true, `${pair.label} byte match`, "skipped (bundle or local build missing)")
						continue
					}
					const packed = sha1(pair.entry)
					const local = sha1(pair.local)
					add(
						"bytes",
						packed === local,
						`${pair.label} byte match`,
						`${packed.slice(0, 8)}… ${packed === local ? "=" : "≠"} local ${local.slice(0, 8)}…`,
					)
				}
			}
		}

		// --- contract table -------------------------------------------------
		const rounds = options.rounds.length > 0 ? new Set(options.rounds) : undefined
		const selected = rounds ? CONTRACTS.filter((contract) => rounds.has(contract.round)) : CONTRACTS
		// A filter that matches nothing would report a green run for code that was
		// never checked, which is worse than no check at all.
		if (rounds && selected.length === 0) {
			throw new Error(`--round matched no contracts: ${[...rounds].join(", ")}`)
		}
		const sources = { host: hostPath, webview: webviewPath }
		const loaded = {}
		for (const [kind, file] of Object.entries(sources)) {
			loaded[kind] = existsSync(file) ? readFileSync(file, "utf8") : undefined
		}
		for (const contract of selected) {
			const haystack = loaded[contract.bundle]
			if (haystack === undefined) {
				add(contract.round, false, contract.marker, `${contract.bundle} bundle missing`)
				continue
			}
			const present = haystack.includes(contract.marker)
			add(
				contract.round,
				contract.absent ? !present : present,
				`${contract.absent ? "absent: " : ""}${contract.marker}`,
				`${contract.bundle} — ${contract.why}`,
			)
		}

		const failed = checks.filter((check) => !check.ok)
		const result = {
			vsix,
			name: basename(vsix),
			version,
			size: statSync(vsix).size,
			entries: files.length,
			checks,
			passed: checks.length - failed.length,
			failed: failed.length,
			temp: options.keep ? temp : undefined,
		}
		return result
	} finally {
		if (!options.keep) {
			rmSync(temp, { recursive: true, force: true })
		}
	}
}

function render(result) {
	const lines = []
	lines.push("VSIX contract check")
	lines.push(
		`  vsix: ${result.name} (${result.size.toLocaleString("en-US")} B · ${result.entries} files · version ${result.version ?? "?"})`,
	)
	let group
	for (const check of result.checks) {
		if (check.group !== group) {
			group = check.group
			lines.push("")
			lines.push(`  ${group}`)
		}
		lines.push(`    ${check.ok ? "OK  " : "FAIL"} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`)
	}
	lines.push("")
	lines.push(`  ${result.passed} passed, ${result.failed} failed`)
	if (result.temp) {
		lines.push(`  extracted at ${result.temp}`)
	}
	return lines.join("\n")
}

function main() {
	let options
	try {
		options = parseArgs(process.argv.slice(2))
	} catch (error) {
		console.error(error.message)
		process.exit(2)
	}
	if (options.help) {
		console.log(usage())
		return
	}
	let result
	try {
		result = run(options)
	} catch (error) {
		console.error(error.message)
		process.exit(2)
	}
	console.log(options.json ? JSON.stringify(result, null, 2) : render(result))
	process.exit(result.failed > 0 ? 1 : 0)
}

main()
