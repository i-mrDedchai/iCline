# 📋 รายงานรอบ Context 128K + เครื่องมือวินิจฉัย + แถวแจ้ง truncation + e2e stub

**วันที่:** 28 ก.ย. 2026 · **สาขา:** `feat/upstream-waves-1-2` · **สถานะ:** ปิดงานครบทุกข้อ · working tree สะอาด
**ชุด commit:** `81fb49118` · `46de21459` · `1806231df` · `065fb5b9c` · `55484ca9c`

---

## 1) 🔢 บั๊ก "Context: 128K" — หารากจริงเจอ 4 ชั้น แก้ที่ต้นทาง (`81fb49118`)

โมเดลที่ประกาศ context window จริง (เช่น `kimi-k3` 1M ใน models.json) และ provider นอกสารบบทั้งตัว (Cleanapis 500K) แสดง "Context: 128K" เสมอ — ไม่ใช่แค่ UI โกหก แต่งบ compaction ก็ตามตัวเลขปลอมด้วย รากที่ตรวจพบ:

| ชั้น | ปัญหา | วิธีแก้ |
|---|---|---|
| **(ก) registry split-brain** | view `MODEL_COLLECTIONS_BY_PROVIDER_ID` สะท้อนเฉพาะ collection ของ provider **ไม่รวม**โมเดลที่ต่อเข้ามาผ่าน `registerModel` (models.json) ⇒ ทุกจุดที่อ่านเสีย `contextWindow`/pricing ที่ประกาศไว้ | เพิ่ม `getModelsForProviderSync()` (merged view = collection ∪ CUSTOM_MODELS) ใน `@cline/llms` ให้ทุก consumer อ่านชุดเดียวกัน |
| **(ข) default ที่แต่งขึ้น** | พอค่าหาย `openAiModelInfoSafeDefaults` (128K) ถูกตราเป็นข้อเท็จจริงของโมเดล (store fallback / shape adapter / webview) | เลิก fabricate — ค่าที่ไม่มีก็คือไม่มี (safe-defaults เหลือแค่ diff base ของ legacy migration) |
| **(ค) manifest ถูก snapshot ตอน module load** | provider ที่ register ทีหลังมองไม่เห็นใน `resolveProviderConfig` | compose manifest ตอนเรียกใช้จาก registry จริง |
| **(ง) proto3 scalar = 0** | ค่า 0 จาก wire ถูกส่งผ่านแทน undefined | normalize 0/absent → undefined |

**แถม regression ที่เจอระหว่างทาง:** custom provider ที่เพิ่งเข้าถึง `resolveProviderConfig` ไป trigger การดึง shared catalog (models.dev + Cline feed) เปล่าประโยชน์ ⇒ เพิ่มเงื่อนไข `canUseSharedCatalog` ข้ามให้ — เทสต์ `local-provider-service` ที่ flake ตอนโหลดรวมกลับมาเขียว 98/98

เทสต์ใหม่ 5 ข้อ (registry 1 · provider-defaults 3 · handler-factory 1) + ปรับชุด store/shape-adapter เดิม

## 2) 🩺 สคริปต์วินิจฉัยประวัติแชท (`46de21459`)

`scripts/diagnose-chat-history.mjs` — รวม pattern จากการ audit ด้วยมือหลายรอบเป็นเครื่องมือถาวร สแกน `*.messages.json` ทั้ง tree หา 5 อาการ: เทิร์นตายกลางงาน, tool result หาย, ชน output limit, โมเดลปฏิเสธงาน (pattern อังกฤษ+ไทย), parse error — รายงาน JSON/Markdown ได้

รันบนของจริง 92 เซสชัน ตรงกับที่เคยพบเป๊ะ: **12 เทิร์นตายกลางงาน / 4 ชน output limit** (รวมตัวเขียน RAIN/SCENE `ocw60o` 31,999 และ `t4kozl` 32,000) / **2 tool result หาย** (ทั้งคู่ `ask_question`) / **1 ปฏิเสธงาน** (`j0urr9` — "I lack a terminal tool")

## 3) 💬 แถวแจ้ง "turn truncated, continuing" (`1806231df`)

