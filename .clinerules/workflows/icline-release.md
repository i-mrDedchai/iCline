# iCline Release Workflow (Dev / Beta / Stable)

Standard release process for **iCline** (`i-mrdedchai.iCline`).  
New agent sessions: read this file + `icline-marketplace.md` first.

## Release channels

| Channel | Command | GitHub Release | Marketplace | Smoke gate |
|---------|---------|----------------|-------------|------------|
| **Dev** | `-Channel Dev` | No | No | No |
| **Beta** | `-Channel Beta` | Pre-release + VSIX | Optional `-PublishMarketplace` | Required |
| **Stable** | `-Channel Stable` | Release + VSIX | `-PublishMarketplace` (explicit) | Required (stricter) |

**Current Stable:** `0.1.17` — see `releases/STABLE.md`

## Golden rule — ห้าม publish store โดยตรง

**อย่า** รัน `npm run publish:marketplace` หรือ `node scripts/publish-marketplace.mjs` เองสำหรับ Stable

สคริปต์นี้จะ **บล็อก** ถ้ายังไม่มี GitHub Release + VSIX สำหรับเวอร์ชันนั้น (ยกเว้น `--allow-without-github-release`)

ใช้ **`release-icline.ps1` เท่านั้น** สำหรับ Beta/Stable ที่จะขึ้น store

## Golden path — Stable (แนะนำ)

```powershell
# 1) Dev build + ทดสอบในเครื่อง
.\scripts\release-icline.ps1 -Channel Dev

# 2) Stable — GitHub Release ก่อน แล้วค่อย Marketplace (คำสั่งเดียว)
.\scripts\release-icline.ps1 -Channel Stable -Version 0.1.18 `
  -PublishMarketplace `
  -SkipSmokeCheck `
  -MaintainerApproval "Release 0.1.18 Stable — smoke passed manually"
```

ลำดับที่สคริปต์ทำให้อัตโนมัติ:

1. Finalize CHANGELOG
2. Build VSIX
3. Git commit + push (ถ้าไม่ใส่ `-SkipPush`)
4. **GitHub Release** + แนบ `.vsix` + tag `vX.Y.Z`
5. **Marketplace + Open VSX** (เมื่อมี `-PublishMarketplace`)
6. **`release-parity.mjs verify`** — ยืนยันทุกช่องทางตรงกัน

## คำสั่งอื่นที่ใช้บ่อย

```powershell
# Dev — VSIX only (default)
.\scripts\release-icline.ps1 -Channel Dev

# Beta
.\scripts\release-icline.ps1 -Channel Beta -Version 0.1.18-beta.1 -PublishMarketplace

# GitHub Release อย่างเดียว (ย้อนหลัง / store publish ไปแล้ว)
.\scripts\release-icline.ps1 -Channel Stable -Version 0.1.17 -GitHubOnly `
  -SkipBuild -SkipPush -SkipSmokeCheck `
  -MaintainerApproval "retroactive GitHub release — stores already at 0.1.17"

# ตรวจ parity หลัง release
node scripts/release-parity.mjs verify --version 0.1.17
```

Flags: `-Version`, `-SkipBuild`, `-SkipPush`, `-SkipRelease`, `-GitHubOnly`, `-MaintainerApproval`, `-SkipSmokeCheck`

**ห้าม:** `-PublishMarketplace` + `-SkipRelease` (สคริปต์จะ error)

## Smoke test gate

```powershell
.\scripts\icline-smoke-checklist.ps1 -Channel Beta   # or Stable
```

Beta/Stable releases run this automatically unless `-SkipSmokeCheck`.

## Manual checklist (every release)

### 1. Code + version

- [ ] Fix/feature complete
- [ ] Add bullets under `## [x.y.z] - Unreleased` in `apps/vscode/CHANGELOG.md` during dev (never `## [x.y.z-dev.N]` sections)
- [ ] On Stable: `release-icline.ps1` finalizes Unreleased → dated release, blocks leftover dev sections, seeds next Unreleased
- [ ] **If touching a provider adapter** — `*.test.ts` must exist with at minimum a happy-path stream test and a non-Error throw regression test
- [ ] **Doc audit before Stable** — verify `ICLINE.md`, `ICLINE-WORKFLOW.md`, `releases/STABLE.md` match `package.json` version and current state

### 2. Sync docs

```powershell
cd apps/vscode
npm run sync:docs
```

### 2b. README screenshots (Marketplace + Open VSX)

Before any `-PublishMarketplace` run, confirm packaged README uses **GitHub absolute** image URLs. `package-vsix.mjs` applies `--baseImagesUrl` automatically — see `icline-marketplace.md` § README screenshots baseline.

### 3. Dev build + local install

```powershell
cd ../..
.\scripts\release-icline.ps1 -Channel Dev
code --install-extension apps\vscode\dist\i-mrdedchai.iCline-<version>.vsix --force
```

Reload Window → run smoke checklist mentally or via script.

### 4. Beta / Stable

Script handles: commit, push, **GitHub Release (บังคับก่อน store)**, optional Marketplace, parity verify.

### 5. Verify before "done"

- [ ] `node scripts/release-parity.mjs verify --version X.Y.Z` — ทุกช่องทาง OK
- [ ] https://github.com/i-mrDedchai/iCline/releases — tag + VSIX
- [ ] Marketplace + Open VSX version (if published)
- [ ] อัปเดต `releases/STABLE.md`
- [ ] Test from **Marketplace install**, not only local VSIX

## How updates reach users

| Channel | Auto-install? |
|---------|---------------|
| VS Code Marketplace (`i-mrdedchai`) | Yes |
| GitHub Releases `.vsix` | No — manual reinstall |
| iCline update toast | Notify only |

## Extension identity

- **ID:** `i-mrdedchai.iCline`
- **Publisher:** `i-mrdedchai`
- **GitHub:** `i-mrDedchai/iCline`
- **Settings:** `iCline.*`

## CI guidance

- **Green gate:** `ext-vscode-test-e2e` (Playwright)
- **Known debt:** `ext-vscode-test` — triage incrementally; do not block Beta on it

## Agent session bootstrap

1. Read this file + `icline-marketplace.md`
2. Read `บันทึกแชท/RECENT.md` or last 7 days of decision logs (`.grok/iCline/บันทึกแชท/YYYY-MM/`) to avoid re-deciding past agreements
3. Check `package.json` version vs `releases/STABLE.md` vs `release-parity.mjs verify`
4. Dev build first; Beta/Stable only after smoke passes
5. **Never** `publish-marketplace.mjs` alone for Stable — always `release-icline.ps1`
