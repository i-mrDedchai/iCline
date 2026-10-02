# คำขอฟิลด์ group/family ถึง NaraRouter — ร่างพร้อมส่ง (ยังไม่ส่ง)

> สถานะ (2026-10-03): ร่างเสร็จ รอส่ง — ทิศทางข้อ 5 (grouped tabs) และข้อ 4
> (ชุดทดสอบที่ครอบคลุมขึ้น) **พักเป็นงานรอตัดสินใจ** จนกว่าจะได้คำตอบจาก
> NaraRouter (ร่วมมือ / ปฏิเสธ) แล้วค่อยเลือกทางเดินต่อ

## บริบท

- iCline รวม NaraRouter เป็น first-class provider แล้ว (56 chat models, snapshot ตรง live 100% ณ 2026-10-03)
- ข้อสรุปฝั่งเรา: wire ไม่มีฟิลด์ group/tier — ถ้าจะทำ tabs ต้อง hardcode เอง
  ซึ่งจะเน่าเร็วเพราะ catalog เปลี่ยนบ่อย จึงขอฟิลด์จาก gateway แทน

## สิ่งที่อ่านจาก docs (https://router.bynara.id/docs, 2026-10-03)

- **502 ไม่อยู่ในตาราง error** — ตารางมี 400/401/403/404/413/415/429/**503**/500 เท่านั้น
  (`503 service_unavailable` คือ "temporarily unavailable, retry with backoff")
  ส่วน **402** ก็ไม่มีในตาราง ทั้งที่ section combos อ้างถึง (insufficient balance)
- `reasoning_effort` 7 ระดับ (`none|minimal|low|medium|high|xhigh|max`, `ultra` = alias
  ของ `max`) — docs ระบุชัดว่า **"safe to always send"**: บน non-reasoning model เป็น
  no-op, ระดับที่เกินถูก clamp ลงมาแทน error — ยืนยันด้วยการทดสอบจริงแล้ว (ดูด้านล่าง)
- Models section ระบุว่าโหลดจาก **public `/api/plans`** (มีจริง, 200): free 12 โมเดล /
  freemium 17 / freemium-max 17 / gpt-fams-promo 3 / freemium-ultra 17 —
  **free 12 โมเดลตรงกับ snapshot shelf ของเราพอดี** (mapping เราถูก)
- docs เขียนว่า "four API surfaces" แต่จริง ๆ อธิบาย 6+ (responses, messages, chat,
  images, embeddings, rerank + systemone, videos)
- มี **model combos** (`combo/'<name>'`, fallback + circuit breaker 10 นาที) — น่าสนใจ
  สำหรับ resilience แต่ต้องสร้างใน dashboard

## ผล sweep ทุกโมเดล (2026-10-03, คีย์ทดสอบ, curl เท่านั้น — ไม่ commit คีย์)

**`/v1/chat/completions` 56 chat models: 43/56 ได้ HTTP 200**

- **502 ถาวร 10 โมเดล** (ลองซ้ำ 2 รอบ): `deepseek-v4-flash-vision-exp`,
  `deepseek-v4-flash-alibaba`, `deepseek-v4-pro-alibaba`, `longcat-2.5`,
  `mimo-v2.6-flash`, `minimax-m3`, `qwen3.8-27b`, `qwen3.8-max`,
  `qwen3.8-max-alibaba`, `mimo-v2.5-pro` — body เป็น **Cloudflare HTML
  ไม่ใช่ JSON envelope ของ gateway** แปลว่า request ไม่ถึง gateway logic เลย
  (upstream route ล่ม) และ 502 แบบนี้ไม่มีใน docs
- **502 ชั่วคราว** (รอบแรก 502, รอบสอง 200): `mimo-v2.5-free`, `mimo-v2.5`
  (default model ของเรา — กลับมาใช้ได้แล้ว แต่เคยล่ม)
- **400 ถาวร 2 โมเดล**: `jev` (ถูกต้องตาม design — jev คือ System One
  ใช้ได้เฉพาะ `/v1/systemone` ซึ่งทดสอบแล้ว 200), `ling-3.0-flash-fin-free`
  (400 แม้ไม่ส่ง `max_tokens` — ไม่ใช่เรื่อง budget, เป็นปัญหาจริง)
- **400 ชั่วคราว**: `gpt-6-astra` (รอบแรก 400, รอบสอง 200)
- **ผ่านและยืนยันพฤติกรรมตาม docs**: `reasoning_effort: "ultra"` ไม่ error,
  `xhigh` บน non-reasoning model เป็น no-op, `high` บน reasoning model ทำงานปกติ
- **`/v1/embeddings` + `/v1/rerank`** ด้วยชื่อโมเดลตามตัวอย่างใน docs
  (`text-embedding-3-small`, `rerank-v3`) → `not_found` ทั้งคู่ —
  **ชื่อใน docs ไม่มีอยู่ใน catalog/entitlement** (docs กับของจริงไม่ตรงกัน)
- **`/v1/systemone` ด้วย `jev` → 200** ใช้งานได้

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

**P.S. — possible incident, not part of the request:** on Oct 3 we probed all 56 chat models on `POST /v1/chat/completions` (minimal prompts, same key — 43/56 returned `200`). Ten models persistently return `502` with a Cloudflare HTML body rather than your documented JSON error envelope, across two rounds: `deepseek-v4-flash-vision-exp`, `deepseek-v4-flash-alibaba`, `deepseek-v4-pro-alibaba`, `longcat-2.5`, `mimo-v2.6-flash`, `minimax-m3`, `qwen3.8-27b`, `qwen3.8-max`, `qwen3.8-max-alibaba`, `mimo-v2.5-pro`. (`mimo-v2.5-free`/`mimo-v2.5` 502'd in round one but recovered in round two.) Two notes: (1) `502` is not in your docs' error table — only 500/503 are — so clients can't distinguish "retry with backoff" from "route is down"; (2) the docs' embedding/rerank examples (`text-embedding-3-small`, `rerank-v3`) return `not_found` — those aliases don't appear in the catalog. Happy to share full probe logs.

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
