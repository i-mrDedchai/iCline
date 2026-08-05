# Changelog

## [0.1.18] - Unreleased

Upstream sync + smoke-test restoration on the v4.0.0 SDK architecture (dev builds use VSIX labels only; notes accumulate here until Stable).

### Added
- 🔄 **Upstream sync (v4.0.0 SDK migration)** — merged 124-file conflict resolution + 16 post-sync commits from `upstream/main` (@ `402b9994d`). iCline now runs on the new SDK architecture (`@cline/shared`, `@cline/llms`, `@cline/agents`, `@cline/core`). Sakana/Jan/zenmux providers registered as SDK `BuiltinSpecs` with the `openai-compatible` family.
- 🛡️ **Guardrails re-injection** — `getIclineHarnessOverlay` re-injected via the SDK `buildClineSystemPrompt()` `rules` slot; `verifyWrittenFile` re-injected via the SDK `afterTool` hook (verifies `editor` + `apply_patch` targets; failure replaces the tool result so the model cannot claim a write that did not land). Covered by 10 tests.
- 📡 **zenmux dynamic model list** — `modelsSourceUrl` added to the zenmux builtin spec so the SDK's generic `resolveProviderModels` RPC fetches the live model list (supersedes the orphaned `refreshZenmuxModels.ts` handler).
- 🆕 **Upstream features ported to main** — Claude Sonnet 5, GPT-5.6 ChatGPT, ClinePass full enable, DeepSeek reasoning `xhigh`, Vertex models, Kimi K3 ClinePass fallback, task lifecycle telemetry, Claude Code/Codex optional peer deps, SDK OAuth retry + teammate run fixes.
- 📋 **Upstream sync plan** — `docs/icline/upstream-sync-plan.md` documents the v3.89.2 → upstream/main merge strategy with 7 phases.
- 🐟 **Sakana.ai provider** — Fugu / Fugu Ultra via OpenAI-compatible API (`https://api.sakana.ai/v1`); Pay-as-you-go and Subscription plan modes; Responses API (default) and Chat Completions; models `fugu`, `fugu-ultra`, `fugu-ultra-20260615`
- 🔔 **Welcome update bar (Phase 2)** — dismissible in-webview notices on the welcome home for new iCline releases and optional upstream Cline ahead signals (reuses `iCline.updates.*` settings and dismiss state)
- 📚 **Provider docs** — `docs/provider-config/sakana.mdx` and `docs/provider-config/jan.mdx` added to the docs site navigation

