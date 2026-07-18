import * as vscode from "vscode"
import { ExtensionRegistryInfo } from "@/registry"
import type { IclineUpdateBarStatus } from "@/shared/ExtensionMessage"
import { fetch } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"

/** iCline release metadata (GitHub Releases API shape, subset). */
export interface IclineReleaseInfo {
	tag_name: string
	name: string
	html_url: string
	published_at: string
	body?: string
	prerelease: boolean
}

/** Upstream Cline release for optional merge notifications. */
export interface UpstreamClineReleaseInfo {
	tag_name: string
	html_url: string
	published_at: string
}

export interface UpdateCheckResult {
	currentVersion: string
	icline?: IclineReleaseInfo
	upstreamCline?: UpstreamClineReleaseInfo
	iclineUpdateAvailable: boolean
	upstreamAhead: boolean
}

const DEFAULT_ICLINE_RELEASES_URL = "https://api.github.com/repos/i-mrDedchai/iCline/releases/latest"
const UPSTREAM_CLINE_RELEASES_URL = "https://api.github.com/repos/cline/cline/releases/latest"

function iclineReleasesUrl(): string {
	return (
		vscode.workspace.getConfiguration("iCline").get<string>("updates.releasesUrl") ||
		DEFAULT_ICLINE_RELEASES_URL
	)
}

const DISMISSED_ICLINE_VERSION_KEY = "icline.updates.dismissedVersion"
const DISMISSED_UPSTREAM_TAG_KEY = "icline.updates.dismissedUpstreamTag"
const LAST_CHECK_KEY = "icline.updates.lastCheckAt"

function parseSemver(version: string): number[] {
	return version
		.replace(/^v/, "")
		.split(".")
		.map((part) => Number.parseInt(part.replace(/[^0-9].*$/, ""), 10) || 0)
}

export function isNewerVersion(current: string, candidate: string): boolean {
	const a = parseSemver(current)
	const b = parseSemver(candidate)
	const len = Math.max(a.length, b.length)
	for (let i = 0; i < len; i++) {
		const av = a[i] ?? 0
		const bv = b[i] ?? 0
		if (bv > av) {
			return true
		}
		if (bv < av) {
			return false
		}
	}
	return false
}

async function fetchLatestRelease(url: string): Promise<{ tag_name: string; html_url: string; published_at: string; name?: string; body?: string; prerelease?: boolean } | undefined> {
	try {
		const response = await fetch(url, {
			headers: {
				Accept: "application/vnd.github+json",
				"User-Agent": `iCline/${ExtensionRegistryInfo.version}`,
			},
			signal: AbortSignal.timeout(15_000),
		})
		if (!response.ok) {
			Logger.debug(`[iCline updates] Release fetch failed ${url}: HTTP ${response.status}`)
			return undefined
		}
		return (await response.json()) as {
			tag_name: string
			html_url: string
			published_at: string
			name?: string
			body?: string
			prerelease?: boolean
		}
	} catch (error) {
		Logger.debug("[iCline updates] Release fetch error:", error)
		return undefined
	}
}

let updateServiceInstance: UpdateService | undefined

export function initializeUpdateService(context: vscode.ExtensionContext): UpdateService {
	updateServiceInstance = new UpdateService(context)
	return updateServiceInstance
}

export function getUpdateService(): UpdateService | undefined {
	return updateServiceInstance
}

export class UpdateService {
	private cachedResult?: UpdateCheckResult

	constructor(private readonly context: vscode.ExtensionContext) {}

	get currentVersion(): string {
		return ExtensionRegistryInfo.version
	}

	async checkForUpdates(options?: { force?: boolean }): Promise<UpdateCheckResult> {
		const config = vscode.workspace.getConfiguration("iCline")
		const checkUpstream = config.get<boolean>("updates.notifyUpstreamCline", true)
		const minIntervalHours = config.get<number>("updates.checkIntervalHours", 24)

		if (!options?.force) {
			const lastCheck = this.context.globalState.get<number>(LAST_CHECK_KEY, 0)
			if (Date.now() - lastCheck < minIntervalHours * 3_600_000) {
				return {
					currentVersion: this.currentVersion,
					iclineUpdateAvailable: false,
					upstreamAhead: false,
				}
			}
		}

		const [iclineRelease, upstreamRelease] = await Promise.all([
			fetchLatestRelease(iclineReleasesUrl()),
			checkUpstream ? fetchLatestRelease(UPSTREAM_CLINE_RELEASES_URL) : Promise.resolve(undefined),
		])

		await this.context.globalState.update(LAST_CHECK_KEY, Date.now())

		const result: UpdateCheckResult = {
			currentVersion: this.currentVersion,
			iclineUpdateAvailable: false,
			upstreamAhead: false,
		}

		if (iclineRelease) {
			result.icline = {
				tag_name: iclineRelease.tag_name,
				name: iclineRelease.name ?? iclineRelease.tag_name,
				html_url: iclineRelease.html_url,
				published_at: iclineRelease.published_at,
				body: iclineRelease.body,
				prerelease: Boolean(iclineRelease.prerelease),
			}
			result.iclineUpdateAvailable = isNewerVersion(this.currentVersion, iclineRelease.tag_name)
		}

		if (upstreamRelease) {
			result.upstreamCline = {
				tag_name: upstreamRelease.tag_name,
				html_url: upstreamRelease.html_url,
				published_at: upstreamRelease.published_at,
			}
			result.upstreamAhead = isNewerVersion(this.currentVersion, upstreamRelease.tag_name)
		}

		this.cachedResult = result
		return result
	}

