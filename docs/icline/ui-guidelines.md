# iCline UI Guidelines — Balloon Tooltip & Capability Colors

> ข้อกำหนด UI ที่ตกลงร่วมกับ maintainer (2026-09-14) · บังคับใช้กับทุก surface ที่ iCline เป็นเจ้าของ
> แหล่งอ้างอิงฉบับเต็ม: `.icline/plans/quick-picker-redesign/` (mock + PLAN, maintainer-only local)

## กฎที่ 1 — hover ข้อความทั้งหมดใช้ balloon tooltip ห้ามใช้ native `title`

- native `title` โผล่ล่างขวาของเมาส์ ควบคุมตำแหน่ง/สไตล์ไม่ได้ และดูหลุดธีม
- **Balloon tooltip:** โผล่**ด้านบน**ของ element กึ่งกลาง มีหัวลูกศรชี้ลง, clamp ไม่ให้ตกขอบจอ (ถ้าชนขอบบนจอเท่านั้น ค่อยสลับไปด้านล่าง), ซ่อนเมื่อ scroll
- ข้อความ tooltip ต้องผ่านระบบ **i18n** เสมอ (EN default + TH) — ห้าม hardcode สตริงใน component
- ปิดเกม `:hover` แบบเดา ๆ: ให้ driver ใช้ตำแหน่ง pointer จริง (mousemove → elementFromPoint/closest) หรือ floating-ui (`offset` + `shift` + `flip`) — อย่าพึ่ง `mouseover`/`mouseout` ลำดับเปล่า ๆ เพราะ synthetic/edge-case events ทำ tooltip หาย

## กฎที่ 2 — สี capability icon ประจำโมเดล (โทนสด ใช้ซ้ำให้ตรงกันทั้งแอป)

| Capability | สี | Hex |
|---|---|---|
| Reasoning (เลือก Effort ได้) | ม่วง | `#c39bff` |
| Thinking (toggle) | ทอง | `#ffd166` |
| Vision | ฟ้า | `#5ec8ff` |
| Audio | ชมพู | `#ff7eb6` |
| Video | ส้ม | `#ff9466` |
| Trains-on-data | เขียวมะนาว | `#4de3c1` |

- ไอคอนทุกตัวต้องมี tooltip อธิบาย (ตัวที่ยังไม่มีข้อมูลจริง เช่น audio/video/training จะ**ซ่อน**จนกว่าจะมี metadata — ห้ามเดา)
- ชุดไอคอนมาตรฐาน = Lucide ที่มีใน webview อยู่แล้ว: `Brain`, `Sparkles`, `Eye`, `Music`, `Video`, `Database`

## กฎที่ 3 — เป้าคลิกต้องเป็นรูปมือ (`cursor: pointer`)

- **ปุ่ม `<button>` เปล่า ๆ ใน webview ได้ลูกศรของ OS** (ไม่ใช่รูปมือ) ขณะที่ `VSCodeButton` (ไอคอน 4 ตัวแรกใต้ช่องแชท: Add Context · Add Files & Images · Servers · Cline Rules) ได้รูปมือมาเอง ⇒ ปุ่มที่ iCline วาดเองทุกตัวต้องเติม `cursor-pointer`
- ใช้กับ **ทุกเป้าคลิกที่ผู้ใช้ตั้งใจกด**: ชิปโมเดล (`data-icline-model-trigger`) · ชิปสถานะ (`data-icline-model-status-button`) · แถวโมเดล (`data-icline-model-row`) · หัว provider · ไอคอน footer (refresh/edit) · ปุ่มระดับ Effort ในแผง Options
- **เมนูทั้งแผงเป็นพื้นที่ของเมนู ไม่ใช่แค่แถวที่กดได้** (คำขอ 2026-09-20: "ไอคอนและทุกส่วนของ Picker ทั้งสอง และหน้าเมนูโมเดลและแผง Options") ⇒ ใส่ `MENU_SURFACE_CLASS` (`cursor-pointer`) ที่ *ตัวห่อ popover* ทั้งสองตัว (`data-icline-quick-picker` และ `data-icline-status-options`) และที่รากของ `ModelOptionsPanel` ด้วย เพื่อให้หัวข้อ · model id · ระยะห่างระหว่างแถว · แถว capability · ข้อความ "Active ·" ขึ้นรูปมือทั้งหมด (cursor ของลูกสืบทอดจากตัวห่อ)
- ข้อยกเว้นเดียว: **ช่องค้นหา** (`input` ใน picker) ต้องเป็น `cursor-text` (I-beam) — เป็นที่พิมพ์ ไม่ใช่เป้าคลิก · และปุ่ม `disabled` ที่ขึ้น `not-allowed` ตามด้านล่าง
- ปุ่มที่ `disabled` ยังต้องขึ้น `not-allowed` — `disabled:cursor-not-allowed` มี specificity สูงกว่า `cursor-pointer` จึงไม่ถูกกลืน (อย่าสลับเป็น inline style)

## กฎที่ 4 — popover ของ Options เกาะขอบซ้ายของปุ่ม เป็นหลัก และถอยไปขอบขวาเมื่อหน้าแชทถูกบีบ

