#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { getVsceImageRewriteArgs } from "./marketplace-images.mjs"
import { restore, swapIn } from "./marketplace-readme.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extRoot = path.join(__dirname, "..")
const pkg = JSON.parse(fs.readFileSync(path.join(extRoot, "package.json"), "utf-8"))
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "icline-docs.manifest.json"), "utf-8"))
const base = manifest.vsixFileName || manifest.extensionId || "i-mrdedchai.iCline"
const out = path.join(extRoot, "dist", `${base}-${pkg.version}.vsix`)

// Run the project's own @vscode/vsce through Node. Resolving the package by name works
// whether bun hoisted it to the repo root or kept it under apps/vscode, and avoids the
// `.bin` shim (`npx vsce` can load a broken copy from the npm cache).
const require = createRequire(path.join(extRoot, "package.json"))
let vsceEntry
try {
	const vscePkgPath = require.resolve("@vscode/vsce/package.json")
	const vscePkg = JSON.parse(fs.readFileSync(vscePkgPath, "utf-8"))
	vsceEntry = path.join(path.dirname(vscePkgPath), vscePkg.bin.vsce)
} catch {
	console.error("@vscode/vsce is not installed; run `bun install` at the repository root first")
	process.exit(1)
}

const swapResult = swapIn()
let exitCode = 1
try {
	const result = spawnSync(
		process.execPath,
		[vsceEntry, "package", "--no-dependencies", ...getVsceImageRewriteArgs(manifest), "--out", out],
		{
			stdio: "inherit",
			shell: false,
			cwd: extRoot,
		},
	)
	exitCode = result.status ?? 1
} finally {
	if (!swapResult.skipped) {
		restore()
	}
}

// Record the round in the smoke-test tracker while the artifact is fresh, so the
// documentation cannot trail the pack (the tracker used to lag a round behind).
// A tracker failure must not fail a pack that already produced a valid VSIX.
if (exitCode === 0) {
	const recorded = spawnSync(process.execPath, [path.join(__dirname, "update-round-tracker.mjs"), "--vsix", out], {
		stdio: "inherit",
		cwd: extRoot,
	})
	if (recorded.status !== 0) {
		console.warn("warning: could not update docs/icline/smoke-test-tracker.md (see above)")
	}
}
process.exit(exitCode)
