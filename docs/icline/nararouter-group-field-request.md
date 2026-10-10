# คำขอฟิลด์ group/family ถึง NaraRouter — ร่างพร้อมส่ง (ยังไม่ส่ง)

> สถานะ (2026-10-10): **ส่งแล้ว และได้รับคำตอบแล้ว** — ดูหัวข้อ "คำตอบจาก NaraRouter" ท้ายไฟล์
>
> สถานะเดิม (2026-10-03): ร่างเสร็จ รอส่ง — ทิศทางข้อ 5 (grouped tabs) และข้อ 4
> (ชุดทดสอบที่ครอบคลุมขึ้น) **พักเป็นงานรอตัดสินใจ** จนกว่าจะได้คำตอบจาก
> NaraRouter (ร่วมมือ / ปฏิเสธ) แล้วค่อยเลือกทางเดินต่อ
>
> ทบทวน 2026-10-04 (dev.5 follow-up): ตรวจ EN/TH ตรงกันแล้ว — ตัวเลข
> (57 โมเดล / แชท 56 / 200 จำนวน 43 / 502 ถาวร 10 รายชื่อ / ฟื้น 2 /
> 400 ถาวร-ชั่วคราว) และโครง (คำขอ + ประโยชน์ฝั่งเขา 3 ข้อ + P.S.
> incident แยกชัด) ตรงกันทั้งสองฉบับ พร้อมส่งหลังเติมชื่อผู้ส่ง +
> ช่องทางติดต่อกลับ เช็กลิสต์ก่อนส่งอยู่ท้ายไฟล์ (หัวข้อ "ก่อนส่ง")

## บริบท

- iCline รวม NaraRouter เป็น first-class provider แล้ว (56 chat models, snapshot ตรง live 100% ณ 2026-10-03)
- ข้อสรุปฝั่งเรา: wire ไม่มีฟิลด์ group/tier — ถ้าจะทำ tabs ต้อง hardcode เอง
  ซึ่งจะพังเงียบทันทีที่ catalog เปลี่ยน (57 โมเดลหลายตระกูล + docs เขาเองบอกว่า
  catalog อัปเดตต่อเนื่อง) จึงขอฟิลด์จาก gateway แทน — หมายเหตุซื่อสัตย์:
  ช่วง 1 วันที่ทดสอบอย่างเป็นทางการ list นิ่ง 100% ยังไม่เคยเห็น churn จริง
  จดหมายจึงไม่อ้างความเร็วที่วัดไม่ได้ อ้างแค่ scale + failure mode

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

**Why we're asking instead of grouping client-side:** with 57 models across many families — and a catalog your own docs describe as continuously updated — any hardcoded mapping on our side breaks the moment the catalog changes: models land in the wrong tab with no error to catch, users pick the wrong model, and that costs both sides in confusion and wasted calls. A server-side field stays correct by construction. (For honesty: in our day of official testing the list itself was stable — this is about building for the long term, not about churn we've already seen.)

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

## ร่างจดหมาย (ภาษาไทย — ฉบับอ่านตรงกัน, ไม่ได้ใช้ส่ง)

> กฎของไฟล์นี้: ถ้าอัปเดตเนื้อหาจดหมาย ต้องอัปเดต**ทั้งสองฉบับ**ให้ตรงกันเสมอ
> ฉบับที่ส่งจริงคือภาษาอังกฤษข้างบนเท่านั้น

**หัวข้อ:** ขอฟีเจอร์: ฟิลด์ `group`/`family` ใน `GET /v1/models` — พร้อมแจ้ง incident mimo 502

ถึงทีม NaraRouter,

เรากำลังพัฒนา **iCline** ซึ่งเป็น AI coding assistant สำหรับ VS Code และได้รวม NaraRouter เข้าไปเป็น provider หลักตัวหนึ่งแล้ว — catalog ทั้งหมดของคุณ (57 โมเดล ใช้แชทได้ 56) อยู่ใน model picker ของเรา และดึงข้อมูลสดจาก `GET /v1/models` เมื่อผู้ใช้มีคีย์ ขอบคุณอีกครั้งสำหรับเครดิตทดสอบ — มันช่วยให้เราตรวจสอบการเชื่อมต่อครบทั้งเส้นทาง

**คำขอเล็ก ๆ หนึ่งข้อ:** ช่วยเพิ่มฟิลด์จัดกลุ่มที่เสถียรในแต่ละรายการของ `GET /v1/models` ได้ไหม เช่น

```json
{ "id": "deepseek-v4-flash", "group": "deepseek", "group_display": "DeepSeek", ... }
```

โดยยึดตามชั้น/กลุ่มเดียวกับที่แสดงบน dashboard ของคุณก็จะดีมาก