### Fixed
- 📦 **History export/import (root-cause)** — the prior fix used `import * as archiverNS` then called `archiverNS(...)`, which throws "archiverNS is not a function" at runtime under esbuild/bun (namespace objects are non-callable). Reached the callable via `archiverNS.default` instead. Added a real-archiver round-trip test (3 tests).
- 🔌 **Proto RPCs restored** — 5 iCline RPCs lost in the upstream merge are restored (handlers already existed): `refreshIclineUpdates`, `dismissIclineUpdate` (UpdateService); `refreshZenmuxModelsRpc`, `refreshXaiSubscriptionModelsRpc`, `getJanModels` (model fetching).
- 📦 **api.ts exports restored** — `sakanaModels`, `sakanaDefaultModelId`, `SakanaModelId`, `zenmuxDefaultModelId`, `zenmuxDefaultModelInfo` (lost in the upstream merge).
- 🖼️ **ClineCompactIcon restored** — iCline compact logo asset (deleted by upstream) used by `IclineWelcomeBrand`.
- 🧭 **ChatTextArea migration** — prior inline `ChatModelPicker` dropdown → upstream settings-navigation pattern (`navigateToSettingsModelPicker`). The upstream `ClineModelPicker` in settings uses the new SDK hooks and supports all providers including Sakana/Jan/zenmux.
- 🏷️ **Welcome home props restored** — `quickStartMode` + `shouldShowQuickWins` props added to `WelcomeSection`/`HomeHeader`/`ChatView` (lost in the upstream merge).
- 🧹 **Lint hygiene** — `biome.jsonc` ignores archived legacy code under `docs/icline/legacy-*/`; `model-utils.test.ts` converted from UTF-16 LE to UTF-8.
- 🏷️ **agent-display-name restored** — 26 `AGENT_DISPLAY_NAME` references in `ChatRow.tsx` user-facing strings (lost in the upstream merge).
- 📦 **HistoryView export/import restored** — Export/Import buttons in `HistoryView` + iCline welcome header (`IclineWelcomeBrand` + `ProviderModelChip`).
- 📄 **sync:docs script** — `patchProviders` made conditional (providers.json removed upstream in `83339c3c5`); `build-metadata.ts` regenerated with v4.0.0 SDK synced version.
- 🔧 **Jan settings not saving (C5) + model list not loading (C3)** — root cause: `convertApiConfigurationToProto` / `convertProtoToApiConfiguration` were missing mappings for all iCline-specific provider fields (`janBaseUrl`, `janApiKey`, `sakanaApiKey`, `zenmuxApiKey`, `zenmuxApiProtocol`, `sakanaBillingMode`, `sakanaApiProtocol`, `plan/actModeJanModelId`, `plan/actModeSakanaModelId`, `plan/actModeZenmuxModelId`). When the webview called `handleFieldChange("janBaseUrl", …)`, the value was silently dropped before reaching `StateManager`, so the settings never persisted and Jan model fetch always fell back to the default port. Added the missing mappings in both directions. Affects Jan, Sakana, and ZenMux providers.
- 🔐 **xAI → Grok branding + OAuth UI** — three pieces restored: (1) `HOST_PROVIDER_LABELS` host-side override in `catalog.ts` displays "Grok" instead of "xAI" in the provider dropdown (no SDK patch, upstream-sync-safe); (2) `XaiProvider.tsx` restored the OAuth Sign In/Out buttons, `AuthConnectionBadge`, and CLI-auth-only branch on top of the new SDK hooks (`useProviderConfig` + `useProviderModelSelection`); (3) `getStateToPostToWebview` re-populates `xaiOAuthIsAuthenticated` / `xaiGrokCliIsAuthenticated` so the Sign In button can flip to Connected.
- ⚡ **Quick Provider & Model picker** — new `QuickModelPicker` component built on the v4.0.0 SDK hooks (`useProviderListings` + `useProviderModels` + `commitModelSelection` RPC) replaces the upstream "click to open settings" fallback in `ChatTextArea`. Supports all providers including Sakana/Jan/zenmux/Grok. Preserves the prior inline popover UX (provider list, expandable models, search, refresh, "Edit in Settings…" footer).
- 📸 **Open VSX README screenshots** — package VSIX with `vsce --baseImagesUrl` so README images use GitHub absolute URLs on Open VSX and VS Marketplace (corrects v0.1.17 assumption that relative `assets/docs/` paths work on Open VSX)
- 🏷️ **Residual Cline branding** — VS Code LM justification, standalone terminal names, AI Review comment controller, worktree tooltip, and onboarding welcome heading use **iCline** / `getProductName()` (official Cline upstream references unchanged)
- 🔧 **Jan provider hardening** — default model ID fallback, retry policy, error classification, and sanitized error logging (no credentials in user-facing messages)
- 🐟 **Sakana provider error safety** — sanitized error logging removes API keys from error output
- 🐟 **Sakana provider validation** — require an API key in onboarding/settings, include Sakana in configured-provider discovery, and handle Responses API function-call done events without emitting nameless tool calls
- 🔧 **Jan provider RPC type** — wrap `getJanModels` args in `OpenAiModelsRequest.create({ baseUrl, apiKey })` so the `metadata` proto field is auto-filled (fixes TS2345 and the webview build)

### Changed
- 🗄️ **Legacy code archived** — prior `ChatModelPicker.tsx`, `chatModelPickerUtils.ts`, `ModelThinkingStatusIcons.tsx` moved to `docs/icline/legacy-chat-model-picker/` (depended on removed APIs). ModelThinkingStatusIcons UX is temporarily dropped — to be re-implemented on the new SDK hooks later.
- 🧰 **SDK workspace** — `bun install` now manages the whole monorepo; `build:sdk` rebuilds the 6 SDK packages before running bun unit tests.
- 📦 **Publish baseline** — shared README image rewrite in `scripts/marketplace-images.mjs`; documented in `icline-marketplace.md` (never use `--no-rewrite-relative-links` for store publishes)

### Known Limitations
- ModelThinkingStatusIcons (reasoning effort indicators in chat textarea) temporarily removed — to be re-implemented on the new SDK hooks.
- QuickModelPicker is read-only for model selection (no reasoning-effort / thinking-budget controls in the popover yet — open Settings for those).
- Mistake-limit telemetry (upstream v4.0.10) not ported — it is a legacy/stable-only feature not present in `upstream/main`; `consecutiveMistakeCount` handling already exists in `sdk-interaction-coordinator.ts`.
- Jan C3+C5 fix verified by typecheck + code reading; runtime test with a real Jan server pending user smoke test.

