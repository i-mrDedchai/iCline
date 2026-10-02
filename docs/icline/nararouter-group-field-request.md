# คำขอฟิลด์ group/family ถึง NaraRouter — ร่างพร้อมส่ง (ยังไม่ส่ง)

> สถานะ (2026-10-03): ร่างเสร็จ รอส่ง — ทิศทางข้อ 5 (grouped tabs) และข้อ 4
> (ชุดทดสอบที่ครอบคลุมขึ้น) **พักเป็นงานรอตัดสินใจ** จนกว่าจะได้คำตอบจาก
> NaraRouter (ร่วมมือ / ปฏิเสธ) แล้วค่อยเลือกทางเดินต่อ

## บริบท

- iCline รวม NaraRouter เป็น first-class provider แล้ว (56 chat models, snapshot ตรง live 100% ณ 2026-10-03)
- ผล live probe ด้วยคีย์ทดสอบ: `/v1/models` → 200 (57 รายการ), chat → 200 บน
  `ling-3.0-flash-sante-free` แต่ `mimo-v2.5-free` / `mimo-v2.5` → 502 (3/3 ครั้ง)
- ข้อสรุปฝั่งเรา: wire ไม่มีฟิลด์ group/tier — ถ้าจะทำ tabs ต้อง hardcode เอง
  ซึ่งจะเน่าเร็วเพราะ catalog เปลี่ยนบ่อย จึงขอฟิลด์จาก gateway แทน

## ร่างจดหมาย (ภาษาอังกฤษ — คัดลอกส่งได้เลย)

**Subject:** Feature request: `group`/`family` field in `GET /v1/models` — plus a heads-up on mimo 502s

Hi NaraRouter team,

We're building **iCline**, an AI coding assistant for VS Code, with NaraRouter integrated as a first-class provider — your full catalog (57 models, 56 chat-capable) is listed in our model picker, enriched live from `GET /v1/models` when the user has a key. Thank you again for the test credit; it verified our integration end-to-end.

**One small API request:** could each entry in `GET /v1/models` carry a stable grouping field, e.g.

```json
{ "id": "deepseek-v4-flash", "group": "deepseek", "group_display": "DeepSeek", ... }
```

ideally matching the shelves/grouping you already show on your dashboard.

**Why we're asking instead of grouping client-side:** your catalog moves fast (we see new families appearing regularly), so any hardcoded mapping on our side rots within weeks — models land in the wrong tab, users pick the wrong model, and that costs both sides in confusion and wasted calls. A server-side field stays correct by construction.

**What's in it for you:**

- **Better discovery → more usage** — grouped, tabbed browsing (like your dashboard) helps users find the right model instead of scrolling 50+ entries, which means more successful calls through your gateway.
- **Your taxonomy, everywhere** — third-party clients like ours would surface exactly the grouping you designed, instead of each client inventing its own.
- **Fewer support questions** — users stop asking "which model is which" when the grouping travels with the API.

A `tier`/`plan` shelf field (Free / Bonus / PAYG) alongside it would be a welcome bonus — it would let us label costs honestly instead of guessing from prices — but `group` alone already unlocks the tabbed UX.

Happy to share our current client-side mapping as a starting point, and happy to beta-test the field as soon as it ships.

**P.S. — possible incident, not part of the request:** on Oct 3 our probes to `POST /v1/chat/completions` returned `502` for `mimo-v2.5-free` and `mimo-v2.5` (3/3 attempts, minimal 5-token prompt), while `ling-3.0-flash-sante-free` answered `200` correctly with the same key. Flagging in case the mimo upstream route needs a look — it's currently our picker's default model, so we've had to warn our testers.

Thanks for the great gateway — looking forward to growing with it.

Best regards,
*[ชื่อผู้ส่ง] — iCline team*

## โครงจดหมาย (เผื่อปรับ)

1. ตัวตนเรา — client จริงที่ส่ง traffic ให้เขา (ไม่ใช่คำขอเลื่อนลอย)
2. คำขอเล็กและชัด — ฟิลด์เดียว พร้อมตัวอย่าง JSON
3. ประโยชน์ฝั่งเขา — usage, taxonomy, support (ไม่ใช่แค่ "ทำให้แอปเราสวย")
4. P.S. แยก incident mimo 502 ออกจาก feature request ชัดเจน (forward ต่อให้ทีม infra ได้; ถ้ากลัวกลบประเด็นหลักให้แยกส่งอีกฉบับ)

## ทางแยกหลังได้คำตอบ (งานรอตัดสินใจ — ยังไม่ทำ)

- **กรณีร่วมมือ (ได้ฟิลด์ group/tier):** ออกแบบ grouped tabs ขับด้วยฟิลด์จริง + ขยายชุดทดสอบ (live-key e2e แบบ keyed, snapshot refresh อัตโนมัติ)
- **กรณีปฏิเสธ/เงียบ:** ทำฟิลเตอร์จากฟิลด์จริงที่มี (shelf Free/Bonus/PAYG, reasoning/vision, search) + group header ใน list เดียวแบบไม่ซ่อนของ — ไม่ hardcode vendor tabs
