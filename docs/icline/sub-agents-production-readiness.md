# Sub-agents / Agent Teams — ประเมินความพร้อม production (2026-09-25)

**คำถาม:** iCline รองรับ Sub-agents / ทีมหลาย agent / ทำงานขนานไหม? ถ้ามี เป็นทีมระดับ production หรือไม่?

**คำตอบสั้น:** มีจริง — เป็นระบบ multi-agent เต็มชุดใน `@cline/core` (ทั้ง `spawn_agent`, configured agents และ Agent Teams 18 tools) ที่ผ่านการออกแบบ ทดสอบ และมี persistence ในระดับ infrastructure จริงจัง แต่เดิม**ปิดสวิตช์ในตัว VS Code** (factory hardcode `false`) — รอบนี้เปิดใช้งานผ่าน 2 สวิตช์ตั้งค่า (`Sub-agents`, `Agent Teams` — ปิดเป็นค่าเริ่มต้น) พร้อมระบบ approval แล้ว (commit `9be072356`) ความพร้อมโดยรวม: **ฝั่ง SDK = production-grade infra; ฝั่ง UX ของ VS Code = ใช้งานได้จริงแต่ยังบาง** — รายละเอียดด้านล่าง

---

## 1. สิ่งที่มีอยู่จริง (หลักฐานจากโค้ด)

### 1.1 `spawn_agent` — sub-agent แบบ delegate (`sdk/packages/core/src/extensions/tools/team/`)

- **อินพุต:** `systemPrompt` + `task` → สร้าง delegated agent (`delegated-agent.ts`) ที่วิ่ง agent loop ของตัวเองจนจบ แล้วคืน `{text, iterations, finishReason, usage}`
- **ขนานได้จริง:** หลาย `spawn_agent` call ในคำตอบเดียวทำงานพร้อมกัน — webview มีตัว aggregate หลาย call (`message-translator.ts` — `spawn_agent` entries keyed by toolCallId) และ UI แสดงสถานะรวม
- **กำหนดเครื่องมือของ sub-agent ได้:** `subAgentTools` / `createSubAgentTools` + hooks, telemetry, approval ถูกส่งต่อไปยัง sub-agent run
- **Configured agents:** ประกาศ agent เป็นไฟล์ (frontmatter YAML/MD) ใน `.cline/agents` หรือ `~/.cline/.agents` — ระบุ `name`, `description`, `tools`, `skills`, `providerId`, `modelId`, `maxIterations` ต่อตัว (`configured-agent-config.ts`) โหลดอัตโนมัติตอนสร้าง session

### 1.2 Agent Teams (`team/`) — เครื่องมือครบ 18 ตัว

| กลุ่ม | Tools |
|---|---|
| จัดการเพื่อนร่วมทีม | `team_spawn_teammate`, `team_shutdown_teammate`, `team_status` |
| งาน/ขนาน | `team_task`, `team_run_task`, `team_cancel_run`, `team_list_runs`, `team_await_runs` |
| สื่อสาร | `team_send_message`, `team_broadcast`, `team_read_mailbox` |
| บันทึก | `team_mission_log`, `team_cleanup` |
| ผลลัพธ์ร่วม | `team_create_outcome`, `team_attach_outcome_fragment`, `team_review_outcome_fragment`, `team_finalize_outcome`, `team_list_outcomes` |

- **Persistence จริง:** `file-team-store` เก็บสถานะทีม + `hydrateState()` กู้กลับตอนเปิดแชทใหม่ (ไม่ใช่ของชั่วคราวในหน่วยความจำ)
- **บทบาทชัดเจน:** `subagent-prompts.ts` แยก system prompt ของ sub-agent กับ teammate (lead vs member)
- **bootstrap เป็นขั้นบันได:** `bootstrapAgentTeams` ปลดล็อกเครื่องมือฝั่ง lead เมื่อทีมพร้อม (`onLeadToolsUnlocked`) ไม่ยัด 18 tools ตั้งแต่ต้น
- **เทสต์:** `multi-agent.lifecycle.test.ts`, `spawn-agent-tool.test.ts`, `delegated-agent.test.ts`, `team-tools.test.ts`, `configured-agent-tool.test.ts` + runtime-builder tests หลายชุด