- **กฎหลัก:** popover ของชิปสถานะ (`data-icline-status-options`, เปิดด้วย `data-icline-model-status-button`) ใช้ `align="start"` ⇒ **ขอบซ้ายของแผง = ขอบซ้ายของปุ่ม** (เดิม `align="end"` ⇒ ขอบ**ขวา**ของแผงไปตรงกับขอบขวาของปุ่ม ทำให้แผง 236px เลื่อนไปทางซ้ายไกลจากไอคอนที่กด) — ใช้ได้จริงในหน้าแชทกว้างประมาณ 930px ซึ่งเป็นความกว้างที่ผู้ใช้ทำงาน
- **กฎถอย (fallback):** เมื่อหน้าแชทแคบจนวางแผง 236px เริ่มที่ขอบซ้ายของปุ่มไม่พอ (sidebar ปริยายของ VS Code ~300px) ให้กลับไปใช้ขอบ**ขวา**ของปุ่มแบบเดิม ⇒ **รองรับทั้งสองแบบ** ตัดสินด้วย `pickMenuPopoverAlign({ triggerLeft, viewportWidth, panelWidth })` ใน `src/icline/menuPopover.ts` (ระยะ margin 8px จากขอบหน้า) วัดจาก **ตัวปุ่ม** (trigger) ตอนเปิด ไม่ใช่วัดจากตัวแผง เพราะแผงยังไม่ถูกจัดตำแหน่งตอนนั้น
- วัดซ้ำขณะเปิดอยู่เมื่อมี `resize` (การลากขอบ sidebar กว้าง/แคบคือทางที่ผู้ใช้เข้าถึงเคสแคบจริง ๆ) และเปลี่ยน `align` ได้โดยไม่ต้องปิด-เปิดใหม่
- **ต้องคง `avoidCollisions` (ค่าปริยาย) ไว้** — Radix จะเลื่อนแผงกลับเข้ากรอบอีกชั้นเมื่อขอบที่เลือกก็ยังล้น ⇒ การตรวจ "ขอบตรงกันเป๊ะ" ทำได้เมื่อมีที่พอเท่านั้น **ห้ามปิด collision เพื่อบังคับให้ตรง** เพราะแผงจะล้นออกนอก webview แล้วโดนตัด

## กฎที่ 5 — กฎของเมนู popover อยู่ที่เดียว: `webview-ui/src/icline/menuPopover.ts`

- สามข้อของ "นิสัยเมนู" (ขอบที่เกาะ + รูปมือทั้งเมนู + I-beam ในช่องพิมพ์) ถูกรวมเป็นโมดูลเดียว: `pickMenuPopoverAlign` (สูตรเพียว ๆ) · `useMenuPopoverAnchor` (ฮุกที่วัดจาก trigger ตอนเปิด + วัดซ้ำเมื่อ `resize` + คืน `align` กับ `onOpenChange` ให้ Radix) · ค่าคงที่ `MENU_SURFACE_CLASS` / `MENU_TEXT_FIELD_CLASS` · เรียก **หนึ่งครั้งต่อหนึ่งเมนู** (ไม่ใช่ต่อคอมโพเนนต์) เพราะความกว้างของเมนูแต่ละตัวไม่เท่ากัน — picker ของโมเดล 320px กับแผง Options 236px ตัดสินคนละคำตอบได้ในหน้าแชทเดียวกัน
- **เมนูใหม่ต้องผ่านโมดูลนี้** — `src/icline/menuPopover.guard.test.ts` สแกนซอร์สของทุก "เมนูของ iCline" (นิยาม = `<PopoverContent>` ที่มี `data-icline-*`) แล้ว fail ถ้า: ไม่มี `MENU_SURFACE_CLASS` · `align` เป็นค่าคงที่ (`align="start"/"end"/"center"`) แทนที่จะมาจากฮุก · ไม่ได้ import โมดูลนี้ · หรือ `<input>` ในเมนูไม่มี `MENU_TEXT_FIELD_CLASS` · และมี assert กัน "การ์ดตาย": ถ้าสแกนไม่พบเมนูเลย เทสต์ต้องไม่ผ่าน
- เทสต์ที่พิสูจน์เรื่องนี้: `src/icline/menuPopover.test.ts` (สูตร + ขอบเขตการสลับ) · `QuickModelPickerRealPopover.test.tsx` (ทั้งสองเมนูสลับข้างเอง, ช่องค้นหาเป็น I-beam) · e2e `composer-status-options` **มี 2 เทสต์**: เทสต์แรกวัดบน sidebar ปริยาย (โหมดถอย) ส่วนเทสต์ที่สอง **บีบหน้าต่างให้กว้างขึ้นเอง** (ขยายหน้าต่าง Electron + ลาก sash ของ VS Code จริง) แล้วยืนยันว่าแผงที่เปิดอยู่**ย้ายไปเกาะขอบซ้ายของปุ่มเอง** ⇒ วัดได้จริง: pane 297px → `x=73` (`end`) แล้ว pane 900px → แผง `x=278` ตรงกับปุ่ม `x=277.7` (`start`, ต่าง 0.27px)

## กฎที่ 6 — "Recent" บนหน้าแรก = **3 แถวคงที่** แต่กี่คอลัมน์ให้วัดจาก pane

