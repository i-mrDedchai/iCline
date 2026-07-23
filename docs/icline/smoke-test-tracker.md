# Smoke Test Tracker — v0.1.18-dev.5

**Last updated:** 2026-07-23
**Branch:** `sync/upstream-v4.0.0`
**HEAD:** `b54b34265`
**vsix:** `dist/i-mrdedchai.iCline-0.1.18-dev.5.vsix`

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

## ⏳ ข้อ 2 — xAI / Grok Provider

**สถานะ:** แก้บางส่วนแล้ว (commit `0f1d6145d`) ยังเหลือ 3 ปัญหา:

| # | ปัญหา | สถานะ | รายละเอียด |
|---|-------|--------|-----------|
| 2a | ชื่อ Provider ไม่ตรง dev.4 | ⏳ pending | ปัจจุบันแสดง "Grok" แต่ dev.4 แสดง **"xAI Grok (OAuth & Subscription)"** — ต้องแก้ `HOST_PROVIDER_LABELS` ใน `catalog.ts` |
| 2b | Model list ไม่ครบ | ⏳ pending | ปัจจุบันดึงได้ 5 โมเดล แต่ dev.4 ดึง CLI + subscription รวมเป็น 8 โมเดล — ต้อง restore subscription model fetch |
| 2c | แชทไม่ได้ | ⏳ pending | ขึ้น error **"No credentials presented"** — OAuth token อาจไม่ถูกส่งไปยัง SDK handler |

---

## ⏳ ข้อ 3 — Quick picker บน chat header

**สถานะ:** สร้างใหม่แล้ว (commit `6f6abbc5b`) แต่ผู้ใช้ชอบแบบ dev.4 มากกว่า

| # | ปัญหา | สถานะ | รายละเอียด |
|---|-------|--------|-----------|
| 3a | แสดงชื่อ active ผิด | 🔶 อาจแก้แล้ว | `jan:grok-4.5` — แก้ใน `b54b34265` (เพิ่ม jan case) ยืนยันด้วย smoke test |
| 3b | สลับ provider/model มีปัญหา | ⏳ pending | Provider ค้างที่เดิม |
| 3c | บังคับขยาย Provider ที่เลือกใน Setting | ⏳ pending | ไม่ยุบได้ ต้องไปเลือก Provider อื่นก่อน |
| 3d | ตัวเลือก Effort หายไป | ⏳ pending | dev.4 มี reasoning effort selector ใน picker |

> **หมายเหตุ:** ผู้ใช้บอกชัดเจนว่า "ชอบรูปแบบ Quick picker บน chat header แบบใน dev.4 มากกว่า" — อาจต้อง restore legacy ChatModelPicker แทน QuickModelPicker ใหม่

---

## ⏳ ข้อ 4 — Push origin/main

**สถานะ:** ยังไม่ push (ผู้ใช้สั่งห้าม push จนกว่าจะบอก)

---

## ⏳ ข้อ 5 — 4 คำถามที่ยังไม่ตัดสินใจ

**สถานะ:** รอผู้ใช้ขอให้อธิบายแต่ละตัว

| # | คำถาม | สถานะ | ความหมาย |
|---|-------|--------|---------|
| 5a | Sync timing | ⏳ pending | จะ sync upstream บ่อยแค่ไหน? ทุก release? ทุกเดือน? หรือเฉพาะ major? |
| 5b | ClinePass | ⏳ pending | จะเปิดใช้ ClinePass (provider ใหม่ของ upstream) หรือไม่? |
| 5c | Marketplace | ⏳ pending | จะเผยแพร่ที่ VS Marketplace / Open VSX หรือไม่? หรือแจกเฉพาะ GitHub? |
| 5d | Subagents | ⏳ pending | จะใช้ subagent system ของ upstream หรือไม่? |

---

## ⏳ ข้อ 6 — Agent แนะนำตัวเองว่า "Cline"

**สถานะ:** ยังไม่ได้เริ่ม

| # | ปัญหา | สถานะ | รายละเอียด |
|---|-------|--------|-----------|
| 6a | ระหว่างทำงาน | ✅ ถูกต้อง | "iCline read 1 file:" — แสดงถูก |
| 6b | แนะนำตัวเอง | ⏳ pending | บอกว่า "ผมคือ Cline — AI Coding Agent" แทนที่จะเป็น "iCline" — ต้องแก้ใน system prompt หรือ model instruction |

---

## Git state
- **Branch:** `sync/upstream-v4.0.0`
- **HEAD:** `b54b34265`
- **Tag:** `v0.1.18-dev.5`
- **Backup tags:** `pre-upstream-sync-0.1.18-dev.4`, `pre-upstream-sync-round2-a3e556807`
- **Uncommitted:** none (clean working tree)