## [0.1.17] - 2026-06-22

### Fixed
- 🖼️ **Marketplace icon** — restore high-contrast `icon.png` (white robot on dark tile) so the extension logo is visible on store listing pages
- 📸 **Marketplace screenshots** — fix preview images on VS Marketplace (GitHub `baseImagesUrl` rewrite) and Open VSX (relative `assets/docs/` paths in VSIX); use Markdown image syntax
- 📋 **Comparison table** — remove store/distribution rows from README tables (not a meaningful Cline vs iCline differentiator)

## [0.1.16] - 2026-06-22

**Stable release** — GitHub Release + VS Marketplace + Open VSX (`i-mrdedchai.iCline`).

### Added
- 🏪 **VS Marketplace & Open VSX** — v0.1.16 published on both stores under verified publisher `i-mrdedchai` ([Open VSX #11300](https://github.com/EclipseFdn/open-vsx.org/issues/11300) namespace claim completed)
- 🏠 **Welcome home — Phase 1** — iCline branding, provider/model chip, subtitle `Autonomous coding agent · in your IDE`, and twelve quick-start prompts (explain, refactor, tests, debug, review, architecture, security, CI, docs, plan, performance, dependencies); **quickStartMode** keeps task history visible alongside quick starts (unlike Cline hosted quick wins)
- ✏️ **Quick Start prompt editor** — click ⋯ or ✎ on a quick-start card to edit, save, reset, or start with a custom prompt (localStorage)
- 📦 **History export** — export selected tasks or all history to a `.zip` archive (manifest + task folders) from the History footer
- 📥 **History import** — import tasks from an iCline `.zip` archive; duplicate task IDs are reassigned automatically

### Changed
- 🏪 **Marketplace copy** — displayName `iCline — Standalone Coding Agent` (EN) / `iCline — เอเจนต์เขียนโค้ด (standalone)` (TH); description leads with “Cline fork” + provider line (Grok, ZenMux, OpenRouter, …); remove Grok-only signal from title
- 🏷️ **Agent branding in chat** — runtime tool labels, grouped summaries (`iCline read N files…`), approval prompts, system notifications, and editor code actions say **iCline** instead of Cline during task execution
- 🏠 **Quick Starts layout** — two-column grid (single column below 300px); welcome scroll includes quick starts so cards are not hidden behind Auto-approve / chat input; hover detail layer disabled for now (title + description stay on the tile)
- 🎨 **iCline icon branding** — `i` mark on Activity Bar SVG (`icon.svg`) and Welcome compact icon; refresh 128×128 marketplace PNG; retrace sleepy logo (`sleepy-cline.svg`, `ClineLogoTired`); update panel robot PNGs (dark/light)
- 🏠 **Review quick start** — read-only review wording; PowerShell-safe directory guidance (`Set-Location` instead of `cd /d`)

### Fixed
- 🐛 **Auto-approved commands stuck on Running** — stream command output without blocking on `command_output` asks; apply managed timeouts; mark command UI completed when orchestration returns (including timeout / proceed-while-running paths)
- 🏠 **iCline Quick Starts** — keep the 12-card grid on welcome home even when task history has 3+ items (Cline hosted quick wins still hide at threshold)
- 🐛 **Open VSX screenshots** — keep relative `assets/docs/` paths in packaged README (`vsce --no-rewrite-relative-links`; Open VSX blocks external GitHub URLs); `package-vsix.mjs` swaps marketplace README before `vsce package`
- 📦 **Package hygiene** — exclude nested VSIX artifacts from the extension bundle (`.vscodeignore`)
- 🛡️ **Harness epistemic discipline** — do not echo user factual claims (e.g. wrong weekday in greetings); check `# Current Time` in environment_details before affirming date/time; politely correct conflicts instead of mirroring
- 🛡️ **ACT MODE conversational replies** — harness overlay requires `attempt_completion` or `ask_followup_question` for chat-only turns (avoids plain-text replies that trigger “did not use a tool” loops)

## [0.1.15] - 2026-06-22

### Changed
- 📄 **Install messaging** — clarify that iCline is **standalone** (no official Cline required) across Marketplace description, GitHub README, `README.marketplace.md`, and Settings → About
- ❓ **FAQ** — add “Do I need official Cline?” / “Can I use both?” sections (EN + TH) on extension README and Marketplace Details

### Fixed
- 🐛 **User confusion** — replace “install alongside official Cline” one-liner that read like a prerequisite; optional side-by-side install is now explained separately

### Added
- 🌐 **Open VSX** — publish `i-mrdedchai/iCline` v0.1.15 on [Open VSX](https://open-vsx.org/extension/i-mrdedchai/iCline) so Cursor and other Open VSX–based IDEs can search and install iCline (same VSIX as VS Marketplace; no rebuild)

## [0.1.14] - 2026-06-21

### Fixed
- 🐛 **Marketplace Details page** — ship full `README.marketplace.md` (comparison table, preview screenshots, Thai link) instead of the minimal stub; sync absolute image URLs for Marketplace rendering
- 🐛 **Webview ServiceWorker error on Windows** — defer sidebar HTML assignment on cold start (VS Code race; see cline/cline#8920); README tip to **Reload Window** if it still appears once after install

## [0.1.13] - 2026-06-21

### Added
- ⚡ **Chat quick Provider & Model picker** — switch providers/models from the chat bar; search, collapse/expand provider groups, per-model Thinking/Effort on hover, status icons on chat + list rows, refresh dynamic catalogs
- 🔢 **Dev build numbering** — `release-icline.ps1 -Channel Dev` bumps `0.1.13-dev.N`; About shows `v0.1.13 · dev build N · timestamp`
- ⚙️ **Settings → About** — iCline + Cline (Official) sections; shows upstream Cline version synced in this fork
- 📸 **README previews** — chat picker & Settings screenshots under **Why iCline?** (`assets/docs/`)
- 🔗 Root **README** — Changelog link beside Releases
- 🏷️ **GitHub repo topics** script — `scripts/set-github-repo-topics.ps1`

### Changed
- 🏪 **Marketplace SEO** — displayName `iCline — Cline Fork (Grok & ZenMux)`, description leads with “Cline fork”, expanded keywords (`cline-fork`, `coding-assistant`, `vscode-extension`, …)
- 🏷️ VS Marketplace search tags — `grok-build`, `composer-2.5-fast`, `grok-4`, `grok-code`, `grok-cli`, `supergrok` (plus existing `composer`, `grok`, `xai`)
- 📄 **SECURITY.md / CONTRIBUTING.md** — maintainer contact → [@i-mrDedchai](https://github.com/i-mrDedchai)

## [0.1.12] - 2026-06-21

**Stable release** — GitHub Release + VS Marketplace (`i-mrdedchai.iCline`). ทดสอบ Grok: Composer 2.5 Fast, Grok 4.3, Grok Build.

### Fixed
- 🐛 **Webview blank / UI not loading** — remove dev-only `localhost:8097` script and broken `node_modules` codicon link from production HTML (codicons already bundled in `index.css`)

## [0.1.11] - 2026-06-21

### Fixed
- 🐛 **xAI / Grok (Composer 2.5 Fast, subscription)** — handle Responses API `function_call_arguments` streaming; stop emitting empty `attempt_completion` tool calls that caused `without value for required parameter 'result'. Retrying...`
- 🐛 **attempt_completion** — canonicalize alias fields (`message`, `response`, `summary`, etc.) into `result` for models that use non-standard parameter names

### Added
- 🚦 **Release gates** — Dev / Beta / Stable channels with interactive smoke checklist (`scripts/icline-smoke-checklist.ps1`, `scripts/release-icline.ps1 -Channel`)

## [0.1.10] - 2026-06-21

### Changed
- 🏪 Marketplace publisher **`i-mrdedchai`** — extension ID **`i-mrdedchai.iCline`**
- 🐙 GitHub moved to org **[i-mrDedchai/iCline](https://github.com/i-mrDedchai/iCline)** (`i-mrDed` account kept for other projects)

## [0.1.9] - 2026-06-21

### Changed
- 🎨 New extension icon (128×128 PNG)
- 🏪 Marketplace publisher ID **`i-mrded`** — extension ID is now **`i-mrded.iCline`** (VS Marketplace requires lowercase publisher slug)

## [0.1.8] - 2026-06-20

### Fixed
- 🐛 **Extension collision** — migrate commands/views/settings to `iCline.*` prefix so `i-mrDed.iCline` no longer conflicts with legacy `icline.icline` installs (fixes missing sidebar / duplicate registration errors)

### Added
- 📦 VS Marketplace docs: `README.marketplace.md`, `.clinerules/workflows/icline-marketplace.md`

### Changed
- ⚙️ Settings keys: `icline.updates.*` → `iCline.updates.*`

## [0.1.7] - 2026-06-20

### Fixed
- 🐛 **xAI / Grok models** — register `xai` as a next-gen provider and Grok agent models (Composer, Build, Code) so native tool calling is enabled; fixes `Native tool calling must be enabled to use xAI subscription and CLI models`

## [0.1.6] - 2026-06-20

### Changed
- 🆔 Extension ID **`i-mrDed.iCline`** (publisher `i-mrDed`) — aligns with GitHub repo owner
- 🌐 Bilingual docs: `README.md` (English) + `README.th.md` (ภาษาไทย)
- 🗣️ VS Code marketplace strings: `package.nls.json` + `package.nls.th.json`

### Added
- 📦 Initial public release on [GitHub](https://github.com/i-mrDed/iCline) with CONTRIBUTING & SECURITY guides

## [0.1.5] - 2026-06-20

### Fixed
- 💰 Subscription models (Grok 4.3, etc.) show **Included in subscription** instead of pay-as-you-go pricing
- 🟡 **Sign Out OAuth** now shows amber CLI-only badge when `~/.grok/auth.json` is still active (explains why status remains connected)
- 📢 Update toast says **iCline has been updated** (not Cline)

## [0.1.4] - 2026-06-20

### Added
- 🌐 **xAI subscription model catalog** — fetches chat models from `api.x.ai/v1/models` for your OAuth account (Grok 4.3, Grok 4.20, etc.)
- 📋 Model picker shows **CLI models + full subscription list** when signed in

### Fixed
- 🐛 Subscription models (e.g. Grok 4.3) now use **Responses API** on `api.x.ai` with OAuth token — fixes empty/unparsable API errors

## [0.1.3] - 2026-06-20

### Fixed
- 🐛 **xAI OAuth** — filter model list to subscription-only models (Composer 2.5 Fast, Grok Build) when signed in without API key
- 🛡️ Runtime guard: clear error if subscription auth is used with pay-as-you-go models (or vice versa)
- 🔄 Auto-reset incompatible model when auth mode changes

### Added
- 🟢 **Auth connection badge** — green status indicator for xAI, OpenAI Codex, and ZenMux

## [0.1.2] - 2026-06-20

### Added
- 📄 **Auto doc sync** — `scripts/sync-icline-docs.mjs` อัปเดต README, CHANGELOG, package.json, provider labels ก่อน package
- 🔗 GitHub repo ตั้งเป็น [i-mrDed/iCline](https://github.com/i-mrDed/iCline)
- 📦 คำสั่ง `npm run sync:docs` และ `npm run package:vsix`

### Changed
- 🏷️ Provider xAI เปลี่ยนชื่อเป็น **xAI · Grok (OAuth & Subscription)**
- 🎨 README & CHANGELOG เพิ่ม emoji / ไอคอนให้อ่านง่ายขึ้น
- ⚙️ Default `icline.updates.releasesUrl` → `i-mrDed/iCline` releases API

## [0.1.1] - 2026-06-20

### Added
- 🌐 **ZenMux** provider (`zenmux`) — multi-protocol support (OpenAI, Anthropic, Responses, Gemini)
- 🔑 PAYG + Subscription API keys, optional Management API key for balance/quota display
- 📋 Dynamic model picker from `zenmux.ai/api/v1/models`
- 🎯 Provider routing (latency / price / throughput)
- 🔗 Console links: Sign in, PAYG, Subscription, Management keys

## [0.1.0] - 2026-06-20

### Added
- 🎉 Rebrand เป็น **iCline** แยกจาก Cline official (ตอนนี้ใช้ ID `i-mrDed.iCline`)
- 🔐 **xAI OAuth** — Sign in/out, token refresh, Grok CLI auth bridge
- ⚡ โมเดล **Composer 2.5 Fast**, **Grok Build**, Grok 4.3
- 🛡️ Agent harness guardrails (verify-before-claim, post-write verify, compaction clamp)
- 🔄 Dual-channel update service (iCline releases + Cline upstream notification)
- 📢 คำสั่ง `iCline: Check for Updates`
- ⚙️ Settings `icline.updates.*`

### Changed
- 🏷️ Commands และ Activity Bar ใช้ prefix `icline.*`
- 🤖 System prompt ระบุตัวตนเป็น iCline เมื่อรันภายใต้ extension นี้