- กฎอยู่ที่เดียว: `webview-ui/src/icline/recentGrid.ts` — `recentColumnCount(width)` คืนจำนวนคอลัมน์จากความกว้างที่วัดได้ (อย่างน้อย 240px ต่อการ์ด + gap 8px · สูงสุด 3) ⇒ ยังเห็นแค่ **3 แถวเสมอ** แต่ได้ 3 / 6 / 9 เซสชันตามความกว้างที่ทำงานจริง (แถบข้างปริยาย ~300px = 1 คอลัมน์เหมือนเดิม · pane ~875px อย่างที่ maintainer ใช้ = 3 คอลัมน์) ส่วนที่เกินไปพึ่ง **View All**
- **ความสูงของแถวไม่ใช่ตัวแปร** — เพิ่มคอลัมน์ได้ แต่ห้ามทำให้การ์ดสูงขึ้น (ชื่อเรื่องยัง clamp 2 บรรทัดเท่าเดิม) และการ์ดในแถวเดียวกันสูงเท่ากัน (`align-items: stretch`) ⇒ กริดใช้ `grid-template-columns: repeat(var(--history-columns), minmax(0, 1fr))` โดยตั้ง `--history-columns` จากจำนวนคอลัมน์ที่ตัดสินได้
- **วัดที่ตัวกริด ไม่ใช่ที่หน้าต่าง** — และต้องรองรับกริดที่ "เพิ่งเกิด" (ประวัติมาถึงหลัง paint แรก) ∴ ฮุก `useRecentColumnCount(element)` รับ **element ผ่าน callback ref** ไม่ใช่ ref object (ref object ที่ caller สร้างใหม่ทุก render จะทำให้วัดซ้ำแล้วตกกลับไป 1 คอลัมน์) + ใช้ `ResizeObserver` เมื่อมี (jsdom ไม่มี ⇒ ถอยไปฟัง `resize` ของ window)
- **การ์ดต้องบอกลำดับได้ด้วยตัวเอง** — แชทหลายอันของวันเดียวกันเคยดูเหมือนกันหมด ∴ ป้ายเวลามาจาก `recentTime.ts`: `just now` → `14:32` (วันนี้) → `Yesterday` → `Fri` (ใน 7 วัน) → `Sep 10` และ hover (`title`) ต้องเป็นวันเวลาเต็ม · ห้ามเพิ่มความสูงการ์ดหรือเพิ่มบรรทัดเพื่อสิ่งนี้
- เทสต์ที่ปักกฎ: `src/icline/recentGrid.test.ts` (สูตร + การวัด + กริดที่เกิดทีหลัง) · `src/icline/recentTime.test.ts` (ป้ายเวลา/วันเต็ม) · `components/history/HistoryPreview.test.tsx` (1→2→3 คอลัมน์ ⇒ 3/6/9 การ์ด · 3 คอลัมน์คือเพดาน · คลิกเปิดแชท · ลำดับด้วยป้ายเวลา · View All ยังอยู่)

## กฎที่ 7 — สื่อ (รูป) เข้าคอนเทกซ์ที่ความละเอียดที่มีประโยชน์จริง

- **รูปต้องถูกย่อที่จุดที่มัน "เข้า" บทสนทนา ไม่ใช่ตอนส่งคำขอ** — รูปที่อยู่ในทรานสคริปต์จะถูกส่งซ้ำในทุกคำขอต่อจากนั้น ∴ จุดที่ต้องย่อคือ: `read_files` อ่านไฟล์ภาพ (โค้ดใน `sdk/packages/core/src/extensions/tools/executors/file-read.ts`) · รูปที่ผู้ใช้แนบมากับข้อความ (`buildInitialUserContent`) ⇒ ทั้งสองเรียกตัวเดียวคือ `sdk/packages/core/src/media/png.ts`
- **เพดานยาวสุด 1,568px (`MAX_IMAGE_LONG_EDGE`) เพราะผู้ให้บริการย่อเองที่ระดับนั้น** (Anthropic 1568 · ค่าย OpenAI-compatible ~2048 + เพดาน image token) ⇒ พิกเซลที่เกินกว่านั้นไม่มีใครเห็น แต่ต้องจ่ายค่าส่งทุกคำขอ · **การย่อต้องไม่แตะรูปที่เล็กกว่าอยู่แล้ว** (ส่งต่อไบต์เดิมไม่ re-encode) และ **ถ้าไฟล์ที่เข้ารหัสใหม่ไม่เล็กกว่าเดิม ให้คืนของเดิม**
- **โค้ดรูปเขียนเองล้วน ๆ (ไม่มี dependency ใหม่):** `node:zlib` + ตัวถอดรหัส/เข้ารหัส PNG (colour type 0/2/3/4/6 · bit depth 8 · ไม่ interlaced) · **รองรับเฉพาะ PNG — JPEG/GIF/WEBP ต้องผ่านไปทั้งไบต์** (GIF แบบ animated ห้าม re-encode เด็ดขาด) · **ถอดรหัสไม่ได้ = คืนของเดิม** ⇒ บั๊กโคเดกต้องเสื่อมเป็น "ส่งขนาดเต็ม" ไม่ใช่ "รูปเสีย/รูปหาย"
- **งบของ `MessageBuilder` ยังเป็นตาข่ายกันล้ม:** รูปที่เกินงบต่อใบจะ **ย่อให้พอดีแล้วเก็บไว้** ไม่ใช่ถูกแทนด้วย `[media omitted: …]` (การทิ้งรูป = โมเดลอ่านแต่ placeholder) · จุดนี้ย่อเฉพาะเส้นทางที่เกินงบอยู่แล้วเพื่อไม่ให้เสีย CPU ทุกเทิร์น
- เทสต์ที่ปักกฎ: `sdk/packages/core/src/media/png.test.ts` (round-trip · ฟิลเตอร์ทั้ง 5 · palette/grayscale · alpha-premultiply ของ box filter) · `executors/file-read.test.ts` (รูปใหญ่ถูกย่อ + รายงานขนาดเดิม→ใหม่) · `runtime/orchestration/user-input-builder.test.ts` (รูปที่แปะมา) · `session/services/message-builder.test.ts` (เกินงบ ⇒ ย่อ ไม่ใช่ทิ้ง)

