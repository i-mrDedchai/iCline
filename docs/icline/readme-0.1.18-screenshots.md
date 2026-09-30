# v0.1.18 README screenshots — spec & checklist

Status 2026-09-30: all 5 images landed from the maintainer and are slotted
into Details + full READMEs (EN/TH). Maintainer re-reviews everything before
the real release. No push/merge until approved.

Format note (approved): **PNG is allowed** alongside JPG — use PNG where
transparency matters (e.g. the QuickPicker+Effort shot). Keep each file small
(this batch totals ~672K); `assets/docs/**` ships inside the VSIX
(`.vscodeignore` re-includes it) while the store listing hotlinks GitHub
`raw/main` via `--baseImagesUrl`, so weight counts twice. Exact filenames are
kept as delivered (including `+` — legal in path segments, served literally
by GitHub raw and passed through by the vsce rewrite).

## The memorial rule (never ask again)

- `apps/vscode/assets/docs/` images from v0.1.17 are **never replaced,
  renamed, or deleted** (hashes recorded in `memorial-0.1.17/README.md`).
- Every new image is **additive** with a version-prefixed name.
- Text slots for not-yet-existing images live as **HTML comments** in the
  READMEs (they render nothing), and are uncommented when the file lands —
  never commit a visible `<img>` whose file does not exist yet.

## The 5 additive screenshots (landed 2026-09-30, exact names)

In `apps/vscode/assets/docs/` (old `Preview-Settings-*` files stay on disk
with June 21 hashes unchanged — but as of 2026-09-30 no live README
references them anymore; they survive only in `memorial-0.1.17/`):

| # | File | Shows | Used in |
|---|---|---|---|
| 1 | `0.1.18-Settings+Webview-EN+CH+JP+TH.png` | Settings + webview in 4 languages | i18n sections (Details + full EN/TH) |
| 2 | `0.1.18-Appearance-Settings.jpg` | Settings → **Appearance** tab | Appearance sections (Details + full EN/TH) |
| 3 | `0.1.18-NewDesign-QuickPicker+Effort.png` | Quick picker new design + per-model Effort | Picker sections (Details + full EN/TH) |
| 4 | `0.1.18-Providers+models-Stats+Customer-Providers.jpg` | Provider/model stats + Custom providers | Provider sections (Details + full EN/TH) |
| 5 | `0.1.18-Sub-agents+Agent-Teams.jpg` | Sub-agents & Agent Teams | Team sections (Details + full EN/TH) |

The Thai READMEs reuse the same files (existing TH docs already share the
EN-named images) — no separate TH captures. No API keys / tokens / personal
paths visible in any shot.

## Slot-in checklist (done 2026-09-30)

- [x] Files at the exact names above (JPG + PNG, no spaces).
- [x] Image blocks live in `apps/vscode/README.marketplace.md` (5 images).
- [x] Image blocks live in `apps/vscode/README.md` (5 images; 2 memorial refs removed 2026-09-30 — superseded).
- [x] Image blocks live in `apps/vscode/README.th.md` (same files, TH captions; memorial refs removed).
- [x] Root `README.md` / `README.th.md`: picker shot swapped to the 0.1.18 new-design PNG (same subject, updated).
- [ ] `npm run sync:docs` NOT needed for this (version unchanged); but before
      the Stable bump, confirm the `icline:version` markers still render.
- [ ] Verify at pack time: `tar -xOf dist/*.vsix extension/readme.md` shows
      `github.com/.../raw/main/apps/vscode/assets/docs/` URLs (baseline in
      `icline-marketplace.md` § README screenshots baseline).
- [ ] Images must be on `main` before publish (`raw/main` serves from main).
- [ ] Maintainer re-reviews all text + images before release (explicit gate).

## Release-flow wiring (so nobody has to remember)

- `icline-release.md` §2b points here for the image checklist.
- `icline-marketplace.md` § README screenshots baseline carries the memorial
  rule (additive images, never replace).
- This file is the single source of truth for *which* images a release needs.
