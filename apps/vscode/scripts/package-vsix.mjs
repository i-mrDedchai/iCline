#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import fs from "node:fs"
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

// Call the project's own vsce binary. `npx vsce` can load a broken copy from the
// npm cache ("Cannot find module 'leven'") and fail even when the project is fine.
const vsceBin = path.join(extRoot, "node_modules", ".bin", process.platform === "win32" ? "vsce.exe" : "vsce")
if (!fs.existsSync(vsceBin)) {
	console.error(`vsce binary not found at ${vsceBin}; run bun install in apps/vscode first`)
	process.exit(1)
}

const swapResult = swapIn()
let exitCode = 1
try {
	const result = spawnSync(vsceBin, ["package", "--no-dependencies", ...getVsceImageRewriteArgs(manifest), "--out", out], {
		stdio: "inherit",
		shell: false,
		cwd: extRoot,
	})
	exitCode = result.status ?? 1
} finally {
	if (!swapResult.skipped) {
		restore()
	}
}
process.exit(exitCode)
