**Last updated:** 2026-09-20 (fix.23)
**Branch:** `feat/upstream-waves-1-2` (จาก main @ `78ebd0923` — รวม dev.5 แล้ว, tag `pre-merge-dev.5`, ยังไม่ push)
**HEAD:** ดู `git log` (ไม่ตรึง hash ไว้ตรงนี้ — มันตกหล่นทุกครั้งที่มี commit เอกสารตามหลัง) · **fix.23 ยังไม่ commit** (รอบปัจจุบัน — pack จาก working tree) · **fix.7–fix.22 commit แล้ว ยังไม่ push** (`88ff6028b` fix lifecycle ของวิว · `29c24e71c` e2e ขนาน + fixture auxiliary bar + เทสต์ใหม่ · `af58ebbad`/`8aec05f6c` เอกสาร fix.20 · fix.21 Recent หลายคอลัมน์ + draft รอดการย้ายวิว) · **fix.22 ยังไม่ commit** (รอบปัจจุบัน — เตรียมแพ็กเป็น `fix.22`)
**vsix (ล่าสุดที่มีอยู่):** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.23.vsix` (12,089,267 B @ 2026-09-20T13:02:26Z · 60 files · About = `dev build 6 · fix.23` — ตรวจในไบต์จริงแล้วว่ามีเพดานใหม่ `32000` + ข้อความรูปที่ถูกย่อ และสคริปต์คืน `package.json`/`build-metadata.ts` เรียบร้อย)· ⏳ รอ maintainer smoke · **ห้ามใช้ `fix.22` หรือก่อนหน้า smoke เรื่องรูป/ไฟล์ใหญ่** (fix.22 ยังมีกำแพง 6,000 ของ `editor` และยังไม่มีการย่อรูป) · ของเดิม: `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.22.vsix` (12,086,670 B @ 2026-09-20T12:16:30Z · 60 files · About = `dev build 6 · fix.22` — ตรวจแล้วว่าสตริงอยู่ในบันเดิล webview จริง และ host bundle มีโค้ดใหม่ (`nothing new above the cut to fold` · ตัวประเมินรูป) · สคริปต์คืน `package.json`/`build-metadata.ts` แล้ว ไม่มี `.wip.bak` ตกค้าง) — ⏳ รอ maintainer smoke · **ห้ามใช้ `fix.21` (หรือก่อนหน้า) smoke เรื่อง compaction/รูป — ยังมีบั๊กตัวประเมิน และ Recent ยังไม่มีป้ายเวลา** · do not overwrite `fix.1`–`fix.21` ใน `dist/` (fix.20 = 12,084,123 B @ 2026-09-20T09:28:31Z · fix.19 = 11,967,453 B @ 2026-09-20T06:07:27Z · fix.18 = 11,967,298 B @ 2026-09-20 05:36:02Z)

---

## 🔧 dev.6-fix.23 — เพดาน `editor` 6,000 → 32,000 ตัวอักษร + **ย่อรูปก่อนเข้าโมเดล** (2026-09-20)

**สถานะ:** ✅ เสร็จ (2 ใน 4 ข้อที่อนุมัติ) · core `bun run build` สะอาด · core รวม **2,504 เทสต์: 2,397 ผ่าน / 21 fail / 86 skip** โดย **21 ตัวที่ fail ไม่เกี่ยวกับรอบนี้เลย** (`cron-runner` 10 · `hub/server` 3 · `runtime-builder` MCP 2 · `workspace-manifest` 2 · `hook-file-hooks` · `checkpoint-hooks` · `local-provider-service` offline · `runtime-commands` — ทุกตัวพังอยู่ก่อนและไม่แตะไฟล์ที่รอบนี้แก้) · กลุ่มที่แตะ: `media` + `extensions/tools` + `message-builder` + `user-input-builder` **428 ผ่าน** · app vitest `hooks-adapter`/`tool-write-pipeline`/`guardrails` **27/27** · `bun run repro:editor-write` **PASS ทุกข้อ** · e2e บน VS Code จริง `oversized-editor-write` **3/3 (24.4s)** · `tsc` สะอาด (app compat · e2e generated) · biome ไม่มี error ใหม่ · **แพ็กแล้ว:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.23.vsix` (12,089,267 B @ 2026-09-20T13:02:26Z · 60 files) — ตรวจในไบต์จริงแล้วว่า host bundle มี `-character per-call limit` + `32000` + `downscaled to fit the model's image input` และ webview bundle มีสตริง `fix.23` · สคริปต์คืน `package.json`/`build-metadata.ts` แล้ว (ไม่มี `.wip.bak` ตกค้าง · `git status` มีแต่ไฟล์ที่ตั้งใจแก้)

### ข้อ 2 — ลบกำแพง 6,000 ตัวอักษรของ `editor` (รากของคำขอที่บานปลาย)

- **หลักฐานจากแชทจริง:** 6 ใน 9 ครั้งของข้อความสีส้มคือ `Editor input too large: new_text was 6079/6113/6729/7144/8181 characters` ⇒ ทุกไฟล์ HTML/CSS/JS ที่ยาวกว่านี้ถูก **ปฏิเสธก่อนแตะดิสก์** แล้วโมเดลต้องฉีกเป็น 2–4 คำขอ (แต่ละครั้ง = provider round trip เต็ม) · ตอนที่มาถึงเครื่องมือ argument นั้น **ถูกส่งมาครบและ parse สำเร็จแล้ว** ⇒ เพดานนี้ไม่ได้กันอะไรในจังหวะที่มันปฏิเสธ
- **แก้:** `EDITOR_INPUT_CHAR_LIMIT = 32_000` (ใหม่ ใน `extensions/tools/schemas.ts` ใช้ทั้งการตรวจขนาด + คำอธิบาย schema ที่โมเดลอ่าน) · `INPUT_ARG_CHAR_LIMIT = 6000` ยังอยู่ตามเดิมในฐานะ "งบคำแนะนำ" ของข้อความ command เท่านั้น (ไม่มีการบังคับใช้) · ข้อความปฏิเสธใหม่บอก **ขนาดจริง + ยังไม่เขียนอะไรลงดิสก์ + วิธีส่งใหม่ (chunk + `insert_line`)** ในข้อความเดียว (เดิมมีถ้อยคำ "less likely to be truncated or time out" ที่ชี้สาเหตุผิด) และ **ตัดถ้อยคำซ้ำ** ที่ fork ต่อท้ายอีกชั้นออก
- **ตัวเลขเพดานต้องมีที่เดียว:** fork เห็นผ่าน `EDITOR_INPUT_CHAR_LIMIT` ที่ `apps/vscode/src/icline/harness/guardrails.ts` (vitest alias `@cline/core` เป็น stub ∴ import ค่าจริงไม่ได้ — มีเทสต์ปักตัวเลข + `bun run repro:editor-write` พิสูจน์กับเครื่องมือจริง) · overlay ที่โมเดลอ่านตอนนี้บอกว่า **"ไฟล์ทั้งไฟล์ลงในคำขอเดียวได้ ไม่ต้องฉีก"** แล้วค่อยบอกวิธีฉีกเมื่อเกินเพดาน
- **พิสูจน์ขอบเขตจริง (`bun run repro:editor-write`, เครื่องมือจริง + ดิสก์จริง):** 32,000 สำเร็จ/32,001 ถูกปฏิเสธ · แบทช์ขนาน 4 คำขอที่ "ขนาดเดิมจากทรานสคริปต์" (5000 · 7020 · 6741) **ลงดิสก์ได้ทุกใบในคำขอเดียว** (ก่อนรอบนี้ 7020/6741 ถูกปฏิเสธ) และเฉพาะ 32,500 ที่ถูกปฏิเสธ ⇒ `success=[true,true,true,false]`
- e2e บนหน้าต่าง VS Code จริง (`oversized-editor-write.test.ts`) อัปเดตมาใช้เพดานใหม่ (fixture ดึงขนาดจากค่าคงที่ของแอปเอง ∴ เลื่อนหลุดขอบเขตไม่ได้) และยังยืนยันครบ 4 อย่าง: ไม่มีไฟล์ลงดิสก์ · ข้อความของเครื่องมือถึงโมเดล · ไม่มี ENOENT · มีวิธีส่งใหม่ในข้อความที่ผู้ใช้เห็น

### ข้อ 3 — รูปต้องถูกย่อก่อนเข้าโมเดล (dependency-free PNG codec)

- **ทำไม:** รูปที่อยู่ในทรานสคริปต์ถูกส่งซ้ำ **ทุกคำขอต่อจากนั้น** และผู้ให้บริการย่อรูปเองอยู่แล้ว (Anthropic 1,568px · OpenAI-compatible ~2048px + เพดาน image token) ⇒ พิกเซลที่เกินกว่านั้นไม่มีใครเห็น แต่ต้องจ่ายค่าส่งทุกคำขอ
- **โค้ดใหม่ `sdk/packages/core/src/media/png.ts`** (ไม่มี dependency เพิ่ม — `node:zlib` + ถอด/เข้ารหัส PNG เอง): รองรับ colour type 0/2/3/4/6 · bit depth 8 · non-interlaced · box filter แบบ **premultiplied alpha** (กันขอบดำ/halo) · เข้ารหัสใหม่เป็น RGBA ที่ deflate ระดับ 3 (วัดแล้ว: ระดับ 6 แพงกว่า ~5 เท่าเพื่อลดขนาดไม่ถึง 10% และงานนี้วิ่งอยู่ใน tool call)
- **ย่อที่จุดที่รูป "เข้า" ไม่ใช่ตอนส่ง** (ราคา decode/encode ต่อเทิร์นจะแพงกว่าที่ประหยัด): `read_files` ที่อ่านไฟล์ `.png` · `buildInitialUserContent` สำหรับรูปที่ผู้ใช้แปะ ⇒ ทั้งคู่เรียก `downscalePngIfNeeded` / `downscaleBase64Png`
- **ทุกทางออกของความล้มเหลว = คืนของเดิม:** ไม่ใช่ PNG · เล็กกว่าเพดานอยู่แล้ว · ถอดรหัสไม่ได้ (16-bit/ย่อย palette/interlaced/ไฟล์ขาด) · **หรือไฟล์ที่เข้ารหัสใหม่ไม่เล็กกว่าเดิม** ⇒ GIF/JPEG/WEBP ผ่านไปทั้งไบต์ (GIF animated ห้าม re-encode)
- **ตาข่ายกันล้มของ `MessageBuilder` เปลี่ยนจาก "ทิ้ง" เป็น "ย่อ":** รูปที่เกินงบต่อใบเคยถูกแทนด้วย `[media omitted: …]` (โมเดลอ่านแต่ placeholder) ⇒ ตอนนี้ลองย่อให้พอดีก่อนตัดสินใจทิ้ง และทำ **เฉพาะเส้นทางที่เกินงบอยู่แล้ว** ∴ ไม่มี CPU เพิ่มในเส้นทางปกติ
- เทสต์ใหม่ 20 ข้อ: `media/png.test.ts` 14 (round-trip · ฟิลเตอร์ 1–4 ที่ทดสอบด้วย PNG ที่สร้างฟิลเตอร์เอง · palette + tRNS · grayscale/gray+alpha · ข้อกำหนด "คืน undefined ไม่เดา" · box filter + alpha) · `file-read.test.ts` (+1: รูป 2400×1600 ถูกย่อเป็น 1568×1045 และรายงานขนาดเดิม→ใหม่) · `user-input-builder.test.ts` ใหม่ 5 · `message-builder.test.ts` (+1: เกินงบ ⇒ ย่อให้พอดี ไม่ใช่ทิ้ง)

### จุด smoke (fix.23)

- **ไฟล์ใหญ่ลงในคำขอเดียว:** ให้ agent สร้างไฟล์ HTML/CSS ที่ยาว ~7,000–10,000 ตัวอักษร ⇒ **ต้องไม่เห็น** `Editor input too large` และ **ไม่ต้องมีคำขอเขียนไฟล์ซ้ำ/แยกชิ้น** (ก่อนแก้: ทุกไฟล์ถูกปฏิเสธแล้วฉีก 2–4 คำขอ)
- **เพดานยังทำงานเมื่อเกินจริง:** ถ้าเจอ `Editor input too large` ต้องบอกขนาดจริง + "nothing was written" + วิธีส่งใหม่ (และต้องมีแค่ที่เดียว ไม่ซ้ำเป็นสองบรรทัด)
- **รูปไม่กินคอนเทกซ์:** ให้ agent อ่านรูป `.png` ขนาดใหญ่ (screenshot หน้าจอเต็ม) ⇒ ผลลัพธ์ต้องมีข้อความ `… (downscaled to fit the model's image input: 3024x1964 → 1568x1019, …)` และ **คำขอถัด ๆ ไปต้องไม่พา base64 ขนาดเดิมไปด้วย** (ดู `inputTokens` ต่อคำขอ — ไม่ควรกระโดดเป็นแสนเพราะรูปใบเดียว)
- **รูปที่แปะจากผู้ใช้:** แนบ screenshot ใหญ่ในช่องแชท ⇒ รูปย่อในช่องแชท **ไม่** เปลี่ยนขนาดที่เห็น (การย่อเกิดฝั่งส่งเข้าโมเดล) และยังส่งได้ตามปกติ
- ของเดิมทั้งหมดของ fix.18–fix.22 ยังใช้ได้

### คิวถัดไป (2 ข้อที่เหลือของชุดที่อนุมัติ)

1. **งานเดินต่อได้ขณะออกจากหน้าแชท (หลาย session พร้อมกัน)** — สถาปัตยกรรมวันนี้ถือ session เดียวต่อ view; ต้องมีโมเดล "หลาย task ที่ยัง active" ฝั่ง host ก่อน
2. **Working badge บนการ์ด Recent** — ต้องมีข้อ 1 ก่อนจึงจะไม่โกหก

---

## 🔬 dev.6-fix.22 — ตรวจแชท smoke จริงของ fix.21 → รากของ "auto-compacting ถี่ + ช้าลง" คือ **base64 ของรูปใน `read_files`** (2026-09-20)

**สถานะ:** ⏳ รอบนี้ยังไม่แพ็ก VSIX · เทสต์ที่รัน: shared `436` (ใหม่ `tokens` 10) · core `extensions/context` **92** (ใหม่ skip-log 1) · llms `gateway` **156** · webview vitest **545/545** (ใหม่ `recentTime` 7 + `HistoryPreview` 1) · extension bun unit `Logger` **4** · `tsc` สะอาด (app · webview · shared · core) · biome ไม่มี error ใหม่ (เหลือ a11y info เดิม 4 ตัว) · **ยังไม่ commit**

### หลักฐานที่อ่านมา (ไม่ใช่การเดา)

ตรวจจากของจริงบนเครื่องผู้ใช้ ไม่ได้ดูแค่ภาพหน้าจอ:
- **ทรานสคริปต์ของ session จริง:** `~/.cline/data/sessions/1789900461463_19uqa/` — `การทดสอบ Dev.6-fix.21 รอบที่ 1 (DeepSeek-v4.1-Flash)` · 246 ข้อความ · 108 คำขอ · 75 นาที · `inputTokens` รวม **15.08M** · `inputTokens` ต่อคำขอโตจาก 4,413 → **166,027** · กลางทางมี **สองจุดที่ prompt ลดฮวบ** (220,329 → 114,060 ตอน +53 นาที · 252,871 → 91,449 ตอน +66 นาที)
- **sidecar ของการ compact:** `…compaction.json` (ตัด 177 ข้อความ → เหลือ 65) · **log ของ VS Code:** `%APPDATA%/Code/logs/20260919T193604/window1/exthost/output_logging_20260920T170810/1-Cline.log` (9 MB · `Context compaction diagnostics` 110 ครั้ง · `Performed agentic compaction` **1 ครั้ง** ที่ 11:40:11Z)
- **ขนาดข้อความในทรานสคริปต์:** 4 ข้อความกินพื้นที่ **~3.96 MB จาก 5.26 MB ทั้งหมด** และทั้งสี่คือ `tool_result` ของ **`read_files` ที่อ่านไฟล์ `.png`** (`nodal-hero-1440` 987k ตัวอักษร · `nodal-gallery` 1.16M · `nodal-physics` 891k · `nodal-thai-drum` 918k — เวลา 11:39:55 / 11:40:05 / 11:41:23 / 11:44:56 น. ซึ่งคือ **นาทีก่อนและหลังการ compact ครั้งเดียวที่สำเร็จ**)

### คำตอบ 4 ข้อที่ maintainer ถาม

**1) ข้อความสีส้ม = tool ล้มเหลวจริง ไม่ใช่บั๊ก และไม่ใช่ Error ของแอป**
ทั้ง 9 ครั้งเป็นผลลัพธ์ของเครื่องมือที่ล้มเหลวและถูกทำเครื่องหมาย `is_error` อย่างถูกต้อง ⇒ สีส้มคือความหมาย "เครื่องมือนี้ล้มเหลว" ที่ควรมี · **แต่วิธีแสดงซ้ำซ้อนเกินไป** — ข้อความเดียวกันโผล่สองที่ (ผลลัพธ์ของ tool + แถวสรุป `1 tool call(s) failed: [editor] …` ซึ่งมาจาก MistakeTracker ใน `session-runtime-orchestrator.ts`) · และ 6 ใน 9 ครั้งเป็นเรื่องเดียวกัน: **`editor` รับ `new_text` ได้ไม่เกิน 6,000 ตัวอักษรต่อการเรียก** (`INPUT_ARG_CHAR_LIMIT` ใน `sdk/packages/core/src/extensions/tools/schemas.ts`) ซึ่งชนกับงานเขียนไฟล์ HTML/CSS/JS ทั้งไฟล์ทันที (6079 · 8181 · 6113 · 6729 · 7144 ตัวอักษร) ⇒ โมเดลต้องฉีกเป็น 2–4 คำขอเพิ่มทุกครั้ง (นี่คือสาเหตุหลักของ "คำขอเยอะขึ้น" ไม่ใช่บั๊กของ UI)

