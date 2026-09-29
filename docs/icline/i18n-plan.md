# แผนรองรับหลายภาษา (i18n) — iCline

> จัดทำ: 2026-09-29 · สถานะ: **กำลังทำ — เฟส 1 เสร็จ, เฟส 2 กวาดได้ครึ่งทางของ Settings แล้ว** (รอบ `fix.46`)
> คำถามตั้งต้นของผู้ใช้: "ตอนนี้มีการ UI หรือการตั้งค่าภาษาอะไรยังไงส่วนไหนแล้วบ้าง และเราต้องเพิ่มอะไรบ้าง"

### สถานะล่าสุด (2026-09-29, `fix.46`)

| เฟส | สถานะ | หลักฐาน |
|---|---|---|
| 0 ตัดสินใจ | ✅ **ตอบแล้ว (2026-09-29)** | **เริ่ม 4 ภาษา: อังกฤษ/ไทย/จีน(ตัวย่อ)/ญี่ปุ่น** (`TRANSLATED_LOCALES`) · ที่เหลือออกแบบให้ *เพิ่ม/แปลได้เมื่อต้องการ* (แก้ 3 จุด: `TRANSLATED_LOCALES` + ตารางต่อ namespace + เทสต์บังคับคีย์ครบเอง) · **ผู้ตรวจคำแปลอาจใช้ sub-agent เฉพาะทาง** ⇒ ยังไม่มีเจ้าภาพตรวจถาวร (เป็นงานค้างด้านคุณภาพ ไม่ใช่ด้านโครงสร้าง) |
| 1 แกนกลาง | ✅ **เสร็จ** | `webview-ui/src/i18n/` (`locales.ts` ครอบทั้ง 19 ภาษา + `TAG_ALIASES` สำหรับ `zh`/`zh-Hans`/`zh-Hant` · `strings.ts` + namespace registry 3 namespace · `useTranslation`) · เทสต์บังคับคีย์ครบทุก locale/namespace + **placeholder ต้องตรงกับอังกฤษ** |
| 2 กวาด webview | 🔄 **Settings ครบ 7 แท็บ + หน้าต้อนรับ/Quick Starts** | namespace `settings` (general/telemetry/terminal/debug/api-config/features/remote-config/about) + `quickStart` · ไฟล์ที่ migrate = รายการ `MIGRATED` 17 ไฟล์ใน `i18n/hardcodedCopy.test.ts` · ตารางภาษา **en/th/ja/zh-CN** |
| 3 manifest + host | ⬜ ยังไม่เริ่ม | ด่านตรวจไฟล์ภาษาอยู่ใน `scripts/verify-vsix-contracts.mjs` แล้ว (กลุ่ม `language bundles`: `package.nls*` + `l10n/**`) — พร้อมรองรับงานเฟสนี้ |
| 4 เสริมด่าน | ✅ ทำแล้วสำหรับทุกเซกชันที่ migrate | ด่าน hardcode (`i18n/hardcodedCopy.test.ts` 17 ไฟล์) + เทสต์ placeholder-parity + ด่าน nls/l10n ในตัวตรวจ VSIX + **e2e สลับภาษาจริงใน VS Code** (`src/test/e2e/settings-language.test.ts`) · **contract 7 ข้อของ fix.46 ปักสตริงไทย/ญี่ปุ่น/จีนในไบต์ของ VSIX** ⇒ เหลือแค่ทำซ้ำให้ครบทุกเซกชันที่จะ migrate

**สิ่งที่ยังเป็นอังกฤษแข็ง** (นับด้วย heuristic เดียวกับด่าน, 2026-09-29):

| พื้นที่ | จุดที่ยังอังกฤษ | หมายเหตุ |
|---|---|---|
| แท็บ api-config: ฟอร์ม provider | ~251 จุดใน `components/settings/` (Bedrock 21 · OpenAICompatible 19 · ModelInfoView 18 · Zenmux 17 · SapAiCore 14 · …) | มากที่สุดและผู้ใช้เห็นบ่อยที่สุด ⇒ **งานถัดไปที่ควรทำก่อน** |
| Chat / composer | ~92 จุด | รวมข้อความสถานะ/ปุ่มในห้องแชท |
| `components/ui/` | ~84 จุด | ส่วนใหญ่เป็น aria/label ของ primitive — ต้องดูรายตัวว่าอันไหนเป็น copy จริง |
| Worktrees 20 · MCP 18 · cline-rules 14 · History 14 · Team 11 · Marketplace 10 · Account 10 · Onboarding 7 · Browser 5 | ~109 จุด | |
| ฝั่ง host | 13 จุด (`show*Message`) | ต้องมีกลไก locale ฝั่ง host (คนละชุดกับ webview) |
| manifest | commands/menus/walkthrough | ทาง `package.nls.json` (มีอยู่แล้ว 1 คีย์) |