## กฎที่ 8 — เพดานตัวอักษรต่อการเรียกของเครื่องมือเขียนไฟล์

- `editor` รับ `old_text`/`new_text` ได้ไม่เกิน **32,000 ตัวอักษรต่อการเรียก** (`EDITOR_INPUT_CHAR_LIMIT` ใน `sdk/packages/core/src/extensions/tools/schemas.ts`) · เดิม 6,000 ซึ่ง **เล็กกว่าไฟล์ซอร์สทั่วไป**: งานเขียนไฟล์ทั้งไฟล์ถูกปฏิเสธ แล้วโมเดลต้องส่งใหม่ 2–4 คำขอ (คำขอ + เวลาบานปลาย) — ทั้งที่ตอนนั้น argument ถูกส่งมาครบและประกอบสำเร็จแล้ว
- เพดานนี้มีไว้กัน payload ที่ไม่มีทางถูกส่งมาครบในคำตอบเดียว ไม่ใช่เพื่อ "บีบให้เขียนสั้น" ⇒ **การปฏิเสธต้องบอกขนาด, บอกว่ายังไม่เขียนอะไรลงดิสก์, และบอกวิธีส่งใหม่ (chunk + `insert_line`) ในข้อความเดียว** · หมายเลขเพดานมีที่เดียว (core) และ fork มองเห็นผ่าน `EDITOR_INPUT_CHAR_LIMIT` ใน `apps/vscode/src/icline/harness/guardrails.ts` + `scripts/repro-editor-write.ts` พิสูจน์ขอบเขตจริงกับเครื่องมือจริง
- เทสต์ที่ปักกฎ: core `extensions/tools/definitions.test.ts` (reject ที่เพดาน+1) · `bun run repro:editor-write` (ที่เพดานเขียนสำเร็จ · เกินถูกปฏิเสธก่อนแตะดิสก์ · ขนาดไฟล์จริงในทรานสคริปต์ smoke ลงในคำขอเดียวได้) · `apps/vscode/src/sdk/tool-write-pipeline.test.ts` + `hooks-adapter.test.ts` (ข้อความที่โมเดลเห็น)

## กฎที่ 9 — ออกจากหน้าแชท = **พัก session** ไม่ใช่หยุดงาน และมีได้ทีละงานที่กำลังทำ