**2) `auto-compacting` / `auto-compaction-skipped` ถี่ = compaction ถูกกระตุ้นด้วย "ขนาด base64 ของรูป" ไม่ใช่จำนวน token จริง**
- เกณฑ์กระตุ้นคือ `estimated request ≥ 90% × maxInputTokens` และตัวประเมินคือ `estimateRequestInputTokens` = `JSON.stringify(ทั้งคำขอ).length / 3` (`CHARS_PER_TOKEN = 3`) — **ไม่มีกรณีพิเศษสำหรับบล็อกรูป** ⇒ รูป 1 ใบ ~0.9–1.2 MB ถูกคิด **~300,000 token** แทนที่จะเป็น ~1,600 token ที่ผู้ให้บริการคิดจริง (สูงเกิน ~200 เท่า)
- พอโมเดลอ่านภาพ 2 ใบ (11:39:55 + 11:40:05) ตัวเลขประเมินก็กระโดดข้ามเกณฑ์ 90% ทันที ⇒ `auto-compacting` แล้วจึงสำเร็จ 1 ครั้ง ⇒ **จากนั้นอ่านรูปเพิ่มอีก 2 ใบ** (11:41:23 + 11:44:56) ⇒ กลับไปเกินเกณฑ์อีก ⇒ **คู่ `auto-compacting`/`auto-compaction-skipped` ทุกตา** และคิวที่ "ยากขึ้นเรื่อย ๆ" = งานที่ต้อง compact ถูกยกขึ้นเป็นคำขอเพิ่ม (prompt พา base64 ไปด้วยทุกคำขอ) — ตรงกับที่ maintainer เห็น
- **ทำไม log เงียบ:** (ก) `Logger` ของ extension จะต่อท้าย payload ให้ **เฉพาะเมื่อ `IS_DEV=true`** ⇒ ใน VSIX (`1-Cline.log` 9 MB) คำว่า `requestInputTokens`/`maxInputTokens` **ไม่ปรากฏเลยแม้แต่ครั้งเดียว** (ข) เส้นทาง `return undefined` ของการ compact (มี 3 จุด: ทรานสคริปต์สั้นเกินไป / ไม่มีจุดตัดที่ปลอดภัย / ไม่มีอะไรใหม่เหนือจุดตัด) **ไม่ log อะไรเลย** ⇒ เห็นแต่ข้อความ notice บนจอที่ไม่ได้ถูกเก็บลงทรานสคริปต์
- **สาเหตุที่ไม่ใช่ "compact เร็วเกิน" แบบ fix.32/33:** รอบนั้นแก้เรื่องหน้าต่างของโมเดล (1.0M) ให้ runtime รู้จัก (fix.33 เป็นบรรพบุรุษของ HEAD นี้แล้ว) · รอบนี้คือ **ตัวประเมินนับรูปผิด** ซึ่งทำให้เกินเกณฑ์ได้แม้หน้าต่างจริงยังห่างไกล (จริง ๆ prompt อยู่ที่ 166k / 1.0M = 17%)

**3) ลำดับของประวัติแชท** → เพิ่ม **ป้ายบอกความใหม่** บนการ์ด (ข้อ 3 ของรายการที่ทำด้านล่าง)

**4) ทำงานเบื้องหลัง + Working badge** → **ยังไม่ทำในรอบนี้** เพราะเป็นการเปลี่ยนสถาปัตยกรรม (iCline ถือ session เดียวต่อ view) · ต้องออกแบบก่อน (ดู "คิวถัดไป")

### สิ่งที่แก้ในรอบนี้ (ราก+การมองเห็น)

- **`sdk/packages/shared/src/llms/tokens.ts` (รากของเรื่อง):** เพิ่ม `IMAGE_TOKEN_ESTIMATE = 1_600` และ `estimateValueTokens(value)` ที่ **พับ payload ของรูปทิ้งก่อนคิดขนาด** (คืน `[image]` แล้วบวก 1,600 token ต่อรูป) ครอบคลุมทั้ง `{type:'image',data}` · `{type:'image',source:{data}}` (สไตล์ Anthropic) · `{type:'image_url',image_url:{url:'data:image/…'}}` (สไตล์ OpenAI) และ data URL ที่ลอยอยู่ทั่วไป · **`estimateRequestInputTokens` และ `createTokenEstimator` ของ compaction ใช้ตัวเดียวกัน** ⇒ เกณฑ์กระตุ้น, หน้าต่าง `preserveRecentTokens`, และสูตรจุดตัด อ่านหน่วยเดียวกันหมด (เดิมตัวประเมินเองก็เป็นเหตุให้ "โซนเก็บท้าย" ยุบเหลือ 1–2 ข้อความเมื่อมีรูป ⇒ บางตาก็ไม่มีอะไรให้ fold ⇒ skip)
- **การมองเห็น:** `apps/vscode/src/shared/services/Logger.ts` — payload ถูกเก็บไว้เสมอสำหรับข้อความวินิจฉัยที่ตั้งใจให้อ่านในสนาม (`Context compaction diagnostics` · `Context compaction completed` · `Skipped compaction…` · `Agentic compaction …` · `Agent model request diagnostics`) และมี `CLINE_LOG_PAYLOADS=true` เป็นสวิตช์เปิดทั้งหมด (พร้อมตัดที่ 2,000 ตัวอักษรต่อ payload กัน log บวม)
- **เหตุผลของ skip ถูกบันทึกแล้ว:** `agentic-compaction.ts` ทั้ง 3 จุดที่เคย `return undefined` เงียบ ๆ + จุดที่ wrapper เห็นว่าไม่ได้ผล ⇒ `Skipped agentic compaction: …` / `Skipped compaction: strategy returned no result`
- **Recent บอกลำดับได้:** `webview-ui/src/icline/recentTime.ts` — ป้ายบอกความใหม่ "just now" → "14:32" (วันเดียวกัน) → "Yesterday" → "Fri" → "Sep 10" + `title` เป็นวันเวลาเต็ม · **ไม่เพิ่มความสูงการ์ด** และไม่แตะกริด/จำนวนคอลัมน์

### จุด smoke (fix.22)

- **รูปไม่ทำ compaction พัง:** แชทที่ `cline-free/*` (หน้าต่าง 1.0M) → ให้ agent อ่าน **ไฟล์ภาพ 3–4 ใบ** ผ่าน `read_files` ⇒ **ต้องไม่เห็น `auto-compacting` เลย** (ก่อนแก้: 1–2 ใบก็กระตุ้นแล้ว) และ `1-Cline.log` ต้องมี `Context compaction diagnostics` **พร้อมตัวเลข** (`requestInputTokens`, `maxInputTokens ~1,048,576`, `shouldCompact=false`)
- **ถ้ามี skip ต้องรู้สาเหตุ:** ถ้าเห็น `auto-compaction-skipped` ให้เปิด `1-Cline.log` ต้องเจอบรรทัด `Skipped agentic compaction: …` หรือ `Skipped compaction: strategy returned no result` ระบุเหตุผล
- **Recent อ่านลำดับออก:** หน้าแรกที่มีแชทวันนี้ ≥ 3 แชทและของเมื่อวาน ⇒ การ์ดบนสุดต้องเป็น **เวลา** (เช่น `14:32`) เรียงลงมา แล้วจึงเป็น `Yesterday` · hover ต้องเห็นวันที่เต็ม
- ของเดิมทั้งหมดของ fix.21/20/19/18 ยังใช้ได้

### คิวถัดไปที่โผล่จากรอบนี้ (ยังไม่ทำ — รออนุมัติ)

1. **งานเดินต่อได้ขณะออกจากหน้าแชท (หลาย session พร้อมกัน) + Working badge บนการ์ด Recent** — สถาปัตยกรรมวันนี้ถือ session เดียวต่อ view (`SdkController` + lifecycle ของวิว); ต้องมีโมเดล "หลาย task ที่ยัง active" ฝั่ง host ก่อน จึงจะใส่ badge ได้ · ขนาดงาน: ใหญ่ (proto/state/host + UI) ⇒ ต้องตกลงขอบเขตก่อน
2. **เพดาน 6,000 ตัวอักษรต่อการเรียกของ `editor`** — เป็นขีดจำกัดของ runtime (`INPUT_ARG_CHAR_LIMIT`) ที่กินคำขอเพิ่ม 2–4 ครั้งทุกไฟล์ที่ยาวกว่านี้ · ทางเลือก: ยกเพดานเฉพาะ `new_text` หรือให้ runtime **ฉีกเป็นชิ้นให้เอง** แล้วสรุปผลเป็นครั้งเดียว ⇒ ต้องเลือกนโยบาย
3. **ย้าย "N tool call(s) failed" ให้เป็นบรรทัดเดียวกับการ์ดผลลัพธ์** (ตอนนี้ข้อความเดียวกันขึ้นสองที่) — เล็ก แต่แตะ MistakeTracker/UI

---

## 🧰 dev.6-fix.21 — "Recent" หลายคอลัมน์บนหน้าแรก + **แก้บั๊ก: draft ในช่องแชทหายเมื่อย้ายวิว** (2026-09-20)

**สถานะ:** ✅ เสร็จ · webview vitest **537/537** (เดิม 501 + ใหม่ 36: `recentGrid` 15 · `HistoryPreview` 5 · `composerDraftStorage` 10 · `useChatState` 6) · `tsc` สะอาดทั้ง app (`tsconfig.vscode-compat.json`) และ e2e (`tsconfig.test.generated.json`) · biome: **ไม่มี finding ใหม่** (แก้ format ของตัวเอง 2 ไฟล์ · เหลือ a11y info 4 ตัวเดิมของ `HistoryPreview.tsx`) · e2e บน VS Code จริง **16/16 ที่ 3 worker (2m00s)** รวม assertion ใหม่ของ draft · ⚠️ **ยังไม่ commit** (pack จาก working tree ก่อน ⇒ เนื้อไฟล์เหมือนที่จะ commit) · **แพ็กแล้ว:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.21.vsix` — ⏳ รอ maintainer smoke

**ที่มา (maintainer อนุมัติ 2 ข้อ):**
1. เก็บ **draft ของช่องแชท** ไว้ให้รอดการย้ายวิว (ข้อที่ fix.20 บันทึกไว้ว่า "ไม่ได้แก้": ข้อความ/ไฟล์ที่พิมพ์ค้างหายเพราะ VS Code สร้าง webview ใหม่)
2. หน้าแรก: Recent ยัง **3 แถวเท่าเดิม** แต่ให้ปรับเป็น 2–3 คอลัมน์ตามความกว้างที่ใช้จริง (ชื่อ session สั้น ⇒ แถวยาว 1 คอลัมน์เหลือที่ว่างเยอะ) ⇒ เห็น 6–9 แชทก่อนต้องกด View All

**สิ่งที่ทำ (1) — draft รอดการย้ายวิว:**
- โมดูลใหม่ `webview-ui/src/icline/composerDraftStorage.ts` (พี่น้องกับ `quickStartPromptStorage.ts`): **one slot** ไม่ใช่ต่อ task (ช่องแชทมีใบเดียว · การสลับ task วันนี้ก็ไม่ล้างข้อความ) · **แยกคีย์ `text` กับ `attachments`** เพราะการพิมพ์ทุกคีย์สโตรกต้องไม่ลากการ re-serialize รูป base64 ทั้งก้อน · เพดานไฟล์แนบ `1_000_000` ตัวอักษร ⇒ รูปที่เกินถูกตัด (เก่าสุดก่อน) และ `console.warn` ครั้งเดียวต่อ session
- `useChatState` อ่าน draft **ตอน mount** (ก่อน paint แรก ⇒ ไม่กระพริบว่าง) แล้ว **เขียนผ่านทุกครั้งที่ช่องแชทเปลี่ยน** ⇒ ไม่ต้องมีคำสั่ง "save draft" ที่ไหน และ **การส่งข้อความ (ที่ล้างช่องแชทอยู่แล้ว) = ล้าง draft เอง** · เทสต์ `useChatState.test.ts` จำลอง "webview ถูกสร้างใหม่" ด้วย unmount → mount ใหม่
- **ทำไม localStorage ไม่ใช่ state ของ host:** VS Code สร้าง webview ใหม่ให้ view เดิมใน **origin เดิม** ⇒ localStorage รอด (ยืนยันบนหน้าต่างจริง ด้านล่าง) และไม่ต้องแตะ proto/host state เลย · ข้อจำกัดที่ยอมรับ: ถ้าเปิด VS Code สองหน้าต่างพร้อมกัน หน้าต่างที่สองอาจเห็น draft ของหน้าต่างแรก (ยังไม่ยืนยันว่า origin แยกต่อหน้าต่างหรือไม่)
- **หลักฐานบนหน้าต่างจริง (probe):** พิมพ์ใน composer ของ sidebar ⇒ `localStorage` มีคีย์ `icline-composer-draft-text` และค่าเป็นข้อความนั้น · หลังย้ายวิว webview ใหม่ได้ **origin เดิม** (`vscode-webview://0tvl…`) และอ่านค่าเดิมได้ ⇒ `secondary-side-bar.test.ts` เพิ่ม assertion: พิมพ์ draft ค้างไว้ก่อนย้าย → หลังย้าย `chat-input` ต้องมีค่าเดิม (ก่อนรอบนี้ได้ `""`)

**สิ่งที่ทำ (2) — Recent หลายคอลัมน์:**
- โมดูลใหม่ `webview-ui/src/icline/recentGrid.ts`: `recentColumnCount(width)` (≥240px ต่อการ์ด + gap 8px · เพดาน 3) · `recentVisibleCount(columns)` = columns × 3 · `sliceRecentTasks` · `useRecentColumnCount(element)`
- `HistoryPreview.tsx`: จาก list 1 คอลัมน์ (`px-4` + `.history-preview-item { margin-bottom: 8px }`) เป็นกริด `repeat(var(--history-columns), minmax(0,1fr))` + `gap: 8px` · ติด `data-icline-recent-grid` / `data-columns` ให้เทสต์กับคนอ่าน DOM · **ความสูงการ์ดไม่แตะ** (ชื่อยัง clamp 2 บรรทัด) และการ์ดในแถวเดียวกันสูงเท่ากัน (`align-items: stretch`)
- **การวัด:** ฮุกใช้ **callback ref** (กริดเกิดหลังประวัติมาถึง — ถ้าใช้ ref object ธรรมดา effect จะพลาดกริดที่ยังไม่มี) + `ResizeObserver` บนตัวกริด (jsdom ไม่มี ⇒ ถอยไปฟัง `window.resize`) · ผลจริง: pane ~843px อย่างที่ maintainer ใช้ = **3 คอลัมน์** · ~600px = 2 · sidebar ~300px = 1 (ค่าเดิม)
- เทสต์: `recentGrid.test.ts` 15 ข้อ (สูตร/ขอบเขต/NaN/กริดที่เกิดทีหลัง/ทั้งสองเส้นทางการวัด) · `HistoryPreview.test.tsx` 5 ข้อ (mock `ResizeObserver` แล้วป้อนความกว้าง ⇒ 3→6→9 การ์ด · 3 คือเพดาน · คลิกเปิด session · View All · สถานะว่าง)

**จุด smoke (fix.21):** ของเดิมทั้งหมดของ fix.18/19/20 ยังใช้ได้ + เพิ่ม 2 ข้อ:
- **Recent หลายคอลัมน์:** เปิดหน้าแรก (ต้องมีประวัติ ≥ 4 แชท) บนหน้าแชทกว้าง (~875px) ⇒ ต้องเห็น **3 คอลัมน์ × 3 แถว = 9 แชท** โดยความสูงแถวเท่าเดิม · ลากขอบให้แคบลง ⇒ 3 → 2 → 1 คอลัมน์ แต่ยัง **3 แถวเสมอ** · ที่เกิน 9 ยังใช้ View All
- **draft รอดการย้ายวิว:** พิมพ์ข้อความค้างไว้ (ยังไม่ส่ง) + แนบรูป 1 รูป ⇒ ย้ายวิวไป Secondary Side Bar ⇒ ข้อความ **และรูปย่อ** ต้องยังอยู่ในช่องแชท ⇒ ส่งได้ตามปกติ (ส่งแล้ว draft ต้องไม่กลับมาอีก)

---

## 🧰 dev.6-fix.20 — e2e รันขนานได้ + fixture ย้ายวิวไป Secondary Side Bar + **แก้บั๊ก: ย้ายวิวแล้วแชทหาย** (ทั้ง "หน้าจอว่าง" และ "task ถูกเคลียร์") (2026-09-20)

