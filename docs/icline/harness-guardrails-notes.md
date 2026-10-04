# iCline Harness — Design Notes & Decision Log

บันทึกการตัดสินใจของ harness ชั้น app (`apps/vscode/src/icline/harness/` + `apps/vscode/src/sdk/hooks-adapter.ts`) — อัปเดตเมื่อมีการตัดสินใจใหม่ ไม่ใช่เอกสารที่เขียนครั้งเดียวทิ้ง

## เหตุที่ guardrail อยู่ชั้น app ไม่ใช่ core

Post-write verification และ failure-envelope guard อยู่ใน `apps/vscode/src/sdk/hooks-adapter.ts` (hook layer ของ host) ไม่ใช่ `sdk/packages/core`:

- core คือ upstream ที่ fork มา — guardrail เฉพาะของ iCline (เช่น บังคับ verify หลังเขียนไฟล์) ไม่ควรเปลี่ยน semantics ของ SDK ที่ app อื่นใช้อยู่
- envelope guard (`{success:false, error}` ที่ runtime ไม่ตั้ง `isError`) แก้บั๊กเฉพาะการ integrate ของ fork นี้ (phantom-write dev.6) — เป็นความรับผิดชอบของ host ที่ตีความ result envelope
- ข้อเสียที่ยอมรับ: subagent หรือ consumer อื่นที่ไม่ผ่าน hook ชั้นนี้จะไม่ถูก verify (ดู C1 ในรายงาน audit หลอมรวม)

## ช่องหลบ guardrail ที่ยอมรับโดย design

- **`run_commands` + shell redirection** (`>`, `>>`, `tee`, heredoc) เขียนไฟล์ได้โดยไม่ผ่าน post-write verification — guardrail ครอบคลุมเฉพาะ `editor` / `apply_patch` การปิดช่องนี้ต้อง parse shell ทุกแบบซึ่งเกิน scope และเสี่ยง false positive กว่าที่ได้
- โมเดลควรรู้: overlay บอกแล้วว่าไฟล์ที่เขียนควรผ่านเครื่องมือแก้ไขไฟล์ — แต่ไม่ได้ห้าม shell write เป็น absolute (ห้ามแล้วจะเจองานที่จำเป็นต้องใช้)

## ขอบเขตของ post-write verification (ณ 2026-10-03)

- ตรวจ **exists + is file + min bytes** เท่านั้น — insert ผิดบรรทัด/เขียนเนื้อหาผิดยังผ่านการตรวจ
- ที่ทำได้จริงโดยไม่ false positive: **hash เฉพาะกรณี full-file write** (เขียนทั้งไฟล์ใน call เดียว → เทียบ hash เนื้อหากับ payload ได้) — แผนเฟส 3 ยังไม่ทำ
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
