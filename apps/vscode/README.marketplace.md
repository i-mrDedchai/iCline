# iCline — Cline Fork

<!-- icline:version -->
> 📦 **Current version:** `0.1.18-dev.6` · [Releases](https://github.com/i-mrDedchai/iCline/releases) · [Changelog](https://github.com/i-mrDedchai/iCline/blob/main/apps/vscode/CHANGELOG.md) · [Repo](https://github.com/i-mrDedchai/iCline)
<!-- /icline:version -->

<!-- icline:repo -->
🔗 **GitHub:** [i-mrDedchai/iCline](https://github.com/i-mrDedchai/iCline)
<!-- /icline:repo -->

🌐 **Languages:** English (this page) · [ภาษาไทย](README.th.md)

Standalone Cline fork for VS Code — extension ID **`i-mrdedchai.iCline`**. **No official Cline required.** Supports Grok, ZenMux, OpenRouter, and other providers.

🤖 xAI Grok OAuth & Subscription, ZenMux, safe dual-channel updates, and hardened agent harness.

---

## 🆕 New in 0.1.18

- 🌐 **The whole UI reads in your language** — Settings (all tabs), welcome home, history, MCP servers, Team panel, Marketplace, Account, onboarding and notifications in **English, Thai, Japanese and Simplified Chinese**. Interface language never changes how the agent talks.
- 🎨 **Settings → Appearance tab** — accent colors for the Task Completed panel and the final-reply card that follow your editor theme, instead of fixed hex colors.
- 🛡️ **Runs survive mid-stream cuts** — an upstream stream that dies before its terminal chunk is now retried instead of ending the run.
- 🧬 **Selective upstream ports, honestly logged** — security fix included (js-yaml CVE-2026-84375); every port/skip is recorded in the changelog, and About shows the exact upstream sync-point.

<!-- 0.1.18 screenshots (additive — old images in assets/docs/ stay untouched):
  uncomment each line when the file lands.
  <img src="assets/docs/0.1.18-Appearance-Settings.jpg" alt="iCline Settings — Appearance tab" width="720" />
  <img src="assets/docs/0.1.18-Task-Completed.jpg" alt="iCline Task Completed panel with theme accent" width="720" />
  <img src="assets/docs/0.1.18-Settings-Thai.jpg" alt="iCline Settings in Thai" width="720" />
  Spec: docs/icline/readme-0.1.18-screenshots.md -->

---

## ❓ FAQ

### Do I need official Cline installed first?

**No.** iCline is a complete extension on its own. Install from Marketplace or a `.vsix` from [Releases](https://github.com/i-mrDedchai/iCline/releases), open **iCline** in the Activity Bar, then sign in to **xAI · Grok** (or add an API key).

### Can I use iCline and official Cline together?

**Yes, optionally.** They are separate extensions (`i-mrdedchai.iCline` vs `saoudrizwan.claude-dev`) and can run side by side without conflicts. Many users run **only iCline**.

---

## ✨ Why iCline?

| | Cline official | iCline |
|---|---|---|
| Extension ID | `saoudrizwan.claude-dev` | `i-mrdedchai.iCline` |
| ⚡ Quick Provider & Model picker on chat | ❌ | ✅ |
| 🏠 Welcome Quick Starts (12 templates, editable prompts) | ❌ | ✅ |
| 📦 History export / import (`.zip`) | ❌ | ✅ |
| 🏷️ iCline branding in agent chat | ❌ | ✅ |
| 🔐 xAI OAuth (SuperGrok / X Premium) | ❌ | ✅ |
| ⚡ Composer 2.5 Fast, Grok Build | ❌ | ✅ |
| 🌐 ZenMux (100+ models) | ❌ | ✅ |
| 🛡️ Harness guardrails (verify-before-claim) | ❌ | ✅ |
| 🔄 Dual-channel updates (iCline + upstream) | ❌ | ✅ |
| 🌐 Full UI in your language (EN / TH / JA / ZH-CN) | ❌ | ✅ |
| 🎨 Appearance tab (theme-accented surfaces) | ❌ | ✅ |

### ⚡ Quick Provider & Model picker (chat)

Switch providers and models **without leaving the chat** — search all providers, collapse/expand model lists, set **Thinking / Effort per model** on hover, and refresh dynamic catalogs.

![iCline quick model picker on the chat input](assets/docs/Preview-Settings-iCline-menu-Providers-Models.jpg)

The full provider catalog and deep model settings remain in **Settings → API Configuration**:

![iCline Settings — Providers and Models](assets/docs/Preview-Settings-iCline-Providers-Models.jpg)

---

## 🚀 Getting started

1. Click the **iCline** icon in the Activity Bar (or `Ctrl+Shift+P` → `iCline: Open In New Tab`)
2. Open **Settings** ⚙️ → choose **xAI · Grok (OAuth & Subscription)** or another provider
3. Sign in or add an API key, pick a model such as **Composer 2.5 Fast** or **Grok Build**
4. Describe your task — iCline plans, reads code, edits files, and runs commands (after your approval)

> 💡 **Tip:** If the sidebar shows *Error loading webview* right after install, run **Developer: Reload Window** once and open iCline again (known VS Code on Windows timing issue).

---

## Features

- 🏠 **Welcome home** — 12 quick-start templates with editable prompts; *Autonomous coding agent · in your IDE*
- 📦 **History transfer** — export/import task history as `.zip` archives
- 🏷️ **iCline branding** — agent labels and notifications say iCline during tasks
- 🔐 **xAI · Grok** — OAuth (SuperGrok / X Premium), API key, Grok CLI auth bridge
- ⚡ **Composer 2.5 Fast**, **Grok Build**, subscription model catalog
- 🌐 **ZenMux** — 100+ models, multi-protocol
- 🛡️ Agent harness guardrails (verify-before-claim, post-write verification)
- 🔄 Dual-channel update notifications (iCline + Cline upstream)
- 🌐 **Full UI localization** — every Settings tab, welcome, history, MCP, Team, Account, onboarding in EN / TH / JA / ZH-CN
- 🎨 **Appearance tab** — theme-following accents for the Completed panel and final-reply card

## Install & updates

- **VS Marketplace:** [i-mrdedchai.iCline](https://marketplace.visualstudio.com/items?itemName=i-mrdedchai.iCline)
- **Open VSX:** [i-mrdedchai/iCline](https://open-vsx.org/extension/i-mrdedchai/iCline) — Cursor, VSCodium, and other Open VSX IDEs
- **GitHub Releases:** [github.com/i-mrDedchai/iCline/releases](https://github.com/i-mrDedchai/iCline/releases)

## Links

- 📦 [GitHub](https://github.com/i-mrDedchai/iCline)
- 📋 [Changelog](https://github.com/i-mrDedchai/iCline/blob/main/apps/vscode/CHANGELOG.md)
- 🔧 [Build from source](https://github.com/i-mrDedchai/iCline#build-from-source)

## License

Apache-2.0 — derived from [Cline](https://github.com/cline/cline).