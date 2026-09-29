# คู่มือเพิ่มภาษา / ตรวจคำแปล (i18n) — iCline

> จัดทำ: 2026-09-29 (`fix.47`) · ใช้คู่กับ [i18n-plan.md](./i18n-plan.md) (แผนและสถานะ) และ [ui-guidelines.md](./ui-guidelines.md) กฎที่ 1 (ห้าม hardcode ข้อความ)
>
> เป้าหมายของเอกสารนี้: **เพิ่มภาษาใหม่ = แก้ 3 จุด ไม่แตะคอมโพเนนต์แม้แต่บรรทัดเดียว** และ **ผู้ตรวจคำแปล** (คนหรือ sub-agent เฉพาะทาง) มีเช็กลิสต์ที่ตรวจได้จริง

---

## 1. โครงสร้างจริง

| ไฟล์ | หน้าที่ |
|---|---|
| `webview-ui/src/i18n/locales.ts` | รายการ locale ที่ **แปลจริง** (`TRANSLATED_LOCALES`) · `TAG_ALIASES` แปลงแท็ก BCP-47 (`zh`, `zh-Hans` → `zh-CN`; `zh-Hant` → `zh-TW`) · `localeFromTag` / `resolveLocale` / `resolveTranslatedLocale` |
| `webview-ui/src/i18n/strings.ts` | ทะเบียน namespace (`NAMESPACES`) + `createTranslator` (ถอยอังกฤษ → คีย์) + `formatString` (`{placeholder}`) + `splitOnPlaceholder` (แทรกลิงก์/ตัวหนาในประโยค) |
| `webview-ui/src/i18n/namespaces/*.ts` | ตารางข้อความ 1 ไฟล์ = 1 พื้นที่: `picker` (Quick Picker + notice) · `settings` (Settings 7 แท็บ) · `quickStart` (การ์ดหน้าแรก) · `providers` (ฟอร์ม provider ทั้งหมดในแท็บ api-config) |
| `webview-ui/src/i18n/useTranslation.ts` | hook `useTranslation(namespace)` — ผูกกับ Preferred Language แล้วถอยไปภาษาที่ VS Code รันอยู่ |
| `webview-ui/src/i18n/picker.ts` | facade เดิมของ Quick Picker (ยังใช้ชื่อ `pickerStrings`/`formatPickerString` เพื่อไม่ให้ผู้ใช้เดิมพัง) |

**ขนาดปัจจุบัน (2026-09-29):** 4 ภาษา (`en`/`th`/`ja`/`zh-CN`) · 4 namespace · **477 คีย์** (picker 51 · settings 133 · quickStart 31 · providers 262) ⇒ ข้อความที่แปลแล้ว **1,908 ชุด** · ด่านคุ้มกันครอบ **63 ไฟล์** (`MIGRATED` ใน `hardcodedCopy.test.ts`)

---

## 2. เพิ่มภาษาใหม่ (3 จุด)

สมมติจะเพิ่ม `vi` (เวียดนาม):

1. **ขึ้นทะเบียน locale** — `locales.ts`:
   ```ts
   export const TRANSLATED_LOCALES = ["en", "th", "ja", "zh-CN", "vi"] as const
   ```
   ถ้าภาษานั้นใช้แท็กที่ VS Code ส่งมาไม่ตรง (เช่น `vi-VN`) ให้เพิ่มใน `TAG_ALIASES` หรือพึ่ง `localeFromTag` ที่ไล่จากแท็กยาว → สั้นอยู่แล้ว

2. **เพิ่มตารางในทุก namespace** — สร้าง `const vi: Record<XxxStringKey, string> = { … }` แล้วลงทะเบียนในออบเจ็กต์ท้ายไฟล์ (`export const xxxStrings: Record<TranslatedLocale, …> = { en, th, ja, "zh-CN", vi }`)
   คีย์ต้องครบเท่าอังกฤษ (TypeScript บังคับอยู่แล้วผ่าน `Record<XxxStringKey, string>`) และ **ค่าห้ามว่าง** (มีเทสต์บังคับ)

3. **ไม่ต้องแตะอะไรอีก** — `NAMESPACES` อ่านจาก locale ที่ขึ้นทะเบียน, `useTranslation` ใช้ locale จาก Preferred Language (18 ภาษาที่ dropdown เสนอ: ถ้าภาษานั้นยังไม่มีตาราง จะ **ถอยไปอังกฤษทั้งหน้าจอ** ไม่ใช่หน้าจอว่าง)

