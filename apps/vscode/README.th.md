# iCline

<!-- icline:version -->
> 📦 **เวอร์ชันปัจจุบัน:** `0.1.18-dev.6` · [Releases](https://github.com/i-mrDedchai/iCline/releases) · [Changelog](https://github.com/i-mrDedchai/iCline/blob/main/apps/vscode/CHANGELOG.md) · [Repo](https://github.com/i-mrDedchai/iCline)
<!-- /icline:version -->

<!-- icline:repo -->
🔗 **GitHub:** [i-mrDedchai/iCline](https://github.com/i-mrDedchai/iCline)
<!-- /icline:repo -->

🌐 **ภาษา:** ภาษาไทย (หน้านี้) · [English](README.md)

**iCline** เป็น extension **ใช้งานได้เอง** บน VS Code จากสาย [Cline](https://github.com/cline/cline) (`i-mrdedchai.iCline`) — **ไม่จำเป็นต้องติดตั้ง Cline official** ติดตั้ง iCline แล้ว sign in Grok (หรือ provider อื่น) ได้เลย ถ้าต้องการใช้ [Cline official](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev) คู่กันก็ได้ (คนละ extension ID ไม่ทับกัน)

---

## 🆕 มีอะไรใหม่ใน 0.1.18

- 🌐 **UI ทั้งหมดอ่านเป็นภาษาของคุณ** — Settings ทุกแท็บ, หน้า welcome และการ์ด Quick Start, หน้าประวัติทั้งหมด (ค้นหา, จัดเรียง/กรอง, export/import), โมดัล Customize (Rules / Hooks / Skills), หน้า MCP server, แผง Team, แค็ตตาล็อก Marketplace, หน้าจอ Account, ตัวช่วย Onboarding, ตั้งค่า Browser รวมถึงข้อความแจ้งเตือนของ extension และข้อความ manifest — รองรับ**อังกฤษ ไทย ญี่ปุ่น และจีนตัวย่อ** prompt ยังเป็นภาษาอังกฤษ (เพราะสั่งโมเดล) และการเปลี่ยนภาษาหน้าจอไม่เปลี่ยนภาษาที่ agent ตอบ
- 🎨 **แท็บ Settings → Appearance** — แผง Task Completed มี token สีของตัวเอง (`--color-completed` แยกจาก `success` จึงปรับสีโดยไม่กระทบ diff count หรือ badge) และการ์ด final-reply มี `--color-reply` ทั้งคู่ตาม theme ของ editor เลือก accent ได้ 3 กลุ่ม เก็บเป็น choice id `iCline.appearance.*`
- 🛡️ **รันงานรอดเมื่อสตรีมขาดกลางคัน** — ถ้า upstream stream จบก่อน terminal chunk จะ retry แทนการจบงาน และเพดาน output ปรับตามงบของโมเดล (`max(32k, 30% ของ budget)`) งาน reasoning ใหญ่ๆ จึงไม่ล้น
- 🧬 **พอร์ต upstream แบบเลือกเฉพาะที่ บันทึกตรงไปตรงมา** — ไม่ merge ทั้งก้อน: ช่องโหว่ fast-lane (js-yaml CVE-2026-84375), backoff ที่เคารพ abort, แยก `content-filter` จากความล้มเหลวชั่วคราว, compaction summarizer ใช้ credential จริง ทุก port *และ* skip บันทึกใน [Changelog](https://github.com/i-mrDedchai/iCline/blob/main/apps/vscode/CHANGELOG.md) และหน้า Settings → About แสดง sync-point ตรงกับ upstream จริง (`4.1.18 SDK (main@173837314)` / `2026-09-16`)

<!-- ภาพใหม่ 0.1.18 (เพิ่มเท่านั้น — ห้ามแตะภาพเก่าใน assets/docs/):
  เอา comment ออกทีละบล็อกเมื่อได้ไฟล์ภาพแล้ว ใช้ภาพชุดเดียวกับเวอร์ชันอังกฤษได้
  <p align="center">
    <img src="assets/docs/0.1.18-Appearance-Settings.jpg" alt="iCline Settings — แท็บ Appearance" width="720" />
  </p>
  <p align="center">
    <img src="assets/docs/0.1.18-Task-Completed.jpg" alt="แผง Task Completed ของ iCline ตามสี theme" width="720" />
  </p>
  <p align="center">
    <img src="assets/docs/0.1.18-Settings-Thai.jpg" alt="iCline Settings ภาษาไทย" width="720" />
  </p>
  Spec: docs/icline/readme-0.1.18-screenshots.md -->

---

## ❓ คำถามที่พบบ่อย

### ต้องติดตั้ง Cline official ก่อนไหม?

**ไม่ต้อง** — iCline เป็น extension สมบูรณ์ ติดตั้งจาก Marketplace หรือ `.vsix` จาก [Releases](https://github.com/i-mrDedchai/iCline/releases) แล้วเปิด **iCline** จาก Activity Bar → sign in **xAI · Grok** หรือใส่ API key

### ใช้ iCline กับ Cline official พร้อมกันได้ไหม?

**ได้ (ไม่บังคับ)** — เป็นคนละ extension (`i-mrdedchai.iCline` vs `saoudrizwan.claude-dev`) ใช้คู่กันได้ไม่ชนกัน ผู้ใช้หลายคนใช้แค่ **iCline อย่างเดียว**

---

## ✨ ทำไมต้องใช้ iCline?

| | Cline official | iCline |
|---|---|---|
| Extension ID | `saoudrizwan.claude-dev` | `i-mrdedchai.iCline` |
| Verified publisher | `saoudrizwan` | `i-mrdedchai` ✅ |
| VS Marketplace · Open VSX | Marketplace only | ✅ ทั้งสอง |
| ⚡ เมนูด่วนเลือก Provider / Model บนแชท | ❌ | ✅ |
| 🏠 Quick Start 12 แบบ (แก้ prompt ได้) | ❌ | ✅ |
| 📦 Export / Import history (`.zip`) | ❌ | ✅ |
| 🏷️ branding iCline ในแชท agent | ❌ | ✅ |
| 🔐 xAI OAuth (SuperGrok / X Premium) | ❌ | ✅ |
| ⚡ Composer 2.5 Fast, Grok Build | ❌ | ✅ |
| 🌐 ZenMux (100+ models) | ❌ | ✅ |
| 🛡️ Harness guardrails (verify-before-claim) | ❌ | ✅ |
| 🔄 Dual-channel updates (iCline + upstream) | ❌ | ✅ |
| 🌐 UI ครบทุกภาษา (EN / TH / JA / ZH-CN) | ❌ | ✅ |
| 🎨 แท็บ Appearance (สีตาม theme) | ❌ | ✅ |

### ⚡ เมนูด่วนเลือก Provider & Model (บนแชท)

สลับ Provider และโมเดลได้ **โดยไม่ต้องออกจากหน้าแชท** — ค้นหาได้ทุก Provider ยุบ/ขยายรายการโมเดล ตั้ง **Thinking / Effort รายโมเดล** เมื่อ hover และ refresh รายการโมเดลแบบ dynamic

![เมนูด่วนเลือก Provider และ Model บนช่องแชท iCline](assets/docs/Preview-Settings-iCline-menu-Providers-Models.jpg)

รายการ Provider เต็มและการตั้งค่าโมเดลแบบละเอียดยังอยู่ที่ **Settings → API Configuration**:

![iCline Settings — Providers และ Models](assets/docs/Preview-Settings-iCline-Providers-Models.jpg)

---

## 🚀 เริ่มต้นใช้งาน

1. เปิด **Activity Bar** แล้วคลิกไอคอน iCline (หรือ `Ctrl+Shift+P` → `iCline: Open In New Tab`)
2. ไปที่ **Settings** ⚙️ → เลือก Provider
3. เลือก **xAI · Grok (OAuth & Subscription)** แล้วกด **Sign in to xAI Grok** สำหรับ OAuth  
   หรือใส่ **API Key** / ใช้ auth จาก **Grok CLI** (`~/.grok/auth.json`)
4. เลือกโมเดล เช่น **Composer 2.5 Fast** หรือ **Grok Build**
5. พิมพ์งานที่ต้องการ — iCline จะวางแผน อ่านโค้ด แก้ไฟล์ และรันคำสั่ง (หลังคุณอนุมัติ)

> 💡 **เคล็ดลับ:** เปิด iCline ใน sidebar ด้านขวาเพื่อดูการเปลี่ยนแปลงไฟล์แบบ side-by-side กับ Explorer

---

## 📥 ติดตั้ง

- **VS Marketplace:** [i-mrdedchai.iCline](https://marketplace.visualstudio.com/items?itemName=i-mrdedchai.iCline)
- **Open VSX:** [i-mrdedchai/iCline](https://open-vsx.org/extension/i-mrdedchai/iCline) — Cursor, VSCodium และ IDE ที่ใช้ Open VSX
- **GitHub Releases:** [ดาวน์โหลด `.vsix`](https://github.com/i-mrDedchai/iCline/releases)

### ติดตั้งจาก VSIX

ดาวน์โหลด `.vsix` ล่าสุดจาก [GitHub Releases](https://github.com/i-mrDedchai/iCline/releases) แล้วรัน:

```bash
code --install-extension i-mrdedchai.iCline-0.1.18-dev.6.vsix --force
```

หรือ build เอง:

```powershell
cd apps/vscode
npm install
npm run package:vsix
code --install-extension dist/i-mrdedchai.iCline-0.1.18-dev.6.vsix --force
```

---

## 🤖 โมเดล xAI ที่รองรับ

- ⚡ **Composer 2.5 Fast** — โมเดลหลักสำหรับ coding agent
- 🔨 **Grok Build** — โมเดลสำหรับงาน build / implement
- 🧠 **Grok 4.3** และรุ่น Grok อื่นๆ ตามที่ xAI เปิดให้ใช้

---

## 🎯 ฟีเจอร์เพิ่มจาก Cline official

### 🏠 Welcome home & Quick Starts
- Quick Start 12 แบบบนหน้า welcome (แสดงตลอด แม้ history มี 3+ รายการ)
- แก้ บันทึก รีเซ็ต และเริ่มงานด้วย prompt ที่ปรับเอง (popover ⋯ / ✎)
- Subtitle: *Autonomous coding agent · in your IDE*

### 📦 Export / Import history
- Export งานที่เลือกหรือทั้งหมดเป็น `.zip` (manifest + โฟลเดอร์ task)
- Import จาก archive — task ID ซ้ำจะถูกสร้างใหม่อัตโนมัติ

### 🏷️ branding iCline ในแชท
- ป้าย tool, สรุปกลุ่ม และข้อความอนุมัติแสดง **iCline** ระหว่างรันงาน

### 🔐 xAI · Grok (OAuth & Subscription)
- Sign in ผ่าน browser (PKCE OAuth) — SuperGrok / X Premium
- รองรับ token refresh อัตโนมัติ
- อ่าน session จาก Grok CLI ได้ถ้ามี login อยู่แล้ว
- ใส่ API key จาก console.x.ai ได้ (Pay-as-you-go)

### 🛡️ Agent harness (Fable-style guardrails)
- **Verify-before-claim** — ห้ามอ้างว่าทำสำเร็จก่อนตรวจสอบจริง
- **Post-write verification** — ตรวจไฟล์หลัง save
- **Compaction threshold clamp** — จำกัด threshold ระหว่าง 0.5–0.95

### 🔄 Dual-channel updates
- ตรวจ **iCline release** จาก GitHub Releases
- แจ้งเตือน **Cline upstream** เวอร์ชันใหม่ (ไม่ auto-merge)
- คำสั่ง: `iCline: Check for Updates (iCline & Cline upstream)`

### 🌐 UI ครบทุกภาษา
- Settings ทุกแท็บ, welcome, history, โมดัล Customize, MCP, Team, Marketplace, Account, onboarding — EN / TH / JA / ZH-CN
- ข้อความแจ้งเตือนและ manifest (หน้า Extensions, command palette) แปลผ่าน `vscode.l10n`
- prompt ยังเป็นอังกฤษ เปลี่ยนภาษาหน้าจอไม่เปลี่ยนภาษาที่ agent ตอบ

### 🎨 แท็บ Appearance
- สี accent ตาม theme สำหรับแผง Task Completed (`--color-completed`) และการ์ด final-reply (`--color-reply`)
- เก็บเป็น choice id `iCline.appearance.*` ค่าที่ไม่รู้จักจะ fallback เป็นค่า token

---

## ⚙️ Settings

| Setting | คำอธิบาย | ค่าเริ่มต้น |
|---|---|---|
| `iCline.updates.enabled` | เปิดตรวจอัปเดต | `true` |
| `iCline.updates.releasesUrl` | URL GitHub Releases API | `https://api.github.com/repos/i-mrDedchai/iCline/releases/latest` |
| `iCline.updates.notifyUpstreamCline` | แจ้ง Cline upstream | `true` |
| `iCline.updates.checkIntervalHours` | ช่วงตรวจ (ชั่วโมง) | `24` |

---

## 🌐 ZenMux

Provider **ZenMux** รองรับครบตามที่ ZenMux ให้บริการ:

- 👤 **บัญชี**: Sign in (Email / GitHub / Google) ผ่านลิงก์ใน Settings
- 🔑 **API Key**: Pay As You Go (`sk-ai-v1-`) และ Builder Subscription (`sk-ss-v1-`)
- 📊 **Management API Key**: แสดง PAYG balance และ subscription quota
- 🔌 **โปรโตคอล**: OpenAI Chat, Anthropic Messages, OpenAI Responses, Google Gemini/Vertex
- 📋 **โมเดล**: ดึงรายการอัตโนมัติจาก ZenMux (100+ models)

## 🔌 Providers อื่นๆ

นอกจาก xAI และ ZenMux แล้ว iCline ยังรองรับ providers เดิมของ Cline ทั้งหมด เช่น Anthropic, OpenAI, OpenRouter, Google Gemini, AWS Bedrock, Azure, LM Studio/Ollama และ MCP

---

## 🔒 อัปเดตปลอดภัย

- อัปเดต Cline official **จะไม่ลบ** iCline
- อัปเดต iCline **จะไม่ลบ** Cline official
- ดึงโค้ดจาก upstream: `scripts/sync-upstream.ps1`

---

## 📄 เอกสารอัปเดตอัตโนมัติ

ทุกครั้งที่ build/package extension (`npm run package:vsix` หรือ `vscode:prepublish`) สคริปต์ `scripts/sync-icline-docs.mjs` จะ sync README, CHANGELOG, package.json และ provider labels

---

## 📜 License

Apache-2.0 — อิงจาก [Cline](https://github.com/cline/cline)