**ทำไมถึงขอแทนที่จะจัดกลุ่มเองฝั่ง client:** ด้วยโมเดล 57 ตัวหลายตระกูล — และ catalog ที่ docs ของคุณเองบอกว่าอัปเดตต่อเนื่อง — mapping ที่ hardcode ไว้ฝั่งเราจะพังทันทีที่ catalog เปลี่ยน: โมเดลไปอยู่ tab ผิดโดยไม่มี error ให้จับ ผู้ใช้เลือกโมเดลผิด และทั้งสองฝ่ายเสียหายทั้งความสับสนและ call ที่สูญเปล่า ฟิลด์ฝั่ง server จะถูกต้องโดยโครงสร้างตั้งแต่ต้น (พูดตามตรง: ช่วง 1 วันที่ทดสอบอย่างเป็นทางการ list นิ่งสนิท — เรื่องนี้คือการสร้างเผื่อระยะยาว ไม่ใช่ churn ที่เราเจอมาแล้ว)

**ฝั่งคุณจะได้อะไร:**

- **ค้นหาเจอง่าย → ใช้งานเยอะขึ้น** — การ browse แบบจัดกลุ่มเป็น tab (เหมือน dashboard) ช่วยให้ผู้ใช้เจอโมเดลที่ใช่ แทนการเลื่อนดู 50+ รายการ — แปลว่า call สำเร็จผ่าน gateway คุณมากขึ้น
- **taxonomy ของคุณ อยู่ทุกที่** — client ภายนอกอย่างเราจะแสดงกลุ่มเดียวกับที่คุณออกแบบ แทนที่แต่ละเจ้าจะคิดเองคนละแบบ
- **คำถาม support น้อยลง** — ผู้ใช้เลิกถามว่า "โมเดลไหนคือตัวไหน" เมื่อกลุ่มมากับ API เลย

ถ้ามีฟิลด์ชั้นราคา (`tier`/`plan`: Free / Bonus / PAYG) มาด้วยก็จะเป็นโบนัสที่น่ายินดี — จะทำให้เราติดป้ายราคาได้ตรง ไม่ต้องเดาจากราคา — แต่แค่ `group` อย่างเดียวก็ปลดล็อก UX แบบ tab แล้ว

ยินดีแชร์ mapping ฝั่ง client ของเราเป็นจุดตั้งต้น และยินดีช่วย beta-test ฟิลด์นี้ทันทีที่ปล่อย

**ป.ล. — incident ที่อาจเกิดขึ้น ไม่เกี่ยวกับคำขอ:** วันที่ 3 ต.ค. เรา probe โมเดลแชททั้ง 56 ตัวบน `POST /v1/chat/completions` (prompt สั้น ๆ คีย์เดียวกัน — 43/56 ตอบ `200`) มี 10 โมเดลที่คืน `502` ตลอดทั้ง 2 รอบ โดย body เป็น HTML ของ Cloudflare ไม่ใช่ JSON error envelope ตามที่ docs ระบุ ได้แก่ `deepseek-v4-flash-vision-exp`, `deepseek-v4-flash-alibaba`, `deepseek-v4-pro-alibaba`, `longcat-2.5`, `mimo-v2.6-flash`, `minimax-m3`, `qwen3.8-27b`, `qwen3.8-max`, `qwen3.8-max-alibaba`, `mimo-v2.5-pro` (`mimo-v2.5-free`/`mimo-v2.5` 502 ในรอบแรกแต่ฟื้นในรอบสอง) หมายเหตุ 2 ข้อ: (1) `502` ไม่มีในตาราง error ของ docs — มีแค่ 500/503 — client จึงแยกไม่ออกว่า "retry with backoff" หรือ "route ตาย"; (2) ชื่อโมเดลตัวอย่าง embeddings/rerank ใน docs (`text-embedding-3-small`, `rerank-v3`) เรียกแล้วได้ `not_found` — ชื่อพวกนี้ไม่มีใน catalog ยินดีแชร์ log การ probe ฉบับเต็ม

ขอบคุณสำหรับ gateway ที่ยอดเยี่ยม — หวังว่าจะได้เติบโตไปด้วยกัน

ขอแสดงความนับถือ,
*[ชื่อผู้ส่ง] — ทีม iCline*

## โครงจดหมาย (เผื่อปรับ)

1. ตัวตนเรา — client จริงที่ส่ง traffic ให้เขา (ไม่ใช่คำขอเลื่อนลอย)
2. คำขอเล็กและชัด — ฟิลด์เดียว พร้อมตัวอย่าง JSON
3. ประโยชน์ฝั่งเขา — usage, taxonomy, support (ไม่ใช่แค่ "ทำให้แอปเราสวย")
4. P.S. แยก incident mimo 502 ออกจาก feature request ชัดเจน (forward ต่อให้ทีม infra ได้; ถ้ากลัวกลบประเด็นหลักให้แยกส่งอีกฉบับ)

## ก่อนส่ง (เช็กลิสต์ 2026-10-04)

- [ ] เติมชื่อผู้ส่ง + ช่องทางติดต่อกลับ (ไฟล์ยังมี `*[ชื่อผู้ส่ง]`) — อย่าส่งทั้งที่เป็น placeholder
- [ ] ตัดสินใจว่า P.S. incident ไปฉบับเดียวกับคำขอ หรือแยกอีกฉบับ (โครงข้อ 4 แนะนำแยกได้ถ้ากลัวกลบประเด็นหลัก)
- [ ] แนบ probe log ฉบับเต็มตามที่สัญญาไว้ใน P.S. (อย่าส่งแค่รายชื่อ)
- [ ] ห้าม commit คีย์ทดสอบ (ค้นหา prefix ของคีย์ทดสอบใน git ต้องว่างก่อนส่ง/ก่อน commit ใด ๆ)