### 1.3 ใครใช้งานอยู่แล้ว (นอก VS Code)

- **automation / cron-runner / hub** ในโมโนรีpo เปิดใช้ตามค่าเริ่มต้น (`enableSpawn !== false`, `enableTeams ?? true`) — ทีมถูกใช้ใน scheduled tasks และ CLI/automation surface
- **Presets ของ core:** `act`/`plan`/`search` เปิดทั้ง spawn+teams, `minimal` เปิดเฉพาะ spawn, `yolo` ปิดทั้งคู่

---

## 2. สถานะใน iCline VS Code (หลังรอบนี้)

| ชิ้น | สถานะ |
|---|---|
| สวิตช์ตั้งค่า `Sub-agents` + `Agent Teams` (Settings → Agent) | ✅ เพิ่มแล้ว (ปิดเป็นค่าเริ่มต้น — opt-in) |
| Wiring เข้า session (`enableSpawnAgent` / `enableAgentTeams`) | ✅ อ่านจาก settings แทน hardcode `false` |
| เปลี่ยนสวิตช์กลางแชท | ✅ rebuild session อัตโนมัติ (เครื่องมือถูกสร้างตอน start session) |
| Approval — `spawn_agent` + `team_*` ทั้ง 19 ตัว | ✅ เข้า policy map แล้ว: **ถามทุกครั้ง** ยกเว้น YOLO (เดิม SDK auto-approve เครื่องมือที่ไม่ได้ลิสต์ — เป็นช่องโหว่ที่ปิดก่อนเปิดฟีเจอร์) |
| UI แสดงผล | ✅ ใช้ได้: `spawn_agent` มี aggregate panel ในแชท, `team_*` แสดงเป็น tool rows ปกติ |
| ทีมกู้สถานะตอนเปิดแชทใหม่ | ✅ (ของ core อยู่แล้ว — `sdk-task-history` ยังปิด teams ในการ replay: ถูกต้องแล้ว เพราะหน้า history ไม่รันเครื่องมือ) |

---

## 3. ประเมิน "production-grade ไหม?"

### ✅ จุดแข็ง (ระดับ infrastructure)

1. **สถาปัตยกรรมแยกชั้นดี** — tool definition / delegated runtime / persistence / prompts แยกไฟล์ชัด ไม่ใช่ของเล่นในตัวเดียว
2. **ทดสอบจริง** — lifecycle tests ครอบคลุม spawn → run → result, hydration ของทีม, tool result schemas ทุกตัว
3. **มี persistence + recovery** — ทีมรอดการปิด/เปิดแชท; mailbox/mission log/outcomes ไม่หาย
4. **bounded ทุกจุด** — `TEAM_AWAIT_TIMEOUT_MS`, preview limits, `maxIterations` ต่อ agent, per-call output caps
5. **ใช้งานใน production surface อื่นแล้ว** — cron-runner (scheduled automation) เปิด teams เป็นค่าเริ่มต้น

### ⚠️ ข้อจำกัด / ความเสี่ยง (ต้องรู้ก่อนใช้หนัก)

