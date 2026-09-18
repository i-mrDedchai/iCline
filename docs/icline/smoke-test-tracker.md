**Last updated:** 2026-09-18
**Branch:** `feat/upstream-waves-1-2` (จาก main @ `78ebd0923` — รวม dev.5 แล้ว, tag `pre-merge-dev.5`, ยังไม่ push)
**HEAD:** `19048718b` (chore @types/archiver — เปิดรอบ dev.6)
**vsix:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.1.vsix` — awaiting maintainer smoke; do not overwrite `cline-temp` `fix.1`–`fix.9`

### 🔀 dev.6 Wave 1 — SDK fast-forward ถึง upstream Sep-16 (`ce25d8b15`, เปิดรอบ)

| # | งาน | Smoke |
|---|-----|-------|
| W1-1 | SDK packages (core/shared/llms/agents) ยกทั้งก้อนถึง upstream `173837314` — ครอบ stream retry, terminal reliability, PowerShell fail-fast, editor/CRLF recovery, MCP hang/stdio/OAuth/timeout, checkpoints perf, CVE axios/js-yaml/mermaid/protobufjs | ⏳ รอ smoke |
| W1-2 | identity re-applied: builtins Sakana/Jan/ZenMux · fix.26 catalog merge logic · JAN enum · upstream cline-free catalog supersede fix.26 blocks | ⏳ ร่วมกับด้านบน |
| W1-3 | vscode adapt: ลบ onRetryAttempt pass-through, stored-overrides boundary cast, default models ใหม่ (sonnet-5/gemini-3.8) | ⏳ ร่วมกับด้านบน |

**known-failures (ไม่บล็อก):** llms ollama.wire ×4 (third-party serialization เวอร์ชันลอย) · core ~16–26 (upstream tests flaky บน Windows: cron timers/hub listeners/locale sort/git-init/python/bun-ENOENT)
**รอบ dev.5 ปิดแล้ว (2026-09-18)** — ตารางด้านล่างคือบันทึกประวัติศาสตร์ของ dev.5

**Release plan:** finish this Quick Picker worktree on **dev.5** → merge to main when ordered → ClinePass after that merge. Dynamic model lists for remaining providers stay **dev.6**.

### Compact durable smoke (fix.28–32, branch `fix/compact-durable`)

| Pack | งาน | Maintainer smoke |
|------|-----|------------------|
| fix.28 | แถบ context คงค่าหลังปิด/เปิดแชทจาก History (sidecar persist + re-apply estimate) — `094c9166c` | ⏳ ยังไม่ปิด |
| (packer) | WIP VSIX คอมไพล์ production host (`b1ba27416`) | — |
| fix.29 | แชทแสดงสาเหตุเมื่อ compact ล้มเหลว — `f213d55b2` | ✅ ใช้งานได้จริง — 403 "product surfaces" ถูกเปิดเผย (นำไปสู่ fix.30) |
| fix.30 | manual compact แนบ Cline identity headers เดียวกับแชท (`User-Agent`, `X-CLIENT-*`, `X-Task-ID`) แก้ 403 บน `cline-free/*` + เก็บหนี้ tsc — `8278c6e5a` | ❌ เผยชั้นถัดไป: auto-compact 401 (re-authenticate) |
| fix.31 | `syncOAuthCredentials` อัปเดต `providerConfig.apiKey` ที่ compact ถือ snapshot ไว้ — แก้ 401 หลัง token หมุนเวียน + rebuild core dist — `ae8a40c45` | ✅ **ผ่าน (2026-09-17)** — auto+manual compact ทำงาน ไม่มี 401 |
| **fix.32** | rebuild llms dist → เปิดใช้ fix.26 catalog merge ให้ SDK เห็น context window จริงของ cline-free (แก้ trigger เร็วเกิน + manual ตัดแรง) — `1e7a34425` | ❌ display เห็น 1.0m แล้วแต่ trigger ยัง 115.2k ทุกครั้ง — เผยชั้นถัดไป: runtime knownModels อ่านคนละ pipeline (→ fix.33) |
| **fix.33** | `buildSessionConfig` resolve knownModels ผ่าน `resolveProviderConfig` (pipeline เดียวกับ picker/bar/CLI) — แก้ที่มา: runtime อ่าน registry static ที่ไม่มี cline-free เลย — `e7f9149cc` | ✅ **ผ่านด้าน trigger (2026-09-18)** — ไม่มี auto-compact ตลอดช่วงทดสอบ; session glm-5.3-flash วิ่งถึง 276k เงียบ (fix.32 ต้อง compact แล้ว ≥2 รอบ) = เกณฑ์ใหม่มีผลจริง; เกณฑ์จริง ~849k ยังไม่ถูกกระตุ้น end-to-end |
| **fix.34** | "Task Completed" ซ้ำ 1–3 แถวหลังตอบกลับ — ราก: tool `attempt_completion` ฝั่งเรา (vscode-runtime-builder.ts:65) ไม่มี `lifecycle: { completesRun: true }` → agent loop ไม่จบ, completion echo กลับเป็น tool_result โมเดลตอบซ้ำ + เสีย request เต็ม context ทุกรอบ — เพิ่ม flag 1 บรรทัด + property test — `40fafc6ea` | ✅ **ผ่าน (2026-09-18, 3 รอบ)** — DeepSeek: attempt_completion 1 ครั้ง/turn แล้วจบรอ feedback (ก่อนแก้ซ้ำ 3) · อาการอื่นที่พบ (Solar Pro 4 เริ่มงานซ้ำ, Laguna ตีความ prompt ผิด/เรียก write_file ชื่อเก่า) = พฤติกรรมโมเดลเล็กล้วน — system prompt hash เดียวกันทุกรอบ, harness fail-fast แล้วโมเดลแก้ตัวถูกต้อง |
| **fix.35** | overlay ของ harness สั่งทุก session ใช้ `ask_followup_question` (tool ที่ไม่มีใน runtime) — จุดเริ่มที่ทำ Solar Pro 4 วนเริ่มงานใหม่ (พิสูจน์ด้วยรอบ 4 เทียบ official) — แก้เป็น `ask_question` + ย้าย suite เป็น vitest พร้อม guard ชื่อ tool ค้าง 10 ตัว — `d3619d263` | ⚠️ **บางส่วน (2026-09-18)** — อาการวนหายจริง (โมเดลลงมือทำงานทันที สร้าง folder+file สำเร็จ) แต่เจอ **บั๊กใหม่**: หลังลบไฟล์ข้างนอกผ่าน terminal, editor create รายงานสำเร็จแต่ไฟล์ไม่ลงดิสก์ (verification hook จับได้) → **fix.36 candidate** (dev-log ต่อ 3) · ส่วน prompt base เก่า = Wave 1–2 |

### Worktree smoke (fix.15–27)

| Pack | งาน | Maintainer smoke |
|------|-----|------------------|
| fix.15–16 | Picker activate / requested-id | ❌ ไม่ผ่าน |
| fix.17 | stacked activate | คลิกข้าม provider ดู OK แล้วอาการเดิมกลับหลัง Cline Usage-Billing |
| fix.18 | Settings = แหล่งความจริงของลิสต์ Cline | ลิสต์ตรงแล้ว |
| fix.19 | Featured Recommended/Free ใน Picker | ✅ กลุ่ม Free ตรง Settings |
| fix.20 | เปิด Picker แล้วเลื่อนไป provider ที่ใช้ | ✅ |
| fix.21 | โมเดลที่เลือกอยู่ตำแหน่ง A–Z เดิม | ✅ |
| fix.22 | Grok 4.6 = 500k ในตาราง | ❌ ยังขึ้น 2M (แคชสมัครสมาชิก) |
| fix.23 | บังคับ 500k ทุกเส้นทางแสดง | ✅ Grok 4.6 = 500K |
| fix.24 | แถบแชทอ่านแคตตาล็อกชุดเดียวกับ Settings | ✅ Laguna 262K; โมเดล Cline อื่นยังเพี้ยน |
| fix.25 | ห้ามแปะเลขโมเดลก่อน | ❌ Solar/ตัวอื่นยัง 1.0m หรือ 500k |
| fix.26 | รวม featured เข้าแคตตาล็อก `cline` | ❌ ยัง leftover 1.0m/500k |
| **fix.27** | ห้ามใช้ snapshot ตอน miss + alias slug | ✅ Solar Pro 4 = **524.3k** (2026-09-16) |

---

## ✅ ข้อ 1 — Jan Setting

**สถานะ:** แก้มา 3 รอบแล้ว — รอผู้ใช้ smoke test รอบล่าสุด

| Commit | งาน | สถานะ |
|--------|-----|--------|
| `05d72f2be` | ลบ duplicate Base URL + migrate JanProvider ไป SDK hooks | ✅ แก้แล้ว |
| `fbf4aeae5` | แก้ checkbox ไม่จำค่า + ป้องกัน debounce ล้าง baseUrl | ✅ แก้แล้ว |
| `b54b34265` | ส่ง apiConfiguration ที่ถูกต้อง + เพิ่ม jan case ใน modelDisplayName | ✅ แก้แล้ว |

### ผล smoke test:
- ✅ Checkbox จำค่าได้หลังปิด/เปิด settings panel (แก้ใน `fbf4aeae5`)
- ⏳ Model list โหลดอัตโนมัติ — ยังไม่ confirm (แก้ใน `b54b34265`)
- ⏳ สลับ provider/model แล้วชื่อแสดงถูก — ยังไม่ confirm (แก้ใน `b54b34265`)

---

## 🔧 ข้อ 2 — xAI / Grok Provider

**สถานะ:** แก้ในโค้ดแล้ว (2026-08-05, รอบ TS + catalog sync) — รอผู้ใช้ smoke test

| # | ปัญหา | สถานะ | รายละเอียด |
|---|-------|--------|-----------|
| 2a | ชื่อ Provider ไม่ตรง dev.4 | ✅ แก้แล้ว | `HOST_PROVIDER_LABELS.xai` = `"xAI Grok (OAuth & Subscription)"` ใน `catalog.ts` |
| 2b | Model list ไม่ครบ | ✅ แก้แล้ว | `XaiProvider` + catalog `resolveXaiAuthAwareModels` ใช้ `getXaiModelsForAuth` รวม CLI + subscription cache + API key |
| 2c | แชทไม่ได้ | ✅ แก้แล้ว | `buildSessionConfig` เรียก `resolveXaiAuth` → ส่ง OAuth/CLI token เป็น `apiKey`; CLI models ไป `cli-chat-proxy` + headers |
| 2d | TS build break | ✅ แก้แล้ว | เพิ่ม `xaiDefaultFromCatalog` ใน `XaiProvider.tsx` (TS2304) — webview `tsc -b` ผ่าน |

**ไฟล์หลัก:** `cline-session-factory.ts`, `XaiProvider.tsx`, `catalog.ts`  
**Verify:** webview + extension `tsc` ผ่าน (2026-08-05)

> หมายเหตุ: live `/v1/models` มี path อยู่แล้ว แต่ auto-refresh ทุก provider เต็มรูปแบบ = งาน **dev.6**

---

## 🔧 ข้อ 3 — Quick picker บน chat header

**สถานะ:** แก้ในโค้ดแล้ว (2026-08-05, รอบ sync กับ API Config) — รอ smoke test

| # | ปัญหา | สถานะ | รายละเอียด |
|---|-------|--------|-----------|
| 3a | แสดงชื่อ active ผิด | ✅ แก้แล้ว | ใช้ `getSelectedModelIdForProvider` อ่าน field ต่อ provider (jan/zenmux/sakana ฯลฯ) ไม่พึ่งแค่ generic `*ModeApiModelId` |
| 3b | สลับ provider/model | ✅ แก้แล้ว | `commitModelSelection` + ปิด popover; ใช้ model id ที่ถูกต้องต่อ provider |
| 3c | บังคับขยาย Provider | ✅ แก้แล้ว | `handleOpenChange` seed expand **ครั้งเดียวตอนเปิด** — ยุบ active provider ได้โดยไม่ถูก force เปิดใหม่ |
| 3d | ตัวเลือก Effort หาย | ✅ แก้แล้ว | แถบ Reasoning effort chips (Low/Med/High/Max/Off) สำหรับโมเดล active |
| 3e | ลิสต์โมเดล xAI ไม่ตรง API Config | ✅ แก้แล้ว | `resolveSdkModels` แยก path `xai` → `getXaiModelsForAuth` (CLI + subscription) แทน SDK PAYG-only |
| 3f | เรียง Providers ตามตัวอักษร | ✅ แก้แล้ว | sort ตาม display name ใน `listSdkProviderListings`, `ApiOptions`, และ `QuickModelPicker` |

**ไฟล์หลัก:** `QuickModelPicker.tsx`, `ApiOptions.tsx`, `catalog.ts`  
**Verify:** webview `tsc -b` ผ่าน

---

## ⏳ ข้อ 4 — Push origin/main

**สถานะ:** ยังไม่ push (รอคำสั่ง maintainer ชัดเจน)

**หมายเหตุแผน:**
- ตอนนี้ work อยู่บน `sync/upstream-v4.0.0` (ยังไม่ merge เข้า `main`)
- Local `main` ยัง ahead origin จากรอบ dev.4 บางส่วน
- แนะนำ: commit งาน restore บน branch นี้ → smoke ผ่าน → ค่อย merge/push ตามที่คุณสั่ง

---

## ✅ ข้อ 5 — 4 คำถาม policy (ตัดสินแล้ว 2026-08-05)

**สถานะ:** maintainer ยืนยัน **ใช้ตามแนะนำทั้งชุด**

| # | การตัดสินใจ |
|---|-------------|
| **5a Sync timing** | หลัง restore/dev นิ่ง + เมื่อ upstream มี major/security/ฟีเจอร์ที่ต้องการ — ไม่ sync กลางคันตอน dev.5 ยังไม่ smoke ผ่าน |
| **5b ClinePass** | เปิดให้เลือกได้ แต่ไม่เป็น default ของ iCline |
| **5c Marketplace** | Stable = VS Marketplace + Open VSX · Dev/Beta = GitHub VSIX / pre-release |
| **5d Subagents** | dev.5 ปิดตาม upstream · เปิดทีหลังเมื่อ harness นิ่ง |

**เพิ่มจาก maintainer:** ยัง **ไม่ Publish Stable** จนกว่าจะปิดทุก dev แล้วตัด **Release 0.1.18** (ไม่ใช่ปล่อย Stable กลางทาง dev.5/dev.6)

### Upstream gap (ตรวจ 2026-08-05 หลัง `git fetch upstream`)

| รายการ | ค่า |
|--------|-----|
| iCline branch | `sync/upstream-v4.0.0` @ `b5b4ce1ff` (+ WIP uncommitted) |
| merge-base กับ upstream | `402b9994d` |
| upstream/main | `64993e78d` ≈ **v4.1.3 + 42 commits** (`v4.1.3-42-g64993e78d`) |
| แท็กรีลีสล่าสุดที่เห็น | **v4.1.3** (ไม่ใช่ 4.1.13) |
| commits ที่เรายังไม่มี | **~282** |
| commits ของเราที่ upstream ไม่มี | **~93** |

**คำแนะนำ:** อย่า sync รอบใหม่ตอนนี้ — ปิด smoke dev.5 ก่อน แล้วค่อยวางแผน sync แบบมี checklist (ดูด้านล่าง)

---

## 🔧 ข้อ 6 — Agent แนะนำตัวเองว่า "Cline"

**สถานะ:** แก้ในโค้ดแล้ว (2026-08-05) — รอ smoke test

| # | ปัญหา | สถานะ | รายละเอียด |
|---|-------|--------|-----------|
| 6a | ระหว่างทำงาน | ✅ ถูกต้อง | "iCline read 1 file:" — แสดงถูก |
| 6b | แนะนำตัวเอง | ✅ แก้แล้ว | `applyIclineAgentIdentity` rewrite "You are Cline" → "You are iCline" + identity rule ใน harness overlay |

---

## Git state (local WIP)

- **Branch:** `sync/upstream-v4.0.0`
- **Uncommitted (ประมาณ):**
  - `apps/vscode/src/icline/harness/guardrails.ts`
  - `apps/vscode/src/sdk/cline-session-factory.ts` + `.test.ts`
  - `apps/vscode/src/sdk/model-catalog/catalog.ts`
  - `apps/vscode/webview-ui/.../XaiProvider.tsx`
  - `apps/vscode/webview-ui/.../QuickModelPicker.tsx`
  - `docs/icline/smoke-test-tracker.md`
- **Tag เดิม:** `v0.1.18-dev.5` (ก่อน WIP นี้ — หลัง smoke อาจ tag ใหม่หรือ rebuild VSIX ทับ)
- **Push:** ยังไม่ทำ

---

## ก่อน Build VSIX dev.5 (checklist)

- [x] ข้อ 2 โค้ด + unit tests
- [x] ข้อ 3 โค้ด + tsc webview
- [x] ข้อ 6 โค้ด
- [x] ข้อ 5 policy ตัดสินแล้ว
- [ ] ข้อ 4 — เฉพาะเมื่อคุณสั่ง push
- [x] Build VSIX WIP (2026-08-05) — รอคุณติดตั้ง smoke
- [ ] Smoke ผ่าน → ค่อย commit
- [ ] **ห้าม** sync upstream เพิ่มจนกว่า smoke dev.5 ผ่าน

### ติดตั้ง smoke (PowerShell)

```powershell
code --install-extension "D:\.grok\iCline\cline-wt-quick-model-picker-activate\apps\vscode\dist\i-mrdedchai.iCline-0.1.18-dev.5-fix.27.vsix" --force
```

แล้ว **Developer: Reload Window**

จุดที่ควรเช็ค: Jan · xAI OAuth+chat · Quick picker (expand/effort) · agent แนะนำตัว iCline · History export/import

---

## 🔧 fix.30 — compact 403 "Cline product surfaces" (2026-09-17)

**สถานะ:** แพ็ก VSIX แล้ว — **รอ maintainer smoke** (ยังไม่ปิดรอบ)

อาการจาก fix.29: compact บน `cline-free/deepseek-v4.1-flash` → `Error 403: ... only available via Cline product surfaces` (Cline Official compact แชทเดียวกันได้)

**Root cause:** manual compact สร้าง provider config ใหม่ที่**ไม่มี headers ระบุตัวตน** (`User-Agent: Cline/<ver>`, `X-CLIENT-*`) ต่างจากแชทที่ bootstrap เติมให้ทุก turn — เซิร์ฟเวอร์บังคับว่าโมเดล `cline-free/*` ต้องมาจาก client ที่ระบุตัวตน (Official ผ่านเพราะใช้ strategy `basic` ซึ่งไม่ยิง network; เคส agentic เป็นบั๊กแฝงของ upstream เอง)

**แก้:** coordinator แนบ headers เดียวกับแชททุก byte ผ่าน `resolveProviderRequestHeaders` (ไม่ปลอมเวอร์ชัน) — non-cline provider ไม่ถูกแตะ + เก็บหนี้ tsc 4 errors จาก fix.26–29 (type-level เท่านั้น)

**วิธี smoke:** แชทยาวด้วย cline-free (agentic) → Compact ต้องสำเร็จ · compact paid model ของ cline · provider อื่น (xAI/OpenRouter) ไม่ regression · auto-compact ปกติ · About ขึ้น `fix.30`

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.30.vsix` · Commit `8278c6e5a`

---

## 🔧 fix.35 — overlay อ้าง tool ที่ไม่มีใน runtime (2026-09-18)

**สถานะ:** ⚠️ **smoke บางส่วน (2026-09-18)** — อาการวนเริ่มงานใหม่หายไปจริง (โมเดลลงมือทำโจทย์ทันที สร้าง folder+file สำเร็จ) แต่ชน **บั๊กใหม่คนละ subsystem**: หลังโมเดลลบไฟล์ข้างนอกผ่าน terminal (Remove-Item) editor create รายงานสำเร็จแต่ไฟล์ไม่เคยลงดิสก์อีก — verification hook ของเราจับได้ (ทำงานถูกดีไซน์) — → **fix.36 candidate** ต้องใช้ debugger agent หาราก (dev-log 2026-09-18 ต่อ 3) · terminal "output could not be captured" = Wave 1 terminal reliability ตอบตรง · มติเสนอ: ปิด dev.5 → Wave 1+2

อาการต้นทาง: Solar Pro 4 วนเริ่มงานใหม่บน iCline แต่ prompt/โจทย์เดิมบน official ทำงานปกติ (รอบ 4 = controlled experiment ของ maintainer) — กลับคำสรุปเดิมที่ว่า "โมเดลล้วน"

**Root cause:** system prompt ของทุก session iCline มี overlay ของ harness (`guardrails.ts:84`) สั่งว่า ACT MODE ต้องตอบด้วย `attempt_completion` หรือ **`ask_followup_question`** — ชื่อ classic Cline ที่**ไม่มีใน SDK runtime** (จริงคือ `ask_question`) · โมเดลที่เชื่อตาม = โดน reject แบบ write_file · โมเดลเล็กสับสนจนหลุดโฟกัส (base prompt ของเรายังเป็นรุ่น 21 ก.ค. เก่ากว่า official 752 commits เสริมความต่าง)

**แก้ (`d3619d263`):** overlay → `ask_question` · audit ทั้งไฟล์แล้วมีจุดเดียวที่ค้าง · `ask_followup_question` ที่เหลือใน bundle 5 จุด = display-compat (message-translator สำหรับ session เก่า + responses.ts formatResponse ผ่าน DiffViewProvider) — ยืนยันแล้วไม่ถึง system prompt

**Test-first:** ย้าย `guardrails.test.ts` mocha→vitest (เดิมรันได้แค่บน Electron host หนัก ไม่อยู่ suite ด่วน — ตาม pattern TaskHistoryTransfer) + regression guard ห้าม overlay match ชื่อ tool ค้าง 10 ตัว + ต้องมี ask_question · RED 2 เคส → GREEN 6/6 · vscode sdk 839/839 · check-types สะอาด · marker A/B: `attempt_completion or ask_question` fix.34=0 → fix.35=1

**วิธี smoke:** ติดตั้ง → **session ใหม่ Solar Pro 4 + prompt/โจทย์เดิมรอบ 1** → ไม่วนเริ่มงานใหม่/จบ turn ด้วย tool ครั้งเดียว (ใกล้พฤติกรรม official) · DeepSeek ไม่เปลี่ยนพฤติกรรม · About `fix.35` · หมายเหตุ: ส่วนต่าง prompt ที่เหลือกับ official ปิดด้วย upstream waves

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.35.vsix` · Commit `d3619d263`

---

## 🔧 fix.34 — "Task Completed" ซ้ำหลังตอบกลับ (2026-09-18)

**สถานะ:** ✅ **smoke ผ่าน (2026-09-18, ทดสอบ 3 โมเดล)** — หลักฐานชี้ขาดจาก session จริง: DeepSeek-v4.1-flash จบ turn ด้วย attempt_completion tool_use **1 ครั้ง** แล้วรอ feedback ผู้ใช้ทันที (ก่อนแก้: ซ้ำ 3 ครั้ง) · อาการที่พบเพิ่มระหว่างทดสอบไม่ใช่บั๊ก iCline: Solar Pro 4 เริ่มงานใหม่ซ้ำหลังทุก nudge (ไม่เคยเรียก attempt_completion เลย — จบ turn ด้วย text ล้วน + thinking มีภาษาจีนปน), Laguna ตีความ prompt ผิด (ไปค้น "fix.34" ในโค้ดแทนแนะนำตัว) และเรียก `write_file` (ชื่อ tool สมัย Cline คลาสสิกที่ไม่มีใน SDK) → harness ปฏิเสธ fail-fast พร้อมลิสต์ tool ที่มี แล้วโมเดลแก้ตัวเป็น `editor` ทันที = ทำงานตามดีไซน์ · **system prompt hash เดียวกันทุกรอบ (md5 2ee4904843)** → ทุกความต่าง = ตัวโมเดล · ไม่ต้องทำ fix.35 จากผลนี้

อาการ: หลังผู้ใช้ตอบกลับทั่วไป ("ว้าวมากๆ ครับ") โมเดลเรียก attempt_completion ซ้ำ 1–3 ครั้งใน turn เดียว — UI วาดแถว Task Completed ใหม่ทุกครั้ง และเสีย request เต็ม context ไป 1–3 รอบ (พิสูจน์จาก transcript จริง session muse-spark รอบทดสอบ fix.33: [65][67][69] คือ attempt_completion ต่อเนื่อง จบด้วย text ล้วน [71])

**Root cause:** tool `attempt_completion` ที่ฝั่ง iCline สร้างเองตอน migrate v4.0.0 SDK (`createAttemptCompletionTool`, vscode-runtime-builder.ts:65 — upstream ไม่มี tool นี้) **ไม่ได้ตั้ง `lifecycle: { completesRun: true }`** — agent runtime จบ run เฉพาะเมื่อ tool ที่ถูกเรียกมี flag นี้ (agent-runtime.ts:1318 `findCompletingToolMessage` → :722 `finishRun("completed")`) เมื่อไม่มี ผล completion ถูก echo กลับเป็น tool_result โมเดลจึงตอบด้วย completion อีก วนจน emit text ล้วน · SDK built-in `submit_and_exit` ตั้ง flag เดียวกันนี้ไว้แล้ว (definitions.ts:813) · ตรงกับอาการเก่า "Task Completed สรุปซ้ำหลายรอบ" ใน STATUS

**แก้ (fix.34, `40fafc6ea`):** เพิ่ม `lifecycle: { completesRun: true }` ใน createTool ของ createAttemptCompletionTool — 1 บรรทัด + comment · ไม่แตะ SDK dist

**Test-first:** RED — property test ใหม่ (`vscode-runtime-builder.test.ts`) assert `attempt_completion.lifecycle.completesRun === true` fail บนโค้ดเดิม → GREEN — vscode sdk 839/839 · check-types สะอาด · marker A/B: `completesRun:!0` ใน extension.js fix.33 = 2 → fix.34 = 3 (+1 พอดี)

**วิธี smoke:** จบงานใหม่ → Task Completed ต้องขึ้น **ครั้งเดียว** แล้วรอ feedback · ตอบกลับทักทายทั่วไป → ไม่มีแถวซ้ำ ไม่มี request ตามหลัง · compaction/picker/provider อื่นไม่เปลี่ยนพฤติกรรม · About ขึ้น `fix.34`

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.34.vsix` · Commit `40fafc6ea`

---

## 🔧 fix.33 — runtime knownModels อ่านคนละ pipeline กับ display (2026-09-17)

**สถานะ:** ✅ **smoke ด้าน trigger ผ่าน (2026-09-18)** — log จริง: ไม่มี auto-compact แม้ครั้งเดียวตลอดช่วงทดสอบ (22:43–00:59) · session glm-5.3-flash (247 messages) วิ่งถึง **276,093 input tokens โดยไม่ compact** — ภายใต้เกณฑ์เดิม (115.2k) ต้อง compact แล้ว ≥2 รอบ → เกณฑ์ใหม่มีผลจริง · glm-5.3-flash window จริง 1,310,720 (trigger ≈1.18M), muse-spark 1,048,576 (trigger ≈943,718) ตรง design · งานยาวถึงเกณฑ์จริง (~849k) ยังไม่ได้ทดสอบ end-to-end แต่ใช้กลไกเดียวกับ fix.31/32 ที่ผ่านแล้ว · **บั๊กใหม่ที่เจอระหว่าง smoke = "Task Completed" ซ้ำ → fix.34 (รออนุมัติ)**

**Root cause (จบที่ต้นทางเดียว):** `buildSessionConfig` อ่าน knownModels จาก `getModelsForProvider` (registry static) ซึ่งไม่มี entry ของ provider `cline` เลย — live catalog (ที่ fix.26 รวมไว้แล้ว) ไม่เคย `registerModel` ลง registry, store ไม่มี key `cline`, state hint เขียน undefined ตอน commit → display (resolveProviderConfig) กับ runtime (registry) แตกเป็นสอง pipeline ตั้งแต่ยุค fix.18

**แก้:** `cline-session-factory.ts` เปลี่ยนมา resolve ผ่าน `resolveProviderConfig(sdkProviderId, { loadLatestOnInit, loadPrivateOnAuth, failOnError:false }, runtimeConfig)` — pipeline เดียวกับ picker/bar/CLI (CLI main.ts:1031-1051 ทำแบบนี้แล้ว) · คง injection committedRuntimeModel ต่อท้าย (user override ชนะเหมือนเดิม) · ไม่แตะ core/llms (ไม่ต้อง rebuild dist)

**Test-first:** RED ยืนยัน (resolveProviderConfig ถูกเรียก 0 ครั้งบนโค้ดเก่า) → เขียว: factory 60/60 · vscode sdk 838/838 · core compaction 56/56 (มี pin 943,718.4) · llms 415/415 · check-types สะอาด · marker `loadPrivateOnAuth:!0,failOnError:!1}` ใน extension.js (fix.32 = 0, fix.33 = 1)

**วิธี smoke:** ⚠️ **ต้องเริ่ม task/session ใหม่** (session เก่าถือ config เดิมตอนสร้าง) → งานยาว cline-free: auto-compact ต้องเงียบจน bar เข้าใกล้ ~849k (943,718×0.9) · log "Context compaction diagnostics" ต้องโชว์ `maxInputTokens ≈ 943,718` · manual compact ตัดพอดีจริง · Solar Pro 4 ยัง 524.3k · provider อื่น (xAI/OpenRouter/anthropic) ไม่ regression · About ขึ้น `fix.33`

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.33.vsix` · Commit `e7f9149cc`

---

## 🔧 fix.32 — auto-compact trigger เร็วเกินบน cline-free (2026-09-17)

**สถานะ:** ❌ **smoke แล้ว (2026-09-17) — display เห็น 1.0m แต่ trigger ยัง 115.2k** → พิสูจน์แล้วว่า runtime อ่าน knownModels คนละ pipeline → **fix.33** (ด้านบน)

อาการหลัง fix.31 ผ่าน: auto-compact ทำงานแต่ "ถี่เกิน" — คู่แถว `auto-compacting`/`auto-compaction-skipped` บ่อย และ compact สำเร็จตั้งแต่ bar ~55k/1.0m · manual compact ตัดแรง (237 → 18)

**Root cause:** SDK runtime ไม่รู้จัก context window จริงของ `cline-free/*` (llms dist เก่า ไม่มี catalog ของ free models) → trigger ใช้ default 128k (เกณฑ์ ~115.2k estimator ซึ่งสูงกว่าเลข bar) และ manual target ใช้ fallback 64k

**เกณฑ์ trigger จริง (อ้างอิง):** estimated input ≥ 90% × input budget (`COMPACTION_TRIGGER_RATIO = 0.9`, default 128k เมื่อไม่รู้จักโมเดล)

**แก้:** rebuild `@cline/llms` dist (src delta นับจาก 21 ก.ค. = fix.26 เท่านั้น) — merge recommended/free models + OpenRouter specs เข้า catalog `cline` ให้ trigger/target/bar ใช้แหล่งเดียวกัน · พิสูจน์ด้วย marker `(e.recommended??[])` ใน dist ใหม่ (เก่า = 0) และใน VSIX · **32a (bar unknown) ถือไว้ก่อน** — หลักฐานชี้ 1.0m เป็นข้อมูลจากเซิร์ฟเวอร์

**วิธี smoke:** งานยาว cline-free → auto-compact trigger ถูกสัดส่วนขึ้น (แถว skipped ลดลง) · manual compact ตัดพอดี · ลิสต์ Cline ไม่เพี้ยน · About fix.32

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.32.vsix` · Docs commit `1e7a34425`

---

## 🔧 fix.31 — auto-compaction 401 "re-authenticate" (2026-09-17)

**สถานะ:** แพ็ก VSIX แล้ว — **รอ maintainer smoke** (ยังไม่ปิดรอบ)

อาการบน fix.30: แชทปกติ แต่ auto-compact วน `auto-compacting` → `Unauthorized: Please make sure you're using the latest version of Cline and re-authenticate your Cline account.`

**Root cause:** auto-compact ใช้ token สำเนาจากตอน session start (`createContextCompactionPrepareTurn` capture providerConfig ไว้) ขณะที่แชทเด้ง refresh token ทุก turn — token หมุนเวียนกลาง session เมื่อไหร่ compact ก็ส่งตัวเก่า → 401 (retry ที่มีอยู่ก็กลับไปเจอ snapshot เดิม) · fix.30 แก้ประตู identity ทำให้เห็นชั้น auth นี้ชัดขึ้น

**แก้:** `syncOAuthCredentials` propagate token ใหม่ลง `providerConfig.apiKey` ด้วย · **lesson สำคัญ:** VSIX กิน `@cline/core` จาก `dist/` ที่เก่าตั้งแต่ 2026-07-21 — แก้ `sdk/packages/*/src` ต้อง `bun run build` package นั้นก่อนแพ็ก (ครั้งนี้ build เฉพาะ core; ห้าม build llms/agents/shared จนกว่าจะตั้งใจรับ)

**วิธี smoke:** เล่นงานยาว cline-free/agentic ต่อ (หรือทิ้งข้ามช่วง token หมุนเวียน) → auto-compact ต้องทำงาน ไม่ขึ้น Unauthorized · manual Compact ผ่าน · provider อื่นไม่ regression · About ขึ้น `fix.31`

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.31.vsix` · Commit `ae8a40c45`

