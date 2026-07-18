<p align="center">
  <img src="apps/vscode/assets/icons/icon.png" width="80" alt="iCline" />
</p>

<h1 align="center">iCline</h1>

<p align="center">
Standalone Cline fork for VS Code — no official Cline required. Supports Grok, ZenMux, OpenRouter, and other providers.
</p>

<p align="center">
🌐 <strong>English</strong> (this page) · <a href="README.th.md">ภาษาไทย</a>
</p>

<!-- icline:version -->
<p align="center">
  <strong>Version</strong> <code>0.1.18-dev.4</code> ·
  <a href="https://github.com/i-mrDedchai/iCline/releases">Releases</a> ·
  <a href="https://github.com/i-mrDedchai/iCline/blob/main/apps/vscode/CHANGELOG.md">Changelog</a> ·
  Extension ID <code>i-mrdedchai.iCline</code>
</p>
<!-- /icline:version -->

---

## News

- **Open VSX namespace claimed** — publisher `i-mrdedchai` verified ([Eclipse Foundation #11300](https://github.com/EclipseFdn/open-vsx.org/issues/11300) closed as completed)
- **Open VSX traction** — **116+ installs** within ~12 hours of listing (and growing)
- **v0.1.17 Stable** — marketplace icon/screenshot fixes, store comparison table cleanup
- **v0.1.16 Stable** — welcome home, editable quick starts, history export/import, iCline chat branding

## Quick start

**Install from a store (recommended):**

- [VS Marketplace](https://marketplace.visualstudio.com/items?itemName=i-mrdedchai.iCline) — VS Code, Cursor (Marketplace)
- [Open VSX](https://open-vsx.org/extension/i-mrdedchai/iCline) — Cursor, VSCodium, and other Open VSX IDEs

Then open iCline from the Activity Bar → Settings → sign in to **xAI · Grok** or add your API key.

**Or install from VSIX:**

1. Download the latest `.vsix` from [Releases](https://github.com/i-mrDedchai/iCline/releases)
2. `code --install-extension i-mrdedchai.iCline-<version>.vsix --force` (ใช้ชื่อไฟล์ `.vsix` ที่ดาวน์โหลด)
3. **Developer: Reload Window**

Full extension docs: **[apps/vscode/README.md](apps/vscode/README.md)** · Thai: **[apps/vscode/README.th.md](apps/vscode/README.th.md)**

## Build from source

```powershell
cd apps/vscode
npm install
npm run package:vsix
code --install-extension dist/i-mrdedchai.iCline-<version>.vsix --force
```

## iCline vs Cline official

| | Cline official | iCline |
|---|---|---|
| Extension ID | `saoudrizwan.claude-dev` | `i-mrdedchai.iCline` |
| ⚡ Quick Provider & Model picker on chat | ❌ | ✅ |
| 🏠 Welcome Quick Starts (12 templates, editable prompts) | ❌ | ✅ |
| 📦 History export / import (`.zip`) | ❌ | ✅ |
| 🏷️ iCline branding in agent chat | ❌ | ✅ |
| xAI OAuth & subscription models | ❌ | ✅ |
| ZenMux provider | ❌ | ✅ |
| Harness guardrails (verify-before-claim) | ❌ | ✅ |
| Dual-channel safe updates | ❌ | ✅ |

<p align="center">
  <img src="apps/vscode/assets/docs/Preview-Settings-iCline-menu-Providers-Models.jpg" alt="iCline quick model picker on chat" width="640" />
</p>

See **[apps/vscode/README.md](apps/vscode/README.md)** for screenshots and full feature list.

Both extensions can run side by side — updates to one do not remove the other.

## Sync upstream Cline

```powershell
.\scripts\sync-upstream.ps1
```

## Repository layout

This repo is a fork of [cline/cline](https://github.com/cline/cline). The **iCline VS Code extension** lives in `apps/vscode/`. Other directories (`apps/cli`, `sdk`, `docs`, …) come from upstream.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Changes to `main` are made by the maintainer; external contributions via fork + pull request.

## Security

See [SECURITY.md](SECURITY.md). Never commit API keys, `.env`, or `~/.grok/auth.json`.

## License

[Apache-2.0](LICENSE) — derived from [Cline](https://github.com/cline/cline).