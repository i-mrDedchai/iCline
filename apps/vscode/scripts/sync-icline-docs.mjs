#!/usr/bin/env node
/**
 * Sync iCline extension docs from package.json version + icline-docs.manifest.json.
 * Runs before vsce package / vscode:prepublish so Details, Changelog, and settings stay current.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { ensureChangelogVersion as ensureReleaseChangelogVersion } from "../../../scripts/changelog-release.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extRoot = path.join(__dirname, "..")
const repoRoot = path.join(extRoot, "../..")

const MANIFEST_PATH = path.join(__dirname, "icline-docs.manifest.json")
const PACKAGE_PATH = path.join(extRoot, "package.json")
const README_PATH = path.join(extRoot, "README.md")
const README_MARKETPLACE_PATH = path.join(extRoot, "README.marketplace.md")
const README_TH_PATH = path.join(extRoot, "README.th.md")
const ROOT_README_PATH = path.join(repoRoot, "README.md")
const ROOT_README_TH_PATH = path.join(repoRoot, "README.th.md")
const CHANGELOG_PATH = path.join(extRoot, "CHANGELOG.md")
const PROVIDERS_PATH = path.join(extRoot, "src/shared/providers/providers.json")
const UPDATE_SERVICE_PATH = path.join(extRoot, "src/icline/updates/UpdateService.ts")
const ICLINE_MD_PATH = path.join(repoRoot, "../ICLINE.md")
const BUILD_METADATA_PATH = path.join(extRoot, "webview-ui/src/icline/build-metadata.ts")
const PACKAGE_NLS_PATH = path.join(extRoot, "package.nls.json")
const PACKAGE_NLS_TH_PATH = path.join(extRoot, "package.nls.th.json")

function readJson(p) {
	return JSON.parse(fs.readFileSync(p, "utf-8"))
}

function writeJson(p, data) {
	fs.writeFileSync(p, `${JSON.stringify(data, null, "\t")}\n`, "utf-8")
}

function releasesApiUrl(manifest) {
	const { owner, repo } = manifest.github
	return `https://api.github.com/repos/${owner}/${repo}/releases/latest`
}

function vsixFileName(manifest, version) {
	const base = manifest.vsixFileName || manifest.extensionId || "i-mrdedchai.iCline"
	return `${base}-${version}.vsix`
}

/** Extract the latest changelog section for GitHub Release notes. */
function extractChangelogSection(changelog, version) {
	const header = `## [${version}]`
	const start = changelog.indexOf(header)
	if (start === -1) {
		return undefined
	}
	const afterHeader = changelog.slice(start + header.length)
	const nextHeader = afterHeader.search(/\n## \[\d/)
	const body = (nextHeader === -1 ? afterHeader : afterHeader.slice(0, nextHeader)).trim()
	const dateLine = body.match(/^- \d{4}-\d{2}-\d{2}/)
	const content = dateLine ? body.replace(/^- \d{4}-\d{2}-\d{2}\s*\n?/, "").trim() : body
	return content
}

const VSIX_VERSION_RE = String.raw`\d+\.\d+\.\d+(?:-dev\.\d+)?`

function patchVsixInstallCommands(text, vsixName) {
	let next = text
	// dist/ and bare filenames
	next = next.replace(new RegExp(`i-mrdedchai\\.iCline-${VSIX_VERSION_RE}\\.vsix`, "g"), vsixName)
	next = next.replace(new RegExp(`i-mrd?ed\\.iCline-${VSIX_VERSION_RE}\\.vsix`, "g"), vsixName)
	next = next.replace(new RegExp(`icline-${VSIX_VERSION_RE}\\.vsix`, "g"), vsixName)
	next = next.replace(new RegExp(`dist/i-mrdedchai\\.iCline-${VSIX_VERSION_RE}\\.vsix`, "g"), `dist/${vsixName}`)
	next = next.replace(new RegExp(`dist/i-mrd?ed\\.iCline-${VSIX_VERSION_RE}\\.vsix`, "g"), `dist/${vsixName}`)
	next = next.replace(new RegExp(`dist/icline-${VSIX_VERSION_RE}\\.vsix`, "g"), `dist/${vsixName}`)
	return next
}

function patchReadme(readme, { version, manifest, releasesUrl, vsixName, isThai = false }) {
	const { url } = manifest.github
	let next = readme

	const extId = manifest.extensionId || "i-mrdedchai.iCline"
	const changelog = changelogUrl(manifest)
	const versionLine = isThai
		? `> 📦 **เวอร์ชันปัจจุบัน:** \`${version}\` · [Releases](${url}/releases) · [Changelog](${changelog}) · [Repo](${url})`
		: `> 📦 **Current version:** \`${version}\` · [Releases](${url}/releases) · [Changelog](${changelog}) · [Repo](${url})`

	next = next.replace(
		/<!-- icline:version -->[\s\S]*?<!-- \/icline:version -->/,
		`<!-- icline:version -->\n${versionLine}\n<!-- /icline:version -->`,
	)
	if (!next.includes("<!-- icline:version -->")) {
		const insert = `\n<!-- icline:version -->\n${versionLine}\n<!-- /icline:version -->\n`
		next = next.replace(/^# iCline\n/, `# iCline\n${insert}`)
	}

	next = next.replace(/\| `icline\.icline` \|/g, `| \`${extId}\` |`)
	next = next.replace(/\(`icline\.icline`\)/g, `(\`${extId}\`)`)
	next = next.replace(/i-mrDed\.iCline/g, extId)
	next = next.replace(/i-mrded\.iCline/g, extId)
	next = next.replace(/https:\/\/github\.com\/i-mrDed\/iCline/g, url)
	next = next.replace(/https:\/\/api\.github\.com\/repos\/i-mrDed\/iCline\/releases\/latest/g, releasesUrl)

	next = next.replace(
		/<!-- icline:repo -->[\s\S]*?<!-- \/icline:repo -->/,
		`<!-- icline:repo -->\n🔗 **GitHub:** [${manifest.github.owner}/${manifest.github.repo}](${url})\n<!-- /icline:repo -->`,
	)

	next = next.replace(
		/\| `iCline\.updates\.releasesUrl` \| URL GitHub Releases API \| .*? \|/,
		`| \`iCline.updates.releasesUrl\` | URL GitHub Releases API | \`${releasesUrl}\` |`,
	)

	next = next.replace(
		/```\nhttps:\/\/api\.github\.com\/repos\/.*?\/releases\/latest\n```/,
		`\`\`\`\n${releasesUrl}\n\`\`\``,
	)

	next = next.replace(/เลือก \*\*xAI\*\* แล้วกด/, `เลือก **${manifest.providers.xai}** แล้วกด`)
	next = next.replace(/`icline\.updates/g, "`iCline.updates")

	return patchVsixInstallCommands(next, vsixName)
}

/** README.marketplace.md keeps relative assets/docs/ paths so vsce can rewrite them to
 *  GitHub absolute URLs at package time (--baseImagesUrl). Do not ship relative paths
 *  in the VSIX for store listings — Open VSX cannot serve them (see บันทึกแชท
 *  2026-06/2026-06-23_01_openvsx-readme-images-root-cause.md). */
function ensurePackagedReadmeImages(readme, manifest) {
	const base = `${manifest.github.url}/raw/main/apps/vscode`
	const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	return readme
		.replace(new RegExp(`src="${escapedBase}/assets/docs/([^"]+)"`, "g"), 'src="assets/docs/$1"')
		.replace(new RegExp(`\\]\\(${escapedBase}/assets/docs/([^)]+)\\)`, "g"), "](assets/docs/$1)")
		.replace(/src="assets\/docs\/([^"]+)"/g, 'src="assets/docs/$1"')
		.replace(/\]\(assets\/docs\/([^)]+)\)/g, "](assets/docs/$1)")
}

