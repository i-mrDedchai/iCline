# iCline — VS Marketplace Publish

Extension ID: **`i-mrdedchai.iCline`** · Publisher: **`i-mrdedchai`**

GitHub: **[i-mrDedchai/iCline](https://github.com/i-mrDedchai/iCline)** (org) · personal **`i-mrDed`** kept for other projects

## Prerequisites (one-time, maintainer)

1. **Create publisher** at [Marketplace Publisher Management](https://marketplace.visualstudio.com/manage) under **`mr.dedchai@hotmail.com`**
   - Publisher ID must be exactly: `i-mrdedchai` (matches `package.json` → `"publisher"`)
2. **Personal Access Token** (Azure DevOps — free org on hotmail account):
   - https://dev.azure.com → User settings → Personal access tokens
   - Scopes: **Marketplace** → **Manage**
3. **Login vsce** (once per machine):
   ```powershell
   cd apps/vscode
   npx vsce login i-mrdedchai
   ```
   Paste the PAT when prompted.

## Publish command

**Prefer the gated release script** (runs smoke + build + optional publish):

```powershell
# Beta (pre-release on Marketplace)
.\scripts\release-icline.ps1 -Channel Beta -Version 0.1.11-beta.1 -PublishMarketplace

# Stable (only after Beta soak + smoke)
.\scripts\release-icline.ps1 -Channel Stable -Version 0.1.11 -PublishMarketplace
```

Manual publish (after `npm run sync:docs` + `npm run package:vsix`):

```powershell
cd apps/vscode
npm run publish:marketplace              # stable
npm run publish:marketplace:prerelease   # beta
```

`scripts/publish-marketplace.mjs`:
- Swaps `README.marketplace.md` for publishing
- `package-vsix.mjs` → VSIX with README images rewritten to GitHub (`--baseImagesUrl`)
- `ovsx publish` → Open VSX (same VSIX)
- `vsce publish` → VS Marketplace

### README screenshots baseline (required every release)

| Step | Rule |
|------|------|
| Source | `README.marketplace.md` uses relative `assets/docs/*.jpg` |
| Package | **Always** `vsce package` with `--baseImagesUrl` + `--githubBranch main` (`scripts/marketplace-images.mjs`) |
| Never | `--no-rewrite-relative-links` for store publishes — breaks Open VSX listing images |
| Verify | `tar -xOf dist/*.vsix extension/readme.md` must show `github.com/.../raw/main/apps/vscode/assets/docs/` |

Investigation: `บันทึกแชท/2026-06/2026-06-23_01_openvsx-readme-images-root-cause.md`

## How auto-update works after Marketplace publish

| IDE | Mechanism |
|-----|-----------|
| **VS Code** | Built-in extension updater polls Marketplace (~every few hours). User gets "Update" button in Extensions view. |
| **Cursor** | Same extension host as VS Code — updates from Marketplace when publisher matches installed extension. |
| **VSIX-only install** | No auto-install — only iCline's GitHub release checker (`iCline.updates.*`) notifies user. |

### iCline GitHub update checker (always active)

- Code: `apps/vscode/src/icline/updates/UpdateService.ts`
- Default URL: `https://api.github.com/repos/i-mrDedchai/iCline/releases/latest`
- Settings: `iCline.updates.enabled`, `checkIntervalHours` (default 24h)
- On startup + interval: compares installed version vs GitHub latest → toast **View Release**
- Does **not** download or install — user must update via Marketplace (after publish) or reinstall VSIX

## Checklist before first publish

- [ ] Publisher `i-mrdedchai` created and owns extension name `iCline`
- [ ] `README.marketplace.md` is iCline-specific (not Cline default)
- [ ] `package.json` version matches latest release
- [ ] No duplicate legacy `icline.icline` folders on maintainer machine
- [ ] Icon, license, repository URL set in `package.json`
- [ ] GitHub repo lives at `i-mrDedchai/iCline`

## Troubleshooting

| Error | Fix |
|-------|-----|
| `ERROR Publisher 'i-mrdedchai' is not authorized` | Run `vsce login i-mrdedchai` with Marketplace PAT (hotmail account) |
| `Extension name already taken` | Publisher must own the extension or use a different name |
| Duplicate view/settings registration | Uninstall **all** `icline.icline-*` and old `i-mrDed.iCline` / `i-mrded.iCline` versions; keep only `i-mrdedchai.iCline` |