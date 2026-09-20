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
- 🔒 **A provider your organization does not allow is answered, not silently reverted (dev.6-fix.16)** — the Settings provider dropdown already hides providers outside the organization's allowed list, but the Quick Picker lists every provider's models, so a click on a blocked one looked successful: the host's remote-config layer (org policy — highest precedence) kept the pinned provider, and the chip snapped back on the next state push with no explanation. Blocked providers now carry a lock in the picker, and clicking one of their models says why in place instead of committing a selection that cannot take effect.
- 🔇 **A downgraded Effort level is now announced (dev.6-fix.15)** — Effort is stored once per mode, not per model, and every dropdown deliberately offers the app's full vocabulary, so a level can be in force for a model that does not accept it. The SDK gateway narrows it on the way out (`max` on a model whose top level is `high` reaches the provider as High, a model with no effort control gets none) and nothing said so — you had to compare the provider's answer with the dropdown. Both places that SET an effort now name the level that really goes out: the Quick Picker's Options panel and the Settings Effort control render the same sentence from a host answer, and the answer is not a second opinion — the host calls `decideReasoningEffort`, the very function the gateway calls for every request, with the model's controls read from the registry the gateway resolves it from. Nothing is claimed while the answer is unknown, when the level is sent as chosen, or when a thinking budget is what actually goes out. A scan of the whole registry (every provider and model the gateway can resolve, every level) fails the build if a clamp ever stops fitting one of the two sentences the notice knows.
- 🧭 **Settings snapped back to Cline after choosing a model (dev.6-fix.15)** — selecting a model on the xAI page (or any provider form) committed the model but left the page showing the Cline provider again. The commit writes provider+model into the settings layers, and the remote-config layer — org policy, highest precedence — silently outranked it because `setApiConfiguration` also fed that cache, and provider fields survive its filter. Any earlier settings write therefore pinned whatever provider was current at the time, permanently: the model id updated (which is why it looked like a UI bounce) while the provider did not. Ordinary writes no longer touch the remote layer (only the control-plane fetch populates it), covered by a unit test on the precedence layers and an end-to-end test on a real VS Code window that picks a Grok model and asserts the page stays on xAI.
- 📐 **An open dropdown was covered by the control below it (dev.6-fix.15)** — Sakana's Model list opened *behind* the Reasoning Effort box, and ZenMux's API Protocol list behind Provider routing. Two positioned siblings with equal z-index are decided by DOM order, so the later control always won; the forms now descend instead — the first control takes the top of a shared ladder (`formDropdownZIndex`), and a test pins that ordering for the real styled container.
- 🏷️ **The model chip under the chat input showed no status (dev.6-fix.15)** — the Quick Picker's rows carried capability icons and the effort badge while the chip next to the composer showed a bare model name, so effort/reasoning state was invisible unless the picker was open. Both now render one component (`ModelStatusIcons`) from the same per-model status, with the same balloon tooltips.
- 🎚️ **Effort levels were silently downgraded before the request left the host (dev.6-fix.14)** — the app kept its own 5-value effort list (`none`/`low`/`medium`/`high`/`xhigh`) while the SDK accepts 7 (`minimal` and `max` as well), and every unrecognized value was rewritten to `medium`. Sakana's **Max** therefore reached the provider as *Medium*, and `minimal` from a catalog that publishes it could never be stored at all; on top of that the last gate before the request forwarded only `low`/`medium`/`high`, so `xhigh` was dropped too. The app now stores exactly the SDK's vocabulary (a parity test fails the build if the two lists drift), both gates forward the full set, and the SDK gateway — not the UI — clamps a level the selected model does not advertise. Settings offers the same set, so what the dropdown shows, what the app stores, and what the provider can receive are one vocabulary.
- 🐟 **Sakana Settings showed two forms at once (dev.6-fix.14)** — Sakana declares the `openai-responses` protocol in its SDK listing, so the settings registry classified it as a generic provider and rendered the shared OpenAI-compatible form *on top of* the Sakana form: two API-key fields and two model pickers in one pane. Sakana is now registered as a provider with its own form, and the duplicated pricing links in its intro paragraph are gone (the Pay-as-you-go / Subscription buttons below already own those actions).
- 🎛️ **Quick Picker hover panel missing, then stuck on the first rows (dev.6-fix.9 … fix.11)** — hovering a model never opened the Options panel: the handler was attached in an effect keyed on the popover's open state, and Radix mounts the popover body one commit later, so the effect ran while the list ref was still null and — its dependencies never changing again — never re-ran. Once it opened, placement clamped against the panel's 320px *max* height instead of its real height, pinning every row more than ~90px down to one top. Both are fixed against the locked design's own rule, measured from live rects. The panel now matches that design (Options title, model id, Thinking switch, Effort levels, capability list), and it and the row's status icons and effort chip read the same per-model status — before, the row was never handed the real values at all, so a model with an effort set showed no chip while the panel showed its level.
- 📏 **Effort / Thinking controls disagreed between Settings and the Quick Picker (dev.6-fix.12 … fix.13)** — "which models get an Effort control or a thinking budget" was decided in ~15 provider forms, each with its own copy of the rule (some id-based, some metadata-based, some with hardcoded model lists), and the picker had a fourth variant; "which values that control offers" was hardcoded in the UI too (the adaptive set spelled out six times, Sakana's three levels inside its own component). Both halves are now a single provider-metadata table (`webview-ui/src/utils/modelThinkingOptions.ts`) that Settings and the picker call, so the two surfaces cannot show different controls or different levels for the same model. Sakana's effort control is reachable again without a previously-stored value, and Fugu Ultra still defaults to X-High.
- ✍️ **Rejected file edits reported as success (dev.6-fix.7)** — the write guardrail judged only `isError`, while the SDK returns input-level rejections as a result envelope that does not throw; an oversized `editor` call therefore overwrote the evidence with ENOENT and an edit whose `old_text` did not match was not flagged at all. The envelope is now inspected before verification, the tool's own claim is recorded, and a rejected edit ends as a failed row carrying the real message. The harness overlay teaches the chunking rule, `ICLINE_TOOL_TRACE=1` writes a JSONL trace for diagnosis, and the oversized-write path is now covered end-to-end in a real VS Code window.
- 🧭 **Harness overlay demanded tool usage (dev.6-fix.5)** — the iCline harness overlay was rewritten against the official prompt after a controlled diff, so a conversational reply is no longer pushed into a tool call it has no reason to make.
- 🪞 **Provider selection echo + Jan / ClinePass follow-ups (dev.6-fix.4)** — the provider selection echo, the Jan picker falling back to the server's model list, and the ClinePass flag defaults were corrected, and the provider stats card no longer overlaps the form.
- 🖱️ **Provider/model selections not sticking (dev.6-fix.3)** — clicking a provider or model in Settings or the Quick Picker committed correctly on the host but the visible selection snapped back or froze. Three stacked causes, all fixed at the root: (1) applying a saved reasoning-effort preference AFTER the commit sent the pre-click api configuration snapshot wholesale, reverting the fresh selection — the trigger (saved reasoning settings in the shared providers.json, written by official Cline) became common only now; the effort preference is applied before the commit and configuration writes read live state instead of stale render closures. (2) A single failed state-push delivery permanently silenced state updates for the session (pushes now retry before a subscriber is dropped, and the webview re-subscribes after a stream error). (3) The first edit to a debounced field (e.g. Base URL) after opening settings was silently swallowed.
- 🗂️ **Provider settings parity with official Cline (dev.6-fix.2)** — Sakana's model list now flows from the auto-updated generated catalog (8 models incl. Fugu Ultra v2 and Namazu, with prompt-cache capability) instead of a stale hand-written list, and Jan uses the same rich OpenAI-compatible settings form as official Cline: the model list refreshes automatically from the Base URL you configure (Jan's port is configurable), custom model IDs and headers included. Jan itself remains iCline-only — it is not on models.dev. A rounded summary card above the API Provider dropdown shows the live catalog totals: Providers, Models, and Free (Cline free-tier) counts.
- 🧮 **Compaction summarizer honors Max Output Tokens (Wave 2, CLINE-2911)** — summary requests were hardcoded to a 1024-token output cap; reasoning models could spend the whole budget thinking, producing no summary text and silently skipping compaction. The user's Max Output Tokens setting is now mirrored onto the summarizer's provider config, and the summarizer logs a diagnostic when it gets no summary text instead of failing quietly.
- 🔀 **SDK upgraded to upstream's 2026-09-16 state (dev.6 Wave 1)** — the SDK packages (core/shared/llms/agents) now track upstream Cline's current code instead of the July base, bringing: mid-stream network-interrupt retry before any model output; real provider errors surfaced from gateway-forwarded stream failures; tool-schema union pre-flight (fewer provider 400s); PowerShell fail-fast + nested-script preservation; run_commands object-form and Windows bare-program-resolution fixes; editor old_text=null recovery guidance; CRLF preservation and platform-native new files in editor/apply_patch; apply_patch Add File refuses to overwrite existing files; search_codebase no longer crashes on giant single-line files; checkpoint hashing/perf and file-index fixes; MCP hung-server/stdio-budget/OAuth-401 resilience and per-server timeouts; hook spawn-failure and PostToolUse-output handling; malformed api_req render-crash fix; Gemini custom base URL restored; OpenAI-compatible trailing-slash model list fix; Ollama picker no longer polls /api/tags every 2 seconds; security bumps (axios 1.18.0, js-yaml, mermaid 11.16, protobufjs 7.6.5). iCline identity (Sakana/Jan/ZenMux providers, fix.26 Cline featured-catalog merge) re-applied on the new base — upstream's own cline-free catalog implementation supersedes the fix.26 merge blocks.
- 🧭 **Harness overlay referenced a tool that does not exist (fix.35)** — the iCline harness guardrails overlay, injected into every session's system prompt, instructed the model that conversational ACT MODE replies must use `attempt_completion` or `ask_followup_question` — a classic Cline tool name that is not in the SDK runtime (the real tool is `ask_question`). Obedient models would hit a fail-fast rejection, and small models derailed into restart loops while the same model on the same prompt ran cleanly on official Cline (verified via a controlled comparison and session transcripts). The overlay now references only real runtime tools, backed by a vitest regression guard (suite migrated from the Electron-only mocha host) asserting the overlay never mentions stale tool names.
- 🔁 **Repeated "Task Completed" after every reply (fix.34)** — iCline's own `attempt_completion` tool (created during the v4.0.0 SDK migration; upstream has no such tool) never set `lifecycle: { completesRun: true }`, so the agent runtime never treated a completion as terminal. The completion text echoed back as a tool result and the model answered with another `attempt_completion` — 1–3 repeated "Task Completed" rows after any user reply, plus 1–3 wasted full-context requests per completion, until a plain-text reply happened to end the turn. The tool now carries the same flag as the SDK's built-in `submit_and_exit`, so completing a task ends the turn and waits for feedback, exactly once.
- 📏 **Runtime sessions ignored the real cline-free context window (fix.33)** — the fix.32 llms rebuild fixed the *display* pipeline, but SDK sessions still read knownModels from the bare `@cline/llms` registry, which has no `cline` rows at all (live-catalog models never register into it). Auto/manual compaction therefore kept the 128K default budget — trigger ≈ 115K estimated tokens — and compacted every 1–3 minutes on a 1M window while the chat bar showed 1.0M. `buildSessionConfig` now resolves knownModels through the same pipeline as the webview picker and the CLI (`resolveProviderConfig`: generated ∪ bundled ∪ live catalog ∪ private ∪ public ∪ user overrides), so the compaction trigger (≈ 943,718 tokens on a 1M window), the manual-compact target, and the bar all read one source of truth. The committed-runtime-model injection is preserved (user overrides still win). Note: sessions opened before updating keep their old budget — start a new task to pick it up.
- 📏 **Auto-compact fired too early on cline-free models (fix.32)** — the SDK runtime did not know the real context windows of \`cline-free/*\` models, so auto-compaction used a conservative 128K default (trigger ≈ 115K estimated tokens) while the chat bar showed the server-provided 1.0M window. The \`@cline/llms\` runtime bundle was rebuilt to include the fix.26 live-catalog merge (recommended/free models now resolve real OpenRouter specs — context window, capabilities, $0 pricing — into the \`cline\` collection), so the compaction trigger, manual-compact target budget, and the context bar all read the same source of truth. Note: ships no source change — this activates committed fix.26 catalog code that had never reached a VSIX because the SDK \`dist/\` bundles were stale.
- 🔑 **Auto-compaction 401 after token rotation (fix.31)** — auto-compaction kept sending the Cline access token captured at session start, so once the token rotated mid-session every summarizer request failed with "Unauthorized ... re-authenticate your Cline account" while chat turns (which read the live token) kept working. `syncOAuthCredentials` now also updates the captured `providerConfig.apiKey` in place, so the compaction summarizer — and the auth-error retry — always send the current token. Re-login was only a temporary workaround; this removes the reset entirely.
- 🔐 **Compact rejected on free models (fix.30)** — manual Compact on `cline-free/*` models failed with 403 "only available via Cline product surfaces". The agentic summarizer built its LLM handler from the raw session provider config, which carried none of the Cline client identity headers chat turns send; manual compaction now attaches the same resolved headers (`User-Agent`, `X-CLIENT-*`, `X-Task-ID`) via `resolveProviderRequestHeaders`. Also clears the pre-existing `tsc --noEmit` errors left since fix.26–29 (type-level only, no runtime changes).
- 📊 **Compact error details (fix.29)** — when Compact fails, the chat shows the underlying reason (e.g. sidecar persist) instead of only "Couldn't compact the conversation."
- 📊 **Compact durable context bar (fix.28)** — after Compact, closing and reopening the task from history keeps the reduced context estimate. The live bar row is not in the canonical SDK transcript; history load now re-applies it from the persisted compaction sidecar. WIP VSIX packing now runs `esbuild --production` so `dist/extension.js` is the current host, not a leftover debug bundle.
- 🎯 **Chat bar leftover context window (fix.27)** — after picking a Cline featured id the header no longer keeps DeepSeek 1.0m or Grok 500k. Host `resolveModelInfo` does not reuse a warm-catalog miss snapshot; featured ids alias to a unique OpenRouter slug (`cline-free/solar-pro4` → `upstage/solar-pro4` = 524K); picker commit write-through clears leftover `*ClineModelInfo`.
- 🎯 **Cline featured model context windows (fix.26)** — Usage-Billing free/recommended cards (`cline-free/solar-pro4`, …) are merged into the `cline` catalog with OpenRouter specs (Solar Pro 4 = 524K). They previously had no `cline` catalog row, so the chat bar kept a generic 1M.
- 🎯 **Context bar never shows another model's window (fix.25)** — after switching away from Grok 4.6, the meter no longer stamps 500k onto the next model. Specs bind only when provider+model id match the live selection; catalog default / previous RPC is ignored.
- 🎯 **Chat context bar follows the selected model (fix.24)** — the header meter uses the same live catalog Settings shows. A stale committed snapshot (e.g. 131K leftover) no longer shadows a 262K Cline model after switching in the picker.
- 🎯 **Grok 4.6 context window (fix.23)** — 500k is applied on every display path: static table, subscription-cache rewrite (stale 2M from older builds), host catalog, Cline/OpenRouter `x-ai/grok-4.6`, chat `resolveModelInfo`, and Settings. Official xAI docs; 2M is Grok 4.20.
- 🎯 **Grok 4.6 context window (fix.22)** — `grok-4.6` is 500k tokens (official xAI docs, same as 4.5), not 2M (that is Grok 4.20). Chat/Settings host override so a stale 2M snapshot cannot stick.
- 🎯 **Selected model stays in A–Z order (fix.21)** — the active model keeps its place in the group (checkmark + scroll-into-view) instead of jumping to the top, so nearby models stay next to it.
- 🎯 **Quick Picker opens on the active provider (fix.20)** — opening the chat picker scrolls the current provider (and the selected model once it is in the list) into view instead of leaving the viewport at the first A–Z provider.
- 🎯 **Cline featured lists in Quick Picker (fix.19)** — Cline Usage-Billing Recommended/Free featured cards (RPC, with NEW/FREE badges) are the picker's Recommended/Free groups, not the `:free` name heuristic. Opening the picker or Refresh re-fetches the live featured list so Free stays in sync as Cline updates it.
- 🎯 **Settings is source of truth (fix.18)** — Cline Usage-Billing list policy is shared (`filterOpenRouterModelIds` + recommended/free allowlist). Quick Picker shows that filtered Cline set, not the raw catalog / `:free` name heuristic. Settings provider/model writes go through `commitModelSelection` (dedicated key only; empty model id does not copy leftover xAI `grok-composer-2.5-fast`).
- 🎯 **Quick Picker activate (fix.17)** — stacked-bug pass after failed fix.16 smoke: picker and header share one model-id reader; this picker skips Radix Portal so the VS Code webview cannot swallow pointerdown; host writes the dedicated model key only (does not clobber leftover `*ModeApiModelId`); hot-swap the live session only when it is already on that provider.
- 🎯 **Quick Picker activate (fix.16)** — model rows commit on pointerdown so VS Code webview cannot swallow the click; same-provider model switches now restart the active session (not only provider changes).
- 🎯 **Quick Picker activate (fix.15)** — `resolveModelInfo` no longer replaces a user-requested model id with the provider catalog default (the `xai: grok-composer-2.5-fast` snap). Chat-header label uses the committed id; picker shows commit errors instead of failing silently.
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
- 🧭 **Reopen history TurnState** — opening a task from history now resets the footer phase (`completed` / `resumable` / `awaiting_followup` / `idle`) and clears leftover approval prompts, instead of keeping Cancel/Thinking from the previous live turn
- 📜 **History is not always completed** — `sdkMessagesToClineMessages` no longer appends a fake `ask:completion_result`; last-turn unmatched tools stay partial so Resume is offered only when the turn was interrupted
- 📊 **Compact metrics** — post-compact context-bar estimates are marked `excludeFromTotals` so header token/cost totals no longer jump after `/compact`

### Changed
- 🎚️ **Provider-specific Effort levels (dev.6-fix.13, refined in fix.14)** — each provider's set (the shared None/Minimal/Low/Medium/High/X-High/Max vocabulary, Sakana's High/X-High/Max with a per-model default, whatever a catalog publishes itself — e.g. OCA) is provider metadata, and every dropdown — Settings, the Sakana/OCA pickers and the Quick Picker's Options panel — renders it, so a surface can no longer offer a level its provider does not accept. A catalog that publishes a model's accepted levels wins over the generic set for any provider, not just OCA. `xhigh` is spelled **X-High** everywhere (the picker used to call it "Max", which became ambiguous once `max` was a real level of its own); the off level is never a button, because the Thinking switch is the off.
- 🧾 **Final reply renders as a completion card (dev.6-fix.6)** — the last assistant turn of a task is shown as a tinted completion card (COMPLETED row with its copy always visible, chart-blue accent), and the live "Thinking" label switches to "Thought" once reasoning ends.
- 🗄️ **Legacy code archived** — prior `ChatModelPicker.tsx`, `chatModelPickerUtils.ts`, `ModelThinkingStatusIcons.tsx` moved to `docs/icline/legacy-chat-model-picker/` (depended on removed APIs). ModelThinkingStatusIcons UX is temporarily dropped — to be re-implemented on the new SDK hooks later.
- 🧰 **SDK workspace** — `bun install` now manages the whole monorepo; `build:sdk` rebuilds the 6 SDK packages before running bun unit tests.
- 📦 **Publish baseline** — shared README image rewrite in `scripts/marketplace-images.mjs`; documented in `icline-marketplace.md` (never use `--no-rewrite-relative-links` for store publishes)

### Known Limitations
- ModelThinkingStatusIcons (reasoning effort indicators in chat textarea) temporarily removed — to be re-implemented on the new SDK hooks.
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