**สถานะ:** ✅ เสร็จ (รวม **รอบเสริม 2** ด้านล่าง: ปิดเคส "ย้ายวิวกลางบทสนทนา" + ล้างเทสต์ที่พังเพราะ env ของเครื่อง) · e2e บน VS Code จริง **16/16 ทั้งชุด × 5 รอบติดกัน ไม่มี retry** (3 รอบแรกหลังทำขนาน: 2m19s / 2m17s / 2m21s · 2 รอบหลังรอบเสริม 2: **2m07s / 2m04s** ที่ 3 worker เทียบกับ **4m24s** ตอน `workers: 1` — เร็วขึ้น ~2 เท่า) · unit tests ฝั่ง extension **1032 pass / 0 fail** (69 ไฟล์ — ตัวที่เคย fail คือ `shell.test.ts` › "expands and selects the first configured profile path when it exists" ตอนนี้ผ่านแล้ว ดู "รอบเสริม 2") · `tsc` สะอาดทั้ง app และ e2e (`tsconfig.test.generated.json`) · biome: **ไม่มี warning ใหม่** — รอบแรก **ลบ warning เดิมออก 1 ตัว** (`helpers.ts` ตัวแปรตายของ fixture `clineTestDir`) และที่เหลือ 2 ตัวเป็น warning เดิมของ `src/__tests__/config.test.ts` · **แพ็กแล้ว:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.20.vsix` (12,084,123 B @ 2026-09-20T09:28:31Z · 60 files · About = `dev build 6 · fix.20`) — ⏳ รอ maintainer smoke

**ที่มา (maintainer อนุมัติ 2 ข้อ):**
1. แยกชุด e2e ให้รัน **หลาย worker** เพื่อให้รอบต่อไปเร็วขึ้น (โดยไม่ให้ fixture ที่แชร์กันทำเทสต์ล้มกัน)
2. ขยาย fixture ของ pane ให้ **ย้ายวิวไป auxiliary bar** (Secondary Side Bar) ได้ แล้วเพิ่มเทสต์ยืนยันว่าแถบแชท/ป็อปโอเวอร์ยังทำงานถูกเมื่อผู้ใช้ย้ายเอง

**สิ่งที่ทำ (1) — e2e ขนาน:** `playwright.config.ts` → `workers = E2E_WORKERS ?? (CI ? 2 : 3)` (เดิมตรึง `workers: 1`) · `fullyParallel` คงไว้ + คอมเมนต์ว่าทำไมปลอดภัย · สิ่งที่ต้องแก้ก่อนจึงขนานได้จริง:
- **mock server ผูกพอร์ต 7777 ตายตัว** ⇒ worker ที่สอง `listen` ล้ม · `ClineApiServerMock.startGlobalServer(0)` ขอพอร์ตว่างจาก OS แล้วอ่านกลับจาก socket (`getMockApiServerUrl()`) · ค่าปริยายของสคริปต์อื่นยังเป็น 7777
- **extension host ไม่รู้จัก `CLINE_API_BASE_URL`** (มีแต่ SDK ที่รู้ — `apps/vscode/src/config.ts` ฮาร์ดโค้ด `localhost:7777` ให้ `local`) ⇒ เพิ่ม override ให้ `getEnvironment()` เคารพ env ตัวเดียวกัน (แต่ย้ายแค่ `apiBaseUrl` ไม่แตะ `mcpBaseUrl` ที่ตั้งใจชี้โฮสต์สาธารณะ) + unit test 4 ข้อใน `src/__tests__/config.test.ts` · harness ส่งค่านี้เป็น env ตอน launch
- **teardown กวาด `os.tmpdir()` หา `cline-e2e-*` ทั้งหมด** ⇒ ขนานแล้วจะลบโฟลเดอร์ CLINE_DIR ที่ worker อื่นกำลังใช้อยู่ · เปลี่ยนเป็นลบเฉพาะของ launch ตัวเอง (และลบ fixture `clineTestDir` ที่ตายอยู่ทิ้ง)
- **workspace ใช้ไฟล์ที่ commit ไว้ร่วมกัน** (extension แก้ไฟล์จริง: `file-edit` 2 เทสต์เขียน `test.ts` ไฟล์เดียวกัน) ⇒ เพิ่ม fixture `privateWorkspaces` = สำเนาชุด fixture ลง temp ต่อ **หนึ่งเทสต์** · `workspaceDir`/`multiRootWorkspaceDir` ชี้เข้าไปในสำเนา ⇒ เทสต์ไม่ผูกกับลำดับ/กันเองอีก
- **ดาวน์โหลด VS Code แข่งกันตอน cache เย็น** ⇒ `global.setup.ts` อุ่นเครื่องก่อน worker ไหนเริ่ม
- รอบขนานทำให้ timeout ปริยายของ assertion ที่ต้องรอ "ทั้งเทิร์น" แคบไป 2 จุด ⇒ ใส่ budget ให้ตรงความหมาย: `chat.test.ts` รอข้อความตอบ (`{ timeout: 20_000 }`) และ `settings-model-selection.test.ts` อ่านลิสต์โมเดลแบบ **poll จนกว่าจะมีข้อมูล** (`expect(async () => …).toPass()`) แทนการอ่านครั้งเดียว

**สิ่งที่ทำ (2) — fixture + เทสต์ใหม่:**
- `utils/pane.ts` เพิ่ม `location()` (อยู่ part ไหน) และ `moveToAuxiliaryBar()` ที่ขับ UI ของ VS Code เอง: palette → `View: Move View` → เลือกวิว → `New Secondary Side Bar Entry` แล้ว poll จน webview ย้าย part จริง · คืน **frame ใหม่** เพราะการย้ายสร้าง webview ใหม่
- หา "ตัววิว" ไม่ได้ด้วยชื่อ: วิวของ iCline ประกาศชื่อเป็น **ค่าว่าง** (`contributes.views[].name = ""`) และ palette ทำให้วิวเสียโฟกัส (`focusedView` ว่าง ⇒ picker ไม่ preselect) ⇒ แถวของวิวเราคือแถวที่ **เริ่มกลุ่ม** (aria-label ออกมาเป็น `", Side Bar / iCline"`) ส่วนแถวคำสั่งใช้ label ตรง ๆ เพราะ ranking ของ palette ไม่ได้เรียงตามที่พิมพ์ (`Move View` ดัน `Move Panel Views…` ขึ้นก่อน)
- หา part ของวิวด้วย **เรขาคณิต ไม่ใช่ ancestry**: webview ถูกวางในเลเยอร์ overlay ของ workbench (ancestor ไม่มี `.part.*`) ⇒ เทียบ rect ของ webview กับ rect ของ part
- `helper.getSidebar()` เดิมรับ frame ที่ยัง **`#pending-frame`** (webview ใหม่ยังโหลดไม่เสร็จ แต่ title ขึ้น "Cline" แล้ว) ได้ ⇒ ข้าม pending frame และรอตัวที่ active จริง
- เทสต์ใหม่ `secondary-side-bar.test.ts`: ย้ายวิว ⇒ ยืนยัน `location() === "auxiliarybar"` ⇒ ขยายแถบข้างใหม่ผ่าน fixture ⇒ ส่งข้อความจริง 1 เทิร์น (ได้ข้อความตอบจาก mock) ⇒ เปิดเมนูโมเดล แล้วตรวจว่า `data-align` ตรงกับ **สูตรกลาง** (`triggerLeft + 320 + 8 ≤ viewportWidth`) และแผงยังอยู่ในกรอบ pane
- ต้องปิด toast ของ VS Code ก่อน: harness รันด้วย `--disable-extensions` ⇒ VS Code เด้ง "Reload and Enable Extensions" ที่มุมล่างขวา ซึ่ง **ทับปุ่มส่งในโหมด auxiliary bar พอดี** ⇒ ใช้ `toggleNotifications(page)` ของ harness (ไม่ใช่บั๊กของ iCline)

**สิ่งที่ทำ (3) — บั๊กที่เทสต์ใหม่เจอ (และแก้แล้ว):** หลังย้ายวิวไป Secondary Side Bar **หน้าแชทว่างเปล่า** ทุกครั้ง
- **ราก:** `VscodeWebviewProvider` ผูก `webviewView.onDidDispose` ⇒ `this.dispose()` ⇒ `controller.dispose()` (ทิ้ง task history/session ทั้งก้อน) — แต่การ **ย้ายวิว** ไม่ได้จบเซสชัน: VS Code dispose วิวเดิมแล้ว resolve วิวใหม่ใน part ปลายทาง ⇒ วิวใหม่ถูกต่อกับ controller ที่ตายแล้ว · Console ยืนยันชัด: `SdkTaskHistory has been disposed` + `this.unsubscribeHostTelemetrySettings is not a function` ⇒ webview โหลดแล้วแอปบูตไม่ขึ้น (frame ว่าง ไม่มี `[data-testid]` เลย นานกว่า 30 วิ)
- **แก้:** `onDidDispose` ทิ้งแค่ reference ของวิว (`this.webview`) ไม่แตะ controller · controller ถูกทิ้งตอน **extension deactivate** (`WebviewProvider.disposeAllInstances()` ใน `common.ts`) ซึ่งเป็นตอนที่เซสชันจบจริง · หลังแก้ console **ไม่มี error เลย** และหน้าแชทกลับมาทำงานพร้อมเซสชันเดิม
- **ขอบเขตผลกระทบ:** ผู้ใช้ที่ลากวิว iCline ไป Secondary Side Bar (หรือ panel/แถบข้างอีกด้าน) แล้วแชทหาย = เคสเดียวกันนี้

**จุด smoke (fix.20):** ของเดิมทั้งหมดของ fix.18/19 ยังใช้ได้ + เพิ่ม 2 ข้อ:
- **ย้ายวิว:** เปิดแชทให้ล็อกอินแล้ว ⇒ ลาก/ย้ายวิว iCline ไป **Secondary Side Bar** (หรือ `F1` → `View: Move View` → `New Secondary Side Bar Entry`) ⇒ แชทต้องกลับมาแสดง **พร้อมประวัติเดิม** (ไม่ว่างเปล่า) ส่งข้อความได้ และเปิด Quick Picker/แผง Options ได้ตามปกติ (ป็อปโอเวอร์ยังเกาะขอบตามกฎ)
- **ย้ายกลับ:** ย้ายวิวกลับไปแถบข้างเดิม ⇒ ต้องยังทำงานเหมือนเดิม ไม่ต้อง reload หน้าต่าง และไม่มีข้อความ error ใหม่ใน Notification

### รอบเสริม 2 (2026-09-20, รอบที่สองของ fix.20) — "ย้ายวิวกลางบทสนทนา" + เทสต์ shell ที่พังเพราะ env ของเครื่อง

**สถานะ:** ✅ e2e บน VS Code จริง **16/16 × 2 รอบ** (2m07s / 2m04s) · unit **1032/0** · `tsc` + biome สะอาด · **แพ็ก fix.20 จาก HEAD นี้แล้ว** — รอบนี้แก้ **extension host** อีก ⇒ `fix.19` ไม่ครอบทั้งสองบั๊กของเรื่องย้ายวิว

**ที่มา (maintainer อนุมัติ 2 ข้อ + "แก้ตัวที่ fail ถ้าจำเป็น"):** ต่อจากบั๊กที่เทสต์ย้ายวิวเจอในรอบก่อน — "ย้ายวิวแล้วแชทหาย" แก้ไปแล้วครึ่งเดียว (controller ไม่ตายแล้ว) ∴ ให้ตรวจว่ายังมีที่ไหนที่ **คิดว่าอายุของวิว = อายุของเซสชัน** อีกไหม แล้วแก้ `shell.test.ts` ถ้าจำเป็น

**บั๊กที่สองของเรื่องเดียวกัน:** `resolveWebviewView()` เรียก `controller.clearTask()` **ทุกครั้งที่ resolve** (คอมเมนต์เดิม: "if the extension is starting a new session, clear previous task state") — แต่ **การย้ายวิวก็ resolve วิวใหม่** ⇒ ผู้ใช้ที่ย้ายวิวระหว่างมีบทสนทนาอยู่ **เห็นแชทหายทั้งเธรด** (ไม่ใช่แค่หน้าจอว่าง: `taskControl.clearTask()` → `sessions.endActiveSession("clearTask")` + state กลับเป็น idle จริง)
- **แก้:** เคลียร์เฉพาะ `resolve` **ครั้งแรกของ session** (`hasResolvedView`) ⇒ วิวที่ย้ายมาใหม่ได้ state ปัจจุบันเองผ่าน `subscribeToState` ตอน mount (มันส่ง state ก้อนแรกให้ subscriber ใหม่เสมอ) ⇒ บทสนทนากลับมาครบ
- **หลักฐานก่อน/หลัง (เทสต์เดียวกัน บน VS Code จริง):** **ก่อนแก้** หลังย้ายวิว `getByText("mock Cline API response")` ได้ **0 ตัว** (แชทว่าง) · **หลังแก้** ผ่าน — บทสนทนาอยู่ครบ + ส่งเทิร์นที่สองใน part ใหม่ได้

**ผลการ audit (รอบนี้):**
- **ตัวสดับของ "วิว" อยู่ในถังของ "extension"** — `onDidChangeVisibility` / `onDidDispose` / `onDidReceiveMessage` ถูก push เข้า `this.disposables` ซึ่งถูกล้างตอน extension deactivate เท่านั้น ⇒ ทุกการย้ายทิ้งตัวสดับของวิวที่ตายแล้วค้างไว้ชุดหนึ่ง · แยกเป็น `viewDisposables` + `disposeViewScope()` ที่ถูกเรียก (1) ตอนวิวถูก dispose (2) ตอน re-resolve ก่อนลงทะเบียนชุดใหม่ (3) ตอน extension deactivate · คง **identity ของ array** ไว้เพราะ VS Code ถือเป็นถัง disposable ของ listener ที่มันลงทะเบียนไว้
- **ไม่ได้แก้ (บันทึกไว้):** `telemetryService.capturePanelOpened("sidebar_resolved")` ยังนับ 1 ครั้งต่อการ resolve ⇒ การย้ายวิวจะนับ "panel opened" เพิ่ม 1 ครั้งต่อการย้าย (ไม่กระทบผู้ใช้ ⇒ ปล่อยไว้โดยเจตนา)
- **ไม่ได้แก้ (บันทึกไว้):** ระหว่างย้ายวิว **ข้อความ/ไฟล์ที่พิมพ์ค้างแต่ยังไม่ส่งในช่องแชทหายไป** เพราะ VS Code สร้าง webview ใหม่ทั้งใบ ⇒ ถ้าจะให้รอดต้องเก็บ draft ไว้ฝั่ง host (คนละเรื่องกับ lifecycle · ยังไม่มีใครขอ)

**เทสต์เข้มขึ้น (`secondary-side-bar.test.ts`):** ของเดิมย้ายวิว **ก่อน** ส่งข้อความ ⇒ แยกไม่ออกระหว่าง "เซสชันเดิม" กับ "เซสชันใหม่" · เปลี่ยนเป็น: ส่ง 1 เทิร์นในแถบข้าง → ยืนยันข้อความตอบ **1 ตัว** → ย้ายวิว → ยืนยันบทสนทนายังอยู่และพิมพ์ข้อความเดิม (ที่ส่งไปแล้ว) ยังเห็น **1 ตัว** → ส่งเทิร์นที่สอง → ข้อความตอบเป็น **2 ตัว** → ตรวจป็อปโอเวอร์เกาะขอบตามสูตรกลาง ⇒ ครอบทั้ง "session รอด" และ "วิวใหม่ทำงานได้"

**กับดักของ fixture (`utils/pane.ts`) ที่กินเวลารอบละหนึ่งตัว:**
1. **composer แย่งโฟกัสกลับ** — `ChatView` โฟกัสช่องพิมพ์เองทุกครั้งที่เทิร์นจบ (~50ms หลัง turn เป็น idle) และ VS Code **ซ่อน quick input ทันทีที่ input นั้นเสียโฟกัส** ⇒ palette ที่เปิดในจังหวะนั้นปิดตัวเองโดยที่คำสั่งยังอยู่ในกล่องที่ถูกซ่อน (วัดได้: `document.activeElement` เป็น `<iframe>` ของ webview และ widget ถูกซ่อนภายใน 500ms หลังเขียน query) ⇒ เพิ่ม `typeInPalette()` ที่เปิด palette ซ้ำจนกว่าจะอยู่ · และเขียน query ด้วย `fill` ไม่ใช่ `pressSequentially` (ของเดิมถูกตัดเหลือ `>Move V` แล้วขั้นถัดไป timeout) · **ห้าม `fill("")`** เพราะ `>` คือโหมดของ palette (ว่างแล้วกลายเป็น file picker)
2. **แถวของ quick pick มีสองชั้น** — `.quick-input-list-row` ที่คลิกอยู่ข้างในเป็น label wrapper (กว้างตามเนื้อหา + มีพี่น้องสูง 0px) ⇒ คลิกไม่ติด · เปลี่ยนไปคลิก `.monaco-list-row[role="option"]` (ตัวที่มี hit area + accessible name) และ `clickRow()` match **ชื่อขึ้นต้น** ไม่ใช่เป๊ะ เพราะแถวที่เปิดกลุ่มมีชื่อกลุ่มต่อท้าย ("New Secondary Side Bar Entry, Secondary Side Bar") · แถวที่ไม่มีจะรายงานแถวที่ picker แสดงจริงแทน timeout เปล่า ๆ

**`shell.test.ts` — พังเพราะ env ของเครื่อง ไม่ใช่บั๊กของ env expansion:** เทสต์ตั้ง `process.env.windir = "C:\Windows"` แต่บน Windows จริงมี `WINDIR=C:\WINDOWS` อยู่ก่อนแล้ว และ SUT อ่านชื่อ env **แบบไม่สนตัวพิมพ์** (`getEnvironmentVariable`) · `afterEach` คืนค่า `process.env` จาก snapshot (`{ ...process.env }`) ⇒ สำเนามีคีย์สะกดของโฮสต์ติดมาด้วย ⇒ `Object.entries().find()` เจอ `WINDIR` (ของโฮสต์) ก่อน ⇒ ได้ `C:\WINDOWS\Sysnative\cmd.exe` ไม่ตรงกับที่เทสต์เขียน ⇒ fail เฉพาะบน Windows · แก้ด้วย `setEnv()` ที่ลบสะกดอื่นก่อนเขียน (ใช้กับทุกตัวที่เทสต์ตั้ง: `windir`/`PATH`/`ProgramW6432`/`LOCALAPPDATA`/`COMSPEC`/`SHELL`) ⇒ **31/31** · ผลพลอยได้: เทสต์ "falls through configured profile paths in order" ที่ก่อนหน้านี้ผ่านแบบบังเอิญ (ได้ `SHELL_PATHS.CMD` เพราะ resolve ไม่เจออะไรเลย) ตอนนี้ผ่านด้วยเหตุผลจริง

**จุด smoke เพิ่ม (รอบเสริม 2):**
- **ย้ายวิวกลางบทสนทนา (เคสหลักของรอบนี้):** ส่งข้อความให้ได้คำตอบ 1 เทิร์น → **ขณะที่แชทมีบทสนทนาอยู่** ย้ายวิวไป Secondary Side Bar → ต้องยังเห็นบทสนทนาเดิมครบ (ไม่ใช่หน้า welcome) → พิมพ์ต่อได้และได้คำตอบที่สอง
- **ย้ายไป-กลับ:** ย้ายวิวกลับแถบข้างเดิม ⇒ ยังเห็นบทสนทนาเดิมและทำงานได้ ไม่ต้อง reload หน้าต่าง
- (ของเดิม) จุด smoke ของ fix.18/19 ยังใช้ได้ทั้งหมด

---

## 🧰 dev.6-fix.19 — รวมนิสัย popover เป็นฮุกกลาง + guard สแกนซอร์ส + e2e พิสูจน์โหมดขอบซ้ายบนหน้าต่างจริง (2026-09-20)

**สถานะ:** ✅ เสร็จ · webview vitest **501/501** · `tsc` สะอาดทั้งสองฝั่ง · biome ไม่มี finding ใหม่ · e2e บน VS Code จริง **15/15 ทั้งชุด** (หลังรอบเสริมด้านล่าง — ไม่มี retry) · **commit แล้ว** (`690e703e4` refactor + `6bd8adf2c` e2e) · **แพ็กแล้ว:** `dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.19.vsix` (11,967,453 B @ 2026-09-20T06:07:27Z, About = `dev build 6 · fix.19`)

