# iCline — Stable release pointer

> อัปเดตเมื่อปล่อย Stable แต่ละครั้ง

| ฟิลด์ | ค่า |
|-------|-----|
| **Stable version** | `0.1.18` |
| **Released** | GitHub Release 2026-09-30 · Open VSX 0.1.18 LIVE · Marketplace 0.1.18 LIVE — parity 4/4 green |
| **GitHub** | https://github.com/i-mrDedchai/iCline/releases/tag/v0.1.18 |
| **Marketplace** | https://marketplace.visualstudio.com/items?itemName=i-mrdedchai.iCline |
| **Open VSX** | https://open-vsx.org/extension/i-mrdedchai/iCline |
| **Extension ID** | `i-mrdedchai.iCline` |

## วิธีรู้ว่าเวอร์ชันนี้ “พร้อมใช้งานสาธารณะ”

1. มีไฟล์นี้ (`releases/STABLE.md`) ชี้เวอร์ชันล่าสุด
2. GitHub Release `v0.1.18` **ไม่มี**ป้าย Pre-release และมี VSIX แนบ
3. Marketplace + Open VSX แสดง `0.1.18` แล้วทั้งคู่ (LIVE)
4. `node scripts/release-parity.mjs verify --version 0.1.18` ผ่านทุกช่องทาง (4/4 green 2026-09-30)
5. smoke โดย maintainer ครบ (fix.51/52 + release VSIX — ไม่ข้าม checklist)

## สรุปการเปลี่ยนแปลงหลัก (0.1.18)

- UI ครบ 4 ภาษา (EN/TH/JA/ZH-CN) ทุกแท็บ Settings + welcome/history/MCP/Team/Account
- แท็บ Appearance + Custom providers CRUD + Sub-agents/Agent Teams + Team budget
- Self-healing runs (mid-stream retry, truncation continuation) + selective upstream ports
- VSIX gate 88/88 · smoke fix.51/52 + release ผ่านโดย maintainer

## สรุปรอบก่อน (0.1.17)

- Marketplace icon/screenshots, comparison table cleanup (2026-06-22)