## ทางแยกหลังได้คำตอบ (งานรอตัดสินใจ — ยังไม่ทำ)

- **กรณีร่วมมือ (ได้ฟิลด์ group/tier):** ออกแบบ grouped tabs ขับด้วยฟิลด์จริง + ขยายชุดทดสอบ (live-key e2e แบบ keyed, snapshot refresh อัตโนมัติ)
- **กรณีปฏิเสธ/เงียบ:** ทำฟิลเตอร์จากฟิลด์จริงที่มี (shelf Free/Bonus/PAYG, reasoning/vision, search) + group header ใน list เดียวแบบไม่ซ่อนของ — ไม่ hardcode vendor tabs

## คำตอบจาก NaraRouter (2026-10-10) และคิวงานถัดไป

**สรุปคำตอบ**

- **ฟิลด์ group/family:** ตอบรับแบบร่วมมือ จะปรับ `GET /v1/models` ให้มี metadata การจัดกลุ่ม "ใกล้เคียงกับที่ใช้บน dashboard" — ยังไม่มีวันปล่อย
- **502:** เขายืนยันว่าเกิดจาก upstream ล่ม (ยอดคงเหลือ upstream หมด / provider down) และ request อาจจบที่ proxy ก่อนถึง JSON error handler — จะพิจารณาทำ JSON envelope ให้สม่ำเสมอ (ยังไม่มีวันปล่อย)
- **embedding/rerank alias ใน docs:** รับทราบ จะตรวจและแก้เอกสารให้ตรงกับ catalog ปัจจุบัน
- **probe log:** เขาขอ log ฉบับเต็ม

**ผลตรวจฝั่ง client (2026-10-10)**

- `error-classification.ts` จัด 502 เป็นสถานะที่ retry ได้อยู่แล้ว และ SDK retry ทำงานที่ช่วงเริ่ม request — ยังไม่ได้ทดสอบ runtime กับ 502 จริง
- snapshot (`bynara-snapshot.ts`) ไม่มี alias embedding/rerank → ไม่ต้องแก้ snapshot
- ไม่พบไฟล์ probe log ฉบับเต็มในโปรเจกต์ ต้อง sweep ใหม่ถ้าจะส่ง

**ผลรอบล่าสุด (2026-10-10, คีย์ทดสอบจากผู้ใช้)**

- `GET /v1/models`: 200, 51 โมเดลที่คีย์นี้เห็น, **withGroupField=0** (ยังไม่มีฟิลด์ group เลย)
- Sweep `POST /v1/chat/completions` (max_tokens 256): 200 = 48, 400 = 2, 403 = 1 จาก 51
  - 403 `agnes-video-v2.0`: แพลนนี้ไม่มีสิทธิ์
  - 400 `jev`: ตามเอกสาร (System One ใช้ได้บน `/v1/systemone`)
  - 400 `exo-stealh`: โมเดลปฏิเสธ parameter/input ของคำขอนี้
  - **502 = 0** รอบนี้ (10 โมเดลที่เคย 502 ถาวรในรอบ 2026-10-03 ตอนนี้ตอบ 200 ทั้งหมด)
- บันทึกเต็มอยู่นอก repo: `D:/.grok/iCline/nararouter-probe-2026-10-10.log` (ไม่มีคีย์ในไฟล์) พร้อมส่งตามข้อ 1 ของคิว

**คิวถัดไป (เรียงตามลำดับ)**

1. **ส่ง probe log ฉบับเต็ม** — รอผู้ใช้ยืนยันว่าจะให้ sweep ใหม่ด้วยคีย์ทดสอบ (ห้าม commit คีย์) แล้วส่งให้ทีม NaraRouter
2. **ติดตามฟิลด์ group ใน `/v1/models`** (รันได้ด้วย `NARAROUTER_API_KEY=... node apps/vscode/scripts/check-nararouter-groups.mjs`; ยังไม่ได้ตั้งเวลาอัตโนมัติ) — เมื่อมีฟิลด์จริงจึงเริ่มงาน grouped tabs ตาม "กรณีร่วมมือ" ข้างต้น ระหว่างนี้ไม่ hardcode vendor tabs
3. **502 / JSON envelope** — รอฝั่ง NaraRouter ไม่ต้องแก้โค้ดเพิ่มในรอบนี้ เพราะ retry มีอยู่แล้ว
4. **ตรวจเอกสาร `bynara.mdx`** ซ้ำเมื่อ NaraRouter แก้ alias เสร็จ
5. **พิจารณา model combos** (`combo/'<name>'`) ของ NaraRouter เป็น fallback สำรองเมื่อ 502 ซ้ำ — ต้องสร้างใน dashboard ของเขา เป็นงานเลือกทาง ยังไม่เริ่ม
