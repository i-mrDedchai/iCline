#!/usr/bin/env node
/**
 * WIP VSIX packager for local smoke tests (maintainer tool, committed).
 * Optional: --fix N  → {baseVersion}-fix.N (baseVersion has any prior -fix.* stripped)
 *           --no-verify → skip the contract gate (env ICLINE_SKIP_VERIFY=1 also works)
 *
 * After vsce succeeds the pack is gated on scripts/verify-vsix-contracts.mjs:
 * a non-zero exit fails the pack, so a VSIX that dropped an earlier round's
 * contract never leaves dist/ unnoticed.
 *
 * Mutates package.json and webview-ui/src/icline/build-metadata.ts only while
 * vsce runs. Sidecar backups are written first so a killed pack (Ctrl+C /
 * SIGTERM) can restore vscode:prepublish + version + build metadata on the
 * next run instead of leaving stubs committed.
 *
 * The stamped metadata is what the About page shows: without this, fix.N
 * packs kept the stale "dev build N · <last sync:docs timestamp>" label.
 *
 * Always rebuild the host with `esbuild.mjs --production` before vsce. Skipping
 * that reused a stale debug `dist/extension.js` (fat VSIX, missing host diffs).
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { getVsceImageRewriteArgs } from "./marketplace-images.mjs"
import { restore, swapIn } from "./marketplace-readme.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extRoot = path.join(__dirname, "..")
const pkgPath = path.join(extRoot, "package.json")
const pkgBakPath = path.join(extRoot, ".package.json.wip.bak")
const metaPath = path.join(extRoot, "webview-ui", "src", "icline", "build-metadata.ts")
const metaBakPath = path.join(extRoot, ".build-metadata.wip.bak")
const vsceJs = path.join(extRoot, "node_modules", "@vscode", "vsce", "vsce")
const repoRoot = path.resolve(extRoot, "..", "..")
const verifyScript = path.join(repoRoot, "scripts", "verify-vsix-contracts.mjs")

function recoverStaleBackup(bakPath, targetPath) {
	if (!fs.existsSync(bakPath)) {
		return
	}
	fs.copyFileSync(bakPath, targetPath)
	fs.unlinkSync(bakPath)
	console.warn(`Recovered ${path.basename(targetPath)} from stale ${path.basename(bakPath)}`)
}

recoverStaleBackup(pkgBakPath, pkgPath)
recoverStaleBackup(metaBakPath, metaPath)

const original = fs.readFileSync(pkgPath, "utf-8")
const pkg = JSON.parse(original)
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "icline-docs.manifest.json"), "utf-8"))
const base = manifest.vsixFileName || manifest.extensionId || "i-mrdedchai.iCline"

function parseFixNumber(argv) {
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === "--fix" && argv[i + 1]) {
			const n = Number.parseInt(String(argv[i + 1]), 10)
			if (Number.isFinite(n) && n > 0) return n
		}
		const m = /^--fix=(\d+)$/.exec(a)
		if (m) {
			const n = Number.parseInt(m[1], 10)
			if (Number.isFinite(n) && n > 0) return n
		}
	}
	const envN = Number.parseInt(process.env.ICLINE_FIX || "", 10)
	if (Number.isFinite(envN) && envN > 0) return envN
	return undefined
}

if (!fs.existsSync(vsceJs)) {
	console.error("Missing local @vscode/vsce at", vsceJs)
	process.exit(1)
}

const argv = process.argv.slice(2)
const skipVerify = argv.includes("--no-verify") || process.env.ICLINE_SKIP_VERIFY === "1"
const fixN = parseFixNumber(argv)
// Strip any accidental -fix.* suffix left on package.json from a failed pack.
const baseVersion = String(pkg.version || "0.0.0").replace(/(-fix\.\d+)+$/i, "")
const packVersion = fixN ? `${baseVersion}-fix.${fixN}` : baseVersion
const out = path.join(extRoot, "dist", `${base}-${packVersion}.vsix`)

const pkgJson = JSON.parse(original)
pkgJson.version = packVersion
pkgJson.scripts = pkgJson.scripts || {}
pkgJson.scripts["vscode:prepublish"] = "node -e \"process.stdout.write('skip prepublish\\n')\""

function formatBuiltAt() {
	const d = new Date()
	const pad = (n) => String(n).padStart(2, "0")
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Stamp the About-page metadata for this WIP pack: append " · fix.N" to the
 * dev label (replacing any stale fix suffix) and refresh builtAt. The file is
 * restored after vsce by restoreAll, so the committed copy stays at whatever
 * the last sync:docs run wrote.
 */