> ⚠️ ตัวเลขทั้งหมดมาจาก grep แบบหยาบ (`>ข้อความ<` + attribute ที่ผู้ใช้เห็น) — ใช้จัดลำดับความสำคัญ ไม่ใช่ตัวเลขทางการ

**หมายเหตุการแปลที่ตกลงกันในรอบ fix.46:**
1. **ข้อความ UI แปล · ตัว prompt ของการ์ด Quick Starts คงอังกฤษ** — prompt เป็นคำสั่งให้โมเดล ไม่ใช่ข้อความให้ผู้ใช้ · ภาษาที่โมเดล*ตอบ*ถูกขับด้วย Preferred Language อยู่แล้ว · popover ต่อการ์ดให้ผู้ใช้เขียนใหม่เองได้
2. **id/URL/ชื่อภาษา ไม่แปล** — เป็นค่า ไม่ใช่ copy (`ICLINE_EXTENSION_ID`, `CLINE_SITE`, รายการ 19 ภาษาที่ dropdown เก็บเป็นค่า)
3. **label ของฟิลด์ config แปล** (เช่น `OTLP Endpoint`) แม้ชื่อฟิลด์ใน API จะเป็นอังกฤษ — เพราะเป็นข้อความที่คนอ่านบนจอ
4. **ประโยคที่มีลิงก์/ตัวหนา/โค้ด ต้องเป็นคีย์เดียวที่มี `{placeholder}`** ไม่ใช่การต่อ fragment ในคอมโพเนนต์ — ไม่งั้นลำดับคำอังกฤษถูกฝังใน layout และภาษาที่วางลิงก์คนละที่อ่านเป็นประโยคพัง

---

## 1. ที่มีอยู่จริงตอนนี้

### 1.1 การตั้งค่าภาษาให้ผู้ใช้เลือก — มีแล้ว 1 จุด

| สิ่ง | ที่อยู่ |
|---|---|
| dropdown "Preferred Language" ใน General Settings | `webview-ui/src/components/settings/PreferredLanguageSetting.tsx` |
| รายการภาษา 19 ภาษา (display ↔ key) | `src/shared/Languages.ts` (`LanguageKey`, `LanguageDisplay`, `getLanguageKey`) |
| คีย์เก็บค่า | `preferredLanguage` — global state, default `"English"` (`src/shared/storage/state-keys.ts:291`) |
| ทางเขียนค่า | `state.updateSettings` (`updateSettings.ts:114`) → `stateManager.setGlobalState` |
| ทางอ่านค่าออก webview | `getStateToPostToWebview.ts:41,137` → `ExtensionMessage.preferredLanguage` |

**ผลที่เกิดขึ้นจริงจากการตั้งค่านี้มีแค่ 2 อย่าง** (ไม่ได้แปล UI ทั้งแอป):

1. **สั่งภาษาที่โมเดลตอบ** — host ต่อท้าย system prompt: `# Preferred Language\n\nSpeak in <key>` (`sdk/cline-session-factory.ts:877-881` ผ่าน `getLanguageKey`)
2. **เลือก locale ของข้อความใน Quick Model Picker** — `icline/i18n/usePickerStrings.ts`

### 1.2 i18n ของ UI จริง — มี 2 ภาษา และครอบแค่ "picker"

- `webview-ui/src/icline/i18n/pickerStrings.ts` — ตาราง **en / th** (51 คีย์/ภาษา), มี `formatPickerString` แทน `{placeholder}`
- `pickerLocale.ts` — ลำดับตัดสิน locale: ① `preferredLanguage` ที่เป็นไทย → `th` ② ภาษาที่ VS Code รันอยู่ (`navigator.language`) → `th` ③ ไม่ตรง → `en`
- ผู้ใช้จริงของตาราง: `QuickModelPicker.tsx`, `ReasoningEffortNotice.tsx`, `OrgProviderPolicyNotice.tsx`
- **ตัวเลขเทียบขนาด:** มี **7 ไฟล์ tsx** จาก **285 ไฟล์** ที่แตะ i18n ⇒ ครอบไปแล้ว ~2%
- กฎบังคับ: `docs/icline/ui-guidelines.md` กฎที่ 1 — "ข้อความ tooltip ต้องผ่านระบบ i18n เสมอ (EN default + TH) ห้าม hardcode"
- เทสต์เฝ้าไว้แล้ว: `pickerStrings.test.ts` บังคับว่า en/th **มีคีย์ชุดเดียวกันครบ** และ**ไม่มีค่าเปล่า**