function patchRootReadme(readme, { version, manifest, vsixName, isThai = false }) {
	const { url } = manifest.github
	const extId = manifest.extensionId || "i-mrdedchai.iCline"
	const versionLabel = isThai ? "เวอร์ชัน" : "Version"
	const changelogLabel = isThai ? "Changelog" : "Changelog"
	const releasesLabel = isThai ? "Releases" : "Releases"
	const changelog = changelogUrl(manifest)

	let next = readme
	next = next.replace(
		/<!-- icline:version -->[\s\S]*?<!-- \/icline:version -->/,
		`<!-- icline:version -->\n<p align="center">\n  <strong>${versionLabel}</strong> <code>${version}</code> ·\n  <a href="${url}/releases">${releasesLabel}</a> ·\n  <a href="${changelog}">${changelogLabel}</a> ·\n  Extension ID <code>${extId}</code>\n</p>\n<!-- /icline:version -->`,
	)

	next = next.replace(/i-mrDed\.iCline/g, extId)
	next = next.replace(/i-mrded\.iCline/g, extId)
	next = next.replace(/github\.com\/i-mrDed\/iCline/g, `github.com/${manifest.github.owner}/${manifest.github.repo}`)
	return patchVsixInstallCommands(next, vsixName)
}

function patchIclineMd(source, { version, manifest, releasesUrl, vsixName }) {
	if (!source) return source
	const { url } = manifest.github
	let next = source
	next = next.replace(
		/<!-- icline:version -->[\s\S]*?<!-- \/icline:version -->/,
		`<!-- icline:version -->\n> 📦 เวอร์ชัน \`${version}\` — [Releases](${url}/releases) · [Changelog](${changelogUrl(manifest)})\n<!-- /icline:version -->`,
	)
	next = next.replace(
		/- `iCline\.updates\.releasesUrl`/,
		`- \`iCline.updates.releasesUrl\` (default: \`${releasesUrl}\`)`,
	)
	next = next.replace(/i-mrDed\.iCline/g, manifest.extensionId || "i-mrdedchai.iCline")
	next = next.replace(/i-mrded\.iCline/g, manifest.extensionId || "i-mrdedchai.iCline")
	next = next.replace(/https:\/\/github\.com\/i-mrDed\/iCline/g, url)
	next = next.replace(/github\.com\/i-mrDed\/iCline/g, `github.com/${manifest.github.owner}/${manifest.github.repo}`)
	next = next.replace(/https:\/\/api\.github\.com\/repos\/i-mrDed\/iCline\/releases\/latest/g, releasesUrl)
	next = next.replace(/Marketplace publisher `i-mrded`/g, "Marketplace publisher `i-mrdedchai`")
	next = patchVsixInstallCommands(next, vsixName)
	return next
}

