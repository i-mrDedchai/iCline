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

- ความกว้าง popover 320px · hover Options panel 232px ด้านขวา (top-align กับแถว ถ้าล้นขอบล่างเลื่อนขึ้นพอดีขอบ + max-height 320px)
- จัดกลุ่มโมเดล: **Free ก่อน Standard** (A–Z, Active บนสุดของกลุ่ม) · badge FREE เขียว
- Search ค้นทั้งชื่อ provider และโมเดล · footer เป็นไอคอนล้วน + balloon tooltip · ข้อความ "Active ·" สีเขียว
- Chevron provider: ลูกศรเส้น (Lucide `ChevronDown`) ตัวเดียวหน้าชื่อ หมุนรอบจุดกึ่งกลาง · subtitle (เช่น SuperGrok / Premium+) แสดงเฉพาะตอนขยาย
- ภาษา: Free/Standard + tooltip ทุกข้อความ ผูกกับ Language setting (General Settings, default ตามภาษา VS Code)

## ขอบเขตการ implement

1. **fix.9** — QuickModelPicker ตามสเปกนี้ + reusable tooltip component (วางกลาง เช่น `webview-ui/src/icline/BalloonTooltip.tsx`)
2. รอบหลัง — ขยายคลุม surface อื่นของ iCline (แทน native title ที่เหลือทั้งแอป) ทีละส่วน
