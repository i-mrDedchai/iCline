#!/usr/bin/env node
// ensure-sdk-dist.mjs — pack-pipeline guard (lesson of 0.1.19-dev.3).
//
// The extension bundles `@cline/*` from `sdk/packages/*/dist` (build
// artifacts, git-ignored) — NOT from `src`. Editing anything under
// `sdk/packages/*/src` and then running `npm run package` WITHOUT rebuilding
// the SDK silently ships a VSIX with the OLD provider code (dev.3 packed a
// bundle with zero `router.bynara.id` bytes for exactly this reason).
//
// Root CI builds the SDK first (`build:sdk`), so this trap only bites local
// packs. This guard compares newest-mtime(src) against the dist markers and
// rebuilds via the canonical root `build:sdk` when stale — a no-op (~ms) when
// fresh, so it is safe to run unconditionally at the start of `npm run
// package`. Fail-closed: errors (missing bun, build failure) abort the pack.
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extRoot = path.join(__dirname, "..")
const repoRoot = path.join(extRoot, "..", "..")

// SDK workspace packages the VS Code bundle resolves through
// apps/vscode/node_modules/@cline/* symlinks.
const SDK_PACKAGES = ["shared", "llms", "agents", "core"]
const DIST_MARKERS = ["index.js", "index.d.ts"]

function newestMtimeMs(dir) {
	let newest = 0
	const stack = [dir]
	while (stack.length > 0) {
		const current = stack.pop()
		let entries
		try {
			entries = fs.readdirSync(current, { withFileTypes: true })
		} catch {
			continue
		}
		for (const entry of entries) {
			if (entry.name === "node_modules") {
				continue
			}
			const full = path.join(current, entry.name)
			if (entry.isDirectory()) {
				stack.push(full)
			} else if (entry.isFile()) {
				try {
					const mtime = fs.statSync(full).mtimeMs
					if (mtime > newest) {
						newest = mtime
					}
				} catch {
					// Racy file — ignore, the build below is authoritative.
				}
			}
		}
	}
	return newest
}

function distIsFresh(pkg) {
	const distDir = path.join(repoRoot, "sdk", "packages", pkg, "dist")
	for (const marker of DIST_MARKERS) {
		try {
			if (fs.statSync(path.join(distDir, marker)).mtimeMs === 0) {
				return false
			}
		} catch {
			return false // marker (or dist/) missing entirely
		}
	}
	const oldestMarker = Math.min(...DIST_MARKERS.map((m) => fs.statSync(path.join(distDir, m)).mtimeMs))
	const newestSrc = newestMtimeMs(path.join(repoRoot, "sdk", "packages", pkg, "src"))
	return oldestMarker >= newestSrc
}

function resolveBun() {
	const tried = []
	const fromPath = spawnSync(process.platform === "win32" ? "where" : "which", ["bun"], { encoding: "utf-8" })
	if (fromPath.status === 0) {
		const first = fromPath.stdout.split(/\r?\n/).find(Boolean)?.trim()
		if (first) {
			return first
		}
	}
	tried.push("PATH")
	// Local-dev fallback (this machine's install location).
	const candidates =
		process.platform === "win32"
			? [path.join(process.env.USERPROFILE ?? "C:\\Users\\dedch", ".bun", "bin", "bun.exe")]
			: [path.join(process.env.HOME ?? "", ".bun", "bin", "bun")]
	for (const candidate of candidates) {
		tried.push(candidate)
		if (candidate && fs.existsSync(candidate)) {
			return candidate
		}
	}
	console.error(
		`ensure-sdk-dist: bun not found (tried ${tried.join(", ")}). Refusing to pack: cannot verify SDK dist freshness.`,
	)
	process.exit(1)
}

const stale = SDK_PACKAGES.filter((pkg) => !distIsFresh(pkg))
if (stale.length === 0) {
	console.log("ensure-sdk-dist: all SDK dists fresh — skipping rebuild.")
	process.exit(0)
}

console.log(`ensure-sdk-dist: stale SDK dist detected for: ${stale.join(", ")} — rebuilding via root build:sdk …`)
const bun = resolveBun()
// The SDK builds spawn `bun` themselves (e.g. shared/bun.mts), so bun's
// directory must ride along on PATH — the guard may have found bun via a
// fallback location that child processes would not see.
const bunDir = path.dirname(bun)
const childEnv = { ...process.env, PATH: `${bunDir}${path.delimiter}${process.env.PATH ?? ""}` }
const result = spawnSync(bun, ["run", "build:sdk"], {
	stdio: "inherit",
	cwd: repoRoot,
	shell: process.platform === "win32",
	env: childEnv,
})
if ((result.status ?? 1) !== 0) {
	console.error("ensure-sdk-dist: root build:sdk failed — aborting pack.")
	process.exit(result.status ?? 1)
}

// Re-verify: the rebuild must have caught up, otherwise something else (e.g.
// clock skew) is wrong and packing on would ship stale bytes again.
const stillStale = SDK_PACKAGES.filter((pkg) => !distIsFresh(pkg))
if (stillStale.length > 0) {
	console.error(`ensure-sdk-dist: dist still stale after rebuild for: ${stillStale.join(", ")} — aborting pack.`)
	process.exit(1)
}
console.log("ensure-sdk-dist: SDK dists rebuilt and fresh.")