### 1.3 ระดับ VS Code extension manifest (nls)

- `package.nls.json` (487 B) + `package.nls.th.json` (381 B) — **ship อยู่ใน VSIX จริง** (ยืนยันจาก `fix.43`: `extension/package.nls.json`, `extension/package.nls.th.json`)
- **แต่ต่อสายจริงแค่จุดเดียว**: `displayName: "%extension.displayName%"` ⇒ `package.json` ทั้งไฟล์มี `%...%` แค่ **1 จุด**
- `package.nls.json` ยังมีคีย์ `extension.description` + `extension.category.*` **ที่ไม่มีใครอ้างถึง** = คีย์ตาย (description จริงใน `package.json` เป็นอังกฤษแข็ง)
- ไม่มีโฟลเดอร์ `l10n/` และไม่มีการเรียก `vscode.l10n.t()` เลย ⇒ ข้อความฝั่ง host แปลไม่ได้

**สรุป: "ภาษาไทย" ที่ ship อยู่ตอนนี้ผู้ใช้เห็นจริงแค่ 2 ที่** — ชื่อส่วนขยายใน Marketplace/Extensions list และข้อความใน Quick Picker (+ notice ที่แชร์กับ Settings)

---

## 2. ช่องว่าง (อะไรยังไม่แปล)

| # | Surface | ตอนนี้ | ขนาด | ต้องทำ |
|---|---|---|---|---|
| A | **Webview UI ทั้งหมด** (Settings, Chat, History, MCP, Account ฯลฯ) | อังกฤษแข็ง | ~338 ข้อความใน JSX + `title`/`placeholder`/`aria-label` อีกจำนวนมาก | ย้ายเป็นคีย์ i18n ทั้งชุด |
| B | **Quick Picker + notice** | en/th แล้ว | 51 คีย์ | ขยายเป็นภาษาที่เหลือ (ถ้าต้องการ) |
| C | **คำสั่ง/เมนู/การตั้งค่า VS Code** | อังกฤษแข็ง | 23 command titles · 14 menu entries · 3 keybinding titles · 4 configuration descriptions · 1 viewsContainer · 1 walkthrough (1 title + 5 steps) · 6 categories | ห่อเป็น `%key%` + เพิ่มใน nls ทุกภาษา |
| D | **ข้อความฝั่ง host** (notification, error) | อังกฤษแข็ง | 13 จุดที่เรียก `show*Message` | ใช้ `vscode.l10n.t()` + โฟลเดอร์ `l10n/<locale>/bundle.l10n.json` |
| E | **metadata ที่โชว์ตอนติดตั้ง** | displayName ไทยแล้ว | — | ส่ง description/categories เข้า nls (แก้คีย์ตาย) |

---

## 3. แผนเป็นเฟส

### เฟส 0 — ตัดสินใจก่อน (ยังไม่มีคำตอบ)
1. **รองรับกี่ภาษา?** มี 19 ใน `Languages.ts` แต่ทำ i18n เต็มทุกภาษา = งานแปลมหาศาล → แนะนำ: โครงสร้างพร้อมทุกภาษา, แปลจริงเริ่มจาก **ไทย (มีอยู่) + อังกฤษ** แล้วเพิ่มทีละภาษา
2. **ใครแปล?** คน หรือ AI แปลแล้ว maintainer ตรวจ (มีข้อจำกัด: ศัพท์เทคนิคอย่าง Thinking / Effort / Context window ที่ mock v11 ล็อกให้คงอังกฤษทั้งสองภาษา)
3. **`preferredLanguage` ควรแปล UI ด้วยไหม?** ตอนนี้แยกหน้าที่ชัด (สั่งโมเดลตอบภาษา + picker) — ถ้าจะให้มีผลกับ UI ทั้งหมดต้องตกลงว่าจะใช้ตัวเดียวหรือแยกสองตัว