**ที่มา (maintainer อนุมัติ 2 ข้อต่อจากรอบ fix.18):**
1. เพิ่ม e2e ที่ทำให้หน้าแชท **กว้างพอ** เพื่อพิสูจน์โหมดหลัก (ขอบซ้ายของปุ่ม) บนหน้าต่าง VS Code จริง — ของเดิมพิสูจน์ได้แค่โหมดถอย เพราะ sidebar ของ harness แคบ
2. รวม "นิสัยของ popover" (ขอบที่เกาะ · รูปมือทั้งเมนู · ข้อยกเว้นช่องพิมพ์) เป็นคอมโพเนนต์/ฮุกกลาง + เทสต์ guard ที่ fail เมื่อเมนูใหม่ไม่ผ่านข้อตกลง ⇒ "ครอบคลุมและยืดหยุ่นสำหรับอนาคต"

**สิ่งที่ทำ (1) — e2e:** `composer-status-options.test.ts` เพิ่มเทสต์ที่ 2: เปิดแผง Options ตอนหน้าแชทยังแคบ (ยืนยันเงื่อนไขก่อนว่าแคบจริง + `data-align="end"`) ⇒ ขยายหน้าต่าง Electron ผ่าน `app.evaluate(BrowserWindow.setSize(1800,1000))` ⇒ **ลาก sash ของ VS Code จริง** เพื่อขยาย pane ⇒ ยืนยันว่าแผงที่เปิดอยู่**ยังเปิดอยู่** และย้ายไป `data-align="start"` โดยขอบซ้ายตรงกับปุ่ม ≤1px
- ยืนยันรหัส pane/ sash ไม่ได้ฮาร์ดโค้ด id ของ part:หาจาก **webview id** ใน query (`id=<guid>` ของ iframe ด้านนอกที่ตรงกับเฟรมที่เทสต์ขับ) ⇒ ใช้ได้ทั้ง sidebar และ auxiliary bar (VS Code ซ้อน iframe สองชั้น: `frameElement()` ของเฟรมเราเป็น `#active-frame` ด้านใน ซึ่งไม่รู้จัก `.part`/`.monaco-sash` เลย — จุดนี้ทำให้รอบแรกของเทสต์ fail)
- sash ที่ต้องลาก = `.monaco-sash` แนวตั้งที่ไม่ติด `disabled` และอยู่ใกล้ขอบซ้าย/ขวาของ iframe ≤ 40px (ของจริงใน sidebar = `primary-sidebar-sash` ที่ x=348) · วัดผลได้: pane 297px → 900px, ปุ่ม `x=277.7` คงที่, แผงย้ายจาก `x=73` (`end`) ไป `x=278` (`start`, ต่าง 0.27px)

**สิ่งที่ทำ (2) — ฮุกกลาง + guard:** โมดูลใหม่ `webview-ui/src/icline/menuPopover.ts` รวม `pickMenuPopoverAlign` (สูตรเดิมจาก `quickModelPickerList.ts` — ย้ายมา ไม่มี copy) · `useMenuPopoverAnchor({ open, setOpen, triggerRef, panelWidth })` (วัดจาก trigger ตอนเปิด ⇒ ภาพแรกถูกข้าง ไม่กระพริบ · วัดซ้ำเมื่อ `resize` · คืน `align` + `onOpenChange` ให้ Radix) · `MENU_SURFACE_CLASS` · `MENU_TEXT_FIELD_CLASS` ⇒ picker เรียก **2 ครั้ง** (เมนูโมเดล 320px และแผง Options 236px ตัดสินคนละคำตอบได้)
- `menuPopover.guard.test.ts` สแกนซอร์สทุก "เมนูของ iCline" (นิยาม = `<PopoverContent>` ที่มี `data-icline-*`) แล้ว fail ถ้าไม่ใช้ `MENU_SURFACE_CLASS` · `align` เป็นค่าคงที่ · ไม่ import โมดูล · หรือ `<input>` ไม่ใช้ `MENU_TEXT_FIELD_CLASS` · มี liveness assert กัน guard ตาย (สแกนไม่พบอะไร = fail) · พิสูจน์แล้วว่ามันกัดจริงโดยวางไฟล์ตัวอย่างที่ผิดข้อตกลง → เทสต์ fail 4 ข้อ → ลบไฟล์ทิ้ง
- เทสต์เดิมย้ายตาม: สูตร align → `src/icline/menuPopover.test.ts` (quickModelPickerList.test.ts เหลือหมายเหตุชี้ทาง) และ `QuickModelPickerRealPopover.test.tsx` เพิ่มเทสต์ "แต่ละเมนูตัดสินข้างของตัวเอง" (สลับเป็น `end` เมื่อชิปถูกดันชิดขอบ)

**สิ่งที่ต้องรู้:** พฤติกรรมที่ผู้ใช้เห็นของ fix.19 = fix.18 ทุกข้อ (รอบนี้เป็นการจัดบ้าน + เพิ่มหลักฐาน) ⇒ ถ้าติดตั้ง fix.18 ไว้แล้วยัง smoke ต่อได้ หรือใช้ fix.19 แทนได้เลย · `fix.18` ใน `dist/` ไม่ถูกเขียนทับ

**จุด smoke (fix.19):** ใช้รายการเดียวกับ fix.18 ทั้ง 5 ข้อ + เพิ่ม 1 ข้อ:
- ข้อ 2 (ต่อ): ลากขอบ sidebar ให้แคบ/กว้าง**ขณะเปิดแผง Options อยู่** — แผงต้องสลับข้างเองโดยไม่ปิด-เปิดใหม่ (e2e พิสูจน์แล้ว 297→900px) · เปิด picker ของโมเดลแล้วทำเหมือนกัน ⇒ เมนูโมเดลก็สลับข้างเองเช่นกัน

### รอบเสริม (test-only — หลังแพ็ก fix.19 แล้ว): ทำเทคนิคขยาย pane เป็น fixture + ล้างเทสต์ที่พังเพราะ sidebar แคบ

**สถานะ:** ✅ e2e บน VS Code จริง **15/15 (ทั้งชุด ไม่มี retry)** · `tsc -p tsconfig.test.generated.json` สะอาด · biome ไม่มี finding ใหม่ · ❗ **ไม่ต้องแพ็ก VSIX ใหม่** — รอบนี้แตะแค่ `src/test/e2e` (ไม่เข้า bundle ของ extension) ⇒ artefact `fix.19` ยังตรงกับโค้ดที่ ship อยู่

- **fixture ใหม่:** `src/test/e2e/utils/pane.ts` → `createPaneController({ app, page, sidebar })` มี `measure()` / `widenTo(target = 900)` (ขยายหน้าต่าง Electron ก่อน + ลาก sash ของ VS Code จริง โดยหา sash จาก **webview id** ไม่ใช่ part id ⇒ ใช้ได้ทั้ง sidebar/auxiliary bar · ถ้าลากไม่ถึงเป้าจะ throw ไม่ปล่อยให้เทสต์ผ่านแบบหลอก ๆ) และใน `helpers.ts` มี fixture `pane` (คอนโทรลเลอร์) กับ `widePane` (ใส่ชื่อในเทสต์ = ขยาย pane ให้ก่อนเข้า body แล้วคืนความกว้างที่ได้)
- **`chat.test.ts` ผ่านแล้ว** (พังมาก่อนหน้ารอบนี้ทุกครั้ง): สาเหตุคือ composer row ใน sidebar ~300px ซ้อนกันเอง จนชื่อโมเดลที่ถูกตัด (`<span class="truncate max-w-[180px]">`) ทับสวิตช์ Plan/Act ⇒ `planButton.click()` ถูก intercept ทุกครั้ง · ใช้ `widePane` แล้วผ่าน — พร้อมแก้ locator ที่เปราะอีก 3 จุดที่เจอตอนวิ่งถึง: (1) ปุ่ม New Task ถูก re-render ของ header กลืนคลิก ⇒ คลิก-แล้ว-ยืนยันด้วย `expect(async () => {…}).toPass()`, (2) เมนู slash command เมนู "Context mentions" ต้องอ้างเป็น **การ์ดข้อเสนอแนะ (ARIA option)** ไม่ใช่ `getByText` เพราะข้อความเดียวกันมีอยู่ใน live-region สำหรับ screen reader (`Problems, 2 of 2`) และมี Problems สองแถว ⇒ ใช้ `getByRole("option", { name: "Problems", selected: true })` (แถวที่เมนูไฮไลต์คือแถวที่ใส่เมนชันได้จริง)
- **`composer-status-options` ใช้ fixture แทนโค้ดในไฟล์** (ลบ `widenChatPane`/`findSash` ในเทสต์ออกแล้ว เหลือ `await pane.widenTo(PANE_WIDE_WIDTH_PX)`)
- **ประโยชน์ต่ออนาคต:** เทสต์ใดก็ได้ที่ต้องการแถบข้างกว้างแค่ใส่ `widePane` ในรายการ fixture (หรือเรียก `pane.widenTo(n)` เมื่ออยากทดสอบการเปลี่ยนความกว้างกลางทาง)

---

## 🔎 dev.6-fix.18 — ตำแหน่ง popover ของ Options · เคอร์เซอร์รูปมือ · รูปย่อในช่องแชทขึ้นด้านบนและใหญ่ขึ้น (2026-09-20)

**สถานะ:** ✅ เสร็จ · webview vitest **494/494** · `tsc` สะอาดทั้งสองฝั่ง · biome ไม่มี finding ใหม่ (warning เท่ากับ HEAD) · e2e บน VS Code จริงผ่าน **5/5** (`composer-status-options` + `quick-picker-hover` + `quick-picker-effort-notice` + `quick-picker-org-policy`) · **commit แล้ว** (`3012c6df5` feat · `ddf4a372a` test(e2e)) · **แพ็กแล้ว:** `dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.18.vsix` (11,967,298 B @ 2026-09-20T05:36:02Z, About = `dev build 6 · fix.18`) · ⏳ **รอ maintainer smoke**

**ที่มา (3 เรื่องจาก maintainer, อนุมัติพร้อมกัน + เสริมรอบถัดมา):**

1. **ตำแหน่ง popover ของ Options** — ขอบซ้ายของแผงต้องอยู่ที่ขอบซ้ายของปุ่มที่เปิดมัน **เป็นหลัก** และ **รองรับทั้งสองแบบ**: ถ้าหน้าแชทถูกบีบแคบจริง ๆ ให้กลับไปเกาะขอบขวาของปุ่มแบบเดิม (ความกว้างที่ maintainer ทำงาน ≈ 930px — ดูภาพที่แนบมา)
2. **เคอร์เซอร์** — Quick Picker ทั้ง "ของโมเดล" และ "ของ Option" รวมทั้ง **หน้าเมนูโมเดลและแผง Options ทั้งหมด** (ไม่ใช่แค่แถวที่กดได้) ต้องเป็นรูปมือเหมือนไอคอน 4 ตัวแรกใต้ช่องแชท (Add Context · Add Files · Servers · Cline Rules)
3. **รูปย่อในช่องแชท** — ย้ายจากด้านล่างขึ้นด้านบน (ยังอยู่ในช่องแชท) และเพิ่มขนาดขึ้น

**รากของ (1):** `PopoverContent` ของชิปสถานะตั้ง `align="end"` ⇒ ขอบ**ขวา**ของแผง 236px ไปตรงกับขอบขวาของปุ่มสถานะ (ปุ่มกว้าง ~32px) ⇒ แผงเลื่อนไปทางซ้ายไกลจากไอคอนที่กด
**แก้ (1):** ขอบซ้าย (align="start") เป็น **ค่าตั้งต้น** และใช้ `pickOptionsPopoverAlign({ triggerLeft, viewportWidth })` ใน `quickModelPickerList.ts` ตัดสินข้างจาก **ตำแหน่งของปุ่ม** ตอนเปิด ⇒ `triggerLeft + 236 + 8 ≤ viewportWidth` = `start` ไม่งั้นถอยเป็น `end` (ค่าเดิม) · วัดซ้ำเมื่อมี `resize` ขณะแผงเปิดอยู่ ⇒ ลาก sidebar แคบ/กว้างแล้วแผงสลับข้างเองได้ · ตรวจได้จาก `data-align` ใน DOM (กว้าง ~930px ได้ `start`, sidebar ปริยาย ~300px ได้ `end`)

**รากของ (2):** ปุ่มที่ iCline วาดเองเป็น `<button>` เปล่า ⇒ webview คืนลูกศรของ OS ขณะที่ `VSCodeButton` (ไอคอน 4 ตัวนั้น) ให้รูปมือเอง
**แก้ (2):** เติม `cursor-pointer` ให้ทุกเป้าคลิกที่ผู้ใช้ตั้งใจกด — ชิปโมเดล · ชิปสถานะ · แถวโมเดล · หัว provider · ไอคอน footer (refresh/edit) · ปุ่มระดับ Effort ในแผง Options · สวิตช์ Thinking (มี pointer จาก `ui/switch`) · **และคลุมทั้งเมนู**: ตัวห่อ popover ทั้งสองตัว + รากของ `ModelOptionsPanel` ⇒ หัวข้อ/model id/ระยะหว่างแถว/แถว capability/ข้อความ "Active ·" เป็นรูปมือทั้งหมด (ลูกสืบทอด cursor จากตัวห่อ) · ข้อยกเว้นเดียวคือช่องค้นหาที่เป็น `cursor-text` (I-beam) · ปุ่มที่ `disabled` ยังขึ้น `not-allowed` เพราะ specificity ของ `disabled:` สูงกว่า

**รากของ (3):** `ChatTextArea` วาง `Thumbnails` แบบ `absolute` ที่ `bottom: 14` และป้อน `border-bottom` โปร่งใสของ textarea ด้วย `thumbnailsHeight` ⇒ ช่องว่างสำหรับรูปถูกจองที่ **ล่าง** · ขนาดชิปฮาร์ดโค้ด 34px เท่ากับ transcript
**แก้ (3):**
- ย้ายไป `top: 14` (ยังในกรอบช่องแชท) และย้ายที่ว่างไปเป็น **`border-top` โปร่งใส** ของ textarea + `padding-top` ของ highlight layer (ต้องตรงกัน ไม่งั้นไฮไลต์ mention/slash ลอยขึ้น)
- **เหตุผลที่ยังใช้ border ไม่เปลี่ยนไปใช้ padding:** พอถึง `maxRows` textarea จะ scroll — ข้อความที่ scroll จะเลื่อนขึ้นไปทับรูปย่อในเขต padding แต่ไม่เข้าเขต border (คอมเมนต์ในโค้ดอธิบายไว้)
- เพิ่ม prop `size` ให้ `components/common/Thumbnails.tsx` (ปริยาย 34 = transcript ไม่เปลี่ยน) และให้ composer ส่ง **44px** · ขนาดป้ายลบ/offset/ไอคอน/ฟอนต์ชื่อไฟล์คำนวณจาก `size` ตัวเดียว

**เทสต์ที่ปักไว้:**
- unit `quickModelPickerList.test.ts`: สูตร `pickOptionsPopoverAlign` — หน้าแชท ~930px ได้ `start` · sidebar ~300px ได้ `end` · สลับที่ `panel + margin` พอดีเป๊ะ · กว้างขึ้นแล้วไม่ถอยกลับไป `end`
- unit `QuickModelPickerRealPopover.test.tsx`: `data-align` = `start` ในหน้าแชทกว้าง · **สลับเป็น `end` เมื่อปุ่มถูกดันไปชิดขอบขวา แล้วกลับเป็น `start` เมื่อมีที่พออีกครั้ง** (จำลองด้วย `getBoundingClientRect` + `resize`) · ตัวห่อ popover ทั้งสอง + ราก `ModelOptionsPanel` มี `cursor-pointer` · ช่องค้นหามี `cursor-text` · ชิปโมเดล/ชิปสถานะ/หัว provider/ปุ่มระดับ Effort มี `cursor-pointer`
- unit **ใหม่** `components/common/Thumbnails.test.tsx`: ไม่ส่ง `size` = 34px (transcript คงเดิม) · ส่ง 44 = ชิป 44px + ป้ายลบ 17px + ฟอนต์ชื่อไฟล์ 9px (กัน "ชิปใหญ่แต่ป้ายลบเท่าเดิม")
- e2e `composer-status-options` (บน VS Code จริง): `data-align` ต้องตรงกับสูตรของ pane จริง (`start` เมื่อปุ่ม + 236px + 8px พอ · ไม่งั้น `end`) · เมื่อมีที่พอของข้างที่เลือก **ขอบต้องตรงกัน ≤1px** (ซ้ายกับ `start` / ขวากับ `end`)

**สิ่งที่ต้องรู้ (harness):** sidebar ของ e2e กว้างปริยาย ~297px (CSS) ขณะที่แผง 236px และแถว composer เต็มไปด้วยไอคอน 4 ตัว + ชื่อโมเดล ⇒ หน้าต่างนี้ **ตกไปที่โหมดถอย (`align="end"`)** ซึ่งเป็นโหมดที่เทสต์ยืนยันบนหน้าต่างจริง ส่วนโหมดหลัก (`start`) ถูกปักด้วยเทสต์หน่วย (สูตร + การสลับข้าง) และเทสต์ webview ที่จำลองหน้าแชทกว้าง · Radix ยังคงเลื่อนแผงกลับเข้ากรอบอีกชั้น ⇒ "ขอบตรงกันเป๊ะ" ตรวจได้เมื่อมีที่พอเท่านั้น **ห้ามปิด `avoidCollisions`** เพื่อบังคับให้ตรง