- **การนำทางทุกทาง (ปุ่ม `+` · เปิดแชทอื่นจากการ์ด/ประวัติ · กลับหน้าแรก) ต้องไม่ `stop()` session ที่กำลังทำอยู่** — กติกาอยู่ที่ `SdkSessionLifecycle.parkActiveSession` (พักเฉพาะ session ที่ `isRunning` เท่านั้น) · session ที่ **idle** ไม่มีอะไรต้องรักษา ⇒ จบได้ตามเดิม (`endActiveSession`)
- **"คะแนนเสียง" อยู่ที่ 2 สถานะใน lifecycle:** `activeSession` (ที่แสดงอยู่) กับ `parkedSession` (ที่ทำงานเบื้องหลัง) — และ `getLiveSession()` = active ?? parked คือคำตอบเดียวของคำถาม "งานนี้ยังมีชีวิตอยู่ไหม" (badge และ `interactions` อ่านจากตัวนี้) · งานที่ถูกพัก **ต้องยังเป็นเจ้าของ transcript ของตัวเอง**: event ของมันถูกแปลและต่อเข้า task proxy ของงานนั้น (ไม่เข้าระบบข้อความของงานที่แสดงอยู่ และไม่ขึ้น webview) ⇒ กลับมาแล้วได้ข้อความชุดเดิม ไม่ใช่ชุดที่อ่านใหม่จาก SDK store
- **ขอบเขตของคอนเวอร์เซชัน (epoch) ต้องยกได้โดยไม่ล้าง stream pointer:** เมื่อมีงานถูกพักและยังวิ่งอยู่ ห้ามเรียก `resetMessageTranslator()` (มันล้าง pointer ของข้อความที่กำลังสตรีม ⇒ ข้อความเดียวกันจะกลับมาเป็น 2 บับ: บับเดิมค้างเป็น partial + บับใหม่ที่ต่อจากนั้น) ให้เรียก `bumpConversationFence()` (ยก epoch อย่างเดียว) — webview แทน transcript ทั้งชุดเมื่อ epoch ใหม่กว่า ∴ ยังล้างจอของงานก่อนหน้าได้ครบ · กติกานี้อยู่ใน `SdkTaskControlCoordinator.fenceConversation()` ที่เดียว
- **คำขอ (ask/approval) ของงานที่พักไว้ต้องถูก "พัก" ทั้งใบ:** `SdkInteractionCoordinator` เก็บไว้ใน `deferredAsk` (ไม่เขียนลง transcript ของงานอื่น และไม่เปิด diff preview ที่ไม่มีใครเห็น) แล้วแสดงเมื่อผู้ใช้กลับไปงานนั้นผ่าน `surfaceDeferredAskForSession()` — **promise ของคำขอนั้นไม่ถูก resolve ระหว่างพัก ∴ ปุ่ม Approve/Reject ยังใช้ได้ทันทีที่กลับมา** · `clearPending()` ต้องไม่ล้างมะโนคำขอของงานที่พัก (ไม่งั้นคำขอที่ผู้ใช้ไม่เคยเห็นกลายเป็น "ถูกปฏิเสธ")
- **หนึ่งงานเท่านั้นที่กำลังทำ:** งานใหม่ที่สั่งขณะมีงานเบื้องหลังยังวิ่งอยู่จะถูก **คิว** (`SdkTaskStartCoordinator.hasQueuedTask`/`startQueuedTask`) ไม่ใช่ไปฆ่างานเดิม · คิวเริ่มเองเมื่อเจ้าของเดิมถึง `idle` (สัญญาณ `onParkedSessionIdle` แยกจาก `onDidBecomeIdle` — งานเบื้องหลังจบต้องไม่ไปสั่ง rebuild วิวที่ผู้ใช้กำลังดูอยู่) · งานที่ "รอคำตอบผู้ใช้" (`pending`) ถือว่ายังทำงาน ∴ ไม่ถูกแซง
- **badge บนการ์ด Recent ต้องไม่โกหก:** `ExtensionState.backgroundTask` ถูกส่งจาก `SdkController.describeBackgroundTask()` และ**หายไปทั้งก้อนเมื่องานถูกหยุด/ถูกแทน** · **สามสถานะที่ต้องแยกออกจากกัน** (อยู่ใน `webview-ui/src/icline/backgroundTaskBadge.ts` ที่เดียว): `Working` (`codicon-loading`) = กำลังทำ · `Waiting` (`codicon-bell`) = รอคำตอบเรา · `Done` (`codicon-check`) = **จบแล้วขณะเราไม่ดู** ⇒ 🚫 ห้ามยุบสามอันนี้เป็นอันเดียว (ป้ายที่เขียนว่า "Working" ทั้งที่งานจบไปแล้วคือการโกหก ซึ่งเป็นเหตุผลทั้งหมดของการมีป้ายนี้) · `awaitingApproval` มาก่อน `isRunning` เพราะ "รอเรา" สำคัญกว่า "กำลังทำ" (งานที่รอคำถามยังนับเป็น `isRunning` — pending ใน SDK) · แบนเนอร์เหนือ Recent บอกชื่องาน + ปุ่ม `View` และต่อท้ายด้วย "your next task starts when it finishes" เฉพาะเมื่อมีคิว (แต่ถ้าเจ้าของคิวเป็นงานที่ **รอคำตอบ** ต้องเป็น "your next task waits until you answer it" — คิวเริ่มจาก idle เท่านั้น ∴ สัญญาว่า "จะเริ่มเมื่อมันจบ" ไม่จริง) · สิ่งที่ห้ามหลุด: **งานที่พักและ idle (จบแล้ว) ต้องถูก `endParkedSession` ทิ้งเมื่อเราออกจากมันครั้งถัดไป** ไม่งั้น session จะค้างเป็น "งานเบื้องหลัง" ที่ไม่ได้ทำอะไร แต่ยังขึ้นป้ายบนการ์ด
- เทสต์ที่ปักกฎ: `src/sdk/sdk-session-lifecycle.test.ts` (พักแล้วไม่ `stop` · idle ไม่ถูกพัก · resume · `onParkedSessionIdle` ไม่ปนกับ `onDidBecomeIdle` · จบงานที่พักตอน startNewSession/dispose) · `sdk-session-event-coordinator.test.ts` (event ของงานที่พักลง transcript ของตัวเอง ไม่ขึ้น webview · `running`/`pending` = ทำงาน, `idle` = หยุด) · `sdk-interaction-coordinator.test.ts` (คำขอถูกพัก → กลับมาแล้วตอบได้) · `sdk-task-control-coordinator.test.ts` (พัก/กลับมา/สลับงาน/ยกเลิกงานเบื้องหลัง/คลิกการ์ดงานที่กำลังดูอยู่/เก็บกวาดงานที่พักและ idle) · `sdk-task-start-coordinator.test.ts` (คิว + เริ่มเอง + คิวใหม่ทับคิวเดิมทีเดียว) · `components/history/HistoryPreview.test.tsx` + `icline/backgroundTaskBadge.test.ts` (badge ตรงใบเดียว · Working/Waiting/Done · แบนเนอร์ + ปุ่ม View · ข้อความคิวสองแบบ · ไม่มีงานก็ไม่มีอะไรขึ้น)

## Quick Picker (ออกแบบล็อกแล้ว — สรุป)