	getWebviewStatus(): IclineUpdateBarStatus | undefined {
		const config = vscode.workspace.getConfiguration("iCline")
		const updatesEnabled = config.get<boolean>("updates.enabled", true)
		const notifyUpstreamCline = config.get<boolean>("updates.notifyUpstreamCline", true)
		const dismissedIcline = this.context.globalState.get<string>(DISMISSED_ICLINE_VERSION_KEY)
		const dismissedUpstream = this.context.globalState.get<string>(DISMISSED_UPSTREAM_TAG_KEY)
		const result = this.cachedResult

		const status: IclineUpdateBarStatus = {
			currentVersion: this.currentVersion,
			updatesEnabled,
			notifyUpstreamCline,
		}

		if (result?.icline) {
			const showBar =
				updatesEnabled && result.iclineUpdateAvailable && dismissedIcline !== result.icline.tag_name
			status.icline = {
				tagName: result.icline.tag_name,
				name: result.icline.name,
				htmlUrl: result.icline.html_url,
				updateAvailable: result.iclineUpdateAvailable,
				showBar,
			}
		}

		if (result?.upstreamCline) {
			const showBar =
				updatesEnabled &&
				notifyUpstreamCline &&
				result.upstreamAhead &&
				dismissedUpstream !== result.upstreamCline.tag_name
			status.upstreamCline = {
				tagName: result.upstreamCline.tag_name,
				htmlUrl: result.upstreamCline.html_url,
				ahead: result.upstreamAhead,
				showBar,
			}
		}

		return status
	}

	async dismissUpdate(channel: "icline" | "upstream"): Promise<void> {
		const result = this.cachedResult ?? (await this.checkForUpdates({ force: true }))
		if (channel === "icline" && result.icline) {
			await this.context.globalState.update(DISMISSED_ICLINE_VERSION_KEY, result.icline.tag_name)
		} else if (channel === "upstream" && result.upstreamCline) {
			await this.context.globalState.update(DISMISSED_UPSTREAM_TAG_KEY, result.upstreamCline.tag_name)
		}
	}

	async maybeNotify(): Promise<void> {
		const config = vscode.workspace.getConfiguration("iCline")
		if (!config.get<boolean>("updates.enabled", true)) {
			return
		}

		const result = await this.checkForUpdates()
		const dismissedIcline = this.context.globalState.get<string>(DISMISSED_ICLINE_VERSION_KEY)
		const dismissedUpstream = this.context.globalState.get<string>(DISMISSED_UPSTREAM_TAG_KEY)

		if (result.iclineUpdateAvailable && result.icline && dismissedIcline !== result.icline.tag_name) {
			const action = await vscode.window.showInformationMessage(
				`iCline ${result.icline.tag_name} is available (installed: ${this.currentVersion}). Download the .vsix from Releases and reinstall — VS Code does not auto-update iCline.`,
				"View Release",
				"Dismiss",
			)
			if (action === "View Release") {
				await vscode.env.openExternal(vscode.Uri.parse(result.icline.html_url))
			} else if (action === "Dismiss") {
				await this.context.globalState.update(DISMISSED_ICLINE_VERSION_KEY, result.icline.tag_name)
			}
			return
		}

		if (
			config.get<boolean>("updates.notifyUpstreamCline", true) &&
			result.upstreamAhead &&
			result.upstreamCline &&
			dismissedUpstream !== result.upstreamCline.tag_name
		) {
			const action = await vscode.window.showInformationMessage(
				`Cline official released ${result.upstreamCline.tag_name}. Your iCline fork (${this.currentVersion}) may benefit from an upstream sync.`,
				"View Upstream",
				"Dismiss",
			)
			if (action === "View Upstream") {
				await vscode.env.openExternal(vscode.Uri.parse(result.upstreamCline.html_url))
			} else if (action === "Dismiss") {
				await this.context.globalState.update(DISMISSED_UPSTREAM_TAG_KEY, result.upstreamCline.tag_name)
			}
		}
	}

	async showUpdateStatus(): Promise<void> {
		const result = await this.checkForUpdates({ force: true })
		const lines = [
			`iCline version: ${result.currentVersion}`,
			result.icline
				? `Latest iCline release: ${result.icline.tag_name}${result.iclineUpdateAvailable ? " (update available)" : ""}`
				: "Latest iCline release: unavailable (configure iCline.updates.releasesUrl)",
			result.upstreamCline
				? `Latest Cline official: ${result.upstreamCline.tag_name}${result.upstreamAhead ? " (ahead of iCline)" : ""}`
				: "Latest Cline official: unavailable",
			"",
			"Safe update model:",
			`• iCline updates use extension ID ${ExtensionRegistryInfo.id} — separate from saoudrizwan.claude-dev`,
			"• Official Cline auto-update will NOT overwrite iCline",
			"• Merge upstream with scripts/sync-upstream.ps1, then release a new iCline build",
		]
		await vscode.window.showInformationMessage(lines.join("\n"), { modal: true })
	}
}