function patchProviders(providers, manifest) {
	const list = providers.list.map((p) => {
		if (p.value === "xai" && manifest.providers.xai) {
			return { ...p, label: manifest.providers.xai }
		}
		if (p.value === "zenmux" && manifest.providers.zenmux) {
			return { ...p, label: manifest.providers.zenmux }
		}
		if (p.value === "sakana" && manifest.providers.sakana) {
			return { ...p, label: manifest.providers.sakana }
		}
		return p
	})
	return { ...providers, list }
}

function patchUpdateService(source, releasesUrl) {
	return source.replace(
		/const DEFAULT_ICLINE_RELEASES_URL = ".*?"/,
		`const DEFAULT_ICLINE_RELEASES_URL = "${releasesUrl}"`,
	)
}

function changelogUrl(manifest) {
	const { owner, repo } = manifest.github
	return `https://github.com/${owner}/${repo}/blob/main/apps/vscode/CHANGELOG.md`
}

function parseVersionParts(version) {
	const devMatch = version.match(/^(.+)-dev\.(\d+)$/)
	if (devMatch) {
		return {
			releaseVersion: devMatch[1],
			devBuildNumber: Number.parseInt(devMatch[2], 10),
			devBuildLabel: `dev build ${devMatch[2]}`,
		}
	}
	return {
		releaseVersion: version,
		devBuildNumber: null,
		devBuildLabel: null,
	}
}