**จุด smoke (fix.18):**
1. ช่องแชท: คลิกชิปโมเดล → popover รายการโมเดล · **hover ทุกส่วนของเมนู (หัวข้อ provider, แถวโมเดล, ระยะหว่างแถว, footer, ข้อความ Active) ต้องเป็นรูปมือ** (เทียบกับไอคอน 4 ตัวซ้าย) ยกเว้นช่องค้นหาที่ยังเป็น I-beam
2. คลิกชิปสถานะ (ชุดไอคอน/badge) → แผง Options: **ขอบซ้ายของแผงต้องอยู่ที่ขอบซ้ายของปุ่มสถานะ** (ที่ความกว้างแชทปกติ ~930px) · ลากขอบ sidebar ให้แคบลงเรื่อย ๆ ⇒ แผงสลับไปเกาะ**ขอบขวา**ของปุ่มแทนโดยไม่ล้นออกนอกหน้าต่าง · ทุกส่วนในแผง (หัวข้อ, model id, ปุ่ม Effort, capability) เป็นรูปมือ
3. แนบ/วางรูปในช่องแชท → รูปย่ออยู่ **ด้านบน** ของช่องแชท ใหญ่กว่าเดิม (44px) · พิมพ์ข้อความยาวถึงบรรทัดสูงสุดแล้วเลื่อน ข้อความ **ห้ามทับรูปย่อ** · ไฮไลต์ `@`/`/` ต้องอยู่ตรงกับตัวอักษรจริง
4. เปิด picker ตอนมีรูปแนบ — รูปย่อยังอยู่ด้านบน ไม่ทับช่องค้นหาหรือแถว provider
5. About: `dev build 6 · fix.18` (ตรวจแล้วในบันเดิลที่แพ็ก — `webview-ui/build/assets` มีสตริงนี้จริง)

**ยังไม่ทำ:** ไม่ได้แตะ hover Options panel ของ picker (ด้านขวาของแถว — โครงสร้างล็อกจาก mock v11 ยังเดิม) · ไม่ได้แก้ `chat.test.ts` ที่ fail อยู่ก่อนรอบนี้ (ปุ่ม Plan/Act ถูก `<span class="truncate max-w-[180px]">` ของชิปโมเดลบังใน sidebar ~300px — อาการ layout ก่อนรอบนี้ ไม่เกี่ยวกับ diff รอบนี้)

---

## 🎛️ dev.6-fix.17 — ชิปสถานะแยกปุ่ม + เปิด Options ของโมเดลที่ใช้อยู่ + นโยบายองค์กรมีหลักฐานบน VS Code จริง (2026-09-20)

**สถานะ:** ✅ เสร็จ · unit/tsc/biome ผ่าน · e2e บน VS Code จริง **5/5** · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.17`)

**ที่มา (2 เรื่องที่ maintainer อนุมัติพร้อมกัน):**
1. ทำเส้นทาง "provider ที่องค์กรไม่อนุญาต" ของ fix.16 ให้มีหลักฐาน e2e บน VS Code จริง (เดิมพิสูจน์ได้แค่ระดับ unit เพราะ harness ไม่มี control plane ที่ส่ง remote config ได้)
2. ปรับ UXUI ชิปใต้ช่องแชท: ไอคอนสถานะถูก“ฝัง”รวมกับปุ่มชื่อโมเดล (คลิกเดียวเปิดรายการโมเดล) ⇒ อยากกดที่ไอคอนเพื่อเปิดแผง Options ของโมเดลที่ใช้อยู่ (เปลี่ยน Thinking/Effort โดยไม่สลับโมเดล) — และแยกไอคอนให้ออกมาอยู่ข้างปุ่มชื่อ

**วิธีแก้ (1) — harness:** `fixtures/server/api.ts` + `index.ts` เพิ่ม state `remoteConfig` + 2 endpoint ที่ extension อ่านจริง (`GET /api/v1/users/me/remote-config` = discovery คืน `data: null` เมื่อไม่มีนโยบาย, `GET /api/v1/organizations/{id}/remote-config` = `{ value: JSON, enabled }`) + helper `/.test/setRemoteConfig` + `setRemoteConfig()` บนคลาส mock (เพิ่ม endpoint `/organizations/{orgId}/api-keys` ที่ implement ไว้ก่อนหน้านี้ไม่ครบด้วย)

**เทสต์ e2e ใหม่:** `src/test/e2e/quick-picker-org-policy.test.ts` — signin → เผยแพร่นโยบาย "Cline เท่านั้น" → เข้า org ผ่าน **Account view จริง** (`tab-account` → select `random-org-id`) ซึ่งเป็นเส้น `setUserOrganization` → `fetchRemoteConfig` (await จริง ⇒  deterministic) → กลับหน้า chat → เปิด picker → assert (ก) provider ทุกตัวที่ไม่อนุญาตมีล็อก `data-icline-org-blocked="<id>"` และ cline ไม่มี (ข) ขยาย provider ที่ถูกห้ามจนเจอตัวที่มีโมเดล → คลิกโมเดล → ขึ้น `[data-icline-org-provider-block]` + popover ยังเปิด + **ชื่อโมเดลบนชิปไม่เปลี่ยน**

**วิธีแก้ (2) — webview:**
- คอมโพเนนต์ใหม่ `components/chat/ModelOptionsPanel.tsx` = เนื้อหาแผง Options (หัวข้อ/model id/Thinking/Effort/capability + `ReasoningEffortNotice`) ที่**ทั้งสองที่**เรนเดอร์: แผง hover ของ picker และ popover ของชิป · `CAPABILITY_ICONS` export จาก `ModelStatusIcons` เป็นนิยามเดียว (ลบตารางที่สองใน picker)
- ชิปแยกเป็น 2 ปุ่ม: `data-icline-model-trigger` (ชื่อ + chevron → รายการโมเดล) และ `data-icline-model-status-button` (ชุดไอคอน/badge → popover `data-icline-status-options`) · ซ่อนปุ่มสถานะเมื่อไม่มีอะไรแสดง (caps ว่าง + ไม่มี badge)
- เขียนค่าผ่าน handler ตัวเดิม (`handleThinkingToggle`/`handleEffortChange`) ⇒ โมเดลที่ใช้อยู่เขียนลง configuration จริง (ไม่ใช่ preference) และเรียก `useReasoningEffortOutcome` ตัวที่สองสำหรับโมเดลปัจจุบันเพื่อให้ popover แสดงประโยค clamp เดียวกับแผง hover
- i18n: `statusOptionsTooltip` (en/th)

**เทสต์ unit ใหม่:** `QuickModelPickerRealPopover.test.tsx` — "splits the composer chip..." : assert ไอคอนไม่อยู่ในปุ่มชื่อ · status button ไม่เปิดรายการโมเดล · popover แสดง model id/switch/effort ของโมเดลที่ใช้อยู่ · คลิก Max ⇒ `handleModeFieldChange({plan,act}, "max", "act")` และ **ไม่เรียก `commitModelSelection`** · badge บนชิปขยับตาม

**แก้เทสต์ e2e เดิม:** `quick-picker-hover` / `quick-picker-effort-notice` เลิกใช้ selector `button:has(span[class~="max-w-[180px]"])` (ราะปุ่มชื่อถูกจัดวางใหม่) → ใช้ `[data-icline-model-trigger]`

**หมายเหตุที่ต้องรู้ (harness):** ถ้าไม่มีนโยบาย discovery ตอบ `data: null` ⇒ host เรียก `clearRemoteConfig()` ตามเดิม · `vscode-dropdown` **ไม่ใช่** `<select>` (เป็น combobox ของ webview-toolkit: `role="combobox"` + `vscode-option` เป็น light DOM ที่ถูก slot เข้า shadow listbox) ⇒ ต้อง **คลิก dropdown แล้วคลิก `vscode-option[value=...]`** (ห้ามใช้ `selectOption` และ `getByRole("option")` จะมองไม่เห็นตอน listbox ปิด) · `showNavbar: false` ใน `platform-configs.json` ⇒ ใน VS Code ไม่มี navbar (`tab-account`) ต้องเปิด Account view ผ่านปุ่ม view-title ของ host (`.action-label[aria-label="Account"]:visible`) ซึ่งคือคำสั่ง `iCline.accountButtonClicked`

**ผลตรวจ (รอบนี้):** webview vitest **486/486** · `tsc -b` + biome ผ่าน · e2e บน VS Code จริง **5/5** = `composer-status-options` (ใหม่ 16.9s) · `quick-picker-org-policy` (ใหม่ 17.9s) · `quick-picker-hover` (19.0s) · `quick-picker-effort-notice` (39.5s) · `settings-model-selection` (17.4s) — รันบน VSIX `dist/e2e.vsix` ที่แพ็กจาก commit รอบนี้ (ยืนยันว่าบันเดิล webview มี `data-icline-model-status-button` + `data-icline-status-options`)

**VSIX:** `dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.17.vsix` (11,966,957 B @ 2026-09-20T03:45:49Z · About = `dev build 6 · fix.17`) · `build-metadata.ts` / `package.json` ถูก restore กลับสภาพเดิมหลังแพ็ก (ไม่มีไฟล์ค้าง)

**ยังไม่ทำ (ตัดสินใจไว้):** เส้นทาง "นโยบายองค์กร" ที่พิสูจน์ด้วย e2e นี้ครอบ sign-in → เข้า org ผ่าน UI → lock + คลิก blocked; ยังไม่ได้จำลองเคส **องค์กรปัก provider จริง** (remote config ที่มี `providerSettings` ของ provider อื่น + API keys) เพราะ harness ยังไม่มีคีย์ปลอมให้ resolve โมเดลของ provider นั้น

---

## 🔎 dev.6-fix.15 — แจ้งเมื่อ Effort ถูกลดระดับ + Settings เด้งกลับ Cline + dropdown ทับกัน + ไอคอนสถานะใต้ช่องแชท (2026-09-20)

**สถานะ:** ✅ แก้แล้ว + unit/e2e ผ่านบน VS Code จริง · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.15`)

**ที่มา (4 เรื่องรวมรอบเดียว — 3 เรื่องเป็นรายงานจาก maintainer, 1 เรื่องเป็นคิวที่ค้างจาก fix.14):**

1. **คิวจาก fix.14:** "ถ้าอยากให้ผู้ใช้เห็น `Max → X-High` ต้องมี surface แจ้ง (ยังไม่มี)"
2. **Settings ของ Sakana:** menu dropdown ของ Model โผล่**หลัง**ค่า Effort (maintainer แนบภาพ · ตีกรอบเหลือง)
3. **xAI Grok (OAuth & Subscription):** เลือกโมเดลในลิสต์ที่หน้า Settings แล้วหน้าเด้งกลับไป Cline (Quick Picker เลือกได้ปกติ)
4. **ใต้ช่องแชท:** ชื่อโมเดลไม่มีไอคอนสถานะเหมือนที่เมนู picker มี

**รากของ (1):** Effort เก็บที่ระดับ **mode** ไม่ใช่ต่อโมเดล และ dropdown ทุกตัวจงใจเสนอพจนานุกรมเต็ม ⇒ ค่าหนึ่งอาจบังคับใช้กับโมเดลที่ไม่รับค่านั้น แล้ว **SDK gateway** เป็นผู้ลดระดับให้ (ไม่ใช่ UI) — ไม่มีใครบอกผู้ใช้

**วิธีแก้ (1):**
- SDK: แยกการตัดสินออกมาเป็น **`decideReasoningEffort()`** (ฟังก์ชันเดียวกับที่ `normalizeReasoningRequest` เรียกทุก request) + export ออกจาก `@cline/llms` + เทสต์ `reasoning-options.test.ts` (รวม "โชว์เหตุผลครบทุกแบบ")
- host: `src/sdk/reasoning-effort-decision.ts` — ตอบ `{requested, applied, supportedEfforts, reason, clamped, suppressedByBudget, source}` โดยอ่าน controls จาก **registry เดียวกับที่ gateway ใช้** (`getProviderCollectionSync` + `toSdkProviderId`, matching ตรงเป๊ะแบบเดียวกับ gateway) · rpc ใหม่ `resolveReasoningEffort` (proto + handler `core/controller/models/resolveReasoningEffort.ts` + protos regenerate) — ไม่แตะ network ⇒ webview ถามทุก hover ได้
- webview: hook `useReasoningEffortOutcome` (cache ต่อ `provider|model|effort|budget` + กันคำตอบค้างเก่าด้วย key) + คอมโพเนนต์เดียว `ReasoningEffortNotice` ใช้ทั้ง **แผง Options ของ picker** และ **Effort control ใน Settings** ⇒ สองที่ไม่มีทางพูดไม่ตรงกัน · เงียบเมื่อ: ไม่รู้คำตอบ / ส่งตามที่เลือก / สิ่งที่ออกไปคือ thinking budget
- เทสต์: `reasoning-effort-decision.test.ts` (host) · `ReasoningEffortNotice.test.tsx` (กติกาข้อความ) · `useReasoningEffortOutcome.test.ts` (cache/race) · `ReasoningEffortSelector.test.tsx` · **e2e บน VS Code จริง** `quick-picker-effort-notice`
- **บทเรียนสำคัญของเทสต์:** รอบแรกผมเขียนเทสต์โดยสมมติว่า "โมเดล Fugu ที่มีปุ่ม Max ต้องถูก clamp" — **ผิด** (`sakana/fugu-max` ใน registry รองรับ `high/xhigh/max` จริง ⇒ `exact`) เทสต์ที่ผ่านในรอบนั้นผ่านเพราะ *ไม่มีการยืนยันอะไรเลย* ตอนนี้เทสต์ **คำนวณความคาดหมายจาก registry เดียวกับ host** (`decideReasoningEffort`) แล้ว assert ทั้งสองด้าน (clamp ต้องมีข้อความพร้อม label ของค่าที่ออกจริง · exact ต้องเงียบ)

**รากของ (2):** `vscode-dropdown` วาง listbox ไว้ในคอนเทนเนอร์ ⇒ list ถูกวาดที่ z-index ของคอนเทนเนอร์ · สอง sibling ที่ `position: relative` และ **z-index เท่ากัน** ตัดสินด้วยลำดับ DOM ⇒ ตัวหลัง (Effort) ทับ list ของตัวก่อน (Model) — ค่าเดิม `DROPDOWN_Z_INDEX - 100` เท่ากันทุกตัวในฟอร์ม

**วิธีแก้ (2):** `formDropdownZIndex(position)` ใน `common/ModelSelector.tsx` + กติกา "ฟอร์มต้องไล่ลง": Sakana billing 0 · protocol 1 · model 2 · effort 3 (ข้ามไฟล์ `SakanaProvider` ↔ `SakanaModelPicker` มีคอมเมนต์กำกับ) · ZenMux protocol 0 · routing 1 · เทสต์ `ModelSelector.test.tsx` ปักทั้ง "ไล่ลงจริง" และ "เรนเดอร์บนคอนเทนเนอร์จริง"

**รากของ (3):** `setApiConfiguration()` ส่ง settings ต่อเข้า **`remoteConfigCache`** (`filterAllowedRemoteConfigFields` เก็บ `planModeApiProvider`/`actModeApiProvider`) — และ remote เป็นชั้น**สูงสุด**ใน `remote > session > task > global` ⇒ **การเขียน settings ทั่วไปกลายเป็น "นโยบายองค์กร" ปลอม**: provider ที่เป็นอยู่ตอนนั้นถูกปักไว้ถาวร หลังจากนั้นการเลือกโมเดลของ provider อื่น commit สำเร็จแค่ *โมเดล* (provider ถูก shadow) — จับได้จาก log ชั้น precedence ของ host เอง:

```
COMMIT provider=xai model=grok-build mode=act
BATCH {"actModeApiProvider":"xai", …, "actModeApiModelId":"grok-build"}
LAYER actModeApiProvider remote=cline session=undefined task=undefined global=xai   ← remote ชนะ
STATE post plan=cline (grok-build) act=cline (grok-build)
```

**วิธีแก้ (3):** `setApiConfiguration` ไม่แตะ remote cache อีก (มีคอมเมนต์อธิบาย + ชี้เส้นทางที่ถูกคือ `applyRemoteConfig`/`setRemoteConfigField`) · เทสต์ใหม่ `remote-config/provider-pin.test.ts` — (ก) เขียน provider ธรรมดาต้องไม่ทิ้งร่องรอยใน remote layer (ข) remote pin ที่มาจาก control plane ต้องชนะจริงและ `clearRemoteConfig()` คืนค่าท้องถิ่นได้ · **e2e บน VS Code จริง** `settings-model-selection`: เปิด Settings → เลือก provider xAI → เลือกโมเดล Grok → **provider ต้องยังเป็น xAI** (ก่อนแก้ เห็น `Cline Usage-Billing`)

**รากของ (4):** ไอคอน + badge อยู่เฉพาะในแถวของ picker (`CapabilityIcons` เป็น local function ภายใน `QuickModelPicker.tsx`) ⇒ ชิปใต้ช่องแชทมีแค่ชื่อโมเดล

**วิธีแก้ (4):** แยกเป็นคอมโพเนนต์กลาง `components/chat/ModelStatusIcons.tsx` (capability icons + effort badge + `statusTooltip`) แล้วให้ทั้ง **แถวของ picker** และ **ชิปของ composer** เรนเดอร์ตัวเดียวกันจาก `status` ก้อนเดียวกัน (`statusForModel(currentProvider, currentModelId, warmModelsFor(...))`) · บอลลูนเดิมคร่อมทั้งชิป → ย้ายให้ครอบเฉพาะชื่อโมเดล กันบอลลูนซ้อนบอลลูน · เทสต์ใหม่ใน `QuickModelPickerRealPopover.test.tsx`: ชิปต้องมี caps/states/badge **ชุดเดียวกับแถว** ของโมเดลเดียวกัน

**ผลตรวจ:** webview vitest **477/477** · `tsc -b` (webview) · biome (ไฟล์ที่แตะทั้งหมด) · bun unit `reasoning-effort-parity` 2/2 · sdk vitest `reasoning-options` 16/16 · host vitest ใหม่ (`reasoning-effort-decision` 8/8 · `remote-config/provider-pin` 2/2) · **e2e บน VS Code จริง 4/4** (`quick-picker-effort-notice` 39.8s · `quick-picker-hover` 19.6s · `settings-model-selection` 17.9s)

**หลักฐานว่าแก้ตรงจุด (ข้อ 3):** รัน probe เดิมก่อนแก้ ⇒ ชิป provider = `Cline Usage-Billing` หลังเลือกโมเดล xAI · หลังแก้ ⇒ คงเป็น `xAI Grok (OAuth & Subscription)` ตลอดทั้ง 12 ตัวอย่างที่เก็บ (ทุก 250ms)

**พิสูจน์ว่า e2e เป็นยามจริง (falsification):** ใส่บรรทัด `this.setRemoteConfigState(settingsUpdates)` กลับเข้า `StateManager` ⇒ rebuild VSIX ⇒ e2e `settings-model-selection` **fail จริง** ด้วย `provider-selector-input` = `"Cline Usage-Billing"` (ตรงกับที่ maintainer เห็น) · ถอดออก + rebuild ⇒ ผ่านทั้ง 4 e2e อีกครั้งบน VSIX ที่แพ็กเป็น fix.15