- ความกว้าง popover 320px · hover Options panel **236px** ด้านขวา (top-align กับแถว ถ้าล้นขอบล่างเลื่อนขึ้นพอดีขอบ margin 10px + max-height 320px · gap 4px · ไม่ต่ำกว่า 38px จากขอบบนของ picker เพื่อไม่ทับช่องค้นหา) — สูตรจริงอยู่ใน `computeOptionsPanelTop` (`quickModelPickerList.ts`) และ mock ที่ล็อก
- จัดกลุ่มโมเดล: **Free ก่อน Standard** (A–Z, Active บนสุดของกลุ่ม) · badge FREE เขียว
- Search ค้นทั้งชื่อ provider และโมเดล · footer เป็นไอคอนล้วน + balloon tooltip · ข้อความ "Active ·" สีเขียว
- Chevron provider: ลูกศรเส้น (Lucide `ChevronDown`) ตัวเดียวหน้าชื่อ หมุนรอบจุดกึ่งกลาง · subtitle (เช่น SuperGrok / Premium+) แสดงเฉพาะตอนขยาย
- ภาษา: Free/Standard + tooltip ทุกข้อความ ผูกกับ Language setting (General Settings, default ตามภาษา VS Code)

### รูปย่อไฟล์/รูปภาพในช่องแชท (แชท composer)

- รูปย่อเกาะ **ด้านบนของกล่องข้อความ** (`top` ไม่ใช่ `bottom`) และยังอยู่ในกรอบของช่องแชท — ที่ว่างของบรรทัดแรกจองด้วย **`border-top` โปร่งใสของ textarea** ที่สูงเท่า `thumbnailsHeight` (ไม่ใช่ padding เพราะพอถึง `maxRows` แล้ว textarea จะ scroll ⇒ ข้อความที่ scroll จะเลื่อนขึ้นไปทับรูปย่อในกล่อง padding แต่ไม่เข้าเขต border) · highlight layer ของ mention/slash ต้องเติม padding-top เท่ากันเสมอ ถ้าไม่ตรงกันไฮไลต์จะลอยขึ้นเท่าความสูงของแถวรูป
- ขนาดชิปในช่องแชท **ใหญ่กว่า transcript** (44px vs 34px) — ส่งผ่าน prop `size` ของ `components/common/Thumbnails.tsx` · ขนาดของป้ายลบ (badge), offset, ไอคอน codicon และฟอนต์ชื่อไฟล์ **คำนวณจาก `size` ตัวเดียว** ⇒ ห้ามฮาร์ดโค้ดตัวเลขของชิปที่สอง (มีเทสต์ปักคู่ขนาด 34/44)

### แผง Options ตอน hover (ล็อกจาก mock v11 — implement แล้วใน fix.11–fix.14)

- เนื้อหา: หัวข้อ **Options** → บรรทัด model id → สวิตช์ **Thinking** (on/off = ค่าจริงที่เขียนได้) → ปุ่ม **Effort** (มี ✓ ที่ระดับที่เลือก) หรือข้อความ "No effort options for this model" → รายการ capability (ไอคอนเทา)
- **ระดับ Effort และชุดค่ามาจาก metadata ของ provider** ไม่ใช่ชุดตายตัว: ค่าที่แอปเก็บได้ทั้งชุด = `none/minimal/low/medium/high/xhigh/max` (ตรงกับ SDK เป๊ะ) · `sakana` = High/X-High/Max + default ต่อโมเดล · provider ที่ catalog เผยแพร่ระดับเอง (OCA และ provider อื่นที่ catalog รู้) ก็แสดงตามนั้น — นิยามที่เดียวใน `webview-ui/src/utils/modelThinkingOptions.ts` (`resolveEffortLevels`) และ Settings ใช้ตัวเดียวกัน ⇒ **dropdown ของ Settings ต้องมีค่าเท่ากับที่แอปเก็บได้เสมอ** (ห้ามมีลิสต์ที่สอง)
- **คำที่แสดง:** `xhigh` = **X-High**, `max` = **Max** (ทั้ง Settings และ picker) — mock v11 เคยเรียก `xhigh` ว่า "Max" ตอนที่ยังไม่มีค่ำ `max` จริง คำที่ต่างกันของค่าเดียวกันคือบั๊ก**การเรียกค่า**ไม่ใช่ค่า (ค่าที่เก็บไม่กระทบ)
- ห้ามมีปุ่ม "None/Off" ในแผง — การปิดเป็นหน้าที่ของสวิตช์ Thinking
- ไอคอน capability บนแถวใช้**สีตามสถานะจริง** (ม่วง reasoning · ทอง thinking: สว่างเมื่อเปิด, จาง 50% เมื่อปิด) + tooltip บอกระดับที่ใช้จริง ส่วน vision/audio/video/training เป็นสีประจำความสามารถล้วน
- **ชุดไอคอน + badge ตัวเดียวกันต้องแสดงที่ชิปโมเดลใต้ช่องแชทด้วย** (ไม่ใช่เฉพาะใน picker) — นิยามที่เดียวคือ `components/chat/ModelStatusIcons.tsx` จาก `status` ก้อนเดียวกับที่แถวใช้ (`resolveModelStatus`) — ห้ามคัดลอกมาร์กอัปไปที่ที่สอง
- **ชิปใต้ช่องแชทแยกเป็น 2 ปุ่ม** (fix.17): ปุ่มชื่อโมเดล + chevron = เปิด **รายการโมเดล** (`data-icline-model-trigger`) · ชุดไอคอนสถานะ = ปุ่มของตัวเอง (`data-icline-model-status-button`) เปิด **แผง Options ของโมเดลที่ใช้อยู่** (`data-icline-status-options`) ⇒ เปลี่ยน Effort/Thinking ของโมเดลปัจจุบันได้โดยไม่ต้องสลับโมเดล · สถานะที่ไม่มีอะไรแสดงเลย = ไม่ต้องมีปุ่ม (อย่าทำปุ่มเปล่า)
- **เนื้อหาแผง Options ต้องเป็นคอมโพเนนต์เดียว** — `components/chat/ModelOptionsPanel.tsx` ใช้ทั้งแผง hover ของ picker และ popover ของชิป (หัวข้อ Options → model id → Thinking → Effort → capability) ห้ามมีมาร์กอัปชุดที่สองที่ "หน้าตาเหมือนกัน" · สวิตช์/ปุ่มในแผงเขียนค่าผ่าน handler ตัวเดียวกันเสมอ (เขียนลง configuration จริงเมื่อเป็นโมเดลที่ใช้อยู่ · เก็บเป็น preference เมื่อไม่ใช่)
- **effort ที่ถูกลดระดับต้องถูกบอก** — เมื่อค่าที่เก็บไว้ทำให้ SDK ส่งค่าอื่น (หรือไม่ส่งเลย) แผง Options และ Effort control ใน Settings ต้องแสดงประโยคเดียวกันจากคำตอบของ host (`ReasoningEffortNotice`) · ถ้าไม่รู้คำตอบหรือส่งตามที่เลือก → เงียบ · **ประโยคที่ต้องมีระดับต้องมีระดับจริง** — ถ้าไม่มี `applied` ให้ใช้ประโยค "ไม่ส่ง" เสมอ (ห้ามมี `X →  · …`) และ host มีเทสต์สแกน registry ยืนยันว่ามีแค่ 2 รูปแบบที่อธิบายได้

