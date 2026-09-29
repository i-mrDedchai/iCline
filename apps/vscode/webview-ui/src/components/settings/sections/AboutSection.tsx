import { VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { formatString, splitOnPlaceholder } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import { ICLINE_BUILD_METADATA } from "@/icline/build-metadata"
import Section from "../Section"

interface AboutSectionProps {
	version: string
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

// Identifiers, not copy: extension ids and URLs read the same in every language, and
// they are rendered as constants so they cannot be mistaken for a translatable label.
const ICLINE_EXTENSION_ID = "i-mrdedchai.iCline"
const ICLINE_UPSTREAM_EXTENSION_ID = "saoudrizwan.claude-dev"
const ICLINE_GITHUB = "https://github.com/i-mrDedchai/iCline"
const ICLINE_RELEASES = "https://github.com/i-mrDedchai/iCline/releases"
const ICLINE_CHANGELOG = "https://github.com/i-mrDedchai/iCline/blob/main/apps/vscode/CHANGELOG.md"
const ICLINE_MARKETPLACE = "https://marketplace.visualstudio.com/items?itemName=i-mrdedchai.iCline"
const CLINE_SITE = "https://cline.bot"

/** The highlight bullets as keys, so the list and its copy stay side by side. */
const ICLINE_FEATURE_HIGHLIGHT_KEYS = [
	"aboutHighlightXai",
	"aboutHighlightComposer",
	"aboutHighlightZenmux",
	"aboutHighlightHarness",
	"aboutHighlightUpdates",
] as const

/** Brand name + version + build label; none of it is prose. */
function formatAboutVersionTitle(version: string): string {
	const { releaseVersion, devBuildNumber, devBuildLabel, builtAt } = ICLINE_BUILD_METADATA
	if (devBuildNumber != null && devBuildLabel) {
		return `iCline v${releaseVersion} · ${devBuildLabel} · ${builtAt}`
	}
	return `iCline v${releaseVersion || version}`
}

const AboutSection = ({ version, renderSectionHeader }: AboutSectionProps) => {
	const tr = useTranslation("settings")

	// Two sentences carry inline elements. The placeholders let each language put the
	// code span where its own word order wants it instead of freezing English order.
	const [upstreamBefore, upstreamAfter] = splitOnPlaceholder(tr("aboutBasedOnUpstream"), "version")
	const [standaloneBefore, standaloneRest] = splitOnPlaceholder(tr("aboutStandaloneNotice"), "standalone")
	const [standaloneBetween, standaloneRest2] = splitOnPlaceholder(standaloneRest, "notRequired")
	const [standaloneBeforeExtensionId, standaloneAfter] = splitOnPlaceholder(standaloneRest2, "extensionId")

	return (
		<div>
			{renderSectionHeader("about")}
			<Section>
				<div className="flex px-4 flex-col gap-4">
					{/* iCline (this extension) */}
					<div className="flex flex-col gap-2">
						<h2 className="text-lg font-semibold">{formatAboutVersionTitle(version)}</h2>
						<p className="text-description text-sm">
							{tr("aboutExtensionIdLabel")} <code className="text-foreground">{ICLINE_EXTENSION_ID}</code>
							<br />
							{upstreamBefore}
							<code className="text-foreground">{ICLINE_BUILD_METADATA.upstreamClineSyncedVersion}</code>
							{upstreamAfter}{" "}
							{formatString(tr, "aboutSyncedAt", { date: ICLINE_BUILD_METADATA.upstreamClineSyncedAt })}
						</p>
						<p>
							{standaloneBefore}
							<strong>{tr("aboutStandaloneWord")}</strong>
							{standaloneBetween}
							<strong>{tr("aboutNoOfficialCline")}</strong>
							{standaloneBeforeExtensionId}
							<code className="text-foreground">{ICLINE_UPSTREAM_EXTENSION_ID}</code>
							{standaloneAfter}
						</p>
						<h3 className="text-md font-semibold">{tr("aboutHighlightsTitle")}</h3>
						<ul className="list-disc pl-5 flex flex-col gap-1">
							{ICLINE_FEATURE_HIGHLIGHT_KEYS.map((highlightKey) => (
								<li key={highlightKey}>{tr(highlightKey)}</li>
							))}
						</ul>
						<h3 className="text-md font-semibold">{tr("aboutLinksTitle")}</h3>
						<p>
							<VSCodeLink href={ICLINE_GITHUB}>{tr("aboutGithubLink")}</VSCodeLink>
							{" • "}
							<VSCodeLink href={ICLINE_RELEASES}>{tr("aboutReleasesLink")}</VSCodeLink>
							{" • "}
							<VSCodeLink href={ICLINE_CHANGELOG}>{tr("aboutChangelogLink")}</VSCodeLink>
							{" • "}
							<VSCodeLink href={ICLINE_MARKETPLACE}>{tr("aboutMarketplaceLink")}</VSCodeLink>
						</p>
					</div>

					<hr className="border-0 border-t border-[var(--vscode-panel-border)]" />

					{/* Cline official (upstream) */}
					<div className="flex flex-col gap-2">
						<h2 className="text-lg font-semibold">{tr("aboutUpstreamTitle")}</h2>
						<p className="text-description text-sm">
							{tr("aboutExtensionIdLabel")} <code className="text-foreground">{ICLINE_UPSTREAM_EXTENSION_ID}</code>
							<br />
							{tr("aboutUpstreamLatest")}{" "}
							<code className="text-foreground">{ICLINE_BUILD_METADATA.upstreamClineSyncedVersion}</code>
						</p>
						<p>{tr("aboutUpstreamDescription")}</p>

						<h3 className="text-md font-semibold">{tr("aboutCommunityTitle")}</h3>
						<p>
							<VSCodeLink href="https://x.com/cline">{tr("aboutXLink")}</VSCodeLink>
							{" • "}
							<VSCodeLink href="https://discord.gg/cline">{tr("aboutDiscordLink")}</VSCodeLink>
							{" • "}
							<VSCodeLink href="https://www.reddit.com/r/cline/">{tr("aboutRedditLink")}</VSCodeLink>
						</p>

						<h3 className="text-md font-semibold">{tr("aboutDevelopmentTitle")}</h3>
						<p>
							<VSCodeLink href="https://github.com/cline/cline">{tr("aboutGithubLink")}</VSCodeLink>
							{" • "}
							<VSCodeLink href="https://github.com/cline/cline/issues">{tr("aboutIssuesLink")}</VSCodeLink>
							{" • "}
							<VSCodeLink href="https://github.com/cline/cline/discussions/categories/feature-requests?discussions_q=is%3Aopen+category%3A%22Feature+Requests%22+sort%3Atop">
								{tr("aboutFeatureRequestsLink")}
							</VSCodeLink>
						</p>

						<h3 className="text-md font-semibold">{tr("aboutResourcesTitle")}</h3>
						<p>
							<VSCodeLink href="https://docs.cline.bot/">{tr("aboutDocumentationLink")}</VSCodeLink>
							{" • "}
							<VSCodeLink href={CLINE_SITE}>{CLINE_SITE}</VSCodeLink>
						</p>
					</div>
				</div>
			</Section>
		</div>
	)
}

export default AboutSection