### เฟส 1 — ขยายแกน i18n ที่มีอยู่ให้เป็น "ระบบ" (งานเล็ก–กลาง)
- ย้าย `icline/i18n/` → `webview-ui/src/i18n/` พร้อม **namespace** (`picker.*`, `settings.*`, `chat.*`, …) เพื่อไม่ให้ตารางเดียวบวม 51 → พันกว่าคีย์
- ทำ `resolveLocale()` กลาง: `preferredLanguage` → `navigator.language` → `en` (generalize `pickerLocale.ts`) และให้ **ทุกภาษาใน `Languages.ts` map เป็น tag ได้** (ปัจจุบันใช้จริงแค่ th)
- คง `t()` แบบ fallback → en → key (พฤติกรรมเดิม ไม่ให้มีข้อความว่าง)
- **เกณฑ์จบ:** ยังไม่มีข้อความใหม่ถูกแปล แต่ทุก surface เรียก `t()` ได้ และเทสต์ "คีย์ครบทุก locale" ขยายเป็นทุก namespace

### เฟส 2 — ครอบ webview ทั้งหมด (งานใหญ่สุด)
- แปลง component ทีละ section: Settings → Chat/composer → History → MCP/Account → common
- ทุกครั้งที่แตะ **ต้องเพิ่มคีย์ EN ก่อน** (EN = source of truth) แล้วค่อยเพิ่ม TH
- เพิ่มด่านกันถอย: เทสต์ที่สแกนว่าห้ามมี JSX text node ตรง ๆ ในโฟลเดอร์ที่แปลงแล้ว (แบบเดียวกับ `pickerStrings.test.ts`)
- ใส่ `data-testid` ไว้เหมือนเดิม (e2e ใช้ testid ไม่ใช่ข้อความ ⇒ e2e ไม่พังจากการแปล)

### เฟส 3 — manifest + host
- ห่อ `commands` / `menus` / `configuration` / `walkthroughs` / `categories` / `description` เป็น `%key%`
- ลบคีย์ตายใน `package.nls.json` หรือทำให้มันถูกอ้างจริง
- สร้าง `l10n/th/bundle.l10n.json` + เปลี่ยน 13 จุดฝั่ง host เป็น `vscode.l10n.t()`
- `sync-icline-docs.mjs` ต้องรู้จักไฟล์ nls เพิ่ม (ตอนนี้รู้จัก 2 ไฟล์)

### เฟส 4 — เสริมด่าน
- เพิ่ม contract ใน `scripts/verify-vsix-contracts.mjs`: VSIX ต้องมีไฟล์ nls ครบทุกภาษาที่ประกาศ
- e2e: สลับ `preferredLanguage` แล้วบังคับว่าป้ายใน Settings เป็นภาษาไทยจริง (ไม่ใช่แค่ picker)

---

## 4. ข้อควรระวังที่เจอจากการสำรวจ

1. **`preferredLanguage` เก็บเป็น display string** (`"Thai - ไทย"`) ไม่ใช่ tag (`"th"`) ⇒ เปราะต่อการแก้ชื่อป้าย, ควรเก็บ tag และมี `getLanguageKey` แปลง (มีแล้ว) แต่ตัว state ยังเก็บ display อยู่
2. **เปลี่ยน locale ต้องไม่ไปแตะ prompt** — คนละหน้าที่ (สั่งโมเดลตอบภาษา vs แปล UI) ถ้ารวมจะได้บั๊ก "เปลี่ยน UI เป็นอังกฤษแล้วโมเดลเลิกตอบไทย"
3. **ข้อความที่โมเดลสร้าง (transcript) ต้องไม่ถูกแปล**
4. **ศัพท์ที่ล็อกให้คงอังกฤษ** (Thinking / Effort / Context window / ชื่อระดับ Low–Max) — ตาม `ui-guidelines.md` และ mock v11
5. งานนี้ **ไม่ใช่การเพิ่ม setting ใหม่** — setting มีอยู่แล้ว (`PreferredLanguageSetting`) ที่ขาดคือ *ความครอบคลุม* ของการแปล ⇒ ไม่ควรสร้าง dropdown ตัวที่สอง (จะซ้ำกับของเดิม)

---

## 5. สรุปคำตอบสั้น

- **มีอยู่แล้ว:** setting เลือกภาษา 1 จุด (19 ภาษา) + i18n จริง 2 ภาษา ที่ครอบเฉพาะ Quick Picker/notice + nls ไทยที่ต่อสายแค่ displayName
- **ต้องเพิ่ม:** (ก) ขยายแกน i18n จาก picker → ทั้ง webview (ข) ห่อ manifest เป็น nls (คำสั่ง/เมนู/การตั้งค่า/walkthrough) (ค) `l10n/` ฝั่ง host (ง) ด่านเทสต์กันข้อความ hardcode กลับมา
- **ต้องตัดสินใจก่อนเริ่ม:** จำนวนภาษาที่จะแปลจริง + คนแปล + จะให้ `preferredLanguage` ตัวเดียวคุมทั้ง prompt และ UI หรือไม่