/**
 * Run scripts/verify-vsix-contracts.mjs against the artifact just packed.
 *
 * Called BEFORE restoreAll() on purpose: the stamped build metadata is what puts
 * the `dev build N · fix.M` label into the freshly built webview bundle, so the
 * byte comparison inside the checker is only meaningful while the stamp is in
 * place. Restore first and every byte check degrades to "skipped — labels differ".
 */
function runContractGate(vsixPath) {
	if (skipVerify) {
		console.warn("\nContract gate skipped (--no-verify)")
		return 0
	}
	if (!fs.existsSync(verifyScript)) {
		console.error(`\nContract gate missing at ${verifyScript} — pass --no-verify to pack anyway`)
		return 1
	}
	console.log("\nRunning VSIX contract gate…")
	const result = spawnSync(process.execPath, [verifyScript, "--vsix", vsixPath, "--local", extRoot], {
		stdio: "inherit",
		cwd: repoRoot,
		env: process.env,
	})
	if (result.status !== 0) {
		console.error(`\nContract gate failed with exit ${result.status ?? "?"} — the VSIX is on disk but is not shippable`)
	}
	return result.status ?? 1
}

function stampBuildMetadata() {
	if (!fs.existsSync(metaPath)) {
		return
	}
	const originalMeta = fs.readFileSync(metaPath, "utf-8")
	let next = originalMeta
	if (fixN) {
		next = next.replace(/devBuildLabel: "([^"]*?)(?: · fix\.\d+)?"/, `devBuildLabel: "$1 · fix.${fixN}"`)
	}
	next = next.replace(/builtAt: "[^"]*"/, `builtAt: "${formatBuiltAt()}"`)
	fs.writeFileSync(metaBakPath, originalMeta)
	fs.writeFileSync(metaPath, next)
}

let swapResult = { skipped: true }
let restored = false

function restoreAll() {
	if (restored) {
		return
	}
	restored = true
	if (fs.existsSync(pkgBakPath)) {
		fs.copyFileSync(pkgBakPath, pkgPath)
		fs.unlinkSync(pkgBakPath)
	} else {
		fs.writeFileSync(pkgPath, original)
	}
	recoverStaleBackup(metaBakPath, metaPath)
	if (!swapResult.skipped) {
		restore()
	}
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
	process.on(signal, () => {
		restoreAll()
		process.exit(signal === "SIGINT" ? 130 : 1)
	})
}

fs.writeFileSync(pkgBakPath, original)
fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, "\t") + "\n")
stampBuildMetadata()
swapResult = swapIn()

// The webview bundle embeds build-metadata.ts (the About page reads the
// compiled constant), so rebuild it AFTER stamping. vscode:prepublish is
// stubbed so vsce does not run the full pipeline; compile the host here.
let exitCode = 1
try {
	const webviewBuild = spawnSync("npm", ["run", "build:webview"], {
		stdio: "inherit",
		cwd: extRoot,
		shell: process.platform === "win32",
		env: process.env,
	})
	if (webviewBuild.status !== 0) {
		console.error("\nwebview rebuild failed with exit", webviewBuild.status)
		restoreAll()
		process.exit(webviewBuild.status ?? 1)
	}

	const hostBuild = spawnSync(process.execPath, ["esbuild.mjs", "--production"], {
		stdio: "inherit",
		cwd: extRoot,
		env: process.env,
	})
	if (hostBuild.status !== 0) {
		console.error("\nhost esbuild --production failed with exit", hostBuild.status)
		restoreAll()
		process.exit(hostBuild.status ?? 1)
	}

	const result = spawnSync(
		process.execPath,
		[vsceJs, "package", "--no-dependencies", ...getVsceImageRewriteArgs(manifest), "--out", out],
		{ stdio: "inherit", cwd: extRoot, env: process.env },
	)
	exitCode = result.status ?? 1
	// Gate the pack on the contracts the artifact must still carry, while the fix
	// label is still stamped (see runContractGate).
	if (exitCode === 0) {
		exitCode = runContractGate(out)
	}
} finally {
	restoreAll()
}

if (exitCode === 0) {
	const st = fs.statSync(out)
	console.log(`\nWIP VSIX ready: ${out}`)
	console.log(`version: ${packVersion}`)
	console.log(`size: ${st.size} bytes @ ${st.mtime.toISOString()}`)
} else {
	console.error("\nWIP VSIX packaging failed with exit", exitCode)
}
process.exit(exitCode)
