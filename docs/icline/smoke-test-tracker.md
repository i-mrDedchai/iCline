**Last updated:** 2026-08-05
**Branch:** `sync/upstream-v4.0.0`
**HEAD:** (local WIP — xAI OAuth + identity + Quick picker)
**vsix:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5.vsix` (WIP smoke build 2026-08-05 09:42, ~11.25 MB) — **ยังไม่ commit**


**Release plan:** finish restore on **dev.5** → then **dev.6** = dynamic model lists for all providers.

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
code --install-extension "D:\.grok\iCline\cline-temp\apps\vscode\dist\i-mrdedchai.iCline-0.1.18-dev.5.vsix" --force
```

แล้ว **Developer: Reload Window**

จุดที่ควรเช็ค: Jan · xAI OAuth+chat · Quick picker (expand/effort) · agent แนะนำตัว iCline · History export/import

---

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