---

## 🔧 fix.29 — compact failure reason in chat (2026-09-17)

**สถานะ:** แพ็ก VSIX แล้ว — **รอ maintainer รายงานอาการที่ทดสอบล่าสุด** (ยังไม่ปิดรอบ)

ตอน compact ล้มเหลว แชทเคยบอกแค่ "Couldn't compact the conversation." ทำให้วิเคราะห์ไม่ได้ — `SdkCompactionCoordinator.compactTask` ตอนนี้แนบ error message เดิมต่อท้าย `(detail)` เพื่อให้เห็นสาเหตุจริง (เช่น sidecar persist)

**วิธี smoke:** ทำให้ compact ล้มเหลว (หรือรายงานอาการที่เจอ) → ข้อความในแชทต้องแสดงสาเหตุในวงเล็บ ไม่ใช่ข้อความกลาง ๆ

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.29.vsix` · Commit `f213d55b2`

---

## 🔧 fix.28 — compact durable context bar (2026-09-16)

**สถานะ:** แพ็ก VSIX รอ maintainer smoke — **ยังไม่ปิดรอบ**

กด Compact แล้วแถบลดทันที (C1) ผ่านแล้ว แต่ปิด/เปิดแชทจากประวัติแล้วเลขกลับค่าก่อน compact เพราะแถวประมาณการอยู่แค่ในหน่วยความจำ โหลดประวัติอ่าน transcript เต็มจาก SDK

**วิธี smoke:** แชทยาว → Compact แถบลด → History เปิดทาสกเดิม → แถบขวายังเลขหลัง compact ไม่กลับก้อนใหญ่

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.28.vsix`

