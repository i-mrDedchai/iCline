# ดัชนีรอบ fix ย่อยทั้งหมดของ 0.1.18 (dev.5 + dev.6)

นับจริงจากหลักฐาน ไม่ประมาณ: **dev.5 = 35 รอบ + dev.6 = 52 รอบ = 87 รอบ**
(ที่นับตกก่อนหน้าว่า "ราว 40" คือมองแค่ dev.6 ช่วงกลาง — ผิดไปกว่าครึ่ง)

วิธีนับ: หมายเลขรอบ `fix.N` ต่อด้วยหลักฐาน (section ใน
[smoke-test-tracker](smoke-test-tracker.md) / commit `(fix.N)` / VSIX
`0.1.18-dev.{5,6}-fix.N` / บรรทัด CHANGELOG) — repack กับ test-only
(`fix.6 v2`, `fix.43 e2e`, ป้าย `fix.49a`) ไม่นับเป็นรอบใหม่

⚠️ **เลขชนกันระหว่าง dev — `dev.5-fix.N` ≠ `dev.6-fix.N`**
เลข 15–35 มีทั้งสอง dev แต่คนละเนื้อหา (เช่น fix.22 ของ dev.5 = ตาราง
Grok 4.6 500k / ของ dev.6 = ประมาณ token รูป base64) — อ้างอิงต้องระบุ dev
ด้วยป้าย VSIX (`0.1.18-dev.5-fix.N` vs `0.1.18-dev.6-fix.N`) เสมอ

## dev.5 — fix.1–fix.35 (2026-09-14 → ปิด 2026-09-18)

| รอบ | เนื้อหา | หลักฐาน |
|---|---|---|
| fix.1 | opener (เนื้อหาไม่ได้บันทึก — มีเลขจากการเรียงลำดับ) | implied |
| fix.2–fix.6 | Quick Picker worktree ต้นทาง (search/sort/free-standard/empty · write-through · xAI subscription · live cache · picker commit) | commits 250631934–2db4b35a1 |
| fix.7 | VSIX `0.1.18-dev.5-fix.7` — smoke ผ่าน 09-14 | tracker + `06c99e628` |
| fix.8 | xAI picker full list + Sakana protocol + branding/docs | `5a71c5336` + smoke section |
| fix.9 | cross-provider commit + legacy id + Sakana layout | `2db4b35a1` |
| fix.10–fix.14 | แพ็กรอบก่อนหน้าใน worktree (VSIX ใน `dist/`) | tracker อ้างถึง |
| fix.15–fix.16 | Picker activate / requested-id | worktree table + `(fix.15)` `(fix.16)` |
| fix.17 | stacked activate | worktree table + `(fix.17)` |
| fix.18 | Settings แหล่งความจริงของลิสต์ Cline | worktree table + `(fix.18)` |
| fix.19 | Featured Recommended/Free ใน Picker | worktree table + `(fix.19)` |
| fix.20 | เปิด Picker เลื่อนไป provider ที่ใช้ | worktree table + `(fix.20)` |
| fix.21 | โมเดลที่เลือกอยู่ตำแหน่ง A–Z | worktree table + `(fix.21)` |
| fix.22 | Grok 4.6 = 500k ในตาราง | worktree table + `(fix.22)` |
| fix.23 | บังคับ 500k ทุกเส้นทางแสดง | worktree table + `(fix.23)` |
| fix.24 | แถบแชทอ่านแคตตาล็อกเดียวกับ Settings | worktree table + `(fix.24)` |
| fix.25 | bind context กับ id ที่เลือกเท่านั้น | worktree table + `(fix.25)` |
| fix.26 | รวม featured เข้าแคตตาล็อก `cline` | worktree table + `(fix.26)` |
| fix.27 | alias slug + Solar Pro 4 = 524.3k | worktree table + `(fix.27)` |
| fix.28 | แถบ context คงค่าหลัง reopen (sidecar) | compact table + `(fix.28)` |
| fix.29 | แสดงสาเหตุ compact ล้มเหลวในแชท | compact table + `(fix.29)` |
| fix.30 | identity headers แก้ 403 บน cline-free | compact table + `(fix.30)` |
| fix.31 | token refresh แก้ 401 | compact table + `(fix.31)` |
| fix.32 | llms rebuild — trigger อ่าน window จริง | compact table (docs-only) |
| fix.33 | knownModels ผ่าน resolveProviderConfig | compact table + `(fix.33)` |
| fix.34 | `attempt_completion` จบ turn (completesRun) | compact table + `(fix.34)` |
| fix.35 | overlay อ้าง tool จริง (`ask_question`) | compact table + `(fix.35)` |

## dev.6 — fix.1–fix.52 (2026-09-19 → 2026-09-30, branch `feat/upstream-waves-1-2`)