1. **ทำงานใน process เดียว** — sub-agent/teammate ทุกตัวรันใน extension host ของ VS Code เอง ไม่ใช่ VM/เครื่องแยก: ขนานได้จริง (หลาย agent loop สลับกัน) แต่แย่ง CPU/หน่วยความจำเครื่องเดียวกัน และ extension host ล่ม = ทั้งทีมหลุด
2. **ต้นทุน token คูณจำนวน agent** — ทุก agent มี context ของตัวเอง; ทีม 3-4 ตัวบนโมเดลแพงอาจเผาเครดิตเร็วมาก ไม่มี budget guard ในชั้น VS Code
3. **Approval fatigue** — นโยบายปัจจุบันถามทุกเครื่องมือทีม (19 ตัว ไม่มีสวิตช์ auto-approve เฉพาะ): งานทีมหนึ่งรอบอาจถามหลายครั้ง ถ้ารำคาญต้องเปิด YOLO (ซึ่งอนุมัติทุกอย่างรวม `run_commands`) — ยังไม่มีทางกลาง
4. **UI จัดการทีมยังบาง** — เห็นสถานะผ่าน tool rows/mailbox แต่ไม่มีแผงควบคุมทีมโดยเฉพาะ (spawn/shutdown ด้วยมือ, ดู topology, ดู mailbox เป็นตาราง) — ต้องสั่งผ่านแชท
5. **ไม่มี isolation ของสิทธิ์** — teammate/sub-agent ได้เครื่องมือชุดเดียวกับที่ lead กำหนดให้ ไม่มี sandbox เพิ่ม; วางใจได้แค่ระดับ tool policy
6. **Configured agents ผูกกับ provider คงที่** — ระบุ providerId/modelId ต่อไฟล์ได้ แต่ไม่มี failover ถ้า provider นั้นล่ม

### สรุปคะแนน

| มิติ | คะแนน | หมายเหตุ |
|---|---|---|
| ความครบของกลไก (spawn/team/mailbox/outcome/persist) | ★★★★★ | ครบกว่าที่คาดสำหรับ in-IDE |
| ความทนทาน (recovery, bounded, tested) | ★★★★☆ | หักเรื่อง single-process |
| ความปลอดภัย (approval/policy) | ★★★★☆ | ถามเสมอ + YOLO ชัดเจน; ขาด granular allow |
| UX สำหรับผู้ใช้ทั่วไป | ★★★☆☆ | ต้องเข้าใจ concept ทีม; UI ยังบาง |
| พร้อมใช้ในงานจริง | **★★★★☆** | ใช้ได้จริงวันนี้แบบ opt-in — เหมาะกับงานแยกส่วนชัดเจน ไม่เหมาะกับงานที่ต้องคุมต้นทุนเข้ม |

**คำตอบที่ตรงคำถามที่สุด:** "เป็นทีมระดับ Productions เลยมั้ย?" — **กลไกภายในเป็นระดับ production จริง** (ทั้ง persistence, mailbox, outcomes, hydration, timeouts, tests) และตอนนี้เปิดให้ใช้ใน iCline แล้วแบบมีสวิตช์และมีการขออนุมัติ — แต่**ประสบการณ์ใช้งานระดับ product** (แผงจัดการทีม, งบประมาณ token, granular approval) ยังเป็น roadmap ไม่ใช่ของที่มีวันนี้

---

## 4. Roadmap ถ้าจะดันเป็นจุดขาย

1. **แผงจัดการทีม** — topology ของทีม + mailbox viewer + ปุ่ม spawn/shutdown จาก UI (ข้อมูลมีแล้วจาก team state snapshot)
2. **Auto-approve granular สำหรับ team tools** — แยกอ่าน (status/mailbox/list) ออกจากเขียน (spawn/send/run) ใน AutoApproveBar
3. **Budget guard** — จำกัดจำนวน agent ที่ spawn พร้อมกัน และ/หรือเพดาน token ต่อทีมต่อเทิร์น
4. **Telemetry ของทีม** — วัดว่าทีมจบงานเร็วขึ้นกี่เปอร์เซ็นต์เทียบกับต้นทุน token (มี `captureSubagentToggle` แล้ว 1 จุด)
5. **e2e fixture ทีม** — ทีม 2 ตัวร่วมกันเขียนไฟล์คนละไฟล์แบบขนานในหน้าต่าง VS Code จริง