## ฟอร์ม Settings: ลำดับ z-index ของ dropdown

- dropdown ของ `vscode-dropdown` วาด list ของตัวเองในคอนเทนเนอร์ ⇒ list ที่ล้นลงไปข้างล่างต้องทับคอนโทรลที่อยู่ **ถัดไป** ด้วย z-index ของคอนเทนเนอร์
- สอง sibling ที่ `position: relative` + z-index เท่ากัน ตัดสินด้วยลำดับ DOM (ตัวหลังชนะ) ⇒ ฟอร์มที่วางค่าคงที่ให้ทุกตัวจะมีบั๊ก "list ถูกคอนโทรลข้างล่างทับ" เสมอ
- กติกา: ฟอร์มหนึ่งใช้ `formDropdownZIndex(position)` จาก `common/ModelSelector.tsx` โดย **position 0 = คอนโทรลบนสุด** (z สูงสุด) แล้วไล่ลงตามลำดับในหน้า — ดู Sakana (billing 0 · protocol 1 · model 2 · effort 3) และ ZenMux (protocol 0 · routing 1)

## นโยบาย provider ขององค์กร (remote config)

- `remoteConfiguredProviders` = รายการ provider ที่องค์กรอนุญาต (ว่าง = ไม่มีนโยบาย) — เป็นแหล่งความจริงเดียวของฝั่ง webview (`icline/orgProviderPolicy.ts`) และต้องตรงกับกติกาฝั่ง host (`isProviderValid`)
- **Settings กรอง provider ที่ไม่อนุญาตออกจาก dropdown + แสดงไอคอนล็อก** ⇒ ผู้ใช้เลือกไม่ได้ตั้งแต่ต้น
- **Quick Picker โชว์โมเดลของทุก provider** ⇒ provider ที่ถูกห้ามต้องมีไอคอนล็อก (`data-icline-org-blocked`) และเมื่อคลิกโมเดลของ provider นั้นต้อง**ไม่ส่ง commit + ไม่ echo provider** แล้วขึ้นข้อความอธิบายในที่ที่คลิก (`OrgProviderPolicyNotice`) — ห้ามปล่อยให้ดูเหมือนสำเร็จแล้วถูกชั้น remote ย้อนกลับ

## ชั้นข้อมูลที่ห้ามเขียนทับ (host)

- ลำดับชั้นของ settings คือ `remote > session > task > global` — **remote = นโยบายขององค์กร** เขียนได้จาก control-plane fetch เท่านั้น (`applyRemoteConfig` / `setRemoteConfigField`)
- การเขียน API configuration ทั่วไป **ห้าม** ป้อนค่าเข้า remote cache — เคยทำแล้วกลายเป็น "pin ปลอม": provider ที่เป็นอยู่ตอนนั้นถูกปักถาวร ทำให้การเลือกโมเดลของ provider อื่น commit สำเร็จแค่โมเดล (หน้า Settings เด้งกลับ provider เดิม)
- ถ้าจะ "เจาะ" ชั้นเพื่อให้ค่าที่ผู้ใช้เลือกมีผล ต้องเจาะแค่ session/task — remote ไม่เจาะ

## วงจรชีวิตของวิว (host) — `resolve` ของวิวคือ "วิวใหม่" ไม่ใช่ "เซสชันใหม่"