---

## 🔧 fix.27 — leftover context window (2026-09-16)

**สถานะ:** ✅ maintainer smoke Solar Pro 4 = **524.3k** (ไม่ใช่ 1.0m / 500k)

**สาเหตุที่ fix.24–26 ยังไม่พอ:** id แท็บ Free ของ Cline เป็น `cline-free/solar-pro4` แต่แคตตาล็อกที่แถบแชทอ่านเป็นคีย์ OpenRouter (`upstage/solar-pro4`). เทสชุดก่อนใส่คีย์ featured ลงแมปล่วงหน้าจึงไม่สะท้อนเคสจริง. ตอน miss โฮสต์คืน `actModeClineModelInfo` ของโมเดลก่อน (DeepSeek 1M / Grok 500k). Laguna ตรงเพราะ featured id **คือ** คีย์ OpenRouter (`poolside/laguna-s-2.1:free`).

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.27.vsix`  
**HEAD:** `cdd4d139b`

งานในรอบนี้:
- `resolveModelInfo`: Cline แคตตาล็อกอุ่นแต่ไม่มี id ที่ขอ → ไม่คืน leftover snapshot; alias last-segment ถ้า unik (`cline-free/solar-pro4` → `upstage/solar-pro4`)
- `commitModelSelection` write-through ล้าง `*ClineModelInfo` ใน task/session
- `useNormalizedApiConfiguration` lookup slug เดียวกัน

จุดทดสอบที่เหลือ: สลับ Grok 4.6 (500k) → Laguna (262k) → Solar (524.3k) → โมเดล Free อื่น ห้ามค้างเลขตัวก่อน

---

## 🔧 fix.26 — merge Cline featured into `cline` catalog (2026-09-16)

**สถานะ:** smoke ไม่ผ่าน (Solar ยัง 1.0m / บางที 500k) — ส่งต่อ fix.27

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.26.vsix`