**ยังเหลือ → ปิดใน fix.16 ทั้งสองข้อ:** (ก) การ commit ของ provider ที่องค์กรไม่อนุญาตถูก shadow เงียบ ๆ — ขึ้นข้อความแล้ว (ข) clip ของ `ReasoningEffortNotice` บนโมเดลที่ไม่มี effort control — ตรวจแล้วว่า**เกิดไม่ได้จริง** และปิดด้วยเทสต์สแกน registry

---

## 🏢 dev.6-fix.16 — provider ที่องค์กรไม่อนุญาต + ยามกันข้อความ Effort ผิดรูป (2026-09-20)

**สถานะ:** ✅ เสร็จ + unit/tsc/biome ผ่าน · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.16`)

**ที่มา:** 2 ข้อ P2 ที่ค้างจาก fix.15

**รากของ (ก):** `ApiOptions` กรองรายการ provider ด้วย `remoteConfigSettings.remoteConfiguredProviders` — provider ที่องค์กรไม่อนุญาต**ไม่โผล่**ใน Settings เลย แต่ **Quick Picker โชว์โมเดลของทุก provider** ⇒ คลิกโมเดลของ provider ที่ถูกห้าม = "เหมือนสำเร็จ" แต่ชั้น remote (นโยบายองค์กร, precedence สูงสุด) คง provider เดิมไว้ แล้วการ echo ของ picker ก็อ้างว่าสลับ provider สำเร็จ (ก่อนที่ state push ถัดไปจะกลับ) — อาการเดียวกับบั๊ก pin ของ fix.15 แต่รอบนี้เกิดจากนโยบายจริง

**วิธีแก้ (ก):**
- `webview-ui/src/icline/orgProviderPolicy.ts` — กติกาเดียวกับฝั่ง host (`isProviderValid`): ลิสต์ว่าง = ไม่มีนโยบาย, provider นอก lisต์ = เลือกไม่ได้ · เทสต์ `orgProviderPolicy.test.ts` 4 เคส (รวมเคสมีช่องว่างในลิสต์)
- `components/common/OrgProviderPolicyNotice.tsx` + คอมโพเนนต์**เรนเดอร์ใน popover** (ไม่ปิด popover) เพื่อให้คำอธิบายอยู่ตรงที่คลิก
- picker: (1) provider ที่ถูกห้ามมีไอคอนล็อก `Building2` + บอลลูนอธิบาย (`data-icline-org-blocked`) ⇒ รู้ก่อนคลิก (2) คลิกโมเดลของ provider ที่ถูกห้าม = **ไม่ส่ง commit** และไม่ echo provider (มีคอมเมนต์อธิบายเหตุผล: commit จะเขียนโมเดลที่ provider ที่ถูกปักใช้ไม่ได้ + echo จะอ้างการสลับที่ host ย้อน) แล้วขึ้นข้อความจาก `orgProviderBlocked`
- i18n: `orgProviderBlocked` / `orgProviderBlockedHint` (en/th)

**รากของ (ข):** ข้อความแจ้งใช้ `{applied}` เมื่อ reason เป็น `nearest-supported`/`catalog-unknown` — ถ้ามีเคสที่ `clamped` แต่ไม่มี `applied` และ reason เป็นสองตัวนั้น จะได้ `Max →  · …` (ช่องว่าง)

**วิธีแก้ (ข):** เขียน **เทสต์สแกน registry ทั้งหมด** (`reasoning-effort-decision.test.ts`) ครอบ provider × model × ระดับทุกตัว (ตัด `none`) assert 3 ข้อ: `clamped` ⇒ reason ไม่ใช่ `exact` · ไม่มี `applied` ⇒ reason ต้องเป็น `no-effort-control` · reason `no-effort-control` ⇒ ต้องไม่มี `applied` · **ผล: ผ่านทั้งหมด ⇒ เคสข้อ (ข) เกิดไม่ได้จริง** — ที่อาจารย์กังวลเป็นเพียงสมมติฐานจากอ่านโค้ด จึงไม่ได้ซ่อมข้อความที่ไม่มีบั๊ก แต่ (1) ยามด้วยเทสต์ (2) เพิ่ม fallback ใน `effortClampNotice`: ถ้าประโยคที่ต้องมีระดับไม่มีระดับ ⇒ ใช้ประโยค "ไม่ส่ง" แทน + เทสต์ (และเทสต์ assert ว่าไม่มี `→` หลุดไปด้วย)

**ผลตรวจ:** webview vitest **485/485** · `tsc -b` · biome · host vitest `reasoning-effort-decision` **9/9** (เดิม 8 + สแกน registry)

---

## 🔎 dev.6-fix.14 — พจนานุกรม Effort เดียวทั้งแอป + ปิดฟอร์ม Settings ของ Sakana ที่ซ้อนกัน (2026-09-19)

**สถานะ:** ✅ แก้แล้ว + unit/e2e ผ่านบน VS Code จริง · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.14`)

**ที่มา (2 เรื่องที่รวมรอบเดียวกัน เพราะแก้ "ค่า/สิ่งที่แสดง ไม่ตรงกับสิ่งที่ทำงานจริง" เหมือนกัน):**

1. **มีพจนานุกรม effort 3 ชุด** — SDK (`REASONING_LEVELS`) รับ `none·minimal·low·medium·high·xhigh·max` / แอปเก็บได้แค่ 5 ตัว (ขาด `minimal`,`max`) / gate ตอนส่ง request ผ่านแค่ `low|medium|high` (fix.13 บันทึกไว้เป็น "ข้อสังเกตที่ยังไม่ได้แก้")
2. **Settings ของ Sakana.ai มีสองฟอร์มเรนเดอร์ซ้อนกัน** (รายงานจาก maintainer: "UXUI มีส่วนทับซ้อนกัน")

**รากของ (1):** `normalizeOpenaiReasoningEffort()` แปลงค่าที่ไม่อยู่ในลิสต์ 5 ตัวเป็น `medium` และมันถูกเรียกบนเส้นทาง task settings จริง (`updateTaskSettings.ts` · `newTask.ts`) → **`max` ของ Sakana กลายเป็น `medium` เงียบ ๆ** ส่วน `xhigh` รอดชั้นนั้นแต่ถูกทิ้งที่ gate (`sdk-api-handler.ts` + `cline-session-factory.isReasoningEffort`)

**วิธีแก้ (1):**
- `src/shared/storage/types.ts` — `OPENAI_REASONING_EFFORT_OPTIONS` = พจนานุกรมเดียวของแอป ตรงกับ SDK เป๊ะ + `isReasoningEffortValue()` (ค่าที่ forward ได้ = ทั้งชุดยกเว้น `none`)
- **เทสต์กันหลุด:** `src/shared/storage/__tests__/reasoning-effort-parity.test.ts` — assert ว่าลิสต์ของแอป **เท่ากับ `REASONING_LEVELS` ของ `@cline/shared`** (deep equal ทั้งค่าและลำดับ) → หลุดกันอีกไม่ได้
- gate ทั้งสองชั้นใช้ `isReasoningEffortValue` ตัวเดียวกัน (`sdk-api-handler.ts` · `cline-session-factory.ts` ลบ `isReasoningEffort` ที่ฮาร์ดโค้ด 4 ค่า)
- **UI อ่านพจนานุกรมเดียวกัน:** `OPENAI_EFFORT_LEVELS` สร้างจาก `OPENAI_REASONING_EFFORT_OPTIONS` (ไม่ใช่ลิสต์ที่เขียนซ้ำ) + ตาราง label `Record<OpenaiReasoningEffort, …>` ⇒ เพิ่มค่าใหม่ที่ storage แล้ว **คอมไพเลอร์บังคับให้ใส่ label**
- **catalog ชนะชุด generic:** ถ้า `modelInfo.reasoningEffortOptions` มีค่า ใช้ชุดนั้น **ทุก provider** (เดิมจำกัดที่ OCA) และ label ของค่าที่ catalog เผยแพร่ใช้คำเดียวกับพจนานุกรม (`xhigh` → "X-High") + ค่า `none` ที่ catalog เผยแพร่ถูกทำเป็น off ⇒ ไม่โผล่เป็นปุ่มข้างสวิตช์ Thinking
- ค่าคอมเมนต์ที่ค้างชี้ 5 ค่า: `proto/cline/models.proto` · `src/sdk/model-catalog/contracts.ts` อัปเดตแล้ว

**รากของ (2):** SDK builtin ของ Sakana ประกาศ `protocol: "openai-responses"` (+ generated catalog ว่า `openai-chat`) ซึ่ง**ทั้งคู่อยู่ใน allowlist ของฟอร์ม generic** → `isGenericProviderListing()` เป็น true → `ApiOptions` เรนเดอร์ `GenericProviderSettings` **และ** `SakanaProvider` พร้อมกัน (API key 2 ช่อง · model picker 2 ตัว)

**วิธีแก้ (2):** ลงทะเบียน `sakana` ใน `CUSTOM_PROVIDER_SETTINGS_IDS` (มีฟอร์มของตัวเอง) → generic form หาย · เทสต์ใหม่ `providerSettingsRegistry.test.ts` ปักว่า `isGenericProviderListing(sakana) === false` และ getter ทั้งสองคืน `undefined` · ลบ `<VSCodeLink>` ไปหน้า /pricing ที่ซ้ำสองอันในย่อหน้า (ปุ่ม Pay-as-you-go / Subscription เป็นเจ้าของ action นั้น)

**หลักฐานที่ยืนยันด้วยรันจริง:** `getProviderCollectionSync("sakana")` รายงาน `{ id: sakana, name: "Sakana AI", protocol: "openai-chat" }` — ยืนยันว่าก่อนแก้ predicate ของฟอร์ม generic จับ Sakana จริง

**ผลตรวจ:** webview vitest **453/453** · `tsc -b` (webview) · extension `tsc --noEmit` · extension vitest (935/937 — 2 เคส timeout จาก lazy import หนัก ๆ เมื่อรันพร้อมกัน, ผ่านเมื่อรันไฟล์เดียว) · bun unit ใหม่ผ่าน 2/2 · biome · **e2e บน VS Code จริง 2/2** (`quick-picker-hover`: แผงต้องอ่านได้ `Minimal/Low/Medium/High/X-High/Max` และ Sakana `High/X-High/Max`)
**VSIX:** `dev.6-fix.14` มี marker ใน bundle จริง (webview มี `X-High`/`Minimal` · host มี `["none","minimal","low","medium","high","xhigh","max"]` 12 จุด) — repack ครั้งสุดท้าย 2026-09-19 16:57Z ให้ตรงกับ commit ที่ลงแล้ว

**เปลี่ยนแปลงพฤติกรรมที่ตั้งใจ:** (1) dropdown Effort ของทุกฟอร์มมี 7 ระดับเท่ากับที่แอปเก็บได้ (เดิม 5) — ค่าที่โมเดลไม่รับจะถูก SDK clamp ไม่ใช่ถูก UI ตัด (2) `xhigh` ใน Quick Picker เปลี่ยนจาก "Max" เป็น **X-High** ให้ตรง Settings เพราะ `max` เป็นระดับจริงอีกตัวแล้ว (เฉพาะคำที่แสดง ค่าที่เก็บไม่กระทบ) (3) สวิตช์ Thinking ที่เปิดกลับใช้ระดับแรกจริง = `minimal` แทน `low`

**ยังเหลือ (ต่อจากรอบนี้):** cloud/routing layer ตัวแทน provider ที่รับ `xhigh`/`max` ไม่ได้ถูกตรวจซ้ำ — SDK เป็นผู้ clamp ให้แล้ว แต่ถ้าอยากให้ผู้ใช้เห็น "ขอ Max แต่ได้ X-High" ต้องมี surface แจ้ง (ยังไม่มี)

---

## 🔎 dev.6-fix.13 — ชุดค่า Effort ต่อ provider ย้ายขึ้นเป็น metadata ของ provider (2026-09-19)

**สถานะ:** ✅ refactor เสร็จ + unit/e2e ผ่านบน VS Code จริง · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.13`)

**ที่มา:** ต่อจาก fix.12 ที่ยก "นโยบายว่าอะไรตั้งได้" ขึ้นเป็นโมดูลกลาง — แต่ **"ชุดค่าที่ตั้งได้"** ยังเป็นความรู้ของ UI: ชุด adaptive (`["none","low","medium","high","xhigh"]`) ถูกเขียนซ้ำใน 6 คอมโพเนนต์ และ Sakana มี `SAKANA_REASONING_EFFORTS = ["high","xhigh","max"]` + default ต่อโมเดลของตัวเอง ขณะที่ Quick Picker มีสูตรที่สี่ (`OPENAI_REASONING_EFFORT_OPTIONS` ตัด `none` ออก)

**วิธีแก้:** ใน `webview-ui/src/utils/modelThinkingOptions.ts` เพิ่ม metadata ของ **levels** ต่อ provider
- `EffortLevel { value, label, short, isOff }` · `ProviderEffortLevels { id, levels, default, defaultFor?, label, description }`
- ชุดที่นิยามไว้: `openai` (None/Low/Medium/High/X-High — ค่าตรงกับ `OPENAI_REASONING_EFFORT_OPTIONS` เป๊ะ), `adaptive-thinking` (ชุดเดียวกัน label "Adaptive Thinking" + คำอธิบาย "Use None…"), `sakana` (High/X-High/Max + `defaultFor`: `fugu-ultra*` → X-High) และ `model-declared` (OCA — สร้างจาก `reasoningEffortOptions` ที่ catalog เผยแพร่จริง)
- `resolveEffortLevels({ providerId, modelId, modelInfo })` เป็นทางเดียวที่ทุก dropdown ใช้ — เลือกชุดจาก **policy ตัวเดียวกับที่ตัดสินว่ามีคอนโทรลหรือไม่** (`adaptive-thinking` → ชุด adaptive, ที่เหลือ → ชุดของ provider, `effortDefault` ของ provider เช่น openai-compatible ที่ว่างเปล่า = `none` ไม่ใช่ `medium`)
- helper ประกอบ: `defaultEffortValue` (default ต่อโมเดล), `firstOnEffortValue` (สวิตช์เปิดกลับไประดับจริง ไม่ใช่ off), `normalizeEffortValue`, `effortBadge`, `declaredEffortDefault`
- **`ReasoningEffortSelector`** เลิกรับ `allowedEfforts`/`defaultEffort`/`label`/`description` ทั้งหมด — รับ `providerId`/`modelId`/`modelInfo` แล้วอ่าน metadata (รวมกรณี adaptive ที่ default มาจากค่าที่ "มีผลจริง" ผ่าน `resolveClaudeOpusAdaptiveThinking` → ลบโค้ดซ้ำใน 6 ฟอร์ม)
- **SakanaModelPicker** สร้าง `VSCodeOption` จาก levels + ใช้ `description` จาก metadata (ลบ `SAKANA_REASONING_EFFORTS`/`defaultSakanaReasoningEffort`/`normalizeSakanaReasoningEffort`)
- **OcaModelPicker** ทั้งการ render และค่า default ตอนเปลี่ยนโมเดลอ่าน metadata ตัวเดียวกัน (ลบ `reasoningEffortOptions[0]` ที่เขียนซ้ำสองที่)
- **QuickModelPicker** ดึง levels ของ **โมเดลที่ hover** (ไม่ใช่ชุดเดียวตายตัว) → Sakana ใน picker แสดง High/X-High/Max, OCA แสดงค่าที่ catalog เผยแพร่ · label แปลตาม i18n ยังอยู่ (`effortMax` เพิ่มใหม่) · `pickerCapabilities` ตัดตาราง badge ซ้ำ (`MODEL_EFFORT_SHORT`) ทิ้ง ใช้ `effortBadge` และรับค่า `max` ได้ (เดิม `isOpenaiReasoningEffort` กรองทิ้ง)
- `ChatModelPreference.reasoningEffort` กว้างเป็น `string` (ค่า `max` ของ Sakana ต้องเก็บได้)

**กันถอยหลัง:**
- unit: `modelThinkingOptions.test.ts` +5 เทสต์ (ชุด openai ตรงกับ enum ที่เก็บจริง · adaptive label/off · Sakana 3 ระดับ + default ต่อโมเดล + badge `M` · OCA ตาม catalog และ `declaredEffortDefault` = ค่าแรก/undefined · openai-compatible ว่างเปล่า = `none` และ `firstOnEffortValue` = `low`) และการ์ดใหม่ "ห้ามไฟล์ใน `components/settings` มี array literal ของ level" — **พิสูจน์แล้วว่าฟ้องจริง** ด้วยไฟล์ probe (fail) แล้วลบออก (pass)
- jsdom: `QuickModelPickerRealPopover.test.tsx` เพิ่มเทสต์ provider Sakana — แผงต้องมี `[high, xhigh, max]`, ไม่มี `none`, `data-icline-effort-set=sakana`, ชิปแถว = `M`
- e2e `quick-picker-hover.test.ts` บน VS Code จริง: อ่าน `data-icline-effort-set` ของแผงแล้ว assert ชุดค่าตรงของจริง (sakana = High/X-High/Max) และกฎร่วม (ไม่มี None, ไม่ซ้ำ, ไม่ว่าง) — ผ่าน 2/2 (ชุด openai/adaptive ถูกขยายเป็น Minimal/Low/Medium/High/X-High/Max ใน **fix.14**)
- ผ่าน: webview `tsc -b` · vitest ทั้งชุด **449/449** · extension `tsc --noEmit` · biome lint · VSIX fix.13 มี marker `data-icline-effort-set`

**ข้อสังเกต (ปิดใน fix.14 แล้ว):** `src/sdk/sdk-api-handler.ts` ส่งต่อ effort แค่ `low|medium|high` → `xhigh` และ `max` ถูกตัดเงียบ ๆ — fix.14 ขยายพจนานุกรมแอปให้ตรง SDK และให้ gate ทั้งสองชั้นใช้ตัวเดียวกัน

**เปลี่ยนแปลงพฤติกรรมที่ตั้งใจ:** (1) คอนโทรล Effort ของ Sakana แสดงตลอด (เดิม gate ด้วย `effortIsSet` → ต้องมีค่าตั้งค้างอยู่ก่อน) (2) label ของ `xhigh` ใน Settings เป็น `X-High` แทน `Xhigh` (config เดิมไม่กระทบ)

---

## 🔎 dev.6-fix.12 — นโยบาย Effort/Thinking เป็นโมดูลกลางตัวเดียวที่ Settings และ Quick Picker เรียกใช้ (2026-09-19)

**สถานะ:** ✅ refactor เสร็จ + unit ทั้งชุดผ่าน · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.12`)

