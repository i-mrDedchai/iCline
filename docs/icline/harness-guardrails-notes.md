# iCline Harness — Design Notes & Decision Log

บันทึกการตัดสินใจของ harness ชั้น app (`apps/vscode/src/icline/harness/` + `apps/vscode/src/sdk/hooks-adapter.ts`) — อัปเดตเมื่อมีการตัดสินใจใหม่ ไม่ใช่เอกสารที่เขียนครั้งเดียวทิ้ง

## เหตุที่ guardrail อยู่ชั้น app ไม่ใช่ core

Post-write verification และ failure-envelope guard อยู่ใน `apps/vscode/src/sdk/hooks-adapter.ts` (hook layer ของ host) ไม่ใช่ `sdk/packages/core`:

- core คือ upstream ที่ fork มา — guardrail เฉพาะของ iCline (เช่น บังคับ verify หลังเขียนไฟล์) ไม่ควรเปลี่ยน semantics ของ SDK ที่ app อื่นใช้อยู่
- envelope guard (`{success:false, error}` ที่ runtime ไม่ตั้ง `isError`) แก้บั๊กเฉพาะการ integrate ของ fork นี้ (phantom-write dev.6) — เป็นความรับผิดชอบของ host ที่ตีความ result envelope
- ข้อเสียที่ยอมรับ: consumer ที่ไม่ได้ถือ hook ชั้นนี้ (เช่น SDK consumer ภายนอก) จะไม่ถูก verify — **แต่ subagent จาก `spawn_agent` ได้ verify แล้ว**: delegated agent รับ `hooks: runtimeConfig.hooks` (delegated-agent.ts) เท่ากับ hook ของ session หลัก (ช่องว่างที่เหลือคือ prompt — ปิดแล้วด้วย C1, ดู decision log)

## ช่องหลบ guardrail ที่ยอมรับโดย design

- **`run_commands` + shell redirection** (`>`, `>>`, `tee`, heredoc) เขียนไฟล์ได้โดยไม่ผ่าน post-write verification — guardrail ครอบคลุมเฉพาะ `editor` / `apply_patch` การปิดช่องนี้ต้อง parse shell ทุกแบบซึ่งเกิน scope และเสี่ยง false positive กว่าที่ได้
- โมเดลควรรู้: overlay บอกแล้วว่าไฟล์ที่เขียนควรผ่านเครื่องมือแก้ไขไฟล์ — แต่ไม่ได้ห้าม shell write เป็น absolute (ห้ามแล้วจะเจองานที่จำเป็นต้องใช้)

## ขอบเขตของ post-write verification (ณ 2026-10-03)

- ตรวจ **exists + is file + min bytes** เท่านั้น — insert ผิดบรรทัด/เขียนเนื้อหาผิดยังผ่านการตรวจ
- ที่ทำได้จริงโดยไม่ false positive: **hash เฉพาะกรณี full-file write** (เขียนทั้งไฟล์ใน call เดียว → เทียบ hash เนื้อหากับ payload ได้) — ทำแล้วในเฟส 3 (D10, ดู decision log)
- Update ที่ย่อไฟล์ได้ = assertion แค่ existence (min bytes 0) — ถูกต้องแล้ว

## Fail-open แต่ไม่เงียบ

Verifier ห้ามทำ turn พังเด็ดขาด (ทุก exception ถูกกลืน) — แต่ทุกช่องว่างต้องทิ้งหลักฐานแบบ forced ใน tool trace:

- `post-write-verify-skipped-no-targets` — เขียนไฟล์แต่ parse target ไม่ได้ (patch ที่ executor รับได้แต่ harness ไม่เข้าใจ)
- `post-write-verification-error` — verifier เอง throw

ก่อนหน้านี้สองกรณีนี้หายเงียบ ทำให้ phantom-write ตรวจย้อนยาก

## Decision log

### 2026-10-03 — ลบ mistake counters (`HarnessMistakeState` ทั้งชุด)

รากของ "Fable-inspired mistake tracking" ที่ไม่เคยต่อเข้า loop (ไม่มี production caller) เลือกลบแทนที่จะ wire เพราะ:

- ตัวเลข verification failure ยังไม่น่าเชื่อถือจนกว่า pipeline จะแม่น (ก่อน fix A1 `Move to` ทุก rename นับเป็น failure เท็จ)
- ถ้าจะนำกลับ ให้เริ่มจากนับ `post-write-verification-failed` ใน trace ซึ่งมีหลักฐานครบอยู่แล้ว

### 2026-10-03 — ลบ `normalizeCompactionThreshold`

