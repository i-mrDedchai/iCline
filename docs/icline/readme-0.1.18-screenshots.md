# v0.1.18 README screenshots — spec & checklist

Status 2026-09-30: text is in place, images pending from maintainer.
The maintainer captures the images; the agent slots them in; the maintainer
re-reviews everything before the real release. No push/merge until approved.

## The memorial rule (never ask again)

- `apps/vscode/assets/docs/` images from v0.1.17 are **never replaced,
  renamed, or deleted** (hashes recorded in `memorial-0.1.17/README.md`).
- Every new image is **additive** with a version-prefixed name.
- Text slots for not-yet-existing images live as **HTML comments** in the
  READMEs (they render nothing), and are uncommented when the file lands —
  never commit a visible `<img>` whose file does not exist yet.

## The 3 additive EN screenshots (maintainer to capture)

All from the fix.52 build (`0.1.18-dev.6-fix.52`), default light theme unless
noted, ~720px wide JPG, no API keys / tokens / personal paths visible.
Drop the files in `apps/vscode/assets/docs/` with exactly these names:

| # | File (exact name) | What to capture | Why |
|---|---|---|---|
| 1 | `0.1.18-Appearance-Settings.jpg` | Settings → **Appearance** tab, all three accent rows visible | New tab, headline feature |
| 2 | `0.1.18-Task-Completed.jpg` | **Task Completed** panel after a real run (theme accent visible, not the old fixed color) | Proves the `--color-completed` token |
| 3 | `0.1.18-Settings-Thai.jpg` | Any Settings tab with **ภาษาไทย** active | Proves the i18n rounds (biggest dev.6 work) |

The Thai READMEs reuse the same three files (existing TH docs already share
the EN-named images) — no separate TH captures needed.

## Slot-in checklist (agent, when images arrive)

- [ ] Files land at the exact names above (JPG, no spaces).
- [ ] Uncomment the three image blocks in `apps/vscode/README.marketplace.md`.
- [ ] Uncomment the three image blocks in `apps/vscode/README.md`.
- [ ] Uncomment the three image blocks in `apps/vscode/README.th.md` (same files).
- [ ] Root `README.md` / `README.th.md`: no image changes needed (they point at
      the two `Preview-Settings-*` memorial images, which stay).
- [ ] `npm run sync:docs` NOT needed for this (version unchanged); but before
      the Stable bump, confirm the `icline:version` markers still render.
- [ ] Verify: `tar -xOf dist/*.vsix extension/readme.md` shows
      `github.com/.../raw/main/apps/vscode/assets/docs/` URLs (baseline in
      `icline-marketplace.md` § README screenshots baseline).
- [ ] Images must be on `main` before publish (`raw/main` serves from main).
- [ ] Maintainer re-reviews all text + images before release (explicit gate).

## Release-flow wiring (so nobody has to remember)

- `icline-release.md` §2b points here for the image checklist.
- `icline-marketplace.md` § README screenshots baseline carries the memorial
  rule (additive images, never replace).
- This file is the single source of truth for *which* images a release needs.