**ที่มา:** คำถาม "ระหว่าง Settings กับ Quick Picker ใครถือแหล่งความจริงเดียว" → คำตอบคือ **ค่าจริง (value truth) เป็นของ host config** (`planMode/actModeReasoningEffort`, `...ThinkingBudgetTokens`) แต่ **นโยบายว่าอะไร "ตั้งได้"** ยังตัดสินซ้ำกันหลายที่: Settings มีกฎกระจายอยู่ในฟอร์ม provider ~15 แห่ง (บางที่ดูจาก id, บางที่ดู metadata, บางที่มีรายการโมเดลฮาร์ดโค้ดของตัวเอง) ส่วน Quick Picker มีสูตรที่สี่ของตัวเอง → สองหน้าจอตอบไม่ตรงกันได้ทั้งที่ค่าจริงถูกต้อง

**โมดูลกลาง:** `webview-ui/src/utils/modelThinkingOptions.ts` → `resolveModelThinkingOptions({ providerId, modelId, modelInfo, effortIsSet, budgetIsSet })` คืน `{ showEffort, showThinkingBudget, builtinReasoning, effortSource, budgetSource }`
- ตาราง `POLICIES` ต่อ provider — แต่ละแถบบันทึกว่าจำลองมาจากฟอร์ม Settings ตัวไหน (xai / anthropic / bedrock / claude-code / qwen / qwen-code / openrouter / vercel-ai-gateway / requesty / zenmux / cline / vertex / oca / litellm / openai-native / openai-codex / openai-compatible) ที่เหลือใช้ `DEFAULT_POLICY` (heuristic เดิมของ picker)
- หลักการ 2 ข้อ: (1) กฎต่อ provider ต้อง**ซื่อตรงกับของเดิม** — รายการโมเดลฮาร์ดโค้ดยังอยู่ (`ANTHROPIC_THINKING_BUDGET_MODELS`, `BEDROCK_…`, `CLAUDE_CODE_…`, `QWEN_…`, fragment ของ gateway) แต่ย้ายมาอยู่ที่เดียว และให้ metadata (`thinkingConfig`, `supportsThinkingLevel`) ชนะเมื่อ catalog รู้จักโมเดลนั้น (2) **คอนโทรลต้องเข้าถึงได้เสมอ** — ค่าที่ตั้งไว้แล้วทำให้คอนโทรลของค่านั้นยังโผล่ (`stored-preference`) โดย budget ที่ค้างอยู่ไม่กลายเป็นคอนโทรล effort
- `effortSource`/`budgetSource` มีไว้ให้เทสต์และรายงานบั๊ก — บอกว่า "ทำไมคอนโทรลนี้โผล่"

**ย้ายเข้าโมดูลกลางรอบนี้ (ปิดงานที่ค้างจากรอบก่อน):**
- `providers/AnthropicProvider.tsx` — เลิกรายการ `SUPPORTED_ANTHROPIC_THINKING_MODELS` ในคอมโพเนนต์ + ใช้ policy
- `providers/BedrockProvider.tsx` — เลิกรายการ `SUPPORTED_BEDROCK_THINKING_MODELS` · โมเดล custom ถูกตัดสินด้วย **base model id** เหมือนเดิม
- `providers/VertexProvider.tsx` — ใช้ policy และแยก "สองหน้าตา" ของ effort ด้วย `effortSource` (`adaptive-thinking` = ตัวมี label/None, `thinking-level` = ตัวธรรมดา)
- `providers/OcaModelPicker.tsx` — ทั้ง dropdown Effort และ budget slider อ่าน policy เดียวกัน (effort = ต้องมี `reasoningEffortOptions` จริง)
- `SakanaModelPicker.tsx` — ให้ policy ตัดสินว่าโมเดลไหนมีคอนโทรล Effort (ระดับ `high/xhigh/max` ยังเป็นของ Sakana ตามที่ provider map เอง)
- `utils/pricingUtils.ts` — `hasThinkingBudget` ย้ายไปเรียก `hasThinkingBudgetConfig` ตัวเดียวกัน
- `utils/providerUtils.ts` — ลบ `supportsReasoningEffortForModelId` ที่ตายแล้วทิ้ง พร้อมคอมเมนต์กันคนกลับมาเขียน helper ซ้ำ

**กันถอยหลัง (สำคัญ):** เพิ่มเทสต์ใน `utils/__tests__/modelThinkingOptions.test.ts`
- คู่เทียบ "Settings กับ Quick Picker ตอบเหมือนกัน" — รวมเคสที่เคยขัดกัน (Claude id ที่ Settings ให้เป็น budget แต่ heuristic เดิมของ picker เรียกร้อง effort)
- เทสต์การ์ดกันซ้ำ (สแกนไฟล์ใน `components/settings` จริง): ไฟล์ไหนเรนเดอร์ `ThinkingBudgetSlider`/`ReasoningEffortSelector` ต้อง import `@/utils/modelThinkingOptions` · และห้ามมีไฟล์ไหนเก็บรายการโมเดล thinking ฮาร์ดโค้ดของตัวเองอีก — **พิสูจน์แล้วว่าเทสต์ฟ้องจริง** โดยวางไฟล์ probe ที่ผิดกฎชั่วคราว (fail) แล้วลบออก (pass)

**ผลตรวจ:** webview `tsc -b` · vitest ทั้งชุด **442/442** · extension `tsc --noEmit` · biome — ผ่านทั้งหมด

**ยังเหลือ (Settings-only, ยังไม่ย้าย):** ฟอร์มที่ถือ "ค่าที่รองรับ" ของตัวเองเป็นชุด dropdown แบบ provider-specific (เช่น Sakana `high/xhigh/max`) — ถ้าจะให้จบในชั้นเดียว ต้องยกชุดค่าพร้อม mapping ขึ้นเป็น metadata ของ provider

---

## 🔎 dev.6-fix.11 — Quick Picker: แผง Options ตรง mock v11 + ไอคอน/สถานะตรงกับค่าที่ตั้งจริง (2026-09-19)

**สถานะ:** ✅ แก้แล้ว + unit/e2e ผ่านบน VS Code จริง · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.11`)

**อาการ:**
1. เนื้อหาแผง Options ไม่ตรง design lock — mock v11 มีหัวข้อ "Options" + บรรทัด model id + สวิตช์ Thinking + ปุ่ม Effort ชื่อ Low/Medium/High/Max (ไม่มี Off) และรายการ capability ส่วนล่างเป็นไอคอนเทา ๆ ส่วนของเราหัวเป็นชื่อโมเดล + label "Reasoning effort"/"Capabilities" + ชิป Off/Low/Med/High/Max
2. ทดสอบ fix.10 แล้วพบว่า "การตั้งค่าและไอคอนแสดงสถานะไม่สอดคล้องกัน" — แผงบอกว่าตั้ง Effort ไว้ ขณะที่แถวโมเดลไม่แสดงสถานะอะไรเลย

**ต้นตอ (ข้อ 2 — ปมหลัก):** แถวโมเดล**ไม่ได้รับค่าจริงเลย** — `renderModelSections` เรียก `<ModelRow>` โดยไม่ส่ง prop `effort` ขณะที่แผงคำนวณค่าของตัวเองแยก → สองฝ่ายอ่าน input คนละชุด จึงตรงกันไม่ได้เลยแม้จะไม่มีบั๊กอื่น นอกจากนี้ค่าที่ตั้งใหม่จะยังไม่ขึ้นจนกว่า state push จาก host จะมาถึง (`handleModeFieldChange` ไม่ได้ optimistic update) จึงเห็น "ตั้งค่าแล้วไอคอนไม่ขยับ"

**วิธีแก้:**
- เพิ่ม `resolveModelStatus()` + `resolveModelOptionSupport()` ใน `icline/pickerCapabilities.ts` — แหล่งความจริงเดียวที่**ทั้งแถวและแผง**อ่านร่วมกัน: อะไรที่ตั้งได้ (พอร์ตตรรกะ `getModelOptionSupport` จาก picker 0.1.17 ตัวที่ shipped: xAI 3-mini = effort, xAI non-reasoning = ไม่มีอะไรให้ตั้ง, xAI reasoning/multi-agent = คิดในตัว, อื่น ๆ = effort เมื่อ `supportsReasoningEffortForModel`/`supportsReasoning` หรือ thinking budget เมื่อมี `thinkingConfig`) + สถานะเปิด/ปิดจริง + ชิปตัวอักษร L/M/H/X
- ไอคอน Reasoning/Thinking บนแถวใช้**สีตามสถานะจริง** (สีประจำความสามารถเมื่อเปิด, จาง 50% เมื่อปิด) พร้อม tooltip บอกระดับจริง — ส่วน Vision ยังเป็นสีความสามารถล้วน (ไม่มีสถานะ)
- เก็บค่าใหม่ที่ผู้ใช้เพิ่งแก้ไว้ใน session (`sessionThinking`) เพื่อให้แถวกับแผงขยับพร้อมกันทันทีโดยไม่รอ push และล้างเมื่อเปิด picker ใหม่ (ตอนนั้น config คือความจริง)
- สวิตช์ Thinking เขียนค่าจริงแบบเดียวกับ Settings: โมเดลแบบ effort → กลับไประดับเดิม (ดีฟอลต์ `medium`) หรือ `none`; โมเดลแบบ budget → `ANTHROPIC_MIN_THINKING_BUDGET` หรือ 0
- ปิดช่องที่เจอระหว่างทาง: ค่า thinking budget ที่เก็บรายโมเดล (localStorage) เคยไม่ถูกนำกลับเข้า config ตอนเลือกโมเดล — ตอนนี้ `applyStoredThinking()` เขียน effort + budget **ในการเรียกเดียว** (`handleModeFieldsChange`) เพราะสองครั้งเรียงกันจะแข่งกับ state push แล้วตัวหลังเขียนทับด้วย snapshot เก่า (คลาสเดียวกับบั๊ก stale write-back ของ fix.9)
- แผง Options ปรับโครงตาม mock v11: หัวข้อ Options → บรรทัด model id → สวิตช์ Thinking → ปุ่ม Effort Low/Medium/High/Max (มี ✓ ที่ระดับที่เลือก) หรือข้อความ "No effort options for this model" → รายการ capability (ไอคอนเทาแบบ mock) หรือ "No capability data" และเว้นวรรค/ขนาดให้ตรง mock (py 10 / px 12, gap 4px, กว้าง 236px, max-height 320px)

**กันถอยหลัง:**
- unit: `pickerCapabilities.test.ts` ครอบกฎ option support + สถานะ (off จนกว่าจะตั้ง, budget เก่า + ไม่มี effort → `high` ตาม `resolveClaudeOpusAdaptiveThinking`, `none` = ปิดจริง, โมเดลไม่มีอะไรให้ตั้ง = ไม่มีคอนโทรล); `QuickModelPickerRealPopover.test.tsx` เพิ่ม 2 เทสต์: โครงแผง mock v11 (Options + model id + สวิตช์ + Low/Medium/High/Max) และ "แถวกับแผงต้องตรงกัน" (ชิป `H` + ไอคอน on + สวิตช์ on + ระดับที่เลือก ตรงกันหมด แล้วสลับปิด/เปิดกลับมาระดับเดิม)
- e2e `quick-picker-hover.test.ts` ยืนยันบน VS Code จริง: แผงเป็นผิว mock v11 (Options/Effort/สวิตช์ 1 ตัว) และไล่ hover สูงสุด 12 แถว ตรวจว่าทุกแถวที่ hover มี model id + สถานะไอคอน + ชิป effort **ตรงกับแผงทุกแถว**
- ผ่าน: webview `tsc -b` + vitest ทั้งชุด 427/427 · extension `tsc --noEmit` · biome · e2e 2/2

**หมายเหตุ:** ชื่อระดับ Effort คงเป็นอังกฤษ (Low/Medium/High/Max) ทั้งสองภาษาเหมือน mock v11 — และไอคอนสีบอกสถานะเป็นพฤติกรรมที่ตั้งใจให้ต่างจาก mock (mock เป็นภาพนิ่ง) ตามข้อ "ไอคอนต้องตรงกับการทำงานจริง"

---

## 🔎 dev.6-fix.10 — Quick Picker: แผง Options ตามแถวได้แค่ไม่กี่แถวบน (ต่อจาก fix.9) (2026-09-19)

**สถานะ:** ✅ ต้นตอพิสูจน์จาก mock v11 จริง + แก้แล้ว + e2e ตรวจสูตรตรง mock · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.10`)

**อาการ:** แผง Options โผล่แล้ว (fix.9) แต่ขยับตามเมาส์แค่รายการช่วงบน ๆ — พอเลื่อนลงต่ำแผงหยุดค้าง

**ต้นตอ:** สูตรจัดตำแหน่งของ mock v11 (`.icline/plans/quick-picker-redesign/mock.v11-locked-2026-09-16.html`) คือ

```js
const desiredTop = rr.top - pr.top - 6;
const maxTop = pr.height - options.offsetHeight - 10;   // ← ความสูง “จริง” ของแผง
options.style.top = Math.max(38, Math.min(desiredTop, maxTop)) + "px";
```

แต่โค้ดจริงใช้ `OPTIONS_PANEL_MAX_HEIGHT_PX` (320 ค่าคงที่) แทน `options.offsetHeight` → `maxTop` = 422−10−320 = **92px** → ทุกแถวที่ต่ำกว่า ~92px ถูก pin ที่ค่าเดียว (แผงดูเหมือนตามได้แค่ 3 แถวแรก)

**วิธีแก้:**
- ย้าย geometry + สูตร clamp เป็น pure helper `computeOptionsPanelTop()` ใน `quickModelPickerList.ts` (unit-test ได้)
- วัดความสูงจริงของแผง (ซึ่งแปรตามโมเดล 157–264px) ใน `useLayoutEffect` หลังเรนเดอร์ แล้วค่อยใส่ `top`
- ปรับค่าอื่นให้ตรง mock: gap 4px (จาก 6), กว้าง 236px (จาก 232), min-top 38px (กันทับช่องค้นหา), nudge 6px, margin ล่าง 10px
- side flip: ไปขวาเป็นหลักเหมือน mock — จะพลิกซ้ายเมื่อด้านขวาไม่พอ **และ** ด้านซ้ายมีที่จริง (กันเคส sidebar แคบดันแผงหลุดจอ)

**กันถอยหลัง:** unit test ของ `computeOptionsPanelTop` ใช้ตัวเลขที่วัดจาก mock จริง (row 311/panel 227 → 267; row 352/panel 157 → 337; row 439/panel 260 → 234) + e2e `quick-picker-hover.test.ts` ยืนยันว่าตำแหน่งแผงตรงสูตร (±1.5px) และยังตามแถวล่างได้

**หมายเหตุ (แก้แล้วใน fix.11):** เทียบ mock แล้ว เนื้อหาแผงยังต่างกัน — mock มีหัวข้อ "Options" + บรรทัด model id + สวิตช์ Thinking และปุ่ม Effort ใช้ชื่อ Low/Medium/High/Max (ไม่มี Off) ขณะที่ของเรามีหัวเป็นชื่อโมเดล + label "Reasoning effort"/"Capabilities" + ชิป Off/Low/Med/High/Max → ยกไปทำใน `dev.6-fix.11`

---

## 🔎 dev.6-fix.9 — Quick Picker: เมนู Options ไม่ขึ้นตอน hover (regression ของ fix.8) (2026-09-19)

**สถานะ:** ✅ ต้นตอพิสูจน์บน VS Code จริง + แก้แล้ว + มี e2e กันถอยหลัง · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.9`)

**อาการ:** เปิด Quick Picker แล้ว hover รายการโมเดล — แผง Options ไม่โผล่เลย (fix.8)

**ต้นตอ:** แผงผูกกับ event ผ่าน `list.addEventListener("pointermove", …)` ที่ใส่ใน `useEffect` โดยมี deps `[open, handleModelHover, scheduleOptionsClose]` ฝั่ง Radix `Presence` **mount เนื้อหา popover หลัง commit ที่ `open` กลายเป็น true หนึ่งจังหวะ** (layout effect ยิง `send("MOUNT")` แล้ว setState) ลำดับจึงเป็น:

1. commit A — `open=true` แต่ content ยังไม่ mount → effect รัน → `listRef.current === null` → `return` (ไม่มี cleanup)
2. commit B — `send("MOUNT")` → ลิสต์ mount จริง, `listRef.current` ถูกตั้งค่า
3. deps ไม่เปลี่ยนอีก → **effect ไม่ re-run → listener ไม่เคยถูก attach** → hover ตาย

พิสูจน์ด้วย e2e probe บน VS Code จริง: ไม่มี `pointermove` listener ถูก attach เลย; อ่าน React fiber ได้ hook effect (deps=3) `ran=false` ขณะ `open=true` และ `listRef.current` ชี้ div จริง (`rowMetaRef` มี 291 แถว) — และเป็นเหตุผลที่ scroll-pin ยังทำงาน เพราะ effect นั้นอ่าน `listRef` ข้างใน rAF

**วิธีแก้:** เปลี่ยนเป็น **React prop `onPointerMove` บนลิสต์** (`handleListPointerMove`) ซึ่งผูกตอน render จึงไม่มีทางพลาดจังหวะ mount — ลบ effect แบบ native listener ทิ้ง

**กันถอยหลัง:** unit test (จริง Radix Popover ตัวจริง) "hovering a model row mounts the Options panel and follows the hovered row" + e2e `src/test/e2e/quick-picker-hover.test.ts` (ไดรฟ์เมาส์จริงบน VS Code: แผงโผล่วันแรกที่ hover และขยับตามแถวที่สอง)

---

## 🔎 dev.6-fix.8 — e2e บน VS Code จริง: `editor` เขียนเกินขีดจำกัด ต้องขึ้นล้มเหลวพร้อมข้อความจริง (2026-09-19)

**สถานะ:** ✅ รันผ่านบน VS Code จริง (ยืนยันซ้ำ 2026-09-19) · ⏳ ยังไม่ commit

**ที่มา:** รอบ fix.7 พิสูจน์ "editor create รายงานสำเร็จแต่ไฟล์ไม่ลงดิสก์" ด้วย core script (`bun run repro:editor-write`) + vitest เท่านั้น — ยังไม่มีหลักฐานในหน้าต่าง VS Code จริงว่าปลายทางผู้ใช้เห็นอะไร

**ทำอะไร:** harness e2e ที่ให้ mock server stream tool call `editor` ขนาดเกินขีดจำกัด (6,000 ตัวอักษรต่อการเรียก) แล้วยืนยันว่าแถว tool ในแชทขึ้น **ล้มเหลวพร้อมข้อความจริงจาก runtime** (ไม่ใช่ `ENOENT` ซึ่งเป็นอาการเดิมที่ทับหลักฐาน)

**ไฟล์:** `src/test/e2e/oversized-editor-write.test.ts` (ใหม่) · `src/test/e2e/fixtures/server/{api,index}.ts` (mock stream tool call + model list) · `scripts/repro-editor-write.ts` + `src/sdk/tool-write-pipeline.test.ts` + `src/icline/harness/tool-trace.ts(+test)` (ชั้น core/observability ของ fix.7)

**หลักฐาน:** `bun run test:e2e:build && node src/test/e2e/utils/build.mjs && npx playwright test oversized-editor-write` → **3 passed** (setup + Single Root + Multi-Roots, ~36s)

---

## 🔎 dev.6-fix.7 — ไล่ "editor create รายงานสำเร็จแต่ไฟล์ไม่ลงดิสก์" (2026-09-19)

**สถานะ:** ✅ ต้นตอพิสูจน์แล้ว + แก้แล้ว · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.7`)