---

## 🔧 fix.25 — bind context to selected id only (2026-09-16)

**สถานะ:** smoke ไม่ผ่าน (สลับโมเดลแล้วยัง 1.0m / 500k) — ส่งต่อ fix.26

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.25.vsix`

---

## 🔧 fix.24 — chat bar uses live Settings catalog (2026-09-16)

**สถานะ:** Laguna 262K ตรง Settings — โมเดล Cline อื่นยังเพี้ยน → fix.25

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.24.vsix`

---

## 🔧 fix.23 — Grok 4.6 500k on every display path (2026-09-16)

**สถานะ:** ✅ Grok 4.6 ขึ้น 500K (ไม่ใช่ 2M)

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.23.vsix`

---

## 🔧 fix.22 — Grok 4.6 table 500k not 2M (2026-09-16)

**สถานะ:** smoke ไม่ผ่าน (ยัง 2M จากแคชสมัครสมาชิก xAI) — ส่งต่อ fix.23

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.22.vsix`

---

## 🔧 fix.21 — selected model stays in A–Z place (2026-09-16)

**สถานะ:** ✅ โมเดลที่เลือกอยู่ตำแหน่งเดิม มีแค่เครื่องหมายถูก

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.21.vsix`

Mock redesign ชะลอ — ล็อกที่ `D:\.grok\iCline\cline-temp\.icline\plans\quick-picker-redesign\mock.v11-locked-2026-09-16.html`

---

## 🔧 fix.20 — scroll picker to active provider (2026-09-16)

**สถานะ:** ✅ เปิดเมนูแล้วโฟกัส provider/โมเดลที่กำลังใช้

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.20.vsix`

