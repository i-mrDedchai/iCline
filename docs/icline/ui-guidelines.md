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
- **เมนูทั้งแผงเป็นพื้นที่ของเมนู ไม่ใช่แค่แถวที่กดได้** (คำขอ 2026-09-20: "ไอคอนและทุกส่วนของ Picker ทั้งสอง และหน้าเมนูโมเดลและแผง Options") ⇒ ใส่ `cursor-pointer` ที่ *ตัวห่อ popover* ทั้งสองตัว (`data-icline-quick-picker` และ `data-icline-status-options`) และที่รากของ `ModelOptionsPanel` ด้วย เพื่อให้หัวข้อ · model id · ระยะห่างระหว่างแถว · แถว capability · ข้อความ "Active ·" ขึ้นรูปมือทั้งหมด (cursor ของลูกสืบทอดจากตัวห่อ)
- ข้อยกเว้นเดียว: **ช่องค้นหา** (`input` ใน picker) ต้องเป็น `cursor-text` (I-beam) — เป็นที่พิมพ์ ไม่ใช่เป้าคลิก · และปุ่ม `disabled` ที่ขึ้น `not-allowed` ตามด้านล่าง
- ปุ่มที่ `disabled` ยังต้องขึ้น `not-allowed` — `disabled:cursor-not-allowed` มี specificity สูงกว่า `cursor-pointer` จึงไม่ถูกกลืน (อย่าสลับเป็น inline style)

## กฎที่ 4 — popover ของ Options เกาะขอบซ้ายของปุ่ม เป็นหลัก และถอยไปขอบขวาเมื่อหน้าแชทถูกบีบ

- **กฎหลัก:** popover ของชิปสถานะ (`data-icline-status-options`, เปิดด้วย `data-icline-model-status-button`) ใช้ `align="start"` ⇒ **ขอบซ้ายของแผง = ขอบซ้ายของปุ่ม** (เดิม `align="end"` ⇒ ขอบ**ขวา**ของแผงไปตรงกับขอบขวาของปุ่ม ทำให้แผง 236px เลื่อนไปทางซ้ายไกลจากไอคอนที่กด) — ใช้ได้จริงในหน้าแชทกว้างประมาณ 930px ซึ่งเป็นความกว้างที่ผู้ใช้ทำงาน
- **กฎถอย (fallback):** เมื่อหน้าแชทแคบจนวางแผง 236px เริ่มที่ขอบซ้ายของปุ่มไม่พอ (sidebar ปริยายของ VS Code ~300px) ให้กลับไปใช้ขอบ**ขวา**ของปุ่มแบบเดิม ⇒ **รองรับทั้งสองแบบ** ตัดสินด้วย `pickOptionsPopoverAlign({ triggerLeft, viewportWidth })` ใน `quickModelPickerList.ts` (ระยะ margin 8px จากขอบหน้า) วัดจาก **ตัวปุ่ม** (trigger) ตอนเปิด ไม่ใช่วัดจากตัวแผง เพราะแผงยังไม่ถูกจัดตำแหน่งตอนนั้น
- วัดซ้ำขณะเปิดอยู่เมื่อมี `resize` (การลากขอบ sidebar กว้าง/แคบคือทางที่ผู้ใช้เข้าถึงเคสแคบจริง ๆ) และเปลี่ยน `align` ได้โดยไม่ต้องปิด-เปิดใหม่
- **ต้องคง `avoidCollisions` (ค่าปริยาย) ไว้** — Radix จะเลื่อนแผงกลับเข้ากรอบอีกชั้นเมื่อขอบที่เลือกก็ยังล้น ⇒ การตรวจ "ขอบตรงกันเป๊ะ" ทำได้เมื่อมีที่พอเท่านั้น (มีเทสต์หน่วยปักสูตร + เทสต์ webview ปักการสลับข้าง + e2e วัดบนหน้าต่างจริง) **ห้ามปิด collision เพื่อบังคับให้ตรง** เพราะแผงจะล้นออกนอก webview แล้วโดนตัด

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

## ขอบเขตการ implement

1. ~~fix.9 — QuickModelPicker ตามสเปกนี้ + reusable tooltip component~~ ✅ ปิดแล้ว (fix.9–fix.17: แผง Options ตามแถว · เนื้อหาตรง mock v11 · สถานะ/ไอคอนตรงกับค่าที่ตั้ง · นโยบาย + ชุดค่า Effort เป็น metadata กลาง · พจนานุกรมค่าเดียวกันทั้งแอป · แจ้งเมื่อค่า Effort ถูกลดระดับ · ชุดไอคอน+badge ตัวเดียวบนชิปใต้ช่องแชท · ลำดับ z-index ของ dropdown ในฟอร์ม Settings · นโยบาย provider ขององค์กรมีคำตอบในที่ที่คลิก · ชิปแยกเป็นปุ่มโมเดล/ปุ่มสถานะที่เปิด Options ของโมเดลปัจจุบันได้)
2. รอบหลัง — ขยายคลุม surface อื่นของ iCline (แทน native title ที่เหลือทั้งแอป) ทีละส่วน