- ไม่มี production caller; core ใช้ค่าคงที่ `COMPACTION_TRIGGER_RATIO = 0.9` (`sdk/packages/core/src/extensions/context/compaction-shared.ts`) ไม่รับค่าจากภายนอก → ต่อให้ wire ก็ไม่มีที่ให้ยัด
- **กับดัก:** default ของ clamp (0.75, ช่วง 0.5–0.95) ขัดกับ 0.9 ของ core — ถ้า wire แบบ naive จะ compact เร็วกว่าที่ core ตั้งใจ (context ถูกตัดก่อนจำเป็น)
- ถ้าต้องการ clamp จริง ต้อง patch core ให้ ratio รับค่าได้ก่อน อย่าฝืน clamp ฝั่ง fork ลอย ๆ

### 2026-10-03 — A1 `apply_patch` + `*** Move to:` verify ปลายทาง

`Update File` + `Move to` = executor เขียนปลายทางแล้วลบต้นทาง (`fs.rm(sourceAbsPath)`) — verify path เก่า = stat fail = รายงานเท็จทุก rename ตอนนี้ `extractPatchTargets` ตาม `Move to` ไป verify ปลายทาง (ดู test ใน `hooks-adapter.test.ts`)

### 2026-10-04 — เฟส 3: C1 subagent prompt, C2 display-name, C3 loop guard, D1 multi-root, D10 content hash

- **C1 subagent overlay/identity:** prompt ของ subagent เป็น model-authored (`spawn_agent.input.systemPrompt`) และ `buildSubAgentSystemPrompt` wrap เฉพาะ provider "cline" → subagent ของ iCline เคยวิ่งเปล่า ไม่มี overlay/identity แก้ที่ app layer ตาม ADR: `beforeTool` (hooks-adapter) rewrite prompt — identity ก่อน แล้วต่อ `getIclineHarnessOverlay()`; hooks/extension rules ไหลถึง delegated agent อยู่แล้ว ช่องว่างคือ prompt เท่านั้น หมายเหตุ: overlay ปรับถ้อยคำบรรทัด `<env>` ให้ session-agnostic เพราะ subagent ไม่มี `<env>` block (กัน stale reference แบบ A2)
- **C2 display-name:** แยก `PROVIDER_DISPLAY_NAMES` + `getProviderDisplayName` ใน guardrails.ts — overlay (F1) กับ `# Active Session` (cline-session-factory) ใช้ตารางเดียวกัน ไม่มีทางเลี่ยนกันอีก; ตัด "report these values exactly" ที่สั่งรายงาน raw id ขัดกับ F1 เปลี่ยนเป็น "name the provider by its display name" เหมือนกันทั้ง prompt; unknown id ไม่ถูกตั้งชื่อเอง (fallback = raw id)
- **C3 loop/stall guard:** counter ใน hook layer — tool+args เดิมซ้ำครบ 3 (และทุก ×3) เตือนผ่าน `appendContext` (soft, non-blocking) + trace `tool-loop-warning` (forced) การเตือนแบบ polling ยังใช้ได้ตามปกติ — เป้าหมายคือทำให้ loop มองเห็น ไม่ใช่ห้ามซ้ำ
- **D1 multi-root fallback:** (ใช้เฉพาะเมื่อไม่มี sessionCwd — D2 มาก่อนเสมอ) relative path ที่ชื่อ root folder ("two/src/x.ts" กับ root `.../two`) → resolve กับ root นั้นแบบ longest-prefix; ไม่งั้น root ที่ไฟล์มีจริง (root ยาวสุดชนะ); สุดท้าย root แรก
- **D10 content hash เฉพาะ full-file write:** `expectedContent` ถูกส่งเฉพาะ editor create (`old_text` ว่าง + `insert_line` ว่าง/0 — 0 เป็น filler ตาม `normalizeInsertLine`) และ `*** Add File` (ต่อเนื้อหาเหมือน parser: `lines.join("\n")`; block พังยอมเสีย hash เก็บ existence) เทียบ sha256 หลัง normalize CRLF→LF เพราะ executor rewrite EOL ตาม platform — content ตรงต้องไม่แพ้เพราะ line ending
- **test gap #5/#6:** real-fs verify (junction/symlink, long path 260+ chars, directory, stale content, EOL tolerance) ใน `guardrails.test.ts` + integration chain move/hash (`hooks-adapter-fs.test.ts` — executor ฝั่ง rename ปักไว้ที่ test ของ sdk core แล้ว) **ยังไม่ครอบคลุม UNC/ACL** — fabricate ไม่ได้จริงบนเครื่อง dev (ต้องมี share/permission จริง) ถ้าจะปิดช่องนี้ต้องรันบนเครื่องที่มี UNC share
