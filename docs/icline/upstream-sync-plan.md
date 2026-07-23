# Upstream Sync Plan — v3.89.2 → upstream/main (post-v4.0.0)

**Last updated:** 2026-07-23
**Sync target:** `upstream/main` @ `402b9994d` (post-v4.0.0 SDK migration + 16 post-sync commits)
**Last synced:** `v3.89.2` (2026-06-21)
**Gap:** 100 commits (50 to v4.0.0 + 50 since v4.0.0)

> ✅ **Status: SYNC COMPLETE — Phase 0-7 DONE**
> - Round 1 merge: commit `a7993a802`
> - Round 2 merge (16 post-sync commits): commit `292c501a3`
> - Smoke test restoration: commits `6d529eac8` → `b54b34265`
> - Tag: `v0.1.18-dev.5`
> - See `smoke-test-tracker.md` for remaining smoke test issues

---

## 1. Upstream summary since last sync

### v4.0.0 (tagged 2026-06-26) — MAJOR

**The biggest Cline release in this window.** Headline changes:

- **SDK migration** — VS Code extension now runs tasks through the shared `@cline/sdk` session layer (agent turns, tools, Plan/Act, MCP, checkpoints, telemetry, compaction, mistake limits, task history). This is a **structural rewrite** of `apps/vscode/src/core/task/**` and `apps/vscode/src/core/context/**`.
- **ClinePass** — onboarding, provider selection, signup/subscription handoff, live model lists, entitlement and organization error states, out-of-credit prompts.
- **Customize marketplace** — Skills / MCP servers / Plugins discovery, install/uninstall, enable/disable. Plugin-bundled skills. Shared marketplace install logic in core.
- **Queued prompts** — messages submitted while Cline is working are queued, shown, and cancellable.
- **Edit-and-regenerate** for previous user messages; clearer Reset Chat / Reset Code actions.
- **Generic SDK provider settings** — many provider-specific views replaced with shared generic settings components. Provider config reworked around `providers.json` + model catalog.
- **Plan/Act rework** through SDK coordinators; auto-continuation when switching Plan → Act.
- **Terminal execution** simplified through SDK run-commands path.
- **MCP settings migration** into shared settings file; atomic writes.
- **Auto-approval defaults changed** — command auto-approval now **disabled by default**.
- **Subagents temporarily disabled** in the VS Code extension.
- **Legacy "Explain Changes" feature removed.**

### Post-v4.0.0 to upstream/main HEAD (50 commits, 2026-06-26 → 2026-07-18)

Highlights:
- `557d72569` fix(vscode): shell mismatch between prompt, execution, and user configuration on Windows
- `7274d8bad` feat(ui): add agent chat components, Storybook, and npm releases
- `d1837366c` chore(llms): update model catalog
- `ef27f4508` fix: max output token handling
- `e3c6d5107` fix: recognize frontmatter with a leading UTF-8 BOM
- `3577b5240` feat(core): emit mistake-limit telemetry
- `1843bc8ed` fix(vscode): persist selected account organization
- `fead00ec5` fix(vscode): avoid duplicate OpenAI provider settings
- `238107d21` fix(vscode): preview auto-approved apply patches
- `7f9d2e96d` fix(ollama): restore native API routing (context window + timeouts)
- `f29c25395` feat(vscode-rollout): A/B loader and packaging for staged SDK extension
- `84c9b587a` refactor(vscode): resolve model metadata host-side
- `50d1578a7` feat(ui): add shared Cline theme package
- `5ef3b8136` feat(desktop): improve chat markdown rendering
- `a695dab23` feat(desktop): align settings with Cline Hub
- `0f4acccd0` feat(desktop): refresh navigation and visual foundation
- `f8c73cd8c` feat(core): persist and refresh workspace git info
- `04438c0d5` feat: shows compaction progress status in UI
- `f053ec48e` refactor(llms): owns provider-specific header policy
- `0df406723` refactor(core): normalize read file request path aliases
- `12703bf40` Improve VS Code terminal reliability: OSC 633 parser, exit codes
- `4a97b46f5` refactor(core): simplifies context compaction trigger
- `2b48dc411` make old tasks incompatible with new cline extension

---

## 2. Conflict analysis (git merge-tree upstream/main main)