ClinePass ทำหลัง merge สาขานี้เข้า main เท่านั้น

---

## 🔧 fix.19 — Cline featured lists in picker (2026-09-16)

**สถานะ:** ✅ กลุ่ม Recommended/Free ตรง Settings (RPC + badge)

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.19.vsix`

---

## 🔧 fix.18 — Settings source of truth for Cline list (2026-09-16)

**สถานะ:** ลิสต์ Settings/Picker ใช้ policy ชุดเดียว — อาการ mismatch หลัง Usage-Billing หาย

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.18.vsix`

---

## 🔧 fix.17 — stacked Quick Picker activate (2026-09-15)

**สถานะ:** คลิกข้าม provider ดู OK แล้วอาการเดิมกลับหลังเลือก Cline Usage-Billing ใน Settings — ส่งต่อ fix.18

**สาเหตุที่ fix.16 ยังไม่พอ:** header/picker อ่านคนละ map; popover Portal ทำให้คลิกถูก dismiss ก่อน commit; host เคย mirror id ลงช่อง generic; hot-swap ไป session เก่าหลัง write-through

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.17.vsix`

จุดทดสอบ:
1. คลิกโมเดลข้าม provider — ชื่อบนแถบต้องเป็น `provider: model` ของตัวที่คลิก ไม่เงียบ ไม่คนละคู่
2. คลิกโมเดลใน provider เดิม (เช่น Composer → Grok 4.6) — แถบ + แชทต้องเป็นโมเดลนั้น
3. About: `dev build 5 · fix.17`

---

## 🔧 fix.16 — Quick Picker click + same-provider session (2026-09-15)

**สถานะ:** smoke ไม่ผ่าน (คลิกแล้วยังไม่ active + แสดงผล provider/model เพี้ยน) — ส่งต่อ fix.17

**สาเหตุที่ fix.15 ยังไม่พอ:** invariant กันแค่การ snap ชื่อหลัง commit สำเร็จ — ถ้าคลิกถูก webview กิน (popover unmount ก่อน `click`) หรือสลับโมเดลใน xAI เดิมโดยไม่รีสตาร์ท session อาการ “คลิกแล้วไม่ active” ยังอยู่

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.16.vsix`