- **การย้ายวิวไป part อื่น** (Secondary Side Bar / panel / แถบข้างอีกด้าน) = VS Code dispose วิวเดิม **แล้ว resolve วิวใหม่** ในที่ใหม่ — ไม่ใช่การปิดงาน
- **`dispose` ของวิว ≠ จบ session:** ห้ามผูกการทิ้ง controller (task history/session) กับ `webviewView.onDidDispose` — เคยทำแล้วผู้ใช้ที่ย้ายวิวเห็น **หน้าแชทว่างเปล่า** และ host ล็อก `SdkTaskHistory has been disposed` · `onDidDispose` ให้ทิ้งแค่ reference ของวิว; controller ถูกทิ้งตอน **extension deactivate** (`WebviewProvider.disposeAllInstances()`) ซึ่งเป็นตอนที่ session จบจริง
- **ย้ายวิวกลางงานที่กำลังทำ = งานต้องไม่ตาย** (คนละเรื่องกับ draft) — งานที่กำลังทำถูก **พัก** (`parkedSession`) ไม่ถูก `stop()` ∴ ย้ายวิว/สลับแชท/กลับหน้าแรก แล้วกลับมา งานยังเดินต่อและได้ข้อความชุดเดิม (ดูกฎที่ 9)
- **`resolve` ของวิว ≠ เริ่ม session:** ห้ามทำอะไรที่ "รีเซ็ตงาน" ใน `resolveWebviewView()` แบบไม่เช็คว่าเป็นครั้งแรกของ session หรือไม่ — เคยทำแล้ว (เรียก `controller.clearTask()` ทุกครั้ง) ผู้ใช้ที่ย้ายวิว **ขณะมีบทสนทนาอยู่ เห็นแชทหายทั้งเธรด** (วิวใหม่ยังต่อกับ controller ที่ยังมีชีวิต แต่ task ถูกเคลียร์ทิ้ง) ⇒ ตอนนี้ทำเฉพาะ `resolve` ครั้งแรกของ session (`hasResolvedView`) · วิวที่ย้ายมาใหม่ได้สถานะปัจจุบันเองผ่าน `subscribeToState` ตอน mount
- **ตัวสดับที่ผูกกับวิวต้องมีอายุเท่าวิว:** `viewDisposables` (ไม่ใช่ `disposables`) แล้วทิ้งตอนวิวถูก dispose / ตอน re-resolve / ตอน extension deactivate (`disposeViewScope()`) ไม่งั้นทุกการย้ายจะทิ้งตัวสดับของวิวที่ตายแล้วค้างไว้ชุดหนึ่ง
- **draft ในช่องแชทต้องรอดการย้ายวิว:** ข้อความ/ไฟล์/รูปที่พิมพ์ค้างไว้อยู่ที่ `webview-ui/src/icline/composerDraftStorage.ts` (localStorage ของ webview — origin เดิมรอดการสร้าง webview ใหม่) และ `useChatState` เขียนผ่านทุกครั้งที่ช่องแชทเปลี่ยน โดย **ข้อความกับไฟล์แนบอยู่คนละคีย์** (การพิมพ์ไม่ต้อง re-serialize รูป base64 ทั้งก้อน) · ส่งข้อความ = draft ถูกล้างเองเพราะช่องแชทถูกล้าง · รูปที่ใหญ่เกินงบจะถูกตัดออก (ข้อความ + เส้นทางไฟล์ยังรอด) พร้อมแจ้งครั้งเดียวใน console · **ห้ามย้าย draft ไปเป็น state ของ host** ถ้าไม่จำเป็น — กติกาของ `resolve` ด้านบนคือ "วิวใหม่ได้สถานะปัจจุบันเอง" ไม่ใช่ "host ต้องจำของให้วิว"
- กติกาตรวจ: ทุกอย่างที่ผูกกับ "วิว" (เช่น focus, visibility, ตัวชี้ webview, ข้อความที่พิมพ์ค้าง) ต้องพร้อมถูกสร้างใหม่หลังย้าย โดยไม่ต้อง reload หน้าต่าง · เทสต์ `secondary-side-bar.test.ts` ส่งข้อความหนึ่งเทิร์นในแถบข้าง → **พิมพ์ draft ค้างไว้** → ย้ายวิว → **บทสนทนาต้องยังอยู่ + draft ต้องยังอยู่** → ส่งเทิร์นที่สองได้ และป็อปโอเวอร์เกาะขอบตามกฎ
- **`view.name` ของ iCline เป็นค่าว่าง** ⇒ อย่าอ้างวิวด้วยชื่อใน UI ของ VS Code (palette/quick pick ออกมาเป็นแถวเปล่า ๆ) ต้องอ้างด้วยตำแหน่ง/บริบท

## ขอบเขตการ implement

1. ~~fix.9 — QuickModelPicker ตามสเปกนี้ + reusable tooltip component~~ ✅ ปิดแล้ว (fix.9–fix.17: แผง Options ตามแถว · เนื้อหาตรง mock v11 · สถานะ/ไอคอนตรงกับค่าที่ตั้ง · นโยบาย + ชุดค่า Effort เป็น metadata กลาง · พจนานุกรมค่าเดียวกันทั้งแอป · แจ้งเมื่อค่า Effort ถูกลดระดับ · ชุดไอคอน+badge ตัวเดียวบนชิปใต้ช่องแชท · ลำดับ z-index ของ dropdown ในฟอร์ม Settings · นโยบาย provider ขององค์กรมีคำตอบในที่ที่คลิก · ชิปแยกเป็นปุ่มโมเดล/ปุ่มสถานะที่เปิด Options ของโมเดลปัจจุบันได้)
2. รอบหลัง — ขยายคลุม surface อื่นของ iCline (แทน native title ที่เหลือทั้งแอป) ทีละส่วน