**Total: 124 conflicts** across 3 categories:

| Type | Count | Severity | Strategy |
|------|-------|----------|----------|
| `modify/delete` | 87 | Medium | Most are upstream deleting legacy files we lightly touched; accept upstream deletions, re-apply iCline deltas only where still relevant |
| `content` | 32 | High | Manual merge — keep iCline branding/providers, adopt upstream SDK plumbing |
| `file location` | 5 | Medium | Upstream renamed `core/api/providers/` → `test/fixtures/`; we added `jan.ts`/`sakana.ts`/`zenmux.ts` there — need to relocate |

### 2a. iCline-specific files (NO conflicts — safe)

These 39 files are untouched by upstream and will fast-forward cleanly:
- `apps/vscode/src/icline/**` (UpdateService, harness, task-history)
- `apps/vscode/webview-ui/src/icline/**` (build-metadata, agent-display-name, quickStartPromptStorage)
- `apps/vscode/webview-ui/src/components/welcome/icline/**` (UpdateBar, QuickStart cards, ProviderModelChip)
- `apps/vscode/src/core/controller/account/sakanaAuthClicked.ts`
- `apps/vscode/src/core/controller/models/getJanModels.ts`
- `apps/vscode/src/core/api/transform/sakana-stream.ts`
- `apps/vscode/webview-ui/src/components/settings/SakanaModelPicker.tsx`
- `docs/provider-config/sakana.mdx`, `docs/provider-config/jan.mdx`

### 2b. Content conflicts (32) — manual merge required

Grouped by impact:

**iCline branding / agent name (keep our deltas):**
- `README.md`, `CONTRIBUTING.md`, `apps/vscode/README.marketplace.md`
- `apps/vscode/src/common.ts` (product name)
- `apps/vscode/src/extension.ts` (IS_DEV watcher + UpdateService init)
- `apps/vscode/src/core/webview/WebviewProvider.ts`
- `apps/vscode/src/hosts/vscode/review/VscodeCommentReviewController.ts`
- `apps/vscode/webview-ui/src/components/chat/ChatRow.tsx`, `ChatView.tsx`, `FeatureTip.tsx`, `task-header/TaskHeader.tsx`
- `apps/vscode/webview-ui/src/components/welcome/HomeHeader.tsx`
- `apps/vscode/webview-ui/src/components/history/HistoryView.tsx`

**Provider wiring (manual — adopt upstream SDK provider model where possible):**
- `apps/vscode/src/shared/api.ts` — Sakana/Jan/zenmux enum entries
- `apps/vscode/src/shared/storage/provider-keys.ts` — provider key entries
- `apps/vscode/src/utils/model-utils.ts` — model info for new providers
- `apps/vscode/src/shared/proto-conversions/models/api-configuration-conversion.ts` — Sakana/Jan proto fields
- `apps/vscode/src/core/controller/models/updateApiConfigurationProto.ts`
- `apps/vscode/src/core/api/index.ts` — provider handler dispatch
- `apps/vscode/src/core/controller/index.ts` — `sakanaAuthClicked` message handler
- `apps/vscode/webview-ui/src/components/settings/ApiOptions.tsx` — Jan/Sakana provider UI
- `apps/vscode/webview-ui/src/components/settings/providers/OpenAiCodexProvider.tsx`, `XaiProvider.tsx`
- `apps/vscode/webview-ui/src/components/settings/utils/providerUtils.ts`
- `apps/vscode/webview-ui/src/components/settings/common/ModelInfoView.tsx`
- `apps/vscode/webview-ui/src/utils/validate.ts`

