#!/usr/bin/env node

/**
 * README screenshot baseline for VS Marketplace + Open VSX.
 *
 * Source READMEs (README.marketplace.md) use relative paths:
 *   assets/docs/Preview-Settings-iCline-*.jpg
 *
 * At `vsce package` / `vsce publish`, pass --baseImagesUrl so vsce rewrites them to:
 *   https://github.com/i-mrDedchai/iCline/raw/main/apps/vscode/assets/docs/...
 *
 * Both stores must receive the rewritten README inside the VSIX:
 * - VS Marketplace has always relied on this rewrite.
 * - Open VSX does NOT serve arbitrary assets/docs/* from the VSIX file API; relative
 *   paths break in the web UI (browser resolves to SPA HTML, not JPEG).
 *
 * Investigation: ../../บันทึกแชท/2026-06/2026-06-23_01_openvsx-readme-images-root-cause.md
 * Related: eclipse-openvsx/openvsx#1182 (host images on Open VSX — not implemented yet)
 */

/** @param {{ github: { url: string } }} manifest */
export function getBaseImagesUrl(manifest) {
	return `${manifest.github.url}/raw/main/apps/vscode`
}

/** CLI flags shared by package-vsix.mjs and publish-marketplace.mjs */
export function getVsceImageRewriteArgs(manifest) {
	return ["--baseImagesUrl", getBaseImagesUrl(manifest), "--githubBranch", "main"]
}