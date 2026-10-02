# Effort-Gate Definition of Done (dev.4-fix.4 ค)

งานใดก็ตามที่แตะ **Reasoning Effort / Thinking Budget gating** — policy ใน
`webview-ui/src/utils/modelThinkingOptions.ts`, เกณฑ์ใน
`webview-ui/src/icline/pickerCapabilities.ts`, ฟอร์ม Settings ใต้
`webview-ui/src/components/settings/` หรือ Quick Picker ใต้
`webview-ui/src/components/chat/` — ถือว่าเสร็จก็ต่อเมื่อผ่านเช็กลิสต์นี้ครบ

## 1. ผ่าน gate ตัวเดียว (`resolveThinkingGateFlags`)

- [ ] ทั้ง Settings และ picker ส่งค่าดิบ (`reasoningEffort`, `thinkingBudgetTokens`,
      `providerDefaultEffortIsSet`) ผ่าน `resolveThinkingGateFlags` เท่านั้น
- [ ] ไม่มี `effortIsSet:` / `budgetIsSet:` เขียน inline ที่ไฟล์อื่น
      (เทสต์ `no surface derives the gate inline` จับให้อัตโนมัติ)
- [ ] ส่งเฉพาะค่าที่ **stored จริง** — ห้ามส่ง ambient default / provider default
      ยกเว้น `providerDefaultEffortIsSet` ของ picker (reachable แต่ไม่ on)

## 2. เพิ่มแถวในตาราง parity (ข)

- [ ] เคสใหม่มีแถวใน `describe("Settings and the Quick Picker agree on the effort gate")`
      ใน `webview-ui/src/utils/__tests__/modelThinkingOptions.test.ts`
- [ ] แถวนั้น assert ทั้ง `settingsView ≈ pickerView` และค่าที่คาด (`expectSupport`)

## 3. รันสองชุดเทสต์ + e2e (จาก `apps/vscode/`)

```bash
export PATH="/c/Users/dedch/.bun/bin:$PATH"
cd apps/vscode
bun run check-types                                   # tsc host + webview
cd webview-ui && bun run test                         # vitest ทั้งชุด
cd .. && bun run lint                                 # biome lint (ห้าม --write)
bun run test:e2e:optimal                              # build vsix + playwright
```

- [ ] `check-types` ผ่าน (0 error ทั้ง host และ webview)
- [ ] `vitest` ผ่านทั้งชุด (รวม `modelThinkingOptions` + `pickerCapabilities`)
- [ ] `lint` ไม่มี error ใหม่ (info เดิมเรื่อง a11y `role="status"` รับได้)
- [ ] e2e ที่แตะต้องผ่านเป็นอย่างน้อย: `settings-bynara`, `settings-stats`,
      `settings-custom-providers`

## 4. เอกสาร + คอมมิต

- [ ] CHANGELOG มีบรรทัดของรอบ fix นี้
- [ ] ถ้าพฤติกรรมผู้ใช้เปลี่ยน: อัปเดต `docs/provider-config/bynara.mdx`
- [ ] `git status` สะอาดยกเว้นไฟล์ที่ตั้งใจ; ห้าม commit คีย์ (`git grep sk-nry`
      ต้องว่างเปล่า)

## หมายเหตุขอบเขต

ฟอร์ม Settings ของ provider อื่น (Anthropic, Bedrock, …) ยังเรียก
`resolveModelThinkingOptions` ตรง ๆ โดยไม่ผ่าน gate helper — รับได้เพราะ policy
ของตนขับด้วย metadata เป็นหลัก การขยาย gate ให้ครอบทุกฟอร์มคืองานข้อ ง.
(retire dual plumbing) ไม่ใช่งานรอบนี้
