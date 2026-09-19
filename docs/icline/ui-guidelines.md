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

## Quick Picker (ออกแบบล็อกแล้ว — สรุป)

- ความกว้าง popover 320px · hover Options panel **236px** ด้านขวา (top-align กับแถว ถ้าล้นขอบล่างเลื่อนขึ้นพอดีขอบ margin 10px + max-height 320px · gap 4px · ไม่ต่ำกว่า 38px จากขอบบนของ picker เพื่อไม่ทับช่องค้นหา) — สูตรจริงอยู่ใน `computeOptionsPanelTop` (`quickModelPickerList.ts`) และ mock ที่ล็อก
- จัดกลุ่มโมเดล: **Free ก่อน Standard** (A–Z, Active บนสุดของกลุ่ม) · badge FREE เขียว
- Search ค้นทั้งชื่อ provider และโมเดล · footer เป็นไอคอนล้วน + balloon tooltip · ข้อความ "Active ·" สีเขียว
- Chevron provider: ลูกศรเส้น (Lucide `ChevronDown`) ตัวเดียวหน้าชื่อ หมุนรอบจุดกึ่งกลาง · subtitle (เช่น SuperGrok / Premium+) แสดงเฉพาะตอนขยาย
- ภาษา: Free/Standard + tooltip ทุกข้อความ ผูกกับ Language setting (General Settings, default ตามภาษา VS Code)

### แผง Options ตอน hover (ล็อกจาก mock v11 — implement แล้วใน fix.11–fix.14)

- เนื้อหา: หัวข้อ **Options** → บรรทัด model id → สวิตช์ **Thinking** (on/off = ค่าจริงที่เขียนได้) → ปุ่ม **Effort** (มี ✓ ที่ระดับที่เลือก) หรือข้อความ "No effort options for this model" → รายการ capability (ไอคอนเทา)
- **ระดับ Effort และชุดค่ามาจาก metadata ของ provider** ไม่ใช่ชุดตายตัว: ค่าที่แอปเก็บได้ทั้งชุด = `none/minimal/low/medium/high/xhigh/max` (ตรงกับ SDK เป๊ะ) · `sakana` = High/X-High/Max + default ต่อโมเดล · provider ที่ catalog เผยแพร่ระดับเอง (OCA และ provider อื่นที่ catalog รู้) ก็แสดงตามนั้น — นิยามที่เดียวใน `webview-ui/src/utils/modelThinkingOptions.ts` (`resolveEffortLevels`) และ Settings ใช้ตัวเดียวกัน ⇒ **dropdown ของ Settings ต้องมีค่าเท่ากับที่แอปเก็บได้เสมอ** (ห้ามมีลิสต์ที่สอง)
- **คำที่แสดง:** `xhigh` = **X-High**, `max` = **Max** (ทั้ง Settings และ picker) — mock v11 เคยเรียก `xhigh` ว่า "Max" ตอนที่ยังไม่มีค่ำ `max` จริง คำที่ต่างกันของค่าเดียวกันคือบั๊ก**การเรียกค่า**ไม่ใช่ค่า (ค่าที่เก็บไม่กระทบ)
- ห้ามมีปุ่ม "None/Off" ในแผง — การปิดเป็นหน้าที่ของสวิตช์ Thinking
- ไอคอน capability บนแถวใช้**สีตามสถานะจริง** (ม่วง reasoning · ทอง thinking: สว่างเมื่อเปิด, จาง 50% เมื่อปิด) + tooltip บอกระดับที่ใช้จริง ส่วน vision/audio/video/training เป็นสีประจำความสามารถล้วน

## ขอบเขตการ implement

1. ~~fix.9 — QuickModelPicker ตามสเปกนี้ + reusable tooltip component~~ ✅ ปิดแล้ว (fix.9–fix.14: แผง Options ตามแถว · เนื้อหาตรง mock v11 · สถานะ/ไอคอนตรงกับค่าที่ตั้ง · นโยบาย + ชุดค่า Effort เป็น metadata กลาง · พจนานุกรมค่าเดียวกันทั้งแอป)
2. รอบหลัง — ขยายคลุม surface อื่นของ iCline (แทน native title ที่เหลือทั้งแอป) ทีละส่วน