| รอบ | เนื้อหา | หลักฐาน |
|---|---|---|
| fix.1 | **Wave 1**: SDK fast-forward ถึง upstream Sep-16 + identity re-applied | W1-1/2/3 table |
| fix.2 | provider parity + stats card + Wave-2 hand-port | CHANGELOG + VSIX |
| fix.3 | P0 selection-stuck (3 ราก) | CHANGELOG + VSIX |
| fix.4 | optimistic echo + Jan fallback + ClinePass | CHANGELOG + VSIX |
| fix.5 | overlay ไม่บังคับ tool | CHANGELOG |
| fix.6 | final-reply completion card (+v2 repack) | CHANGELOG + VSIX |
| fix.7 | editor envelope + tool trace + chunk recipe | tracker section + VSIX |
| fix.8 | e2e: editor เกินลิมิตต้องล้มเหลวพร้อมข้อความจริง | tracker section |
| fix.9 | hover Options ไม่เปิด | tracker + CHANGELOG |
| fix.10 | panel ติดแถวบน | tracker + CHANGELOG (รวม fix.9–11) |
| fix.11 | ตรง mock v11 + status จริง | tracker + CHANGELOG |
| fix.12 | modelThinkingOptions โมดูลเดียว | tracker + CHANGELOG (รวม fix.12–13) |
| fix.13 | Effort metadata ต่อ provider | tracker + CHANGELOG |
| fix.14 | effort vocabulary + ฟอร์ม Sakana ซ้อน | tracker + CHANGELOG ×2 |
| fix.15 | downgrade notice + snap-back + z-index + chip | tracker + CHANGELOG ×4 |
| fix.16 | org lock + effort guard | tracker + CHANGELOG |
| fix.17 | status chip แยกปุ่ม + org proof | tracker + CHANGELOG |
| fix.18 | popover cursor + thumbnails | tracker + CHANGELOG |
| fix.19 | popover shared module | tracker + CHANGELOG |
| fix.20 | ย้ายวิวแล้วแชทหาย | tracker + CHANGELOG |
| fix.21 | recent grid + draft รอด + timestamp | tracker + CHANGELOG ×2 |
| fix.22 | ประมาณ token รูป base64 | tracker + VSIX + CHANGELOG |
| fix.23 | editor 6k→32k + ย่อรูป | tracker + VSIX + CHANGELOG |
| fix.24 | park running session | tracker + VSIX + CHANGELOG |
| fix.25 | กู้ tool call ข้อความล้วน | tracker + VSIX + CHANGELOG |
| fix.26 | สำเนียง `name{json}` + free-route entry | tracker + VSIX + CHANGELOG ×2 |
| fix.27 | element form + Effort จริงรายโมเดล | tracker + VSIX + CHANGELOG ×2 |
| fix.28 | Thinking jump + stream watchdog (+บทเรียน rebuild dist) | tracker + VSIX + CHANGELOG ×2 |
| fix.29 | ถอน scrollbar (+e2e fill fix) | tracker + VSIX + CHANGELOG |
| fix.30 | editor 2M + atomic write | tracker + VSIX + CHANGELOG |
| fix.31 | compaction/OAuth/YOLO (sidecar · token · policies) | VSIX + CHANGELOG |
| fix.32 | ปิดงานค้าง: terminal reserve · insert_line filler | tracker + VSIX |
| fix.33 | 4 คำถาม: dedupe · mocha · parallel/detach · เปิด Teams | tracker + VSIX |
| fix.34 | วินิจฉัย fix.31–33: stall notice · alias · whitespace | tracker + VSIX + CHANGELOG |
| fix.35 | team e2e: toggle-rebuild guard | tracker + VSIX |
| fix.36 | Effort merged-map + drain gate | tracker + VSIX |
| fix.37 | sub-agent tools/approval + continuation (pack 1) | tracker + VSIX |
| fix.38 | thinking cap + Show less (pack 2) | tracker + VSIX |
| fix.39 | context-128K truth + diagnose script + truncation row | tracker + VSIX + CHANGELOG |
| fix.40 | context-blank gateway (/models metadata) | tracker + VSIX + CHANGELOG |
| fix.41 | regression: Bearer-first + error จริง + legacy union | tracker + VSIX |
| fix.42 | custom providers CRUD | tracker + VSIX + CHANGELOG |
| fix.43 | card UX + fetch models (+e2e test-only ไม่ repack) | tracker + VSIX + CHANGELOG |
| fix.44 | placeholder + contract gate + i18n plan | tracker + VSIX + CHANGELOG |
| fix.45 | i18n core + General + nls gate | tracker + VSIX + CHANGELOG |
| fix.46 | 4 ภาษาจริง + 7 แท็บ + welcome | tracker + VSIX + CHANGELOG |
| fix.47 | api-config ทุก provider + contributing guide | tracker + VSIX + CHANGELOG |
| fix.48 | settings shell + composer + auto-approve | tracker + VSIX + CHANGELOG |
| fix.49a | customize + MCP + history (ไฟล์ fix.49 ป้าย a) | tracker + VSIX + CHANGELOG |
| fix.50 | standalone screens + host l10n + manifest | tracker + VSIX + CHANGELOG |
| fix.51 | Appearance + colors + stream retry (smoke ผ่าน) | VSIX + CHANGELOG |
| fix.52 | Wave-3 mini selective ports (smoke อยู่ระหว่างตรวจ) | VSIX + CHANGELOG |

VSIX dev.6 ครบทุกเลข fix.1–fix.21 ใน `dist/` + บันทึกแพ็ก fix.22–52 —
เลขไหนไม่มี section ของตัวเอง หมายถึงผลที่ผู้ใช้เห็นถูกเล่าในบรรทัดรอบใกล้เคียง
(หลักเดิม: tracker บันทึกไว้ว่า fix.1/8/10/11 ของ dev.6 ไม่มีบรรทัด CHANGELOG ของตัวเอง)