### กองที่ 1 — บั๊กของเรา (iCline): guardrail เขียนทับหลักฐาน

`runIclinePostWriteVerification` (`apps/vscode/src/sdk/hooks-adapter.ts`) เดิมตัดสินว่าสำเร็จ/ล้มเหลวจาก **ธง `isError` เท่านั้น** แต่ฝั่ง SDK คืน "การปฏิเสธระดับ input" มาเป็น **envelope ที่ return กลับมา** — `{ query, result: "", error, success: false }` — โดย **ไม่ throw** ดังนั้น `isError` จึงว่างเสมอ

ผลลัพธ์เป็นสองหน้าตาที่ไม่สมมาตรกัน:

| เคส | สิ่งที่เกิดก่อนแก้ | สิ่งที่โมเดลเห็น |
|---|---|---|
| `editor` **สร้างไฟล์ใหม่** oversized (ไฟล์ยังไม่มี) | guardrail เข้าใจว่าสำเร็จ → `verifyWrittenFile` stat ไฟล์ที่ไม่มีวันมี → **เขียนทับข้อความจริงด้วย ENOENT** | "ไฟล์หาย" → เดา → ส่งคำสั่งเดิมซ้ำ |
| `editor` **แก้ไฟล์เดิม** oversized (ไฟล์มีอยู่) | guardrail ตรวจผ่านเงียบ ๆ → envelope ยังอยู่ครบ | ข้อความจริงอยู่ แต่ **ไม่ถูกทำเครื่องหมายว่าล้มเหลว** → โมเดลเล็กส่งซ้ำอยู่ดี |

**แก้แล้ว:** ตรวจ envelope **ก่อน** การ verify (เก็บข้อความของ executor ไว้), คืน `isError: true`, เติมสูตรที่ลงมือได้จริง (แยกก้อน + `insert_line` สำหรับต่อท้าย), และในเส้นทาง verify-fail จะแนบ "The tool reported: …" กลับไปด้วย หลักฐานจึงไม่หายอีก — ดู "ทางป้องกัน/ทางกู้" ท้ายหัวข้อ

### กองที่ 2 — ขีดจำกัดของ runtime (ไม่ใช่บั๊ก iCline แต่ต้องรู้)

| ข้อจำกัด | ค่าจริง | หลักฐาน |
|---|---|---|
| `editor` จำกัด `new_text`/`old_text` **ต่อการเรียก 1 ครั้ง** | 6000 ตัวอักษร (`INPUT_ARG_CHAR_LIMIT`, `@cline/core` `extensions/tools/schemas.ts`) | `bun run repro:editor-write`: 6000 → ลงดิสก์, 6001 → ถูกปฏิเสธ (envelope) |
| `insert_line` ต้องอยู่ในช่วง 1..(บรรทัดสุดท้าย) ของไฟล์ | ปฏิเสธพร้อมข้อความบอกช่วงที่ถูก | session ล่าสุด msg#31 (`insert_line: 21` แต่ไฟล์มี 18 บรรทัด) |
| `old_text` ไม่ตรงเป๊ะ | "No replacement performed" | 40 เคสใน 47 session iCline — **พฤติกรรมโมเดล** ไม่ใช่บั๊ก |

เส้นแบ่ง 6000 ยืนยันจากคลัง session (ตัวเลขจากตาราง size bucket ด้านล่าง): `create` ที่ **>6000 ล้ม 28 จาก 28** (`ok` 0) · `create` ที่ **≤6000 สำเร็จ 56 จาก 65** — และ 9 เคสที่ล้มนั้นเป็น `Editor operation failed: Parameter \`old_text\`` ทั้งหมด (โมเดลส่งคำสั่งแก้ไฟล์ที่ยังไม่มี) **ไม่เกี่ยวกับขนาด** · `edit` ที่ **>6000 ล้ม 23 จาก 23**

### กองที่ 3 — observability: envelope ไม่เคยถูกทำเครื่องหมายเป็น error เลย

สแกน `~/.cline/data/sessions` ด้วย `.icline/scratch/analyze-session.mjs --envelope`:

```
envelope rejections flagged as errors  : 0
envelope rejections reported as SUCCESS: 74  {"ENVELOPE_FAILURE_UNFLAGGED":11,"SIZE_REJECTED_UNFLAGGED":23,"NO_MATCH_UNFLAGGED":40}
by session (14)  — new_text ที่ถูกปฏิเสธเพราะใหญ่เกิน: 6044…26310 (23 ค่า)
```

**74/74 ไม่เคยถูก flag** — ไม่มีแม้แต่ครั้งเดียวที่การปฏิเสธระดับ input กลายเป็น error ที่ UI/ลูปมองเห็น จึงไม่แปลกที่รอบก่อน ๆ สรุปว่า "ข้อความ `Editor input too large` ไม่เคยถึงโมเดล"

> **ตัววิเคราะห์เองก็มองไม่เห็นบั๊กนี้** — `classifyResult` เดิมแยกชนิดจาก `is_error` อย่างเดียว เคส envelope จึงถูกนับเป็น `ok` ต้องแก้เป็นอ่าน payload (`success: false` + `error`) ก่อน ตัวเลข "23/23 ไม่มี flag" จึงโผล่

### สิ่งที่แก้/เพิ่มในรอบนี้

| # | ไฟล์ | ทำอะไร |
|---|---|---|
| 1 | `src/sdk/hooks-adapter.ts` | ตรวจ failure envelope ก่อน verify · เก็บข้อความ executor · เติมสูตรแยกก้อน · คืน `isError: true` · ส่ง `apply_patch` ด้วย |
| 2 | `src/icline/harness/guardrails.ts` | `EDITOR_INPUT_CHAR_LIMIT` (สะท้อนค่าจริง 6000) + `getLargeWriteGuidance()` ใช้ร่วมกันทั้ง overlay และ guardrail · overlay สอนวิธีเขียนไฟล์ใหญ่ก่อนล้ม |
| 3 | `src/icline/harness/tool-trace.ts` | แหล่งหลักฐาน JSONL (`~/.cline/data/logs/icline-tool-trace.jsonl`): tool name / call id / path / คำอ้างของ tool / ผล verify · เขียนเฉพาะตอนล้มเหลวในบิลด์ปกติ, เปิดทั้งหมดด้วย `ICLINE_TOOL_TRACE=1` · จำกัดขนาด 2 MB · ห้าม throw เข้าลูป |
| 4 | `apps/vscode/scripts/repro-editor-write.ts` | harness กับ **core จริง** (`bun run repro:editor-write`) — vitest alias `@cline/core` เป็น stub จึงพิสูจน์ไม่ได้ชั้นนั้น |

**ทางป้องกัน:** overlay ของ harness บอกทุก session ว่ารอบเดียวรับได้ ~6000 ตัวอักษร และให้แยกก้อน + ต่อด้วย `insert_line`
**ทางกู้:** ถ้าโดนปฏิเสธ guardrail ส่งข้อความจริงของ executor + สูตรที่ลงมือได้กลับไปพร้อม `isError: true` แทน ENOENT ที่ทำให้เข้าใจผิด

### เทสต์กันถอยหลัง

| ไฟล์ | คุมอะไร |
|---|---|
| `src/sdk/tool-write-pipeline.test.ts` | สัญญาของ guardrail (envelope ใหญ่/ไม่ใหญ่, เก็บคำอ้าง, เงียบเมื่อสำเร็จจริง, ไม่แตะเมื่อ tool throw แล้ว) |
| `src/sdk/hooks-adapter.test.ts` | +4 เคส: envelope → error จริง · เติมสูตรเมื่อ oversized · envelope ที่ `error: ""` ยังต้อง verify · `apply_patch` ไม่เติมสูตรของ editor |
| `src/icline/harness/tool-trace.test.ts` | เงียบในบิลด์ปกติ · เก็บเคสล้มเหลวเสมอ · เขียนพร้อมกันไม่ปนบรรทัด · ตัด backlog เมื่อเกิน 2 MB |

### 🧪 วิธี smoke fix.7

| # | ทดสอบ | คาดหวัง |
|---|-------|--------|
| 1 | About | `dev build 6 · fix.7` |
| 2 | สั่งให้เขียนไฟล์ใหญ่ (> 6000 ตัวอักษร) ในคำสั่งเดียว | โมเดลต้อง**ไม่**รายงานว่าสำเร็จลอย ๆ — ถ้าโดนปฏิเสธต้องเห็นข้อความ `Editor input too large` **พร้อมสูตรแยกก้อน** และแถว tool ต้องเป็นสีแดง (ไม่ใช่เขียว) |
| 3 | ให้โมเดลสร้างไฟล์ 2 ไฟล์พร้อมกันโดยไฟล์หนึ่งใหญ่เกิน | ไฟล์เล็กต้องลงครบ · ไฟล์ใหญ่ต้องรายงานเหตุผลจริง |
| 4 | `ICLINE_TOOL_TRACE=1` แล้วลองซ้ำข้อ 2 | มีบรรทัดใหม่ใน `~/.cline/data/logs/icline-tool-trace.jsonl` ที่มี `event` / `toolName` / `newTextChars` |
| 5 | Quick Picker: เปิดจากแถบหัวแชท | กว้าง 320px · กลุ่ม **Free ก่อน Standard** + จำนวน · badge FREE · ไอคอน capability มี tooltip (บอลลูน **ด้านบน** ไม่ใช่ title เนทีฟ) · chevron ตัวเดียว**หน้า**ชื่อ provider ยุบแล้วชี้ขวา |
| 6 | hover แถวโมเดล | มี Options panel โผล่**ด้านขวา** ขอบบนตรงกับแถว · เดินเมาส์เข้าไปกด Effort ได้โดย panel ไม่หาย · **scroll ลิสต์แล้ว panel ต้องปิด** |
| 7 | ตั้ง General Settings → Preferred Language = `Thai - ไทย` แล้วเปิด picker | ข้อความใน picker เป็นไทย (ช่องค้นหา / Free / ใช้งานอยู่) |
| 8 | Settings → provider `jan` (หรือ custom ที่ใช้ฟอร์ม OpenAI-compatible) | dropdown **Model ID** ต้องเข้าธีม (ไม่ใช่สีขาวของเบราว์เซอร์) |

### คิวถัดไปที่ยังค้างจากรอบนี้

- **e2e บน VS Code จริง** ผ่าน mock server ที่ stream tool call `editor` ขนาดใหญ่ — เลย์เอาต์ที่พิสูจน์ได้ตอนนี้คือ `bun run repro:editor-write` (real core) + vitest (เลเยอร์เรา); debugger F5 ใช้ได้ แต่ `debug-harness` ของ upstream เป็น macOS-only
- `old_text` ไม่ตรง 40 เคส = คุณภาพโมเดล ไม่ใช่บั๊ก — ถ้าจะลด ต้องแก้ที่ prompt/overlay ไม่ใช่โค้ดเครื่องมือ

---

### 🔀 dev.6 Wave 1 — SDK fast-forward ถึง upstream Sep-16 (`ce25d8b15`, เปิดรอบ)

| # | งาน | Smoke |
|---|-----|-------|
| W1-1 | SDK packages (core/shared/llms/agents) ยกทั้งก้อนถึง upstream `173837314` — ครอบ stream retry, terminal reliability, PowerShell fail-fast, editor/CRLF recovery, MCP hang/stdio/OAuth/timeout, checkpoints perf, CVE axios/js-yaml/mermaid/protobufjs | ⏳ รอ smoke |
| W1-2 | identity re-applied: builtins Sakana/Jan/ZenMux · fix.26 catalog merge logic · JAN enum · upstream cline-free catalog supersede fix.26 blocks | ⏳ ร่วมกับด้านบน |
| W1-3 | vscode adapt: ลบ onRetryAttempt pass-through, stored-overrides boundary cast, default models ใหม่ (sonnet-5/gemini-3.8) | ⏳ ร่วมกับด้านบน |

**known-failures (ไม่บล็อก):** llms ollama.wire ×4 (third-party serialization เวอร์ชันลอย) · core ~16–26 (upstream tests flaky บน Windows: cron timers/hub listeners/locale sort/git-init/python/bun-ENONENT) · **suite ต้องรัน `--no-file-parallelism` (OOM บน dists ใหม่)**

| **fix.2** | provider parity กับ official: Sakana ลบ static list → generated 8 โมเดล (fugu-ultra-v2/namazu/prompt-cache) · Jan ย้ายไปฟอร์ม OpenAI-compatible (auto model list จาก Base URL — กลไกเดียวกับ official, Jan = iCline-only) · การ์ดสถิติ Providers/Models/Free · Wave-2 hand-port ffd6a6b1d (summarizer เคารพ Max Output Tokens) — `4b2aec563` | ❌ smoke เจอ P0: เลือก/สลับ provider+model ไม่ติด (รากมาจาก fix.1 + trigger ใหม่ — → fix.3) |
| **fix.3** | P0 selection stuck — ราก 3 ชั้น: (1) stale write-back race (effort apply หลัง commit ส่ง snapshot เก่าแทนที่ config — trigger = official บันทึก reasoning ลง shared providers.json 9 ตัว) → effort ก่อน commit + handlers อ่าน state สด (getState) (2) push delivery แตกเงียบ → host retry + webview re-subscribe (3) debounce กลืนคีย์แรก → user edit เคลียร์ skip flag · + model leakage fix + การ์ดย้ายไปชิดขวาแถวหัวข้อ — `de487d3e8` | ❌ smoke: commits ทำงาน 47 ครั้งแต่ display ยังค้าง (ติด Cline หลังเลือก) · jan picker ว่าง · ClinePass หายจาก list → fix.4 |
| **fix.4** | (1) **optimistic provider echo** — commit สำเร็จ → patch *ModeApiProvider ใน webview ทันที (ไม่รอ push) ทั้ง picker+settings (2) **jan picker fallback** — catalog ว่าง → ถาม server ของผู้ใช้ (`{baseUrl}/models` เดียวกับหน้า Settings) เฉพาะ dynamic-list providers (3) **ClinePass กลับมา** — flag default ON ทั้ง host/webview (backend ยัง override ได้) — `c2b71008c` | ✅ **ส่วนใหญ่ผ่าน (2026-09-19)** — สลับ Cline Usage Billing เข้า/ออกได้ · ClinePass กลับมา · jan picker มีลิสต์จาก server · การ์ดชิดขวา |
| **หมายเหตุ fix.4 smoke** | (a) ลิสต์ jan = จาก `{baseUrl}/models` ของ Jan server ผู้ใช้เอง — server รายงาน**ไฟล์ทั้งหมดที่เสิร์ฟได้** (ทุก quant + embedding) ขณะที่ Jan app UI คัดเฉพาะ chat models → ไม่ตรงกัน = พฤติกรรม Jan server ไม่ใช่บั๊ก iCline (official จะเห็นลิสต์เดียวกัน) (b) glm-5.3-flash (free) พิมพ์ tool XML เป็น**ข้อความล้วน** (transcript: text-only, ไม่มี tool_use แม้ชิ้นเดียว; deepseek รอบเดียวกันปกติ) = ขีดจำกัดของโมเดล ไม่ใช่บั๊ก iCline | 📝 บันทึกไว้ |
| **fix.6** | การ์ดคำตอบสุดท้ายแบบ official: แถว text สุดท้าย → การ์ด COMPLETED + copy ขวาบน (mock: plans/completion-card/) — `8440e4bb6` | ⏳ รอ smoke |
| **fix.6 v2** (repack) | ปรับตาม feedback: tint **คราม/ฟ้าจาง** (rgba(99,102,241,.07)) · **copy ย้ายเข้าแถว COMPLETED ขวาบน แสดงตลอด** · **COMPLETED สีน้ำเงิน** (charts-blue) · **Thinking → Thought** เมื่อจบคิด — repack ทับ `dev.6-fix.6` (11,948,077 B @ 09-19 08:02) — `9702f2191` | ⏳ รอ smoke (ติดตั้งตัวใหม่ 15:02 น.) |
| **คิวถัดไป** | Quick Picker redesign (mock รอบ 11) + restyle dropdown ดิบ (jan Model ID) — จัดคิวใน STATUS แล้ว ทำหลังปิด smoke | ✅ **ทำใน fix.7** (พร้อมงานไล่บั๊ก editor) ⏳ รอ smoke |
| **fix.5** | glm-5.3-flash พิมพ์ tool XML เป็นข้อความ — **รากฝั่งเรายืนยันด้วย prompt diff**: overlay ของเราสั่ง "must use a tool" ขณะ official ไม่มีคำสั่งนี้เลย (glm เจอคำสั่งขัดแย้งกับ base จึงเขียน markup ลง text) → overlay ใหม่ห้าม fabricate markup + guard เทส — `f05e92253` | ⏳ รอ smoke |
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