> ถ้าอยากแค่ "รับภาษาเข้ามาก่อน ยังไม่แปล" — ห้ามใส่ใน `TRANSLATED_LOCALES` (เพราะจะกลายเป็น fallback เงียบ) ให้เพิ่มตารางเฉพาะเมื่อพร้อม

---

## 3. กติกาการแปล (บังคับโดยเทสต์บางข้อ)

| กติกา | เหตุผล | เทสต์ที่บังคับ |
|---|---|---|
| **คีย์ครบทุก locale ทุก namespace** | กันหน้าจอโหว่ | `i18n.test.ts` (คีย์ชุดเดียวกัน) |
| **placeholder ต้องตรงอังกฤษ** (`{provider}`, `{amount}`, `{step1}` …) | คำแปลที่ทำ marker หายจะพิมพ์ `{standalone}` ให้ผู้ใช้เห็น | `i18n.test.ts` (placeholder parity) |
| **ประโยคที่มีลิงก์/ตัวหนา/โค้ด = คีย์เดียวที่มี `{placeholder}`** ไม่ใช่การต่อ fragment ในคอมโพเนนต์ | ลำดับคำอังกฤษถูกฝังใน layout ⇒ ภาษาอื่นอ่านเป็นประโยคพัง | ตรวจด้วยตา + `splitOnPlaceholder` ในคอมโพเนนต์ |
| **id / URL / ชื่อภาษา / ชื่อรุ่น / คำสั่ง shell ไม่แปล** | เป็น *ค่า* ไม่ใช่คำ | ด่าน hardcode รู้จัก token ประเภทนี้ (`LOOKS_LIKE_IDENTIFIER`) ⇒ ต้องเขียนเป็นค่าคงที่ในคอมโพเนนต์ เช่น `const MOONSHOT_INTL_HOST = "api.moonshot.ai"` |
| **ชื่อแบรนด์ไม่แปล** (OpenAI, ZenMux, AWS) | ผู้ใช้ค้นหาชื่อนี้ในเว็บ | — |
| **ตัวเลข/ราคา/วันที่** ใช้ค่าจากโค้ด (`toFixed`) เป็น placeholder ไม่ฝังในประโยค | แต่ละภาษาเขียนต่างกัน | — |
| **ตัว prompt ของการ์ด Quick Starts คงอังกฤษโดยเจตนา** | prompt คือคำสั่งให้โมเดล ไม่ใช่ข้อความ UI (ภาษาที่โมเดล*ตอบ* มาจาก Preferred Language) | `quickStart.ts` (commented) |
| **โทนภาษา:** ไทยใช้ "คุณ" ไม่ใช้ "ท่าน" · อังกฤษแบบ UI สั้น (Enter/Save มากกว่า Please enter) · ญี่ปุ่นลงท้ายด้วย です/ます · จีนตัวย่อใช้ 。和 ： | ให้อ่านเหมือนเจ้าของภาษา | การตรวจของคน/sub-agent |

---

## 4. วิธีรันด่านด้วยตัวเอง

```bash
# 1) ด่านหลัก: ข้อความ hardcode + placeholder parity + คีย์ครบ
cd apps/vscode/webview-ui && bunx vitest run src/i18n

# 2) ชนิดข้อมูล (คีย์พิมพ์ผิด = error ที่นี่)
cd apps/vscode && bun run check-types

# 3) สลับภาษาจริงใน VS Code (Playwright + VS Code จริง)
cd apps/vscode && bun run test:e2e -- settings-language.test.ts

# 4) ไบต์ของ VSIX จริง (ต้องแพ็กก่อน)
cd apps/vscode && node scripts/package-vsix-wip.mjs --fix N   # ด่านท้ายสุดรันเอง
```

**มาร์คไฟล์ที่ migrate แล้ว:** เพิ่ม path ใน `MIGRATED` (`webview-ui/src/i18n/hardcodedCopy.test.ts`) พร้อม commit เดียวกัน — ด่านจะสแกน 2 อย่าง: ข้อความ JSX และ attribute ที่ผู้ใช้เห็น (`title`/`placeholder`/`aria-label`/`label`/`helpText`)
ไฟล์ที่ **ไม่ได้มีข้อความของตัวเอง** (แค่ประกอบคอมโพเนนต์ที่แปลแล้ว) ให้ใส่ใน `DELEGATES_ONLY` ⇒ ยังถูกสแกนข้อความ แต่ไม่บังคับ import translator