function formatBuiltAt() {
	const d = new Date()
	const pad = (n) => String(n).padStart(2, "0")
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function writeBuildMetadata(manifest, version) {
	const upstream = manifest.upstreamCline ?? {}
	const syncedVersion = upstream.syncedVersion ? `v${String(upstream.syncedVersion).replace(/^v/, "")}` : "unknown"
	const syncedAt = upstream.syncedAt ?? "unknown"
	const repo = upstream.repo ?? "https://github.com/cline/cline"
	const { releaseVersion, devBuildNumber, devBuildLabel } = parseVersionParts(version)
	const builtAt = formatBuiltAt()
	const content = `/** Generated by scripts/sync-icline-docs.mjs — do not edit by hand. */
export const ICLINE_BUILD_METADATA = {
	releaseVersion: "${releaseVersion}",
	devBuildNumber: ${devBuildNumber ?? "null"},
	devBuildLabel: ${devBuildLabel ? `"${devBuildLabel}"` : "null"},
	builtAt: "${builtAt}",
	upstreamClineSyncedVersion: "${syncedVersion}",
	upstreamClineSyncedAt: "${syncedAt}",
	upstreamClineRepo: "${repo}",
} as const
`
	fs.mkdirSync(path.dirname(BUILD_METADATA_PATH), { recursive: true })
	fs.writeFileSync(BUILD_METADATA_PATH, content, "utf-8")
}

function syncPackageNls(manifest) {
	if (!manifest.displayName) return
	for (const [nlsPath, displayName, description] of [
		[PACKAGE_NLS_PATH, manifest.displayName, manifest.description],
		[PACKAGE_NLS_TH_PATH, manifest.displayNameTh ?? manifest.displayName, manifest.descriptionTh ?? manifest.description],
	]) {
		if (!fs.existsSync(nlsPath)) continue
		const nls = readJson(nlsPath)
		nls["extension.displayName"] = displayName
		if (description) {
			nls["extension.description"] = description
		}
		writeJson(nlsPath, nls)
	}
}

function sync() {
	const manifest = readJson(MANIFEST_PATH)
	const pkg = readJson(PACKAGE_PATH)
	const version = pkg.version
	const releasesUrl = releasesApiUrl(manifest)
	const { url } = manifest.github
	const vsixName = vsixFileName(manifest, version)

	pkg.description = manifest.description
	pkg.repository = { type: "git", url }
	pkg.homepage = url
	pkg.keywords = manifest.keywords
	if (pkg.contributes?.configuration?.properties?.["iCline.updates.releasesUrl"]) {
		pkg.contributes.configuration.properties["iCline.updates.releasesUrl"].default = releasesUrl
	}
	writeJson(PACKAGE_PATH, pkg)

	// providers.json was removed upstream (commit 83339c3c5 — refactor: extension
	// to use sdk provider list). The label overrides below are preserved for any
	// future restore of the file; if absent we simply skip without erroring.
	if (fs.existsSync(PROVIDERS_PATH)) {
		const providers = readJson(PROVIDERS_PATH)
		writeJson(PROVIDERS_PATH, patchProviders(providers, manifest))
	}

	const readmeCtx = { version, manifest, releasesUrl, vsixName }
	for (const readmePath of [README_PATH, README_MARKETPLACE_PATH, README_TH_PATH, ROOT_README_PATH, ROOT_README_TH_PATH]) {
		if (!fs.existsSync(readmePath)) continue
		const readme = fs.readFileSync(readmePath, "utf-8")
		const isRootThai = readmePath === ROOT_README_TH_PATH
		const isExtThai = readmePath === README_TH_PATH
		const isMarketplace = readmePath === README_MARKETPLACE_PATH
		let patched =
			readmePath === ROOT_README_PATH || readmePath === ROOT_README_TH_PATH
				? patchRootReadme(readme, { ...readmeCtx, isThai: isRootThai })
				: patchReadme(readme, { ...readmeCtx, isThai: isExtThai })
		if (isMarketplace) {
			patched = ensurePackagedReadmeImages(patched, manifest)
		}
		fs.writeFileSync(readmePath, patched, "utf-8")
	}

	if (fs.existsSync(CHANGELOG_PATH)) {
		let changelog = fs.readFileSync(CHANGELOG_PATH, "utf-8")
		changelog = ensureReleaseChangelogVersion(changelog, version)
		fs.writeFileSync(CHANGELOG_PATH, changelog, "utf-8")
	}

	if (fs.existsSync(UPDATE_SERVICE_PATH)) {
		const src = fs.readFileSync(UPDATE_SERVICE_PATH, "utf-8")
		fs.writeFileSync(UPDATE_SERVICE_PATH, patchUpdateService(src, releasesUrl), "utf-8")
	}

	if (fs.existsSync(ICLINE_MD_PATH)) {
		const md = fs.readFileSync(ICLINE_MD_PATH, "utf-8")
		fs.writeFileSync(ICLINE_MD_PATH, patchIclineMd(md, { version, manifest, releasesUrl, vsixName }), "utf-8")
	}

	writeBuildMetadata(manifest, version)
	syncPackageNls(manifest)

	console.log(`sync-icline-docs: v${version} → ${url}`)
	console.log(`  vsix: ${vsixName}`)
	console.log(`  releases API: ${releasesUrl}`)
	return { version, releasesUrl, url, vsixName }
}

const invokedAsCli = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
if (invokedAsCli) {
	try {
		sync()
	} catch (err) {
		console.error(`sync-icline-docs: ${err.message}`)
		process.exit(1)
	}
}

export { sync, releasesApiUrl, vsixFileName, extractChangelogSection }