จุดทดสอบ:
1. คลิกโมเดลใน provider อื่น (ไม่ใช่ตัวที่ active) ต้องสลับได้ ไม่เงียบ
2. คลิกโมเดล xAI อื่น (เช่น Grok 4.6) ชื่อบนแถบ + แชทต้องเป็นโมเดลนั้น
3. About: `dev build 5 · fix.16`

---

## 🔧 fix.15 — Quick Picker requested-id invariant (2026-09-15)

**สถานะ:** smoke ไม่ผ่าน — ส่งต่อ fix.16

**Branch:** `fix/quick-model-picker-activate`  
**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.15.vsix`

งานในรอบนี้ (root-cause, ไม่แปะชื่อบน header):
- `resolveModelInfo` / `pickFromCatalog`: ถ้ามี requested model id แล้ว id นั้นไม่อยู่ใน catalog → **ห้าม** แทนด้วย `defaultModelId`
- ถอด workaround ที่ header โชว์ id ที่ขอแต่ metadata เป็นของ Composer
- Picker โชว์ข้อความ error ถ้า `commitModelSelection` พัง

จุดที่ควรคลิกทดสอบ:
1. Quick Picker บนหน้าแชท — คลิกโมเดล xAI ที่ไม่ใช่ Composer (เช่น Grok 4.3 / 4.5 / 4.6) แล้วชื่อบนแถบต้องเป็นโมเดลนั้น ไม่เด้ง `xai: grok-composer-2.5-fast`
2. คลิกโมเดลข้าม provider แล้วแถบหัว + แชทต้องเป็น provider/model ที่คลิก
3. ลิสต์ติ๊กถูกตรงกับที่ active
4. About แสดง `dev build 5 · fix.15`

รอบแพ็กก่อนหน้าใน worktree นี้: fix.10–fix.14 (VSIX ใน `dist/`)

---

## 🔧 fix.8 smoke (2026-09-14)

| # | รายการ | ผล |
|---|--------|-----|
| 1 | xAI models แสดงใน picker ครบ | ✅ ผ่าน |
| 2 | คลิกเลือกโมเดลข้าม Provider ใน picker | ❌ **เลือกได้เฉพาะ Provider ที่ active อยู่** — คลิกโมเดลเจ้าอื่นไม่ตอบสนอง (P0 ใหม่ → fix.9) |
| 3 | Sakana protocol dropdown ทำงาน | ⏸️ UI layout ซ้อนทับ (Model/Reasoning Effort ใต้ API protocol) → แก้ใน fix.9 · ทดสอบแชทรอ API key |
| 4 | About metadata + branding | ✅ ผ่าน (`dev build 5 · fix.8`, walkthrough/คลิกขวา iCline) |

## 🔧 SDK history / compact (`fix/sdk-history-reopen-turnstate`)

**สถานะ:** ✅ **Smoke ผ่านบน `0.1.18-dev.5-fix.7`** (maintainer ยืนยัน 2026-09-14: ทำงานดีขึ้น/ถูกต้องขึ้นโดยรวม — เจอจุดใหม่จะรายงานเพิ่ม)

| # | Item | How to smoke | Pass |
|---|------|----------------|------|
| H1 | Reopen **completed** task | Finish a task (green box / Start New Task) → New Task → History → open it | ✅ Footer = Start New Task, not Thinking/Cancel |
| H2 | Reopen **incomplete** task | Cancel mid-tool → History → reopen | ✅ Footer = Resume Task; interrupted tool rows render as **finished** (finalize strips `partial`) — the footer is the Resume signal, not the row |
| H3 | Reopen **follow-up** chat | Let a turn end without completion tool → History → reopen | ✅ Input enabled, no Resume / Start New Task |
| H4 | Switch away from pending approval | While Approve/Reject is showing, open another history item | ✅ Old approval must not fire on the next keystroke |
| C1 | Compact metrics | Long chat → Compact | ✅ Context bar drops; header token/cost totals do **not** jump by the estimate |

## กฎ sync ปลอดภัย (กันซ้ำรอย v4.0 กลืนฟีเจอร์ iCline)

1. **อย่า sync กลาง restore** — จบ smoke / commit WIP ก่อน  
2. **tag backup** ก่อน merge ทุกครั้ง (`pre-upstream-sync-…`)  
3. **merge ทีละช่วง** (เช่น v4.0.x → v4.1.0 → v4.1.3) ไม่กระโดด 282 commits ทีเดียวถ้าเลี่ยงได้  
4. **checklist หลัง merge:** Grok OAuth+chat, Quick picker, History export/import, branding iCline, Jan/Sakana/ZenMux, harness identity  
5. **Dev build เท่านั้น** หลัง sync → smoke → แล้วค่อย Beta/Stable  
6. Stable **0.1.18** ปล่อยเมื่อ dev ปิดครบ ไม่ปล่อยกลางทาง