---

## 5. เช็กลิสต์ผู้ตรวจคำแปล (reviewer checklist)

ต่อ 1 namespace หรือ 1 ภาษา:

1. **ครอบคลุม** — รัน `bunx vitest run src/i18n` แล้วทุกข้อเขียว (คีย์ครบ, ไม่มีค่าเปล่า, placeholder ตรง)
2. **บริบท** — เปิดหน้าจอที่ตรงกับ namespace นั้นจริง (Settings → API Configuration เป็นต้น) แล้วสลับภาษา ดูว่าไม่มีบรรทัดใดยังอังกฤษ
3. **ความสอดคล้องคำศัพท์** — คำเดิมต้องแปลเหมือนกันทุกที่ (เช่น "API Key" คงรูป, "Provider" = "ผู้ให้บริการ", "context window" = "หน้าต่างบริบท")
4. **ความยาว/การตัดบรรทัด** — ชื่อปุ่ม/แท็บยาวขึ้น 30–40% ไม่หลุดกรอบ (ไทย/เยอรมันจะยาวกว่าอังกฤษ; ญี่ปุ่น/จีนจะสั้นกว่า)
5. **ไว้อาลัยเครื่องหมาย** — `…` `—` `›` `“ ”` ต้องคงไว้ (ใช้แทน `...` `-` `"` ตามสไตล์เดิม), ไม่มีช่องว่างเกินหน้าเครื่องหมายวรรคตอนไทย/ญี่ปุ่น/จีน
6. **ไม่ได้แปลค่า** — URL, `sk-ai-v1-`, `lms server start`, ชื่อรุ่น (`claude-sonnet-4.5`) ต้องเหลือรูปเดิม
7. **ตัวเลข/ตัวย่อ** — `1M tokens`, `ms`, `USD` คงรูปตามที่ตกลงในตาราง
8. **ไม่มีคำแปลหายไปดื้อ ๆ** — ถ้าคีย์ไหนไม่รู้จะแปลอย่างไร ให้คงอังกฤษ *และเปิดประเด็น* ไม่ปล่อยว่าง

> **แนะนำให้ใช้ sub-agent เฉพาะทางเป็นผู้ตรวจรอบสอง** (ตามที่ผู้ใช้อนุมัติ): ส่ง *ตารางอังกฤษ + ตารางภาษานั้น + namespace* ให้ sub-agent ที่ตั้งโจทย์ว่า "หาคำแปลที่ผิดความหมาย ผิดบริบท หรือคงอังกฤษโดยไม่จำเป็น" แล้วรายงานเป็นรายการ `คีย์ → ปัญหา → ข้อเสนอ` · จุดที่ sub-agent ตรวจได้ดีเป็นพิเศษคือ **ความสอดคล้องของศัพท์** และ **ประโยคที่มี placeholder** (เพราะอ่านออกจากตารางล้วน ๆ ไม่ต้องเห็น UI)

---

## 6. สิ่งที่ยังไม่แปล (ใช้จัดลำดับ ไม่ใช่ตัวเลขทางการ)

| พื้นที่ | สถานะ |
|---|---|
| Settings ทั้ง 7 แท็บ + ฟอร์ม provider + dropdown เลือกโมเดลต่อ provider | ✅ แปลแล้ว (`settings` + `providers`) |
| หน้าแรก/การ์ด Quick Starts | ✅ แปลแล้ว (`quickStart`) — ยกเว้นตัว prompt |
| `settings/ApiOptions.tsx` (เปลือกแท็บ + notice "Provider options are managed by …"), `CustomProviderManager`, `ProviderStatsCard`, โมดัล Add Custom Provider | ⬜ ยังอังกฤษ |
| Chat / composer, `components/ui/`, Worktrees / MCP / cline-rules / History / Team / Marketplace / Account / Onboarding / Browser | ⬜ ยังอังกฤษ |
| ฝั่ง host (ข้อความ `show*Message`, `package.nls.json`, ไม่มี `l10n/`) | ⬜ ยังอังกฤษ — ต้องมีกลไก locale ฝั่ง host (คนละชุดกับ webview) |
