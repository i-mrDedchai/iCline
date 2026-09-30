# Memorial — store Details & repo READMEs as of v0.1.17

**Frozen. Do not edit.** These five files are byte-identical snapshots of the
live listing/repo text taken 2026-09-30 from `feat/upstream-waves-1-2`
(`975bdc42b`) *before* the v0.1.18 Details/README text update, kept as the
v0.1.17 memorial per maintainer approval.

| Memorial file | Live source it was copied from |
|---|---|
| `README.marketplace-0.1.17.md` | `apps/vscode/README.marketplace.md` (Marketplace / Open VSX Details) |
| `README-0.1.17.md` | `apps/vscode/README.md` (full extension docs, EN) |
| `README.th-0.1.17.md` | `apps/vscode/README.th.md` (full extension docs, TH) |
| `ROOT-README-0.1.17.md` | `README.md` (repo landing, EN) |
| `ROOT-README.th-0.1.17.md` | `README.th.md` (repo landing, TH) |

Honest note: the `icline:version` markers inside these copies read
`0.1.18-dev.6` (the auto-synced working version at snapshot time), but the
bodies are the v0.1.17-era store/repo text — that is exactly why they are
preserved: the v0.1.18 update rewrites the live files, these never change.

Image memorial: the v0.1.17 image set stays untouched in
`apps/vscode/assets/docs/` and is never replaced or deleted —
`Preview-Settings-iCline-menu-Providers-Models.jpg` (`sha1 8f27e523…`),
`Preview-Settings-iCline-Providers-Models.jpg` (`sha1 55893eb9…`).
Every v0.1.18 screenshot is **added** under a `0.1.18-*` name (see
`../readme-0.1.18-screenshots.md`); old images keep their names, their hashes,
and their references.

Rules going forward:

1. Never edit, rename, or delete anything in this folder.
2. Never replace or delete an image under `apps/vscode/assets/docs/` —
   new release images are always additive with a version-prefixed name.
3. `docs/**` is excluded from the VSIX (`.vscodeignore`), so this memorial
   never ships to users or bloats the package.