เดิมเทิร์นที่ถูกตัดด้วยเพดาน output แล้ว runtime ทำต่อจะ**เงียบ** — แชทกระโดดจากข้อความขาดไปเป็นคำตอบใหม่ทันที ตอนนี้มีแถวสถานะก่อนเริ่มเทิร์นต่อ: *"turn truncated, continuing — the model hit the maximum output token limit (continuation N/2)"* ไหลผ่าน `runtime-event-adapter` → `message-translator` จนขึ้นเป็นแถว `info` ในแชทจริง

## 4) 🧪 e2e stub provider จำลองชน output limit กลางเทิร์น (`065fb5b9c`)

ปิดข้อค้าง "e2e harness ยังไม่มี model stub" ของรอบก่อน — mock server ตอบ flow แปลกปลอมตามเนื้อหา request: คำขอแรก stream คำตอบถูกตัดจบ `finish_reason: "length"` (map เป็น max-tokens บน wire) คำขอที่สอง (ที่มี nudge ของ runtime) ตอบส่วนที่เหลือ + `stop`

เทสต์ `output-limit-continuation.test.ts` รันบน **VS Code จริงผ่าน 2/2 (19.1s)**: เห็นข้อความถูกตัด → แถว "turn truncated, continuing" → งานจบครบ และไม่มีข้อความ hard fail (`Model reached the maximum output token limit`) เลย

---

## 📦 แพ็ก `fix.39` + ตรวจไบต์ 35 ข้อ **ผ่านครบ**

- **ไฟล์:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.39.vsix` (12,008,530 B · 60 files · version `0.1.18-dev.6-fix.39`)
- build SDK ครบก่อนแพ็ก (shared → llms → agents → core) · แพ็กด้วย `node` มาตรฐานตั้งแต่ fix.37
- **sha1 ของ host + webview bundle ตรงกับ dist ของเครื่องทุกไบต์** · มีของใหม่ครบ (แถวแจ้ง truncation + guard `maxInputTokens` ของ shape-adapter) · regression ชุด fix.31–38 ครบถ้วน · webview มี label `dev build 6 · fix.39` ตัวเดียว · ไม่มี `.wip.bak` ตกค้าง
- **หมายเหตุเทคนิค:** ชื่อ `getModelsForProviderSync` ถูก minify หายจากบันเดิล (named import) เลยยืนยันที่ llms/core **dist ต้นทาง**ที่เข้าเครื่องแพ็กแทน และเทียบชุด string literal กับ fix.38 เพื่อเลือก marker ที่ซื่อสัตย์ (ไม่ใช้ marker ที่เช็กตัวเองแบบ tautology)
- **บันทึก:** ครั้งแรกเผลอรันแพ็กโดยไม่ใส่ bun บน PATH ⇒ webview rebuild ตายกลางทาง สคริปต์ recover `build-metadata.ts` จาก `.wip.bak` ให้เอง แล้วรันซ้ำด้วย PATH ที่ถูกต้องจนจบ

## 🧪 ผลทดสอบโดยรวม

| ชุด | ผล |
|---|---|
| agents | 130/130 |
| core | 2,457 ผ่าน / 9 ล้ม = flake สภาพแวดล้อมเดิม (cron-runner · runtime-builder MCP ×2 · hook-file-hooks python · workspace-manifest ×2 — ล้มที่ HEAD เดิมด้วย ไม่ใช่ regression) |
| app | 1,062/1,063 (flake เดิม `resolveModelInfo` — ผ่านเดี่ยว 42/42) |
| webview | 583/583 |
| llms | 893 ผ่าน / 4 ล้ม (`ollama.wire` = known failure เดิม — ขาด `patches/ollama-ai-provider-v2@4.0.1.patch` ใน checkout นี้) |
| typecheck | สะอาดทุกชุด (ยกเว้น `hub-upgrades` TS6133 ที่เป็นอยู่ก่อน) |
| e2e ใหม่ | 2/2 ใน VS Code จริง |

## ⏳ ค้างอยู่อย่างเดียว

**ผล smoke ของ maintainer บน fix.39** — (ก) เพิ่มโมเดล custom / Cleanapis ⇒ ต้องแสดง Context 500K/1M **ไม่ใช่ 128K** (ข) งานคิดยาวชนเพดาน output ⇒ ต้องเห็นแถว "turn truncated, continuing" แล้วงานจบได้ (ค) ของ fix.38 ทั้งหมดยังผ่าน + label About = `dev build 6 · fix.39`