**Proto schemas (manual — keep our additions, adopt upstream's):**
- `apps/vscode/proto/cline/models.proto` — Sakana/Jan fields
- `apps/vscode/proto/cline/state.proto` — Sakana/Jan fields
- `apps/vscode/proto/cline/task.proto` — upstream SDK changes

**Build / packaging:**
- `apps/vscode/package.json` — version, dependencies, scripts
- `apps/vscode/scripts/publish-marketplace.mjs`

### 2c. File-location conflicts (5) — relocate iCline providers

Upstream renamed/moved `apps/vscode/src/core/api/providers/` (the legacy per-provider handler files like `anthropic.ts`, `xai.ts` were **deleted** because the SDK now handles them generically).

Our additions in that deleted directory:
- `apps/vscode/src/core/api/providers/sakana.ts` → **must move** into the new SDK provider registration path (likely `sdk/packages/llms/src/providers/` or kept as a thin shim)
- `apps/vscode/src/core/api/providers/jan.ts` → same
- `apps/vscode/src/core/api/providers/zenmux.ts` → same
- `apps/vscode/src/core/api/providers/__tests__/sakana.test.ts` → move next to wherever the handler lands
- `apps/vscode/src/core/api/providers/__tests__/jan.test.ts` → same

> ⚠️ **Research needed:** inspect `sdk/packages/llms/src/providers/builtins.ts` and `factory-registry.ts` in upstream to learn the new provider registration API before moving files.

### 2d. modify/delete conflicts (87) — mostly accept upstream deletions

**Upstream deleted legacy files that we lightly modified. Strategy: accept deletion, port our delta if still relevant.**

Categories:

| Category | Count | Strategy |
|----------|-------|----------|
| Snapshot tests (`__snapshots__/*.snap`) | 53 | Accept upstream deletions; regenerate snapshots after sync via `npm test` |
| Legacy `core/task/**` (ToolExecutor, handlers) | 17 | Accept deletions — SDK now owns this. Re-apply `verifyWrittenFile` guardrail hook in new SDK location |
| Legacy `core/api/providers/*.ts` (anthropic, xai, vscode-lm, etc.) | 3 | Accept deletions — SDK handles these generically now |
| Legacy `integrations/notifications/**`, `integrations/terminal/**` | 6 | Accept deletions — SDK owns these now |
| Legacy `ContextManager.ts` | 1 | Accept deletion — SDK context compaction replaces it |
| Legacy `getConfiguredProviders.ts` | 1 | Accept deletion — replaced by SDK provider discovery |
| `package-lock.json` (vscode + webview) | 2 | Accept upstream deletion if they switched to Bun; regenerate lockfile |
| Legacy assets (`ClineCompactIcon.tsx`, `ClineLogoTired.tsx`) | 2 | Accept deletions if upstream replaced with theme package |

---

## 3. Recommended sync strategy

### Phase 0 — Preparation (before merge) ✅ DONE
1. **Branch:** create `sync/upstream-v4.0.0` from `main` (don't merge directly into `main`) ✅
2. **Backup tag:** `git tag pre-upstream-sync-0.1.18-dev.4` ✅
3. **Clean tree:** ensure no uncommitted changes ✅
4. **Read upstream SDK provider docs:** `sdk/packages/llms/src/providers/README.md`, `builtins.ts`, `factory-registry.ts` ✅
5. **Run tests on current main** as a baseline ✅

### Phase 1 — Merge + auto-resolve easy conflicts ✅ DONE
Commit `a7993a802` — `Merge upstream/main into iCline (v4.0.0 SDK migration + 50 post-v4.0.0 commits)`.
- All 87 legacy deletions accepted (ToolExecutor, task handlers, ContextManager, notifications, terminal executors, vscode-lm/xai providers, providers.json, getConfiguredProviders, legacy snapshots, lockfiles).
- Legacy Sakana/Jan/zenmux handlers archived under `docs/icline/legacy-providers/`.
- Content merges for the 32 conflict files were resolved as part of this merge commit (proto schemas, shared wiring, controller, webview UI, branding, package.json, docs) — equivalent to plan Phase 3, performed inline during conflict resolution.

```powershell
git checkout -b sync/upstream-v4.0.0
git merge upstream/main --no-edit
# Expect 124 conflicts
```

Batch-resolve the easy categories:
```powershell
# Accept upstream deletions for legacy files we don't need
git rm apps/vscode/src/core/task/ToolExecutor.ts
git rm apps/vscode/src/core/task/index.ts
git rm apps/vscode/src/core/task/tools/handlers/*.ts   # 15 files
git rm apps/vscode/src/core/context/context-management/ContextManager.ts
git rm apps/vscode/src/integrations/notifications/index.ts
git rm apps/vscode/src/integrations/terminal/CommandExecutor.ts
git rm apps/vscode/src/integrations/terminal/CommandOrchestrator.ts
git rm apps/vscode/src/integrations/terminal/standalone/StandaloneTerminalManager.ts
git rm apps/vscode/src/core/api/providers/vscode-lm.ts
git rm apps/vscode/src/core/api/providers/xai.ts
git rm apps/vscode/src/shared/providers/providers.json   # upstream moved to sdk/packages/llms
git rm apps/vscode/webview-ui/src/utils/getConfiguredProviders.ts
git rm apps/vscode/webview-ui/src/assets/ClineCompactIcon.tsx
git rm apps/vscode/webview-ui/src/assets/ClineLogoTired.tsx

# Delete all legacy snapshots — will regenerate after sync
git rm apps/vscode/src/core/prompts/system-prompt/__tests__/__snapshots__/*.snap

# Lockfiles — let npm/bun regenerate
git rm apps/vscode/package-lock.json
git rm apps/vscode/webview-ui/package-lock.json
```

### Phase 2 — Relocate iCline providers (file-location conflicts) ✅ DONE
1. Read `sdk/packages/llms/src/providers/builtins.ts` — SDK supports builtin spec registration ✅
2. Registered Sakana/Jan/zenmux as `OPENAI_COMPATIBLE_SPECS` entries (family: `openai-compatible`) instead of moving the legacy handler files — the SDK owns provider wiring now, so the legacy handlers were archived under `docs/icline/legacy-providers/` rather than relocated.
3. Follow-up additions on commit `d491a388c`:
   - Sakana `protocol: "openai-responses"` added to its builtin spec
   - Sakana/Jan/zenmux added to `providerSettingsRegistry.ts` GENERIC_PROVIDER_PRESENTATION_OVERRIDES (generic settings UI)

### Phase 3 — Manual content merges (32 files) ✅ DONE (folded into Phase 1 merge)
All 32 content conflicts were resolved during the Phase 1 merge commit `a7993a802`, in this order:
1. ✅ **Proto schemas** (`models.proto`, `state.proto`, `task.proto`) — kept Sakana/Jan fields (88–99, 150/151), added upstream's new fields; `bun run protos` regenerated cleanly.
2. ✅ **Shared provider wiring** (`api.ts`, `provider-keys.ts`, `model-utils.ts`, `api-configuration-conversion.ts`) — adopted upstream's SDK provider model, re-added Sakana/Jan/zenmux enum entries.
3. ✅ **Controller wiring** (`controller/index.ts`, `core/api/index.ts`, `updateApiConfigurationProto.ts`) — kept `sakanaAuthClicked` handler, adopted SDK dispatch.
4. ✅ **Webview UI** (`ApiOptions.tsx`, `providerUtils.ts`, `validate.ts`, provider components) — adopted upstream's generic settings components, re-added Jan/Sakana provider tabs.
5. ✅ **Branding** (`extension.ts`, `common.ts`, `WebviewProvider.ts`, chat components, welcome, history) — adopted upstream code, re-applied iCline branding.
6. ✅ **Build / packaging** (`package.json`, `publish-marketplace.mjs`) — adopted upstream scripts, kept iCline publisher ID and version.
7. ✅ **Docs** (`README.md`, `CONTRIBUTING.md`, `README.marketplace.md`) — kept iCline content, adopted upstream structural changes.

Verified post-merge: `bun run protos` ✅, `tsc --noEmit` 0 errors ✅.

### Phase 4 — Re-apply iCline guardrails in new SDK locations ✅ DONE
- ✅ `verifyWrittenFile` from `@/icline/harness/guardrails` — re-injected in `apps/vscode/src/sdk/hooks-adapter.ts` `afterTool` (commit `25a17b9b6`). SDK runtime applies `AgentAfterToolResult.result` back to the tool result the model sees (`agent-runtime.ts:1396`). Verifies `editor` and `apply_patch` targets; failure replaces the result with an error, mirroring the legacy `WriteToFileToolHandler` behavior. Covered by `hooks-adapter.test.ts` (10 tests).
- ✅ `getIclineHarnessOverlay` — re-injected in `apps/vscode/src/sdk/cline-session-factory.ts` via the `rules` slot of `buildClineSystemPrompt()` (commit `d491a388c`). Upstream moved system-prompt assembly into `sdk/packages/shared/src/prompt/cline.ts`.

### Work done outside the original plan (carryover fixes)

These were not in the original sync plan but addressed root causes discovered during the sync:

- ✅ **History export/import archiver fix** (commit `3766b1a6b`) — the dev.4 fix used `import * as archiverNS` then called `archiverNS(...)`, which throws "archiverNS is not a function" at runtime under esbuild/bun (namespace objects are non-callable). Reached the callable via `archiverNS.default` instead. Added `TaskHistoryTransfer.test.ts` (3 real-archiver round-trip tests) and registered it in `vitest.config.ts`.
- ✅ **zenmux dynamic model list** (commit `fdbb4f422`) — added `modelsSourceUrl: "https://zenmux.ai/api/v1/models"` to the zenmux builtin spec so the SDK's generic `resolveProviderModels` RPC fetches the live model list. Sakana uses a static `modelsFactory` (Fugu models are fairly stable) and Jan already had `modelsSourceUrl` set. This supersedes the orphaned `refreshZenmuxModels.ts`/`getJanModels.ts` handlers that were never wired into the new SDK RPC routing.

### Phase 5 — Verify
```powershell
cd apps/vscode
npm install        # or bun install if upstream switched
npm run protos
npm run sync:docs
npx tsc --noEmit
npm run lint
npm test           # regenerate snapshots, expect some failures to triage
npm run build:webview
node esbuild.mjs --production
```

Smoke test in a dev VS Code instance:
- Sakana provider loads, Fugu model picker works
- Jan provider loads, Local API Server connect works
- UpdateBar still surfaces iCline + upstream notifications
- Quick Start cards still render
- History export/import still works

### Phase 6 — Update sync metadata
```powershell
# Update build-metadata.ts
cd apps/vscode && npm run sync:docs
# Update icline-docs.manifest.json upstreamCline.syncedVersion
```

### Phase 7 — Commit + PR
- Single squashed commit on `sync/upstream-v4.0.0` (or a few logical commits)
- PR into `main` with full conflict resolution notes
- Tag `v0.1.18-dev.5` after merge

---

## 4. Risks and open questions

| Risk | Mitigation |
|------|------------|
| SDK provider registration API may not support external (non-Cline) providers like Sakana/Jan | Inspect `factory-registry.ts` before merge; if blocked, keep providers as app-level shims |
| Subagents disabled in v4.0.0 — iCline guardrails may depend on subagent hooks | Verify `getIclineHarnessOverlay` still has a callsite |
| Old task history incompatibility (`2b48dc411`) — existing user task caches may break | Document in CHANGELOG; consider migration shim |
| Lockfile format change (npm → Bun) | Confirm with `apps/vscode/package.json` scripts; regenerate lockfile |
| Snapshot tests regenerated against new SDK prompts — iCline branding deltas may need snapshot updates | Run `npm test -u` after sync; review diff carefully |

---

## 5. Estimated effort

| Phase | Files | Est. time |
|-------|-------|-----------|
| 0 — Prep | — | 30 min |
| 1 — Auto-resolve | 87 | 1 hr |
| 2 — Relocate providers | 5 | 2 hr (research + move) |
| 3 — Manual merges | 32 | 6–8 hr |
| 4 — Re-apply guardrails | 2 | 1–2 hr |
| 5 — Verify (build + tests + smoke) | — | 2–3 hr |
| 6 — Metadata | — | 15 min |
| **Total** | **124** | **~13–17 hr** |

Recommend splitting across 2–3 sessions. Do not attempt in one sitting.

---

## 6. Decision needed from maintainer

1. **When to sync?** Upstream is moving fast (50 commits since v4.0.0 in 3 weeks). Syncing now catches the SDK migration while it's fresh; waiting risks more drift.
2. **ClinePass handling** — upstream added ClinePass (subscription) provider. Should iCline:
   - (a) Keep ClinePass disabled (we have our own provider story)
   - (b) Surface ClinePass as an option for users who want it
3. **Customize marketplace** — upstream added Skills/MCP/Plugins marketplace. Should iCline:
   - (a) Adopt as-is (more features for users)
   - (b) Hide Customize tab (keep iCline focused)
4. **Subagents** — upstream disabled them. iCline guardrails use subagent hooks. Confirm we're OK with subagents off for now.
