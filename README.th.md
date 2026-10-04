<p align="center">
  <img src="apps/vscode/assets/icons/icon.png" width="80" alt="iCline" />
</p>

<h1 align="center">iCline</h1>

<p align="center">
เอเจนต์เขียนโค้ดบน VS Code จากสาย Cline พร้อม xAI Grok OAuth, ZenMux และ agent harness ที่แข็งแกร่งขึ้น — ใช้ iCline อย่างเดียวได้ ไม่ต้องติดตั้ง Cline official
</p>

<p align="center">
🌐 <strong>ภาษาไทย</strong> (หน้านี้) · <a href="README.md">English</a>
</p>

<!-- icline:version -->
<p align="center">
  <strong>เวอร์ชัน</strong> <code>0.1.19-dev.5</code> ·
  <a href="https://github.com/i-mrDedchai/iCline/releases">Releases</a> ·
  <a href="https://github.com/i-mrDedchai/iCline/blob/main/apps/vscode/CHANGELOG.md">Changelog</a> ·
  Extension ID <code>i-mrdedchai.iCline</code>
</p>
<!-- /icline:version -->

---

## ข่าวล่าสุด

- **v0.1.18 Stable (2026-09-30)** — UI ครบทุกภาษา (EN / TH / JA / ZH-CN), แท็บ Settings → Appearance สีตาม theme, retry เมื่อสตรีมขาดกลางคัน, พอร์ต upstream แบบเลือกเฉพาะที่พร้อมแพตช์ช่องโหว่ (js-yaml CVE-2026-84375), หน้า About แสดง sync-point ตรงจริง [Release v0.1.18](https://github.com/i-mrDedchai/iCline/releases/tag/v0.1.18) · ขึ้นทั้งสอง store แล้ว รายละเอียด: [apps/vscode/CHANGELOG.md](apps/vscode/CHANGELOG.md)
- **Claim namespace Open VSX สำเร็จ** — publisher `i-mrdedchai` ยืนยันแล้ว ([Eclipse Foundation #11300](https://github.com/EclipseFdn/open-vsx.org/issues/11300) ปิดเป็น completed)
- **ยอดติดตั้ง Open VSX** — **116+ installs** ภายใน ~12 ชม. หลังขึ้นลิสต์ (และยังเพิ่มอยู่)
- **v0.1.17 Stable** — แก้ไอคอน/สกรีนช็อตบน store, เก็บกวาดตารางเปรียบเทียบ
- **v0.1.16 Stable** — welcome home, แก้ quick start ได้, export/import history, branding iCline ในแชท

## เริ่มต้นอย่างรวดเร็ว

**ติดตั้งจาก Store (แนะนำ):**

- [VS Marketplace](https://marketplace.visualstudio.com/items?itemName=i-mrdedchai.iCline) — VS Code, Cursor (Marketplace)
- [Open VSX](https://open-vsx.org/extension/i-mrdedchai/iCline) — Cursor, VSCodium และ IDE ที่ใช้ Open VSX

จากนั้นเปิด iCline จาก Activity Bar → Settings → Sign in **xAI · Grok** หรือใส่ API key

**หรือติดตั้งจาก VSIX:**

1. ดาวน์โหลด `.vsix` ล่าสุดจาก [Releases](https://github.com/i-mrDedchai/iCline/releases)
2. `code --install-extension i-mrdedchai.iCline-0.1.19-dev.2-fix.1.vsix --force`
3. **Developer: Reload Window**

เอกสาร extension เต็ม: **[apps/vscode/README.th.md](apps/vscode/README.th.md)** · English: **[apps/vscode/README.md](apps/vscode/README.md)**

## Build จากซอร์ส

```powershell
cd apps/vscode
npm install
npm run package:vsix
code --install-extension dist/i-mrdedchai.iCline-0.1.19-dev.2-fix.1.vsix --force
```

## iCline vs Cline official

| | Cline official (4.1.18 @ 2026-09-16) | iCline (0.1.18 @ 2026-09-30) |
|---|:-:|:-:|
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
| 🏢 จัดการ Custom provider (สร้าง/แก้/ลบ, fetch model) | ❌ | ✅ |
| 🏷️ แถว Context บอกที่มาตัวเลข (ประกาศ/override/catalog) | ❌ | ✅ |
| 👥 Sub-agent และ Agent Team (แผง team, budget, อนุมัติแยก) | ❌ | ✅ |
| 🛡️ รันงานซ่อมตัวเอง (retry สตรีมขาด, ต่อ truncation) | ❌ | ✅ |

<p align="center">
  <img src="apps/vscode/assets/docs/0.1.18-NewDesign-QuickPicker-Effort.png" alt="เมนูด่วนเลือก Provider และ Model บนแชท iCline (โฉมใหม่ 0.1.18)" width="640" />
</p>

ดูภาพและรายละเอียดเต็มที่ **[apps/vscode/README.th.md](apps/vscode/README.th.md)**

ติดตั้งคู่กันได้ — อัปเดตฝั่งหนึ่งจะไม่ลบอีกฝั่ง

## ดึง upstream จาก Cline

```powershell
.\scripts\sync-upstream.ps1
```

## โครงสร้าง repo

Repo นี้เป็น fork ของ [cline/cline](https://github.com/cline/cline) — extension **iCline** อยู่ที่ `apps/vscode/` ส่วนโฟลเดอร์อื่นมาจาก upstream

## การมีส่วนร่วม

อ่าน [CONTRIBUTING.md](CONTRIBUTING.md) — การแก้ `main` โดยตรงทำได้เฉพาะ maintainer คนอื่นส่ง PR ผ่าน fork

## ความปลอดภัย

อ่าน [SECURITY.md](SECURITY.md) — ห้าม commit API key, `.env`, หรือ `~/.grok/auth.json`

## License

[Apache-2.0](LICENSE) — อิงจาก [Cline](https://github.com/cline/cline)