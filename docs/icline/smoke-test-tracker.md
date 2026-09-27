**Last updated:** 2026-09-26 (⚖️ รอบ auto-approve แยกอ่าน/เขียนของทีม + **budget guard** (agent count/tokens per turn): `5223393e8` + `afee47c18` — teammate เข้าระบบ approval แล้ว (เดิมรันเองโดยไม่ผ่านสวิตช์อะไรเลย) · ค้าง: e2e ทีม 2 agents + แพ็ก `fix.35`) · ก่อนหน้า: 🎛️ รอบแผงจัดการทีม UI — topology + mailbox viewer + ปุ่ม spawn/shutdown + per-agent model picker: `TeamPanel` + `TeamService` gRPC + `TeamMemberSnapshot` ส่งต่อ modelId/providerId · TDD 6 ข้อ · ก่อนหน้า: 🔬 รอบวินิจฉัย smoke fix.31–33 จากประวัติแชทจริง: silent stall · tool `edit` · `text not found` — แก้ครบทั้ง 3 อาการ · ก่อนหน้า: รอบ 4 คำถาม + Agents จัดเต็ม — เคลียร์ mocha ที่ fail ค้าง · ชี้ที่มา `per-call limit` 3 ที่ + แก้ dedupe ให้เช็กสูตรแทนคำว่า limit · เทสต์ขนาน/detach 5 ตัว · ✅ แพ็ก `fix.33` · **เปิด Sub-agents/Agent Teams ใน VS Code** + รายงานประเมิน production) · ก่อนหน้า: รอบปิดงานค้าง — e2e บน `fix.31` · `No replacement performed` · terminal จองคิว · `insert_line` filler · เคลียร์ working tree 23 → 0 · ✅ แพ็ก `fix.32` แล้ว
**Branch:** `feat/upstream-waves-1-2` (จาก main @ `78ebd0923` — รวม dev.5 แล้ว, tag `pre-merge-dev.5`, ยังไม่ push)
**HEAD:** ดู `git log` (ไม่ตรึง hash ไว้ตรงนี้ — มันตกหล่นทุกครั้งที่มี commit เอกสารตามหลัง) · **รอบนี้ปิดงานค้างทั้งหมด: e2e harness ของรอบตรวจ** (`16747c4b7` — `typeIntoWorkbenchInput` ส่งค่าเข้าช่องของ workbench ผ่าน DOM ไม่ใช่ผ่าน focus) · **fix.30** (`ba53500b9` — เพดาน 2,000,000 + atomic write + ข้อความปฏิเสธย่อหน้าเดียว · รวมไฟล์ใหม่ `executors/file-writes.ts` ที่เดิม untracked แต่ถูก import จริง) · **fix.32** (`b7ad3aa81` — จอง terminal ก่อนจ่ายให้คำสั่ง · `0c910a272` — `insert_line` แบบ filler ไม่ทำให้ทั้งคำขอพัง) ⇒ `git status` **สะอาด 0 รายการ** · **fix.24 commit แล้ว** (`183764bf8` — "keep a running task alive when the user leaves its chat") · **fix.25 commit แล้ว** (`5b5d9fbc1` — "recover a tool call the model wrote as plain text") · **fix.26–fix.29 commit แล้ว** (`ab32ff3e1` fix.26 · `8a36a2227` fix.27 · `5ca2eae9b` fix.28 · `24050e7cc` fix.29 · `fa39d8f8a` docs) · **fix.7–fix.25 commit แล้ว ยังไม่ push** (`88ff6028b` fix lifecycle ของวิว · `29c24e71c` e2e ขนาน + fixture auxiliary bar + เทสต์ใหม่ · `af58ebbad`/`8aec05f6c` เอกสาร fix.20 · `8aec05f6c` fix.21 Recent หลายคอลัมน์ + draft รอดการย้ายวิว · `fe3a03a23` + docs `fcbcd2c39` fix.22 · `9dc7aa489` fix.23 · `183764bf8` fix.24 · `5b5d9fbc1` fix.25)
**vsix (ล่าสุดที่มีอยู่):** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.34.vsix` (12,108,524 B @ 2026-09-26T03:04:56Z · 60 files · version ใน VSIX = `0.1.18-dev.6-fix.34` · About = `dev build 6 · fix.34` — ตรวจในไบต์จริงจากใน VSIX เอง (unzip + node สคริปต์ตรวจ 10 ข้อ ผ่านครบ): host bundle (`extension/dist/extension.js` · sha1 ตรงกับ dist ของเครื่องเป๊ะ) มี **ตาราง alias ของ tool name** (`codebase_search` = หลักฐานว่า llms dist ถูก rebuild — รอบแรกแพ็กแล้วหลุดเพราะ `@cline/llms` resolve ผ่าน dist เก่า ต้อง `bun run build` ใน `sdk/packages/llms` ก่อน ซ้ำรอย fix.28) · **notice 3 ตัวของ silent stall** (`(empty response)` + สตริงไทยที่ esbuild escape เป็น `\u0E..` ตัวพิมพ์ใหญ่ ครบ 2 ตัว + `the previous turn ended unexpectedly`) · `Agent teams are not active for this session` ×2 (team control) · `No replacement performed: text not found in` ×2 (core + mirror) · สูตร `includes("first chunk")` ×1 และ `includes("per-call limit")` = 0 · ของเก่ายังครบ (`Tool approval required (not auto-approved)`) · webview (`webview-ui/build/assets/index.js`) มี `dev build 6 · fix.34` ตัวเดียว · core/shared/llms ทั้งสามถูก build ก่อนแพ็ก · สคริปต์คืน `package.json`/`build-metadata.ts` แล้ว (recover `.build-metadata.wip.bak` ค้างอีกรอบ) · ทดสอบรอบนี้: core team/orchestration 311 ข้อ (ยกเว้น 2 ของ `runtime-builder.test.ts` ที่ล้มอยู่ก่อนแล้วจากสภาพแวดล้อม) · app vitest **1026/1026** · webview ไม่เปลี่ยน · `check-types` ทั้ง core และ app = 0 error) · ⏳ รอ maintainer smoke · **ใช้ตัวนี้ smoke: (ก) silent stall — รันคำสั่งยาว/ปล่อยค้าง 10 นาที ⇒ ต้องเห็นแถวแจ้ง "ยังไม่มีความคืบหน้า" · ปิด/เปิด VS Code กลางเทิร์นที่ค้างเครื่องมือ ⇒ ต้องเห็นแถว "previous turn ended unexpectedly" · ถ้าโมเดลตอบว่างต้องเห็นแถว empty response (ข) tool alias — ให้โมเดลอ่อนแก้ไฟล์ ถ้ามันเรียก `edit`/`bash`/`read` ต้องรันเป็น `editor`/`run_commands`/`read_files` ไม่มี `AI_NoSuchToolError` (ค) text not found — แก้ไฟล์ด้วย old_text ที่ต่างแค่ช่องว่างท้ายบรรทัด/ขึ้นบรรทัดใหม่ท้ายไฟล์ ⇒ ต้องแทนที่ได้ (ง) ของเดิม fix.31–33 ยังผ่านครบ + label About = `dev build 6 · fix.34`** · งานค้างรอบถัดไป: **แผงจัดการทีม UI** (ชั้น core พร้อมแล้ว `34875011b` — `getTeamControl` state/spawn/shutdown + per-agent model ใน spec) + auto-approve แยกอ่าน/เขียน + budget guard + e2e ทีม 2 agents · ของเดิม: `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.33.vsix` (12,101,782 B @ 2026-09-25T11:11:33Z · 60 files · version ใน VSIX = `0.1.18-dev.6-fix.33` · About = `dev build 6 · fix.33` — ตรวจในไบต์จริงจากใน VSIX เอง: host bundle มี **การเช็กสูตรแทนการเช็กคำว่า `per-call limit`** (`includes("first chunk")` และ **ไม่มี** `includes("per-call limit")` เหลือ = 0) · สูตร `Do not re-send the oversized call unchanged` ×2 (core + guardrails) · `nothing will be written` ×2 (mirror) · ของ fix.32 ยังอยู่ครบ (`i.busy=!0` · `Tool approval required (not auto-approved)`) · webview มี `dev build 6 · fix.33` ตัวเดียว ไม่มี fix.30–32 หลงเหลือ · core ไม่เปลี่ยนรอบนี้ ⇒ ไม่ต้อง rebuild core dist · สคริปต์คืน `package.json`/`build-metadata.ts` แล้ว (recover `.build-metadata.wip.bak` ค้างอีกแล้ว) ไม่มี `.wip.bak` ตกค้าง · **รอบนี้ mocha ทั้งชุด 211/211 ผ่าน** (plus-button ที่ fail ค้างเคลียร์แล้ว + เทสต์ขนาน/detach ใหม่ 5 ตัว · `getOpenTabs` flake ตอนโหลดเต็ม ผ่าน 4/4 เดี่ยว) · vitest `src/sdk`+`src/icline` 934/934 · `check-types` 0 error) · ⏳ รอ maintainer smoke · **ใช้ตัวนี้ smoke: ของ fix.32 ทั้งหมด (ก)(ข)(ค) + (ง) คำสั่งที่โมเดลเขียนผิดขนาด ⇒ ต้องเห็นสูตรส่งใหม่ครบและข้อความปฏิเสธไม่ซ้ำสองย่อหน้า · ตรวจ label About = `dev build 6 · fix.33`** · ผล smoke ของ fix.31/32 จะรวมกับ fix ถัด ๆ ไปตามที่ตกลง · ของเดิม: `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.32.vsix` (11,985,372 B @ 2026-09-25T09:50:18Z · 60 files · version ใน VSIX = `0.1.18-dev.6-fix.32` · About = `dev build 6 · fix.32` — ตรวจในไบต์จริง **จากใน VSIX เอง** (unzip แล้ว grep): host bundle (`extension/dist/extension.js`) มี **การจอง terminal ตอนจ่ายออก** ตรง ๆ — `Found matching terminal ${i.id} in correct cwd\`),this.terminalIds.add(i.id),i.busy=!0,i;` · **guard ของ `insert_line` 2 ที่** (`==null||t===0?void 0:t` — ตัวหนึ่งมาจาก core dist อีกตัวคือ mirror ใน preview) · และสตริงของรอบก่อนยังครบ (`Summarizer rejected the credentials` · `Agentic compaction returned no result` · `Tool approval required (not auto-approved)` · `context_usage` ×5 · `per-call limit` ×3) · webview (`extension/webview-ui/build/assets/index.js`) มี `dev build 6 · fix.32` และ **ไม่มี `fix.31` หลงเหลือ** · core `bun run build` (รวม `verify-runtime-build-id`) รัน **ก่อน** แพ็ก เพราะรอบนี้ core เปลี่ยน (`schemas.ts`/`definitions.ts`/`executors/editor.ts`) ⇒ ยืนยันใน `sdk/packages/core/dist/index.js` + `hub/index.js` ว่ามี `==null||$===0?void 0:$` · สคริปต์คืน `package.json`/`build-metadata.ts` แล้ว ไม่มี `.wip.bak` ตกค้าง (รอบนี้สคริปต์ recover `.build-metadata.wip.bak` ค้างจากรอบก่อนแล้วเก็บกวาดให้)) · ⏳ รอ maintainer smoke · **ใช้ตัวนี้ smoke: (ก) ให้ agent ทำงานที่ต้องยิงหลายคำสั่งพร้อมกัน เช่น "ตรวจ git status + git log + git remote -v แล้วสรุป" ⇒ ต้องไม่มีคำสั่งถูกเขียนปน/ถูกตัดกลาง และไม่มีคำสั่งค้าง · ตรวจ log: ต้องไม่เห็น `Running command on terminal N: "…"` หลายบรรทัดในมิลลิวินาทีเดียวกันอีก (ข) ให้ agent แก้ไฟล์ที่มีอยู่ ⇒ ต้องไม่มี `Invalid insert_line: 0` อีก (ค) ตรวจของเดิมของ fix.31 ให้ยังผ่าน: context เกิน 90% → agentic summary ไม่ใช่ basic และไม่มี 401 · `/compact` → แถบลดทันทีและยังถูกหลังเปิดแชทใหม่ · YOLO → commands ไม่ถาม** · ของเดิม: `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.31.vsix` (11,984,890 B @ 2026-09-25T09:05:15Z · 60 files · version ใน VSIX = `0.1.18-dev.6-fix.31` · About = `dev build 6 · fix.31` — ตรวจในไบต์จริง **จากใน VSIX เอง**: host bundle (`extension/dist/extension.js`) มี `Summarizer rejected the credentials` · `Agentic compaction returned no result` · `Tool approval required (not auto-approved)` · `context_usage` ×5 · `onAuthError` ×6 และ **การ assignment ที่เป็นรากของ OAuth ตรง ๆ**: `n?.apiKey&&(e.config.providerConfig&&(e.config.providerConfig.apiKey=n.apiKey),e.config.apiKey!==n.apiKey&&…` (ตามด้วย throw `re-authentication.` ด้านหน้า) · webview (`extension/webview-ui/build/assets/index.js`) มี `dev build 6 · fix.31` และ **ไม่มี `fix.30` หลงเหลือ** · สคริปต์คืน `package.json`/`build-metadata.ts` แล้ว ไม่มี `.wip.bak` ตกค้าง) · ⏳ รอ maintainer smoke · **ใช้ตัวนี้ smoke: (ก) แชทที่ context เกิน 90% → ต้องได้ agentic summary ไม่ใช่ basic และไม่มี 401 ใน output · (ข) กด `/compact` → แถบ context ต้องลดทันที และยังถูกต้องหลังปิด/เปิดแชทใหม่ · (ค) เปิด YOLO แล้วใช้ commands → ต้องไม่ถาม · (ง) ถ้ามีการถาม ให้เก็บบรรทัด `Tool approval required (not auto-approved): tool=…`** · ของเดิม: `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.30.vsix` (11,983,078 B @ 2026-09-24T05:38:42Z · 60 files · version ใน VSIX = `0.1.18-dev.6-fix.30` · About = `dev build 6 · fix.30` — ตรวจในไบต์จริง **จากใน VSIX เอง**: host bundle (`extension.js`) มี `.icline-tmp` · `2e6`+`2000000` (เพดานเซฟตี้ 2,000,000) · `per-call limit` 3 ที่ · `Write it in chunks` · `The call carried` (fallback ของ hooks-adapter) · overlay ใหม่ `any realistic size fits in one` + `do not shrink a file to fit a per-call budget` และ **`up to ~` = 0** (ไม่มีตัวเลขเพดานใน prompt) · webview (`webview-ui/build/assets/index.js`) มี `dev build 6 · fix.30` และไม่มี `fix.29` หลงเหลือ · **e2e ทั้งชุด 18/18 (2.6m) + target spec 3/3 รันบนไบต์ของ VSIX นี้** (copy ทับ `dist/e2e.vsix` ก่อนรัน เพราะ helper ติดตั้ง path นั้นตายตัว) — สคริปต์คืน `package.json`/`build-metadata.ts` แล้ว ไม่มี `.wip.bak` ตกค้าง) · ⏳ รอ maintainer smoke · **ใช้ตัวนี้ smoke: (ก) ถาม Space-Bunny-Alpha-Free ด้วยคำถามแนะนำตัวชุดเดิม แล้วสั่งเขียนไฟล์ 40–100KB ⇒ ต้องเขียนทีเดียว ไม่มี `Editor input too large` และไม่มีย่อหน้าแจ้งเพดานซ้ำ 2 ชุด (ข) overlay ใหม่ไม่มีเลข 32,000 อยู่เลย — ห้ามเห็นโมเดลฉีก/หดไฟล์ตามตัวเลข (ค) `apply_patch` เขียน atomic แล้ว: patch หลายไฟล์ที่ล้มกลางทางต้องไม่ทิ้งไฟล์ครึ่ง ๆ กลาง ๆ** · **ห้ามใช้ `fix.29` หรือก่อนหน้า smoke เรื่องเพดาน editor/atomic write/ข้อความซ้ำ** (ยังปฏิเสธ `new_text` >32,000 · ยังเขียนตรงไม่ใช่ temp+rename · ยังเติมคำอธิบายซ้ำ 2 ย่อหน้า) · ของเดิม: `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.29.vsix` (11,978,365 B @ 2026-09-21T03:13:03Z · repack หลังล้าง `/**` ซ้ำในคอมเมนต์ ⇒ byte size เท่าเดิม · 60 files · version ใน VSIX = `0.1.18-dev.6-fix.29` · About = `dev build 6 · fix.29` — ตรวจในไบต์จริง **จากใน VSIX เอง**: webview bundle (`index.js`) มี `dev build 6 · fix.29` และ **รูปของกฎตำแหน่งที่ถูกถอน** ตรง ๆ: `A6=236,XE=4,y3e=320,pgt=38,GUi=6,HUi=10` (ค่าคงที่ mock ครบ **โดยไม่มี 180**) · `function jUi(e){const t=e.rowTop-e.pickerTop-GUi,i=e.pickerHeight-e.panelHeight-HUi;return Math.max(pgt,Math.min(t,i))}` = `top = max(38, min(rowTop − pickerTop − 6, pickerHeight − panelHeight − 10))` และจุดใช้แผงเป็น `maxHeight:y3e` (= 320 ค่าคงที่) · **e2e 6/6 รันบน VSIX นี้** (host bundle ไม่เปลี่ยนในรอบนี้) — สคริปต์ `scripts/package-vsix-wip.mjs` คืน `package.json`/`build-metadata.ts` แล้ว ไม่มี `.wip.bak` ตกค้าง) · ⏳ รอ maintainer smoke · **ใช้ตัวนี้ smoke: hover แถวล่าง ๆ ของรายการโมเดล ⇒ แผง Options ต้องขยายเต็ม ไม่มี scrollbar และไม่ห้อยทับช่องแชท · กด Thinking on/off ในแผง ⇒ หัวแผงต้องไม่ขยับ (ขอบล่างขยับได้) ** · ของเดิม: `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.28.vsix` (11,978,540 B @ 2026-09-21T02:08:28Z · 60 files · version ใน VSIX = `0.1.18-dev.6-fix.28` · About = `dev build 6 · fix.28` — ตรวจในไบต์จริง **จากใน VSIX เอง**: host bundle (`extension.js`) มี `Provider stream idle timeout` · `stream produced nothing for ` · `STREAM_IDLE_TIMEOUT_MS` · `z-ai/glm-5.3-flash` · `wrote its tool call as text` และ webview bundle (`index.js`) มี `dev build 6 · fix.28` · `No effort options for this model` · `supportedEfforts` · `data-icline-effort-set` · ⚠️ **แพ็กแรกของรอบนี้ (11,978,117 B) ไม่มีสตริงของ watchdog เลย** เพราะ `@cline/llms` ถูก resolve ผ่าน `dist/` ที่สร้างไว้ก่อนหน้า ⇒ **ต้อง `bun run build` ใน `sdk/packages/llms` ทุกครั้งที่แก้ SDK แล้วจึง `bun esbuild.mjs --production` + แพ็ก** — สคริปต์คืน `package.json`/`build-metadata.ts` แล้ว ไม่มี `.wip.bak` ตกค้าง) · ⏳ รอ maintainer smoke · **ใช้ตัวนี้ smoke: (ก) กดThinking on/off ในหน้า Options แล้วแผงต้องไม่กระโดด/ไม่หลุดจากแถวของตัวเอง (ข) ระดับ Effort ต้องเป็นของโมเดลนั้นตลอดการกด (ค) turn ที่ provider เงียบเกิน 2 นาที ต้องจบเป็น error ที่ retry ได้ ไม่ค้าง** · ของเดิม: `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.27.vsix` (11,977,982 B @ 2026-09-21T01:09:40Z · 60 files · version ใน VSIX = `0.1.18-dev.6-fix.27` · About = `dev build 6 · fix.27` — ตรวจในไบต์จริง **จากใน VSIX เอง**: host bundle (`extension.js`) มี `catalog-unknown` · `registry-missing-model` · `no-effort-control` · `agent.tool_calls.recovered_from_text` · `wrote its tool call as text` · `Available tools: ` + ไอดี free route `z-ai/glm-5.3-flash` ของ catalog ที่ฝังมา และ webview bundle (`index.js`) มี `supportedEfforts` · `no-effort-control` · `overflow-y-auto overflow-x-hidden` · `dev build 6 · fix.27` · สคริปต์คืน `package.json`/`build-metadata.ts` แล้ว ไม่มี `.wip.bak` ตกค้าง) · ⏳ รอ maintainer smoke · **ต้องใช้ตัวนี้ smoke ทั้งเรื่อง "GLM 5.3 Flash เพี้ยน" และ "GLM ตั้งค่า Thinking/Effort ได้หรือเปล่า"** (fix.26 ยังไม่รู้จักสำเนียง element form และยังไม่มี metadata ของ free route — ดูหัวข้อ fix.27) · ของเดิม: `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.26.vsix` (11,976,794 B @ 2026-09-20T22:35:39Z · 60 files · version ใน VSIX = `0.1.18-dev.6-fix.26` — ตรวจในไบต์จริง **จากใน VSIX เอง**: host bundle มี `wrote its tool call as text` · `agent.tool_calls.recovered_from_text` และ webview bundle มี `overflow-y-auto overflow-x-hidden` 2 ที่ · สคริปต์คืน `package.json`/`build-metadata.ts` แล้ว ไม่มี `.wip.bak` ตกค้าง) · ⏳ รอ maintainer smoke · ของเดิม: `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.25.vsix` (11,975,751 B @ 2026-09-20T15:45:00Z · 60 files · version ใน VSIX = `0.1.18-dev.6-fix.25` · About = `dev build 6 · fix.25` — ตรวจในไบต์จริง **จากใน VSIX เอง**: host bundle มี `Available tools: ` · `Unknown tool: ` · `function_calls` · `parameter|param` · `antml_invoke` (ตัวแกะ tool call ที่โมเดลเขียนเป็นข้อความ) และ webview bundle มี `dev build 6 · fix.25` · สคริปต์คืน `package.json`/`build-metadata.ts` แล้ว ไม่มี `.wip.bak` ตกค้าง) · ⏳ รอ maintainer smoke · **แชทที่ "ทำงานไม่ได้เลย" ของ fix.24 (GLM 5.3 Flash) ต้องใช้ตัวนี้ — รากอยู่ที่ runtime ไม่ใช่ที่ fix.24** · ของเดิม: `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.24.vsix` (11,974,350 B @ 2026-09-20T14:27:09Z · 60 files · version ใน VSIX = `0.1.18-dev.6-fix.24` · About = `dev build 6 · fix.24` — ตรวจในไบต์จริง **จากใน VSIX เอง** ทั้งสองบนเดิล: host มี `Parked running session` · `kept a working session alive in the background` · `Queued a new task behind the running session` · `Resumed parked task` · `describeBackgroundTask` · `clearTask:idle` และ webview มี `Still working in the background` · `Waiting for your answer` · `Finished in the background` · `your next task waits until you answer it` · `This task finished while you were away` · `history-badge-live` · `data-icline-background-task` · สคริปต์คืน `package.json`/`build-metadata.ts` แล้ว ไม่มี `.wip.bak` ตกค้าง) · ⏳ รอ maintainer smoke · **ห้ามใช้ `fix.23` หรือก่อนหน้า smoke เรื่อง "ออกจากหน้าแชทแล้วงานตาย"** (fix.23 ยังหยุด session ทุกครั้งที่นำทาง) · ของเดิม: `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.23.vsix` (12,089,267 B @ 2026-09-20T13:02:26Z · 60 files · About = `dev build 6 · fix.23` — ตรวจในไบต์จริงแล้วว่ามีเพดานใหม่ `32000` + ข้อความรูปที่ถูกย่อ และสคริปต์คืน `package.json`/`build-metadata.ts` เรียบร้อย)· ⏳ รอ maintainer smoke · **ห้ามใช้ `fix.22` หรือก่อนหน้า smoke เรื่องรูป/ไฟล์ใหญ่** (fix.22 ยังมีกำแพง 6,000 ของ `editor` และยังไม่มีการย่อรูป) · ของเดิม: `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.22.vsix` (12,086,670 B @ 2026-09-20T12:16:30Z · 60 files · About = `dev build 6 · fix.22` — ตรวจแล้วว่าสตริงอยู่ในบันเดิล webview จริง และ host bundle มีโค้ดใหม่ (`nothing new above the cut to fold` · ตัวประเมินรูป) · สคริปต์คืน `package.json`/`build-metadata.ts` แล้ว ไม่มี `.wip.bak` ตกค้าง) — ⏳ รอ maintainer smoke · **ห้ามใช้ `fix.21` (หรือก่อนหน้า) smoke เรื่อง compaction/รูป — ยังมีบั๊กตัวประเมิน และ Recent ยังไม่มีป้ายเวลา** · do not overwrite `fix.1`–`fix.21` ใน `dist/` (fix.20 = 12,084,123 B @ 2026-09-20T09:28:31Z · fix.19 = 11,967,453 B @ 2026-09-20T06:07:27Z · fix.18 = 11,967,298 B @ 2026-09-20 05:36:02Z)

---

## ⚖️ รอบ auto-approve แยกอ่าน/เขียน + budget guard ของทีม (2026-09-26)

**สถานะ:** ✅ เสร็จ 2 งาน · commit `5223393e8` (auto-approve แยกอ่าน/เขียน) + `afee47c18` (budget guard) · ค้างรอบถัดไป: e2e ทีม 2 agents เขียนไฟล์ขนานใน VS Code จริง + แพ็ก `fix.35`

**1) granular team auto-approve (read vs write) `5223393e8`:**
- **จุดที่พบตอนสำรวจ:** teammate config **ไม่มี `toolPolicies`/`requestToolApproval` เลย** ⇒ ทุก tool call ของ teammate (รวม `editor`/`run_commands`) ถูก auto-approve เงียบ ๆ ไม่ผ่านสวิตช์อะไรเลย — ต่างจาก sub-agent ที่มีครบ (ทุกอย่างถามจนกว่าจะติ๊ก)
- **สวิตช์ใหม่ใน AutoApproveBar:** `Team reads` (อ่านไฟล์/search/web + team tools ฝั่งอ่าน: `team_status`/`team_read_mailbox`/`team_list_*`/`team_await_runs`/`team_mission_log`) และ `Team writes` (แก้ไฟล์/คำสั่ง + team tools ฝั่งเขียน: `team_spawn_teammate`/`team_send_message`/`spawn_agent` ฯลฯ) · ค่าเริ่มต้น: reads ผ่าน, writes ถาม
- **กลไก:** shared `ToolApprovalRequest` เพิ่ม `callerKind` ("session"/"teammate"/"subagent") — `buildDelegatedAgentConfig` stamp ให้เองทุก delegated call · guard `isToolAutoApproved` แยกกฎตาม caller: delegated → teamReads/teamWrites, session ของ lead → สวิตช์เดิม (Read/Edit/Commands) ไม่มีทางกว้างขึ้น · team tools แยกอ่าน/เขียนทุก caller · teammate ได้ `toolPolicies`+`requestToolApproval` ของ session แล้ว (thread ผ่าน team-tools → delegated-agent → runtime-builder)
- **เทสต์:** core +3 (callerKind stamp ×2 + policy threading) · app `sdk-tool-policies` +6 (แดง→เขียว) · webview +3 (`useAutoApproveActions` + ACTION_METADATA) · **app 1038/1038 · webview 582/582** (ตอนรันคู่กันมี flake จากโหลดเครื่อง: `providerCatalogHandlers`/`resolveModelInfo`/`sdk-diff-edit-coordinator` — รันเดี่ยวผ่านหมด ไม่ใช่ regression)

**2) budget guard (agent count/tokens per turn) `afee47c18`:**
- **`teamBudget` ใน auto-approve settings** (proto `TeamBudget` + UI "Team budget" ใน AutoApproveModal: Max agents + Tokens per turn, 0 = ไม่จำกัด) · ค่าเริ่มต้น `maxAgents: 4`, `maxTokensPerTurn: 0`
- **agent count:** จำกัดที่ spawn จริง (`spawnTeamTeammate` ใน core โยน `Team budget: agent limit (N) reached`) — ครอบคลุมทั้งเครื่องมือ `team_spawn_teammate` และปุ่ม spawn ในแผง · panel handler เช็ก **ค่า live** ซ้ำ (ลดเพดานกลางเทิร์นแล้วกด spawn ต้องโดนทันที) · teammate ที่ restore จาก persistence ไม่โดนเพดาน (เพดานคุมการ spawn ใหม่ ไม่ใช่ประวัติ)
- **tokens per turn:** ใช้ knob `maxTokensPerTurn` (output tokens ต่อ API call) ของ SDK — thread เป็น per-agent override ใน `buildDelegatedAgentConfig` ทั้ง teammate และ sub-agent (`spawn_agent`)
- **ขอบเขตที่ต้องรู้:** เพดาน agent นับเฉพาะ **teammate** — `spawn_agent` ยังถูกคุมด้วยสวิตช์ Team writes (ถามก่อน spawn) ไม่ใช่เพดานตัวเลข · ค่า budget ถูก snapshot ตอนสร้าง session (การ spawn ใหม่/session ใหม่เห็นค่าใหม่ + panel เช็ก live เฉพาะปุ่ม spawn)
- **เทสต์:** core +5 (เพดาน/inherit/restore-skip) · app handler +1 (live re-check) · webview +1 (`updateTeamBudget`) · handler merge คงค่าเดิมเมื่อ request ไม่ส่งมา

---

## 🎛️ รอบแผงจัดการทีม UI: topology + mailbox + spawn/shutdown + per-agent model (2026-09-26)

**สถานะ:** ✅ เสร็จ (commit: plumbing+core `34875011b` + commit นี้แผง UI ทั้งชิ้น) · ค้างรอบถัดไป: auto-approve แยกอ่าน/เขียนใน AutoApproveBar + budget guard + e2e ทีม 2 agents เขียนไฟล์ขนาน แล้วจึงแพ็ก `fix.35`

**สิ่งที่ทำ:**
- **proto + plumbing:** `apps/vscode/proto/cline/team.proto` (TeamService: `getTeamState`/`spawnTeamMember`/`shutdownTeamMember`) → `bun run protos` สร้าง `src/shared/proto/cline/team.ts` + handler registry (`@core/controller/team/*`) + webview `TeamServiceClient` · `session-host`/`vscode-session-host`/`sdk-session-lifecycle`/`SdkController` ส่งต่อไปยัง team control ของ `ClineCore` (ไม่มี runtime → `Agent teams are not active for this session`)
- **handlers** `src/core/controller/team/*`: map `TeamRuntimeState` → proto — mailbox ใหม่→เก่า cap 50, unread count, `openTasks`/`activeRuns`, `active:false` เมื่อไม่มี runtime; spawn/shutdown คืน `TeamActionResult{ok,error}` เพื่อโชว์ inline · เทสต์ 6 ข้อ
- **webview `TeamPanel`:** การ์ด topology (lead + teammates พร้อม role/status badge + โมเดลของแต่ละ agent), mailbox viewer (ใหม่→เก่า, ข้อความยังไม่อ่านเด่น + ป้ายจำนวน), ฟอร์ม spawn (agent ID + role prompt + **model picker จาก `openRouterModels`** ส่ง `providerId=openrouter`) + ปุ่ม `Shutdown <agent>` ต่อ agent + refresh + poll ทุก 5s · เปิดจากปุ่ม "Agent Teams" ใน Navbar · mount แบบ `WorktreesView` (`showTeamPanel` ใน `ExtensionStateContext`)
- **per-agent model ทะลุถึง topology จริง:** `TeamMemberSnapshot` เพิ่ม `modelId?`/`providerId?` — `spawnTeammate` เก็บค่าจาก config และ `exportState` ส่งออก ⇒ แผงแสดงโมเดลของ agent แต่ละตัวได้ ไม่ใช่เดา (ถ้าไม่เลือก = "Inherits task model")
- **เทสต์ (TDD — เขียนเทสต์แดงก่อนทุกส่วน):** webview `TeamPanel.test.tsx` 6 ข้อ · app team-handlers 6 ข้อ (เพิ่ม assert modelId/providerId passthrough) · core team/orchestration 63 ข้อ · shared 432 · **app vitest 1032/1032 · webview 578/578 · `check-types` app+webview 0 error** · ข้อควรจำ: app resolve types ของ `@cline/shared` ผ่าน dist ⇒ แก้ shared แล้วต้อง `bun run build` ใน `sdk/packages/shared` ก่อน (ของแถมจาก gotcha เดิมตอนแพ็ก)

---

## 🔬 รอบวินิจฉัย smoke fix.31–33: silent stall · tool `edit` · `text not found` (2026-09-26)

**สถานะ:** ✅ เสร็จ 3 อาการ · commit 4 รอบ (`e9ae03a7a` tool alias · `831eddfa5` editor whitespace fallback + mirror · `042aa8f66` silent-stall notices · `34875011b` **team control surface** สำหรับแผงทีม: `getTeamControl` state/spawn/shutdown + per-agent model ใน spawn spec) · ✅ **แพ็ก `fix.34` แล้ว** (รายละเอียด + checklist อยู่ในบรรทัด `vsix`) · ค้างรอบถัดไป: แผงจัดการทีม UI (webview) + auto-approve แยกอ่าน/เขียน + budget guard + e2e ทีม 2 agents

**ที่มา:** ผล smoke fix.31–33 แจ้ง 3 อาการ + เชิญให้ตรวจประวัติแชท iCline เพื่อหาต้นเหตุที่ชัดเจน — ตรวจจาก session `1790257744554_96epx` (3,473 ข้อความ, LLM-Engine project) + `icline-tool-trace.jsonl` + `hooks.jsonl`

**1) `Editor operation failed: No replacement performed: text not found` (ยังมีอยู่บ้าง) — แก้แล้ว `831eddfa5`:** จาก tool trace ตัวจริง: ทุกเคสที่เหลือคือ `old_text` ที่ใกล้เคียงของจริงมากแต่เพี้ยนแค่ **trailing whitespace / ขึ้นบรรทัดใหม่ท้ายไฟล์** (เช่น `oldTextChars=571 / newTextChars=571` ใน `ARCHITECTURE.md`, `3603/3604` ใน `INCIDENTS.md`, และ `test_mini_inference.cu` ที่ผู้ใช้เห็น) ⇒ executor เดิม match แบบ strict (EOL normalize แล้วจาก fix.31 แต่ช่องว่างท้ายบรรทัดยังไม่) ⇒ เพิ่ม **whitespace-insensitive line-window fallback** ใน core `executors/editor.ts` (`findNormalizedLineMatch` — เทียบบรรทัดแบบ right-trim, 1 ตำแหน่ง → แทนที่, หลายตำแหน่ง → ยังแจ้ง `multiple occurrences` เหมือนเดิม, ไม่เจอ → `text not found` เหมือนเดิม) และ **mirror `computeNewEditorContent` ทำ fallback เดียวกัน** (preview กับของจริงต้องตรงกัน) · เทสต์ +4 core · +4 mirror

**2) `AI_NoSuchToolError: Model tried to call unavailable tool 'edit'` — ไม่ใช่เรื่องปกติ ต้องแก้ และแก้แล้ว `e9ae03a7a`:** โมเดล (ชินกับชื่อเครื่องมือของ agent stack อื่น) เรียก `edit` แต่ระบบมี `editor` ⇒ AI SDK โยน `NoSuchToolError` → `repairMalformedToolCall` เดิม **ปฏิเสธทันที** สำหรับ unknown tool name (มี test กำกับไว้) ⇒ โมเดลเห็น error แล้ว retry จนบางทีเขียน `<invoke name="edit">…` เพี้ยนเป็นข้อความ (ภาพที่ 2) ⇒ แก้โดย **rename กลับเป็นชื่อที่ลงทะเบียนไว้**: case-insensitive match + ตาราง alias 保守 (`edit/write/str_replace→editor`, `bash/shell→run_commands`, `read→read_files`, `grep→search_codebase` ฯลฯ) โดย**เปลี่ยนชื่อเฉพาะเมื่อเป้าหมายมีจริงในเครื่องมือที่ลงทะเบียน** (ชื่ออื่นที่ไม่เข้าเคสยัง error เหมือนเดิม) · เทสต์ +4 (unit + integration ผ่าน SSE จำลอง)

**3) Silent stall (น่าหงุดหงิดที่สุด) — วินิจฉัยจากประวัติแล้ว + แก้ visibility ครบ `042aa8f66`:** รูปแบบที่พบในประวัติ:
- **คลาสหลัก (~7 จุด): เทิร์นตายกลางเครื่องมือ** — จุดค้างทุกจุดตรงกับ `tool_result` ที่**หายไปจากประวัติ** (migration เติม `[migration] Tool result missing in legacy conversation history.` 11 ข้อความ ตรงกับจุดที่ผู้ใช้ต้องพิมพ์ "ทบทวนจุดที่ค้าง" / "ติดปัญหาอะไรมั้ย" ทุกจุด) ⇒ เทิร์นหยุดกลางเครื่องมือ (tool card ค้าง) โดยไม่มีการแจ้งอะไรเลย จนผู้ใช้ ping เอง
- **คลาสย่อย: เทิร์นจบแบบไม่มี output** (เช่น หลัง `run_commands` ที่ timeout 1 ชม. ได้ result กลับมา แล้วเงียบ) และ **คลาสปกติที่ไม่ใช่บั๊ก**: จบด้วย `attempt_completion` เพื่อรอผู้ใช้อนุมัติขั้นถัดไป (ผู้ใช้ตอบ "อนุมัติ Task N" — อันนี้ทำงานถูกแล้ว)
- **หลักฐานประกอบ:** `hooks.jsonl` มี `session_shutdown: failed_external_process_exit` (pid 80292 = extension host เก่า) ซ้ำจาก `stale_session_reconciler` — เป็นรอยของการ restart/host ตาย ไม่ใช่สาเหตุตรง ๆ · stream idle watchdog (fix.28) คุม provider เงียบแล้ว แต่ไม่มีใครบอกผู้ใช้เมื่อเทิร์นเงียบ
- **สิ่งที่แก้ (notice 3 จุด):** (ก) **empty-turn notice** — เทิร์น `completed` ที่ไม่มี output/ไม่มี tool call เลย → แถว info "ไม่ได้รับคำตอบจากโมเดล… พิมพ์ 'ทำต่อ'" (ข) **stall watchdog** — เทิร์นที่ไม่มี session event เลย 10 นาที (คำสั่งรันอยู่จะมี output เป็นระยะ) → แถว info แจ้งว่ารันยาวอยู่ก็รอได้ ถ้าค้างให้กด Stop แล้วพิมพ์ 'ทำต่อ' (ค) **interrupted-turn notice ตอน resume** — ประวัติที่จบกลางเครื่องมือ (placeholder) → แถวแจ้งว่าเทิร์นก่อนถูกขัดจังหวะ + ควรตรวจ tool call สุดท้ายก่อนทำต่อ · เทสต์ +9 (`sdk-turn-notices.test.ts`) + อัปเดต loader test

**สิ่งที่ยังไม่ได้แก้ (บันทึกเป็นงานอนาคต):** ต้นเหตุที่ทำให้เทิร์นตายกลางเครื่องมือจริง ๆ (V1) — จากหลักฐานชี้ไปที่คำสั่ง/เครื่องมือที่ค้าง (เช่น `git diff` ติด pager) หรือ host restart กลางเทิร์น; ตอนนี้มี notice บอกแล้ว แต่ถ้าพบอีกให้เก็บ `1-Cline.log` ช่วง stall + ดูว่า notice ตัวไหนโผล่ เพื่อจำกัดวงต่อ

---

## 🧪 รอบ 4 คำถาม: mocha ที่ fail ค้าง · ที่มา `per-call limit` 3 ที่ · เทสต์ขนาน/detach · Sub-agents (2026-09-25)

**สถานะ:** ✅ เสร็จ · commit 5 รอบ (`d13acf5f7` เทสต์ขนาน/detach + เคลียร์ mocha · `bd7fa57d4` เอกสาร · `d67747595` แก้ dedupe ของ rejection recipe · `9be072356` **เปิด Sub-agents/Agent Teams** · + เอกสารรอบนี้) · ✅ **แพ็ก `fix.33` แล้ว** (ก่อนงาน Agents — รายละเอียด + สิ่งที่ต้อง smoke อยู่ในบรรทัด `vsix` ด้านบน) · **งาน Agents/Sub-Agents จัดเต็มเสร็จแล้ว** (สวิตช์ตั้งค่า + wiring + approval + รายงานประเมิน `docs/icline/sub-agents-production-readiness.md`) — รวมกับผล smoke ของ fix.31–32 แล้วแพ็กเป็น **`fix.34`**

**1) mocha ที่ fail 1 ตัว — เคลียร์แล้ว ✅ (ไม่ใช่บั๊กโปรดักต์):** `apps/vscode/src/test/extension.test.ts` "should successfully execute the plus button command" เรียก `cline.plusButtonClicked` ซึ่งเป็นไอดีของ upstream — fork นี้ register เป็น `iCline.plusButtonClicked` ทั้งใน `package.json` contributes และ `registry.ts` (prefix จาก publisher) ตั้งแต่ migration #11632 ⇒ คำสั่งที่เรียกไม่มีอยู่จริง (`command not found`) แก้โดยให้เทสต์ **derive ไอดีจาก `package.json`** (ไม่ hardcode prefix — ทนต่อการเปลี่ยนชื่อ publisher) และ **assert ว่าคำสั่งถูก register ก่อน** execute ⇒ `vscode-test --grep "Cline Extension"` = **4 passing** (ก่อนแก้ 3/4 · รอบ full suite ก่อนหน้า = 207 passing / 1 failing ตัวนี้แหละ)

**2) `per-call limit` ในบันเดิล 3 ที่ (6 ครั้งใน `extension.js`) — ชี้ที่มาครบ + ข้อความที่โมเดลเห็นยังมี "สูตรส่งใหม่" ครบ ✅:**
- **ที่ 1 — core `getEditorSizeError`** (`sdk/packages/core/src/extensions/tools/helpers.ts` · 2 ครั้ง = branch `old_text`/`new_text`): นี่คือ **ข้อความที่โมเดลเห็นจริง** (envelope ของ tool `editor`): `Editor input too large: … above the 2,000,000-character per-call limit; nothing was written. Create the file with a first chunk of at most 32,000 characters, then append the remaining chunks with \`insert_line\` (line_count + 1 appends at EOF). Do not re-send the oversized call unchanged.` ⇒ **สูตรครบถ้วน** และมีเทสต์ยืนยัน (`definitions.test.ts` — "per-call limit" ต้องโผล่ครั้งเดียว + ต้องมีสูตรขนาด 32,000)
- **ที่ 2 — hooks-adapter `describeOversizeInput` + guardrails `getLargeWriteGuidance`** (`apps/vscode/src/sdk/hooks-adapter.ts` · 2 ครั้ง = ข้อความ + literal `includes("per-call limit")` ที่ใช้ dedupe): ข้อความเสริมที่แนบเมื่อ write ล้มบน input ใหญ่โดยข้อความของ tool ไม่ได้บอกเรื่องขนาดเอง — สูตรครบเหมือนกัน (`Write it in chunks: … Do not re-send the oversized call unchanged.`)
- **ที่ 3 — mirror ใน `sdk-diff-edit-coordinator.ts`** (preview · 2 ครั้ง): **ไม่มีสูตร** แต่หลุดไปหาโมเดล **ไม่ได้** — `computeNewEditorContent` throw แล้วถูก `openForApproval`/`executeEditorTool` จับ (log WARN + ข้ามแท็บ preview) เท่านั้น งานเขียนจริงผ่าน executor ตัวจริงของ core ซึ่งตอบ envelope ของที่ 1 (มีสูตร) — ตรวจแล้วทุกเส้นทาง
- **จุดเปราะที่ทราบ (ยังไม่เป็นช่องโหว่):** dedupe ของ hook กดสูตรของตัวเองเมื่อเห็นคำว่า `per-call limit` ในข้อความเดิม — ถ้าอนาคตมีทางที่ข้อความแบบ mirror (มีคำนั้นแต่ไม่มีสูตร) ไปโผล่ที่โมเดล สูตรจะหายไปทั้งสองทาง; ตอนนี้เข้าไม่ถึงเพราะ mirror เป็น preview-only

**3) เทสต์ขนาน/detach เพิ่มแล้ว ✅ (RED ไม่เจอ — behavior ที่ fix ไว้ตั้งแต่ `b7ad3aa81` ยังดี):**
- **mocha `VscodeTerminalManager.test.ts` +3:** lookups ขนานกันจริง (Promise.all) ใน cwd เดียวกัน → คนละ terminal · ขนานกันผ่าน **reuse path** ที่มี `await cd` (หน้าต่าง interleave ที่เคยพลาด) → คนละ terminal · **detach กลางงาน** (Proceed While Running) → terminal ยังถูกจองจนคำสั่งจบ คำสั่งถัดไปต้องได้ตัวใหม่
- **vitest `vscode-run-commands-tool.test.ts` +2:** คำสั่งขนาน 2 ตัวผ่าน manager ตัวเดียว → ได้ terminal คนละ id และ **ผลลัพธ์ไม่ปนกันเลย** แม้ output จะ emit สลับกันบรรทัดต่อบรรทัด · **detach ตัวเดียวกลางงาน** → ผลของอีกตัวสะอาดหมด (ไม่มีบรรทัดของตัวที่ detach ปน ไม่มีข้อความ "still running") และ log ของตัวที่ detach ไม่มีของอีกตัวปน
- ผลรวม: mocha `VscodeTerminalManager` **5 passing** · vitest ไฟล์นั้น **28 passing** · `check-types` 0 error

**4) Sub-agents / ทีม — มีจริงใน SDK และตอนนี้เปิดใช้ใน VS Code ได้แล้ว ✅ (commit `9be072356`):** รายละเอียดสถาปัตยกรรม + ประเมิน production ฉบับเต็มอยู่ที่ **`docs/icline/sub-agents-production-readiness.md`** — สั้น ๆ: core SDK ครบ (spawn_agent ขนานหลาย call, configured agents ใน `.cline/agents`, ทีม 18 tools + mailbox/mission log/outcomes + persistence/hydrate) · รอบนี้เพิ่มสวิตช์ `Sub-agents` + `Agent Teams` (ปิดเป็นค่าเริ่มต้น) ใน Settings → Agent, wiring เข้า session factory, rebuild session เมื่อสลับสวิตช์, และ **เพิ่ม `spawn_agent` + `team_*` ทั้ง 19 ตัวเข้า policy map** (เดิม SDK auto-approve เครื่องมือที่ไม่ได้ลิสต์ — ถ้าเปิดฟีเจอร์โดยไม่ปิดจุดนี้ sub-agent จะถูก spawn โดยไม่ถามใครเลย) ⇒ ถาม approval ทุกครั้ง ยกเว้น YOLO · ข้อจำกัดที่ต้องรู้: ทุก agent รันใน process เดียว, ต้นทุน token คูณจำนวน agent, UI จัดการทีมยังบาง (ดูรายงานฉบับเต็ม)

---

## 🧹 รอบปิดงานค้าง: e2e บน `fix.31` · ต้นเหตุ `No replacement performed` · terminal จองคิว · working tree = 0 (2026-09-25)

**สถานะ:** ✅ เสร็จ · commit 4 รอบ (`16747c4b7` e2e harness · `ba53500b9` fix.30 · `b7ad3aa81` terminal · `0c910a272` insert_line) + เอกสารรอบนี้ · **working tree สะอาด** (จาก 22 รายการที่ค้าง + 1 stackdump = 0) · ✅ **แพ็ก `fix.32` แล้ว** — รอบนี้ core เปลี่ยนด้วย ⇒ `bun run build` ใน `sdk/packages/core` ก่อน แล้วจึง `package-vsix-wip.mjs --fix 32` (รายละเอียด + สิ่งที่ต้อง smoke อยู่ในบรรทัด `vsix` ด้านบน)

**ที่มา:** 4 คำขอ — (ก) รัน e2e ทั้งชุดบน `fix.31` และแยก failure ใหม่ vs ของเดิม · (ข) หาต้นเหตุ `Editor operation failed: No replacement performed: text not found` ที่ชั้น executor · (ค) สงสัยว่าคิว terminal เกี่ยวกับการสะดุดของคำสั่งหรือไม่ · (ง) ตรวจ working tree ที่เหลือ 22 รายการว่าค้างอะไร

**e2e ทั้งชุดบนไบต์ `fix.31`:** **17 passed / 1 flaky** (`composer-status-options.test.ts:142` — ล้มด้วย `[data-icline-model-trigger]` ไม่ visible แล้ว**ผ่านตอน retry #1**) · รันไฟล์นั้นเดี่ยว ๆ แบบ `E2E_WORKERS=1` ⇒ **3/3 ผ่าน** ⇒ เป็น flake จาก worker parallelism **ไม่ใช่ regression** · ไม่มี failure ที่เป็นของรอบนี้ · ขนาดชุด 18 tests / 3 workers / 3.3m

**ต้นเหตุ `No replacement performed` (แยก 3 ชั้นจาก log จริง 222 บรรทัด):**
- **191/222 = ชั้น preview เท่านั้น** — `[SdkDiffEditCoordinator] Failed to show auto-approve preview: … text not found in …` (WARN) แล้ว **executor เขียนสำเร็จ** ⇒ เป็น false alarm ล้วน (ไฟล์เป้าหมายทั้งหมดเป็น **CRLF** และ `old_text` ของโมเดลเป็น LF — ยืนยันด้วย `file` ว่า `todo.md`/`plan.md`/`README.md`/`PROJECT_STATE.md`/`test_attention.cu` เป็น CRLF ทั้งหมด) ⇒ **นี่คือข้อความที่ผู้ใช้เห็น และ fix.31 แก้แล้ว**
- **7 ครั้งถึงโมเดล** (ผ่าน guardrail `editor returned a failure envelope…`) — ตรวจทุกเคสแล้ว **preview ล้มพร้อม executor ในมิลลิวินาทีเดียวกันทั้ง 7** ⇒ preview เป็นกระจกที่ซื่อตรง (ไม่มี divergence) และเมื่อมันเตือน executor จะล้มจริง · ⇒ เคสเหล่านี้ `old_text` ของโมเดล**ไม่มีอยู่จริง**ในไฟล์ (ไม่ใช่ EOL เพราะ executor normalize EOL อยู่แล้ว และไม่ใช่ไฟล์หาย) · **ไม่มีเทิร์นไหนตายจากเรื่องนี้** — `task.provider_api_error` ทั้งไฟล์มี 6 ครั้ง (4 = OAuth 401 · 1 = text not found · 1 = `insert_line: 0`) และ log แสดงว่า agent เรียกโมเดลต่อทันที (retry) ⇒ **ไม่ใช่ทางตัน**
- **สิ่งที่พบเพิ่มโดยไม่ได้ขอ:** `Invalid insert_line: 0` เกิด **11 ครั้ง** (เป็นสาเหตุเทิร์นตาย 1 ใน 2 ของกลุ่มนี้) — โมเดลส่ง 0 ซ้ำ ๆ ⇒ คำอธิบาย `insert_line` ใน schema ควรตรวจ (บันทึกเป็นงานอนาคต ยังไม่แก้)

**บั๊ก terminal (รากจริง — ตอบคำถาม (ค) ว่า "ใช่")**: `getOrCreateTerminal` **ไม่จอง** terminal ตอนจ่ายออก (path ที่ match cwd ไม่ตั้ง `busy = true` เลย · path reuse ตั้งแล้ว**ล้างทิ้งใน `finally`** ⇒ กลับไปว่างตั้งแต่ยังไม่ทันส่งคำสั่ง) และ `runCommand` **ไม่เช็ค `busy`** — มันแค่ log แล้วเขียนทับ (`processes.set(id, …)` ทิ้ง process ของคำสั่งก่อนหน้า)
- **หลักฐานจาก log**: terminal 19 ถูกจ่ายให้ **3 คำสั่งใน 1 มิลลิวินาที** (`09:13:08.752–.753`) — `Get-CimInstance …` → `git status --porcelain=v1` → `git log -2 …` โดยคำสั่งที่ 2 และ 3 log ว่า `busy state before: true` แล้ว**เขียนต่ออยู่ดี** · terminal 32 ก็เป็น 4 คำสั่งในมิลลิวินาทีเดียว
- **ผลที่ผู้ใช้เห็นตรงกัน**: ข้อความคำสั่งถูกเขียนปน/ถูกตัดกลาง (สิ่งที่ Agent รายงานว่า "คิว terminal เก่าทำให้คำสั่งถูกตัดก่อน execute") · output ถูกattribute ผิดคำสั่ง · และ process promise ของคำสั่งแรกไม่ settle ⇒ **คำสั่งที่ดูเหมือนค้าง** (สอดคล้องช่วงสะดุด 9 นาทีของรอบก่อน)
- **แก้ (TDD RED→GREEN)**: จอง terminal ตอนจ่ายออกทั้ง 2 path และปล่อยเมื่อคำสั่งนั้นจบ · RED ยืนยัน 2 เคส (`false !== true` และ "ทั้งสองคำสั่งได้ terminal 1") → **2/2 ผ่าน** · เทสต์เดิมที่ยืนยัน `busy === false` ถูกปรับ **เพราะมันปักพฤติกรรมที่เป็นบั๊กอยู่** (พฤติกรรมที่ตั้งใจใหม่: terminal ที่จ่ายออกไปต้องถูกจองจนกว่าคำสั่งของมันจะจบ)

**บั๊กที่ 2: `insert_line` แบบ filler ทำให้ทั้งคำขอพัง (แก้ในรอบนี้เหมือนกัน)** — จากข้อที่พบเพิ่มข้างบน (`Invalid insert_line: 0` × 11 เป็นสาเหตุเทิร์นตาย 1 ใน 2 ของกลุ่มนี้):
- **สาเหตุ**: `insert_line` เป็นฟิลด์ optional และวิธีที่โมเดล "ปล่อยว่าง" ฟิลด์ optional คือใส่ค่าว่างลงไป — `z.coerce.number().int().nullable().optional()` แปลง `""` · `"   "` · `false` เป็น **0** (พิสูจน์กับ zod 4.4.3 จริงในรีโป) ⇒ executor ปฏิเสธด้วย `Invalid insert_line: 0` · **หลักฐานว่าเป็น filler ไม่ใช่เจตนา**: โมเดลยิงค่าเดิมซ้ำ **11 ครั้งแม้ข้อความบอกชัดว่า "must be positive one-based"** (โมเดลที่ตั้งใจแทรกที่หัวไฟล์จะเขียน 1 หลังถูกบอกครั้งแรก) และโค้ดเองมี precedent เดียวกันนี้แล้วที่ `old_text` (คอมเมนต์: "Models that fill optional params with null hit this repeatedly and tend to re-send the identical call")
- **แก้**: 0 ไม่เคยเป็น boundary แบบ one-based ที่ถูกต้อง ⇒ ตีความเป็น "ไม่ได้ระบุ" — คำขอที่บรรยายการแทนที่อยู่แล้วจึงทำงานได้ (และ preview อ่านฟิลด์เดียวกัน ⇒ ไม่ข้ามแท็บพร้อมเตือนทั้งที่ executor เขียนได้) · **ค่าที่เป็น boundary จริงแต่ใช้ไม่ได้ (ติดลบ) ยังถูกรายงานเหมือนเดิม** พร้อม "ไม่มีอะไรถูกเขียน"
- **TDD**: RED ที่ชั้นจริง 2 ฝั่ง (app: preview โยน `Invalid insert_line: 0` · core: executor ยังได้ค่า 0) → GREEN: core tools **366 ผ่าน / 63 skip** · app `src/sdk` **913 ผ่าน** · เทสต์เดิม `rejects insert_line 0 with the valid one-based boundary range` ถูกแทนด้วยเทสต์พฤติกรรม (เดิมปักบั๊ก) + เทสต์ใหม่ "ติดลบยังถูกปฏิเสธ" + เทสต์ปัก label ของ transcript

**working tree ที่ค้าง 22 รายการ = 2 รอบงานที่เสร็จแล้วแต่ไม่เคย commit** (สาเหตุตามที่ผู้ใช้คาด: รอบก่อนจดว่า "workspace รอบนี้ไม่มี git metadata"):
- **9 รายการ = fix.30** (เพดาน editor 2,000,000 · atomic write · ข้อความเดียว) — เทสต์เขียวครบ (`definitions` 71 · `editor` 17|1skip · `apply-patch` 17|2skip · `hooks-adapter` 16 · `tool-write-pipeline` 9 · `guardrails` 9) · ⚠️ **`executors/file-writes.ts` เป็นไฟล์ใหม่ที่ยัง untracked แต่ถูก `import` จริงจาก `editor.ts` + `apply-patch.ts`** ⇒ ถ้าไม่ commit repo จะพังสำหรับคนอื่น — **นี่คือของตกค้างที่อันตรายที่สุดของทั้งกอง**
- **4 รายการ = e2e harness ของรอบตรวจ** (`utils/common.ts`, `helpers.ts`, `pane.ts`, `README.md`)
- `grep.exe.stackdump` (crash dump ของ ripgrep 1,013 B) — ลบทิ้งแล้ว ไม่ได้ commit

**ผลตรวจ (รันจริง):** app `tsc --noEmit` **0 error** · core `tsc -p tsconfig.dev.json --noEmit` **0 error** · biome ของไฟล์ที่แตะ สะอาด · app vitest กลุ่มที่แตะ **34/34** (`hooks-adapter`/`tool-write-pipeline`/`guardrails`) · core vitest กลุ่ม tools **102 ผ่าน / 3 skip** · `VscodeTerminalManager.test.ts` ผ่าน **2/2** ผ่าน `vscode-test` จริง · e2e **17 passed + 1 flaky(ผ่าน retry)** · `git status --porcelain` = **0**

---

## 🧾 รอบตรวจ compaction / แถบ context / OAuth 401 / auto-approve (2026-09-25)

**สถานะ:** ✅ โค้ด+เทสต์เสร็จ · **commit แล้ว 4 รอบ** (`3da75dbd3` compaction/แถบ context · `86b9dc263` OAuth+YOLO · `39bad83f9` EOL ของ preview · `54610d517` docs) · ✅ **แพ็กเป็น `fix.31` แล้ว** — รอบนี้แก้ host code ทั้งสองฝั่ง (`@cline/core` → `dist` + `apps/vscode/src/sdk`) ดังนั้นก่อนแพ็กได้สั่ง `bun run build` ใน `sdk/packages/core` (รวม `verify-runtime-build-id`) **ก่อน** `package-vsix-wip.mjs --fix 31` ซึ่ง build webview + esbuild host เองอยู่แล้ว (บทเรียน fix.28/fix.30: ห้ามแพ็กจาก `dist/` เก่า — รอบนี้ทำตาม)

**ที่มา:** คำขอ 4 ข้อ (compaction fallback ให้ deterministic · แถบ context ต้องตรงกับค่าที่วัดได้ทั้งทันทีและหลังเปิดแชทใหม่ · เทสต์ long-run สำหรับ reasoning-heavy · สอบสาเหตุ warning `Editor operation failed: No replacement performed: text not found` ในไฟล์ที่มีอยู่จริง) + คำขอตรวจ 2 เรื่องจากแชทที่ใช้อยู่: `Unauthorized: … re-authenticate` และ auto-approve "Execute Commands"/YOLO ที่ยังสะดุด

**แก้ (TDD ทุกข้อ — เขียนเทสต์ให้แดงก่อน แล้วจึงแก้):**
- **fallback ของ agentic compaction แคบลง** — เดิมกันที่ `strategy` คืน `undefined` ซึ่งเป็นอาการเดียวกับ "ข้ามโดยเจตนา" ทั้ง 5 แบบ (transcript สั้น · ไม่มีจุดตัดที่ปลอดภัย · ไม่มีอะไรใหม่ให้ fold · budget ของ summarizer หมด · budget ของ input ล้ม) ⇒ ทับตัวกัน compaction storm ที่จดไว้ตั้งแต่ fix.21 · ตอนนี้ `agentic-compaction.ts` ประกาศเหตุผล (`onDecline`) และ basic fold ถูกใช้เฉพาะ `no_summary_text`
- **แถบ context ใช้ค่าที่วัดได้จริง** — `createContextCompactionPrepareTurn` เขียน `contextUsage` (tokens_before/after + max) ลง sidecar (`context_usage`) · coordinator ใช้ค่านั้นก่อนและถอยไปใช้การประมาณจาก message-count เมื่อไม่มี · อ่านตอนเปิดแชทใหม่ก็ใช้ค่าที่วัดได้ · ประกาศรูปร่างฟิลด์ที่เดียว (เดิมมี 3 ที่จน type ไม่ผ่าน)
- **`computeNewEditorContent` normalize EOL** — preview เทียบ `old_text` แบบ LF กับไฟล์ CRLF ไม่เจอแล้วเตือน "text not found" ทั้งที่ executor เขียนได้ (executor normalize EOL อยู่แล้ว) ⇒ preview ปิดบั๊กที่ชั้น preview **แต่ยังไม่ได้พิสูจน์ว่าเป็นข้อความเดียวกับที่ผู้ใช้เห็น** (ข้อความที่มี `Editor operation failed:` มาจาก `definitions.ts` ที่ห่อ error ของ executor — คนละชั้น) — ยังต้องเก็บ log จริงของเคสนั้น
- **OAuth 401 ที่ summarizer (รากจริง)** — `syncOAuthCredentials` refresh token แล้วอัปเดต `session.config.apiKey` + agent connection แต่ **ไม่แตะ `session.config.providerConfig.apiKey`** ซึ่งเป็นออบเจ็กต์ที่ compaction จับ reference ไว้ตั้งแต่สร้าง session ⇒ summarizer ยิงด้วย token เก่า · แก้ให้ sync ค่านั้นด้วย **และ** ให้ summarizer refresh แล้วลองใหม่ 1 ครั้งก่อนถอยไป basic compaction (`onAuthError` จาก host — กลไกเดียวกับเทิร์นแชท)
- **YOLO / auto-approve** — `buildToolPolicies` ไม่สนค่าตั้งและบังคับ `autoApprove: false` ทุกเครื่องมือ · ไม่มีที่ไหนใน `apps/vscode/src/sdk` อ่าน `yoloModeToggled` และ `createToolPoliciesWithPreset("yolo")` ของ core ถูกเรียก 0 ครั้ง ⇒ YOLO ไม่มีผลเลย · แก้ให้ต่อ YOLO เข้าทั้ง policy map และ live guard (อ่านใหม่ทุกรอบ) · `updateAutoApprovalSettings` post state กลับเสมอ (เดิมทิ้งเงียบเมื่อ version ไม่สูงขึ้น ⇒ ติ๊กแล้วไม่มีผลจนกว่าจะ reload) · เพิ่ม log `Tool approval required (not auto-approved): tool=… policyAutoApprove=…`

**หลักฐานจาก log จริง** (`…\Code\logs\20260925T085606\window1\exthost\…\1-Cline.log`):
- `04:18:51 Agentic compaction summarizer diagnostics {summarizerProviderId:"cline", summarizerModelId:"stealth/space-bunny-alpha", summarizerInputLimit:1000000}` → `04:18:52 [ai-sdk] stream error` → `Agentic compaction failed; falling back to basic compaction {"errorMessage":"Unauthorized: … re-authenticate"}` → `Performed basic compaction` → `utilizationBefore 91.0% → after 15.9%` ⇒ **401 เกิดที่ summarizer จริง** และ fallback เดิมช่วยพยุง session ไว้
- access-token hash เปลี่ยนตลอด (`dc3e2bea → ac641680 → c8372ddb → 4b8c5f35 → 4bfa1861`) แต่ refresh token hash เดิม (`71af1ffc`) ⇒ token ถูก refresh จริง แต่ summarizer ยังใช้ตัวเก่า (ตรงกับรากที่แก้)
- อีก 4 ครั้งเป็น `task.provider_api_error … failurePhase:"streaming"` = เทิร์นแชทปกติ ซึ่งกู้ด้วย `runWithAuthRetry` ได้ ⇒ คนละสาเหตุ
- `07:40:20 task.yolo_mode_toggled {enabled:true}` → `08:03:31 {enabled:false}` ตรงกับที่รายงาน · auto-approve เกิดขึ้น 772 ครั้ง (run_commands 343) ⇒ ใน session นี้ "Execute commands" เปิดอยู่แล้วจึงอนุมัติผ่าน · มีช่วงสะดุด ~9 นาที (`07:58:32 → 08:07:22` ไม่มีอะไรถูกอนุมัติ) ⚠️ **ยังไม่รู้ว่าคำสั่งไหน** เพราะ path ที่ "ถาม" ไม่เคยถูกบันทึก (รอบนี้เพิ่ม log แล้ว ⇒ ครั้งหน้าตอบได้จาก log)

**ผลตรวจ (รันจริง):** core `compaction.test.ts` **78/78** · core `local-runtime-host.test.ts` **89/89** · core `tsc -p tsconfig.dev.json --noEmit` **0 error** · core `bun tsc -p tsconfig.build.json` + `bun run ./bun.mts` สะอาด และ **ยืนยันใน dist จริง** ว่ามี `context_usage` / `contextUsage` / `$.config.providerConfig.apiKey=Q.apiKey` · app `tsc --noEmit` **0 error** (เดิม 7) · app `src/sdk` + `core/controller/state` **909/909** · biome สะอาด · `git diff --check` สะอาด

**ชุด fail ที่ไม่เกี่ยว (environment เท่านั้น — พิสูจน์แล้ว):** `compact-session-script.test.ts` 2 ตัวล้มด้วย `spawnSync bun ENOENT` และ **ผ่าน 2/2 เมื่อใส่ `~/.bun/bin` ใน PATH** · `hook-file-hooks` ล้มเพราะไม่มี python · ที่เหลือ (workspace-manifest / local-provider offline / cron-runner timing / hub server) เป็นฐานเดิม

**ต้อง smoke (หลังแพ็ก):** (ก) แชทที่ context เกิน 90% แล้วเปิด compaction — ต้องได้ agentic summary ไม่ใช่ basic และไม่มี 401 ใน output · (ข) กด `/compact` — แถบ context ต้องลดทันที **และ** ยังลดถูกต้องหลังปิด/เปิดแชทใหม่ · (ค) เปิด YOLO แล้วสั่งงานที่ต้องใช้ commands ⇒ ต้องไม่ถามเลย และใน output ต้องไม่มี `Tool approval required` · (ง) ถ้ามีการถามเกิดขึ้น ให้เก็บบรรทัด `Tool approval required (not auto-approved): tool=…` ส่งกลับ

---

## 🔧 dev.6-fix.30 — เพดานเซฟตี้ `editor` 32,000 → 2,000,000 + atomic write (`editor` & `apply_patch`) + ข้อความปฏิเสธเหลือย่อหน้าเดียว (2026-09-24)

**สถานะ:** ✅ โค้ด+เทสต์+แพ็กเสร็จ · ✅ **commit แล้ว** ในรอบถัดไป (`16747c4b7` e2e harness ของรอบตรวจ + `ba53500b9` รอบนี้ — รอบนั้นจดว่า "workspace ไม่มี git metadata" จึงค้างไว้ใน working tree) · core `bun run build` สะอาด · core tools group **361 ผ่าน / 61 skip / 0 fail** · core `typecheck` + app `check-types` (tsc+compat+webview) + biome ทั้ง 2 packages สะอาด · app vitest full **81 files / 983 ผ่าน / 0 fail** (รวม 2 ตัวที่ flake ก่อนหน้า) · `bun run repro:editor-write` **PASS 8/8** (40,243 และ 2,000,000 ลงทีเดียว · 2,000,001 ถูกปฏิเสธพร้อมสูตรก้อน 32,000 · ไม่มี `.icline-tmp` เหลือ) · e2e **ทั้งชุด 18/18 (2.6m) บนไบต์ของ fix.30 โดยไม่มี retry**

**ที่มา:** แชท smoke จริงของ fix.29 ถูกปฏิเสธด้วย `Editor input too large: new_text was 40243 characters` บนไฟล์ธรรมดา + ข้อความปฏิเสธเดียวกันโผล่ 2 ย่อหน้า (ผิดกฎ 8) — เพดาน 32,000 ยังปฏิเสธไฟล์ที่แชทจริงผลิต และตัวเลขใน overlay ก็ไม่ได้ช่วยให้โมเดล free ทำตาม

**แก้:**
- `EDITOR_INPUT_CHAR_LIMIT` 32,000 → **2,000,000** (เพดานเซฟตี้ — เฉพาะ payload ที่คำตอบเดียวผลิตไม่ได้ ~500k tokens) · ใหม่ `EDITOR_CHUNK_CHAR_LIMIT = 32,000` = ขนาดก้อนที่สูตรกู้สถานะแนะนำเท่านั้น (ไม่บังคับ)
- **atomic write ทุกจุดเขียน** — โมดูลร่วม `executors/file-writes.ts` (`resolveWriteTarget`: realpath กัน symlink + ถ่าย mode → `writeFileAtomic`: temp + rename + cleanup เมื่อล้ม) ใช้ทั้ง `editor` (create/replace/insert) และ `apply_patch` (add/update/move) ⇒ "ล้มเหลว = ไม่มีอะไรถูกเขียน" เป็นความจริงของไฟล์ระบบ รวม patch หลายไฟล์ที่ล้มกลางทาง
- **overlay ไม่มีตัวเลขเพดานใด ๆ** — เทสต์ปักว่าไม่มี `32000`/`up to ~` ใน overlay · `hooks-adapter` ไม่ต่อท้ายเมื่อ envelope มี `per-call limit` แล้ว (ข้อความเดียว) และ fallback ใช้ `getLargeWriteGuidance()` ร่วม
- `sdk-diff-edit-coordinator.computeNewEditorContent` mirror เพดาน → preview ถูกข้ามเมื่อ runtime จะปฏิเสธ · e2e fixture = hard+1020 (2,001,020) + assert ข้อความมาครั้งเดียว · docs: `ui-guidelines` กฎ 8 เขียนใหม่ · CHANGELOG ใหม่
- **เทสต์ใหม่พิสูจน์บน real surface:** `editor.test.ts` +4 (40,243 ทีเดียว · ไม่เหลือ temp · rename ล้มเหลว = ของเดิม byte-for-byte · mode คงเดิม) · `apply-patch.test.ts` +2 (add/update/move ไม่เหลือ temp · rename ล้มเหลว = ทุกเป้าหมายเดิมครบ + ไม่มีไฟล์ใหม่) · `definitions.test.ts` (40,243 ผ่าน executor) · fork: `tool-write-pipeline` (นับ `per-call limit` ได้ 1 ครั้ง) + `hooks-adapter` (ส่งผ่านตรง + fallback) + `guardrails` (overlay ไร้ตัวเลข) + coordinator (preview ข้ามที่เพดาน)

**ชุด fail ที่ไม่เกี่ยว (pre-existing/flake):** core full = ชุดรู้จักจากฐานเดิม (cron-runner · hub/server · workspace-manifest · hook-file · runtime-commands · local-provider offline · runtime-builder MCP) + `bash.test` 2 ตัวที่ **ผ่านเมื่อรันแยก** · app full = catalog 2 ตัว timeout 20s ที่ **ผ่านเมื่อรันแยก** — ไม่มีไฟล์ที่รอบนี้แตะ fail

---

## 🧪 e2e ทั้งชุดรอบ dev.6-fix.29 — เจอ 1 failure ที่ *ไม่ใช่* ของ fix.29 และปิดที่รากของมัน (2026-09-21)

**สถานะ:** ✅ เสร็จ · **ยังไม่ commit** (test-only: `apps/vscode/src/test/e2e/utils/{common,pane,helpers}.ts` + `src/test/e2e/README.md` ∴ **ไม่ต้อง repack VSIX** — โค้ดที่ ship ไม่เปลี่ยนแม้แต่ไบต์) · e2e บน VS Code จริง **18/18 สองรอบติดกัน ไม่มี retry** (2.4m / 2.5m ที่ 3 worker) · สเปกเป้าหมายเดี่ยว **6/6** · `tsc --noEmit -p tsconfig.test.json` สะอาด

**ที่มา:** "Run the full e2e suite against the fix.29 VSIX and fix or report every failure" — ปิดช่องที่หัวข้อ fix.29 เองจดไว้ว่า *"รัน e2e 6 สเปกที่เกี่ยวกับ picker/composer ไม่ได้รันทั้งชุด"*

**เรื่อง "fix.29 VSIX":** ก่อนรันได้คัดลอก `dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.29.vsix` → `dist/e2e.vsix` (harness รัน VS Code ด้วย `--install-extension=dist/e2e.vsix`) · **และไม่ต้องเถียงว่าตกลง VS Code โหลดตัวไหน** เพราะ harness ส่ง **ทั้ง** `--install-extension=dist/e2e.vsix` **และ** `--extensionDevelopmentPath=apps/vscode` ⇒ `md5sum` ของ `extension/dist/extension.js` และ `extension/webview-ui/build/assets/index.js` **ใน VSIX = ของ working tree เป๊ะ ๆ** (ทั้งคู่ build ตอน 15:14 จาก tree ที่ commit) ∴ ไม่ว่ารันตัวไหน คำตอบเดียวกัน · (ข้อสังเกตค้างไว้ ไม่ได้แก้: `--install-extension` ของตัวเองดูซ้ำซ้อน — ไม่มี `extensionDependencies` เลย และบรรทัดนี้มาจาก upstream `791d23899`)

### ผลรัน (ก่อน/หลังแก้)

| รอบ | ผล |
|---|---|
| ทั้งชุด #1 (3 worker) | **18/18 ผ่าน · ไม่มี retry** (2.3m) |
| ทั้งชุด #2 | **17/18** — `secondary-side-bar.test.ts` fail (retry #1 ก็ fail) |
| สเปกนั้นเดี่ยว (`--retries=0 --repeat-each=3`) | **fail 2/3** ⇒ อัตราสูง ไม่ใช่ flake หายาก |
| หลังแก้ · สเปกนั้นเดี่ยว (`--repeat-each=6`) | **6/6 ผ่าน** (22.2s เท่ากันทุกครั้ง) |
| หลังแก้ · ทั้งชุด ×2 | **18/18 ทั้งสองรอบ · ไม่มี retry** (2.4m / 2.5m) |

### Failure — อาการ

`secondary-side-bar.test.ts:86` (`an unsent message should survive the move`): คอมโพเซอร์ของวิวใหม่ต้องมี `"unsent draft that has to survive the move"` แต่ได้ **`"unsent draft that has to survive the move>Move View"`** — คือ **คำที่ fixture พิมพ์เข้า command palette ไปโผล่ในช่องแชท** ต่อท้าย draft พอดีไม่มีตัวคั่น · ตัว draft เอง *รอดการย้าย* (ข้อ 1–3 ของสเปกผ่าน) สิ่งที่เสียคือความสะอาดของข้อความ

### ราก — `fill` ไม่ได้เขียนลง element ที่ locator ชี้ แต่ลง **element ที่ถือ focus**

อ่านจาก Playwright ที่ติดตั้งจริง (`playwright-core@1.61.1` · ฟังก์ชัน `elementHandle.fill`):

```js
const result = await injected.fill(node, value)          // <input type=text>/<textarea> → selectText แล้วคืน "needsinput"
if (result === "needsinput") {
  if (value) await this._page.keyboard.insertText(value) // → CDP Input.insertText
}
```

`injected.fill` คืน `"needsinput"` ให้ `<input type="text">` และ `<textarea>` **ทุกครั้ง** (มันแค่ `selectText`) ∴ การเขียนจริงคือ `keyboard.insertText` → **`Input.insertText` แทรกข้อความลง element ที่ถือ focus อยู่** ไม่ใช่ตัวที่ locator resolve · และ **chat webview แย่ง focus กลับเอง** (คอมโพเซอร์ re-focus เมื่อวิวได้ focus คืน) ∴ `fill` ที่แพ้การแข่งนี้ = ข้อความลง **ช่องแชท**

หลักฐานจากรันจริงตอนติด probe: `[probe palette#1 post-fill] active=IFRAME.webview ready paletteShown=true` — fill จบในจังหวะที่ webview เพิ่งฉวย focus · (สเปกนั้นผ่าน 0/7 ตอนติด probe เพราะ probe ที่สแกน frame ทำให้ timing เลื่อน ⇒ **Heisenbug ยืนยันว่าเป็น race ไม่ใช่ตรรกะ** — เจอได้ด้วยการรันซ้ำ ไม่ใช่ด้วยการอ่านโค้ด)

**ทำไมหลุดมาได้นาน และทำไมเงียบ:** รูปแบบนี้พังแบบไม่มีสัญญาณ — placeholder ยังตรง, palette ยังเปิด, แถวยังคลิกได้ ⇒ สิ่งเดียวที่เสียคือ draft ซึ่งมีแค่ *สเปกเดียวในทั้งชุด* ที่ assert ตรง ๆ · และ comment เดิมของ `pane.ts` เขียนว่า "A real user never sees this (their keystrokes follow the OS focus; ours are addressed to an element)" — **ครึ่งหลังไม่จริงสำหรับ `fill`** ความเชื่อนั้นคือสิ่งที่ซ่อนบั๊กไว้

### สิ่งที่แก้ (test-only)

- **`utils/common.ts` — `typeIntoWorkbenchInput()` (export ใหม่):** เขียนค่าผ่าน DOM ในบริบทของ element เอง — native `value` setter (ไม่ใช่ `box.value =` เพราะ input ที่ framework คุมอยู่จะคิดว่า "ไม่เปลี่ยน" แล้วไม่ยิง change) + `InputEvent("input", {bubbles, inputType:"insertText"})` + `change` แล้วปิดท้ายด้วย **`expect(input).toHaveValue(text)`** ⇒ "ข้อความไปที่อื่น" กลายเป็น fail **ที่ขั้นที่ก่อมัน** ไม่ใช่ไปพังทีหลังที่แถวซึ่งไม่เคยถูก filter เข้ามา
- **`utils/pane.ts`:** `type` = เรียก helper นั้น (โครง `typeInPalette` + `clickRow` เดิมคงไว้ — การ re-open ยังจำเป็น เพราะ palette ยังถูกซ่อนได้)
- **`utils/common.ts` (`toggleNotifications`) + `utils/helpers.ts` (`runCommandPalette`):** จุดที่พิมพ์เข้าช่องของ VS Code แบบเดียวกัน (คำสั่ง `> Toggle Do Not Disturb Mode`) เปลี่ยนมาใช้ helper เดียวกัน · `toggleNotifications` รันอยู่ **ในสเปกนี้เอง** (ก่อนถึงขั้นย้ายวิว) และ **ใน `editor.test.ts`** — คลาสเดียวกันที่เงียบกว่า เพราะไม่มีสเปกไหน assert draft หลังเรียกมัน
- **`src/test/e2e/README.md`:** hazard ข้อ 1 ที่เคยเขียนว่า "queries are written with `fill`" แก้ให้ตรงกับกลไกจริง (พร้อมเหตุผล) — ไม่ปล่อยให้เทคนิคที่ผิดถูกส่งต่อ

**หมายเหตุ:** `utils/helpers.ts` › `runCommandPalette` **ไม่มีใครเรียกเลย** (dead code — grep เจอแต่บรรทัดนิยาม) แก้ไว้กันกับดัก แต่ไม่ได้ลบ เพราะไม่ใช่ขอบเขตของรอบนี้

**จุด smoke:** ไม่มี — รอบนี้ไม่มีการเปลี่ยนพฤติกรรมที่ผู้ใช้เห็น ∴ ยังใช้ `fix.29` VSIX ตัวเดิม smoke

---

## 🧪 dev.6-fix.29 — เอา scrollbar ของแผง Options ออก ให้ขยายเต็มเหมือนเดิม (2026-09-21)

**สถานะ:** ✅ เสร็จ · **ยังไม่ commit** (working tree เดียวกับ fix.26 + fix.27 + fix.28) · webview **570/570** (ชุด placement เขียนใหม่ 6 → 5 ข้อ · `QuickModelPicker`/`RealPopover` เดิมผ่านทั้งหมด) · `tsc -b` สะอาด · biome `--diagnostic-level=error` ไม่มี finding (เหลือ warning เดิม 2: `useExhaustiveDependencies` ของ scroll-pinning + `biome-ignore` ที่ไม่มีผลของ `autoFocus`) · **e2e บน VS Code จริง 6/6**: `quick-picker-hover` 2/2 (สเปกแรกมี assertion ใหม่ = ไม่มี scrollbar บนแถวแรก/แถวที่ 7/แถวล่างสุด + lift rule) · `quick-picker-effort-notice` 1 · `quick-picker-surface` 1 · `composer-status-options` 2 · **แพ็กแล้ว:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.29.vsix`

**ที่มา (maintainer):** smoke `fix.28` — "เรื่องหน้า Options กระโดดไปมา ตอนกดเปิด-ปิด Thinking ทดสอบกับ GLM 5.3 flash และโมเดลอื่นดูแล้ว **ไม่กระโดดแล้ว** แต่วิธีหนึ่งที่คุณแก้ไขโดยการใส่ Scrollbar ให้กับ Options ของรายการโมเดลอยู่ด้านล่าง มันไม่โอเคเลยครับ และเหมือนจะแก้ปัญหาไม่ตรงจุด เพราะดูเหมือนคุณจะไปโฟกัสแค่ว่าอยากให้มันตรงกับรายการโมเดล เลยพยายามใส่ scrollbar เพื่อไม่ให้ส่วนหัวของ Options ขยับ ซึ่งมันผิดจุดประสงค์ครับ เพราะอาการกระโดดที่มันเกิดขึ้นและแก้ไขไปแล้วนั้นคือ **มันกระโดดไปทั้งหน้า** ... ดังนั้นควร **เอา scrollbar ออก แล้วขยายให้เต็มเหมือนเดิม**"

**อ่านให้ตรง (จุดที่ fix.28 พลาด):** อาการที่ต้องแก้คือ "แผงทั้งใบขยับ" ⇒ ต้องแก้ที่ **`top` ห้ามมาจากเนื้อหา** ไม่ใช่ที่ "ความสูงต้องถูกตัด" · fix.28 ทำสองอย่างพร้อมกัน จึงได้อย่างหนึ่งและเสียอีกอย่าง: **การ clamp `maxHeight` ด้วยที่ว่างใต้แถว** คือสิ่งที่ทำให้แถวล่างได้ scrollbar แทนแผงเต็มใบ · รอบนี้ **เก็บครึ่งแรกไว้ และถอนครึ่งที่สอง**

### สิ่งที่แก้ (ถอนเฉพาะครึ่งที่สอง)

- **`quickModelPickerList.ts`:** `computeOptionsPanelPlacement` → กลับเป็น **`computeOptionsPanelTop({rowTop, pickerTop, pickerHeight, panelHeight})`** โดย `panelHeight` **กลับมาเป็น input** ⇒ แผงถูกยกขึ้นเท่าที่ความสูงของตัวเองต้องการ (ขอบล่างวางบน margin 10px ของ picker) แล้ว `maxHeight` จึงกลับไปเป็น **320 ค่าคงที่ของ mock** (ใช้ที่ JSX ตรง ๆ) ⇒ **ไม่มีอะไรให้ scroll**
- **`QuickModelPicker.tsx`:** layout effect **วัดความสูงอีกครั้ง — แต่ deps ยังเป็น `[hoveredModel]` เท่านั้น** · **นี่คือตัวที่กันการกระโดด ไม่ใช่การ clamp** (ของก่อน fix.28 มี `statusBump` อยู่ใน deps ⇒ ทุกการเขียน thinking/effort ทำให้ remeasure ⇒ ยกแผงใหม่ ⇒ กระโดด) · **ลบ state `statusBump` ทิ้งทั้งตัว** เพราะไม่มีผู้อ่านเหลือแล้ว
- **ถอนสิ่งที่เป็นเศษของความคิดเดิม:** `OPTIONS_PANEL_MIN_VISIBLE_HEIGHT_PX` (180) และ interface `OptionsPanelPlacement` ถูกลบ — ตัวเลข 180 มีอยู่เพื่อบอก "ต้องเหลือที่ให้แผงอย่างน้อยเท่านี้" ซึ่งเป็นข้อสมมติที่รอบนี้ถอน

### สิ่งที่ pin ไว้ (กันคนละครึ่งกลับมา)

- **unit (`quickModelPickerList.test.ts`):** ยกแถวล่าง **เท่าที่ความสูงของตัวเองต้องการ** (panel 260 ⇒ top 234 · 210 ⇒ 284) · **ไม่ใช่ 320** (regression fix.9 = 174 สำหรับทุกแถว) · แถวที่ยังมีที่ก็ตามแถว (row 311 ⇒ 305) · property: ทุกความสูงที่โมเดลวาดได้ (140/210/260/320) × ทุกความสูงแถว (60…999) ⇒ `top ≥ 38` และ **`top + panelHeight + 10 ≤ pickerHeight`** (แผงทั้งใบอยู่ใน picker เสมอ)
- **e2e `quick-picker-hover.test.ts`:**สเปกแรกอ่าน `scrollHeight`/`clientHeight` ของแผงจาก DOM จริงแล้วบังคับ **`scrollHeight ≤ clientHeight + 1`** ทั้งแถวแรก แถวที่ 7 และ **แถวล่างสุดที่มองเห็น** (คำขอของ maintainer ตรง ๆ — "scrollbar ในแผงนี้คือบั๊ก") · บังคับว่า `top` **ไม่ต่ำกว่า** anchor ของแถวตัวเอง (ยกได้อย่างเดียว) และสำหรับแถวล่างสุด `top + panelHeight ≤ pickerHeight − 10 + 1.5` ⇒ ยกให้พอดี ไม่ให้ห้อยทับ composer
- **สเปกที่สอง (คลิกสวิตช์จริง) ยังบังคับ `moved ≤ 1.5px`** ⇒ **ถ้าใครเอาความสูงกลับไปเป็น input ของ `top` หรือเอา `statusBump` กลับเข้า deps เทสต์นี้จะ fail** — และ e2e รอบนี้รันบน webview ที่ build จาก working tree นี้จริง (`dist/e2e.vsix` แพ็กใหม่ก่อนรัน)

### ลักษณะที่ยอมรับได้ (พูดตรง ๆ)

หลังวางแผงแล้ว ถ้าเนื้อหาเปลี่ยน (notice ของ clamp โผล่/หายตอนกดสวิตช์) แผงจะ **โต/หดจาก top เดิม** ⇒ ขอบล่างอาจห้อยเกินขอบล่างของ picker ได้เท่าที่เนื้อหาโต (สิบ px) — เป็นราคาที่เลือกจ่ายแทน scrollbar ตามที่ maintainer สั่ง · และถ้าเนื้อหาสูงเกิน 320 (ค่า mock) ยัง scroll เหมือนก่อน fix.28 ครับ

**การตรวจ VSIX (บทเรียน fix.28 เรื่องการ grep สตริง):** รอบนี้เป็น UI geometry ล้วน **ไม่มีข้อความใหม่** ⇒ การ grep ข้อความใช้ไม่ได้ · ตรวจ **ตัวโค้ดที่คอมไพล์แล้ว** แทน — ใน `index.js` ของ VSIX นี้: ค่าคงที่ mock ยังครบ (`A6=236,XE=4,y3e=320,pgt=38,GUi=6,HUi=10`) **แต่ไม่มี 180** และฟังก์ชันที่ ship จริงคือ `function jUi(e){const t=e.rowTop-e.pickerTop-GUi,i=e.pickerHeight-e.panelHeight-HUi;return Math.max(pgt,Math.min(t,i))}` ⇒ **`panelHeight` กลับมาเป็น input และไม่มีการคำนวณ `maxHeight` เหลืออยู่** (จุดใช้แผงอ่าน `maxHeight:y3e` = 320) · ตัวที่ยืนยันพฤติกรรมคือ e2e **6/6** ที่รันบน VSIX นี้ (แพ็กใหม่ก่อนรัน)

### ปิดช่องเอกสารของรอบนี้ (2026-09-21)

- **`apps/vscode/CHANGELOG.md` เคยขาดหาย 12 รอบ:** รอบ `dev.6-fix.15/16/17` มีบรรทัดใน CHANGELOG (อยู่ใน commit `docs: record the fix.N round` ของรอบนั้น) แต่ **`dev.6-fix.18`–`fix.29` ไม่มีเลย** — `git log -- apps/vscode/CHANGELOG.md` หยุดที่ `2deb0f571` (fix.17) · รอบนี้เขียนเพิ่ม **12 บรรทัด (fix.18–fix.29)** ในหัวข้อ `### Fixed` ของ `[0.1.18] - Unreleased` ตามสไตล์เดิม (bold + `(dev.6-fix.N)` + เหตุผล) ⇒ ตอนนี้ครอบ **fix.2–fix.29** (ที่ยังไม่มีหมายเลขกำกับคือ `fix.1`/`fix.8`/`fix.10`/`fix.11` ซึ่งเป็นรอบ Wave 1 / e2e harness / แผง hover ต้นทาง — ผลที่ผู้ใช้เห็นถูกเล่าไว้ในบรรทัดของรอบใกล้เคียงแล้ว)
- **`docs/icline/ui-guidelines.md`** — กฎที่รอบนี้ settle (placement + deps, overflow-x-hidden, ชุดระดับ Effort = คำตอบของ host, สวิตช์เปิดกลับต้องไม่ตาย) อัปเดตครบ
- **`docs/icline/smoke-test-tracker.md`** — หัวข้อ fix.26–fix.29 + บรรทัดหัวเรื่องที่เคยค้างว่า "fix.22 ยังไม่ commit" (fix.22–fix.25 commit ไปแล้ว) แก้ให้ตรงกับ `git log`
- **`.icline/` (gitignored, maintainer-only)** — ตาม `ops/doc-workflow.md` §"จบงาน" + §"Verify before pack" ข้อ 5: อัปเดต `STATUS.md` (ตาราง Stable · WIP · commit fix.15–fix.25 · handoff) และเพิ่ม sidecar **`dev-log/0.1.18-dev.6-fix.24-29.md`** (สาเหตุ · ไฟล์ · คำสั่ง test · ผล ต่อรอบ) เพราะรอบหลัง `fix.14` ยังไม่มีบันทึกใน `dev-log/`

---

## 🧪 dev.6-fix.28 — สวิตช์ Thinking ที่ทำให้แผง Options กระโดด + watchdog ฝั่งสตรีม (2026-09-21)

**สถานะ:** ✅ เสร็จ · **ยังไม่ commit** (working tree เดียวกับ fix.26 + fix.27) · **e2e บน VS Code จริง: `quick-picker-hover` 2/2 (ใหม่ 1 = "the Thinking switch never moves the panel off its own row") · `quick-picker-surface` · `quick-picker-effort-notice` (แก้ premise) · `composer-status-options` ผ่านทั้งหมด** · llms: เทสต์ใหม่ 8 (`stream-idle-watchdog` 6 · `ai-sdk.stream-idle` 2) + `cline-offered-models` 10 ⇒ **ทั้งหมดผ่าน** · llms ทั้งชุด **888 ผ่าน / 4 fail** โดย **4 ตัวเป็นของเดิม** (`ollama.wire.test.ts` — พิสูจน์แล้วด้วยการสลับ `abortSignal` กลับเป็น `request.signal` แล้วอาการเดิมเป๊ะ ⇒ ไม่ใช่ของรอบนี้) · webview **571/571** (ใหม่ 14: hook 3 · popover 1 · placement เขียนใหม่ 6 + เดิม) · app `test:unit` **1,036 ผ่าน / 0 fail** (70 ไฟล์) · `tsc` สะอาด: llms (`tsconfig.dev.json`) · app (`tsconfig.json` + e2e/compile-tests) · webview (`tsc -b`) · **แพ็กแล้ว:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.28.vsix`

**ที่มา (maintainer):** smoke `fix.27` — "GLM 5.3 Flash ขึ้นสถานะและเปิด-ปิด Thinking ได้ **แต่**ตอนกดเปิด-ปิด หน้า Options มันกระโดดไปมาและอยู่ไม่ตรงกับรายการโมเดลของมันเอง **อาการเป็นกับหลายโมเดล**" + "แชทนี้ทำได้ดีและจบงาน" (iCline รอบ 1 + Cline ต่างก็ผ่าน ⇒ problem อยู่ที่ชั้นของเรา ไม่ใช่ที่ provider)

### รากของ "กระโดดไปมา" — เป็นสองบั๊กคนละชั้น

1. **คำตอบของ host ถูก cache ด้วยคำถามทั้งคู่ (บั๊กตัวจริงของ "เนื้อหาเพี้ยน")** — คำตอบหนึ่งมีสองครึ่ง: `supportedEfforts`/`source` เป็นสมบัติของ **โมเดล** ส่วน `applied`/`reason`/`clamped` เป็นสมบัติของ **ระดับที่ตั้งอยู่** · เดิม hook แคชทั้งก้อนด้วยคีย์ `provider|model|effort|budget` ⇒ พอกด Thinking (ระดับเปลี่ยนเป็น `none`) คำถามใหม่ยังไม่มีคำตอบ ⇒ คืน `undefined` ⇒ แผงวาด **ชุดคำศัพท์กลาง 6 ระดับ + notice เรื่อง Minimal** แล้ว snap กลับเป็น 3 ระดับของโมเดล · เทสต์ใหม่ใน `QuickModelPickerRealPopover.test.tsx` พิสูจน์ซ้ำได้: บนโค้ดก่อนแก้ได้ `['minimal','low','medium','high','xhigh','max']` หลังกดสวิตช์ (สครีนช็อตของ maintainer คือภาพนี้เป๊ะ — ภาพแรกของ `poolside/laguna-s-2.1:free`)
2. **`top` ของแผงถูก clamp ด้วย "ความสูงจริง" ของแผง (บั๊กตัวจริงของ "กระโดด")** — กฎ mock v11 เดิม: `top = max(38, min(rowTop−pickerTop−6, pickerHeight−panelHeight−10))` ⇒ `panelHeight` คือ **เนื้อหา** ⇒ สวิตช์เปลี่ยนเนื้อหา ⇒ แผงเลื่อนหนีแถวของตัวเอง · **`statusBump` อยู่ใน deps ของ layout effect ด้วย** ⇒ ทุกการเปลี่ยน status remeasure ใหม่

### สิ่งที่แก้

- **`useReasoningEffortOutcome.ts` — แยกแคชเป็นสองคำถาม:** `outcomeCache` (คีย์ = คำถามเต็ม) + `levelsCache` (คีย์ = `provider|model` โดยไม่รวมระดับ) · ทุกคำตอบที่ได้จะสอน **ครึ่งของโมเดล** ให้ด้วย ∴ เปลี่ยนระดับแล้วได้ระดับของโมเดลทันทีโดยไม่ต้องรอ host · ระหว่างรอใช้ `levelsOnlyOutcome()` ที่ **ไม่อ้างอะไรเกี่ยวกับระดับนั้น** (`applied: undefined` · `clamped: false` · reason = `not-applicable` ยกเว้นความจริงระดับโมเดลล้วน ๆ ที่ registry ยืนยันว่ามี `reason: "no-effort-control"`) ⇒ แผงที่วาดจากคำตอบครึ่งเดียว **อ่านเป็นคำอ้างไม่ได้เด็ดขาด** · เพิ่ม `readReasoningEffortLevels()` (export ใหม่) ให้ handler ของสวิตช์ใช้ — เพราะมันถาม **ระหว่างที่ตัวเองกำลังเปลี่ยนระดับนั้น**
- **`quickModelPickerList.ts` — `computeOptionsPanelTop` → `computeOptionsPanelPlacement` (คืน `{ top, maxHeight }`):** `top` เป็นฟังก์ชันของ **anchor เท่านั้น** · `maxHeight = min(pickerHeight − top − 10, 320)` ⇒ เนื้อหาล้นได้แค่ทำให้ **แผง scroll ในกรอบเดิม** · แถวล่างที่เหลือที่ว่าง < `OPTIONS_PANEL_MIN_VISIBLE_HEIGHT_PX` (180px) ถู‌กยกขึ้น แต่ยกด้วย `pickerHeight` ⇒ **เนื้อหาโมเดลเปลี่ยนตำแหน่งไม่ได้อีกต่อไป** · ความสูงที่รับประกัน 180px = สวิตช์ + label + 3 ระดับ — ⚠️ **ครึ่งที่สองของข้อนี้ (clamp `maxHeight` + 180px) ถูกถอนใน `dev.6-fix.29`** เพราะแถวล่างได้ scrollbar แทนแผงเต็มใบ (maintainer ปฏิเสธ) · ที่คงไว้คือ **`top` ต้องไม่ตามเนื้อหา** ซึ่งตอนนี้บังคับที่ **deps `[hoveredModel]` ของ layout effect** แทนการ clamp
- **`QuickModelPicker.tsx`:** layout effect **ไม่วัดความสูงของแผงแล้ว** และ **ตัด `statusBump` ออกจาก deps** ⇒ ตามโครงสร้างไม่มีทางที่การคลิกสวิตช์จะขยับแผงได้
- **`stream-idle-watchdog.ts` (ใหม่) + ต่อสายใน `ai-sdk.ts`:** watchdog ที่ abort เมื่อสตรีม **ไม่มี output เลย 120 วินาที** (ตั้งใจให้ยาวพอสำหรับเทิร์น reasoning บน free tier — สั้นกว่านี้คือ retry เทิร์นที่แค่ "คิดนาน") · `touch()` ทุก part ทั้ง `fullStream` และ `textStream` · chained กับ `request.signal` ของผู้ใช้ · `unref()` ที่ timer เพื่อไม่ค้าง process · `stop()` ใน `finally` · ส่งสัญญาณของ watchdog เป็น `abortSignal` ให้ vendor ⇒ **ผู้ใช้กดยกเลิกกับ deadline ไปถึง vendor เป็น cancel เดียวกัน** · `isRetryableBeyondSdkRetries` จัด `StreamIdleTimeoutError` เป็น retryable **ก่อน** ตัวจำแนกชนิดอื่น (abort ปกติ = ผู้ใช้กดยกเลิก จึงต้อง terminal แต่อันนี้ไม่ใช่)

### e2e เจอของที่ unit มองไม่เห็น

- **`quick-picker-effort-notice.test.ts` พังอยู่ก่อนแล้วตั้งแต่ fix.27** (รอบนั้นไม่ได้รัน e2e) — pass 1 บังคับว่า "ระดับที่จะถูก clamp ต้องถูก *เสนอ*" (`[data-icline-effort-option="max"]` count 1) ซึ่งคือพฤติกรรมที่ fix.27 ตั้งใจเลิกทำ: แผงไม่เสนอระดับที่โมเดลจะไม่ได้รับ ∴ เปลี่ยนเป็น **บังคับตรงข้าม**: ถ้า `Max` ไม่ใช่สิ่งที่ออกไปจริง (`applied !== "max"`) แผงต้อง **ไม่มี** ปุ่ม Max (`count 0`) · ส่วน pass 2 (seed ระดับที่เก็บไว้ → notice) ยังผ่านเหมือนเดิม เพราะ `levelsWithStoredEffort` คงระดับที่ผู้ใช้ตั้งไว้ในลิสต์ ⇒ บทเรียน: **คลาสของ "เทสต์ยืนยันพฤติกรรมเก่า" อยู่ทั้งใน unit และ e2e — ต้องรัน e2e ทุกครั้งที่เปลี่ยนสัญญาของแผง**
- **กับดักที่ e2e ใหม่เจอสองอัน (แก้แล้ว):** (ก) เลือกแถว "ล่างสุดที่มองเห็น" ต้องวัดกับ **กล่องของ list** ไม่ใช่ของ popover — แถวที่ถูก clip ยังคืนพิกัดจริง ∴ เอาเมาส์ไปวางแล้วไปโดน footer แทน (แผงไม่ mount เลย) · (ข) ต้องรอให้คำตอบของ host นิ่งก่อนอ่านสถานะเริ่มต้น (`settledProbe`) ไม่งั้นเทียบ "ลิสต์ชั่วคราวก่อนคำตอบ" กับ "หลังคำตอบ" แล้วพิสูจน์อะไรไม่ได้ · **และแผงที่ห้อยอยู่ข้าง picker 320px ยื่นออกนอก sidebar ~300px ∴ ต้องใช้ `pane.widenTo()` ก่อนจึงคลิกสวิตช์ด้วยเมาส์จริงได้** (เป็นเหตุผลเดียวกับที่สเปกเดิม "seed ไม่คลิก")

### บทเรียนการแพ็ก (สำคัญต่อรอบถัดไป)

- **`@cline/llms` ถูก resolve ผ่าน `dist/` ไม่ใช่ `src/`** (esbuild ของแอปไม่มี alias `@cline/*`) ⇒ **แพ็กแรกของรอบนี้ (11,978,117 B) ไม่มีโค้ด watchdog เลย** — เจอด้วยการตรวจสตริงใน VSIX เอง (`Provider stream idle timeout` = NO) · ต้อง `bun run build` ใน `sdk/packages/llms` **ก่อน** `bun esbuild.mjs --production` แล้วแพ็กใหม่ (11,978,540 B) ⇒ ตรวจซ้ำแล้วได้ yes ทุกสตริง · **บทเรียน: ตรวจสตริงใหม่ใน VSIX ทุกครั้งก่อนส่ง และตัว checker ต้องเป็นสตริงของ *รอบนี้* ไม่ใช่ของรอบก่อน**

### ตอบคำถาม: "โมเดลอื่นมีปัญหาแบบเดียวกันอีกไหม"

- `sdk/packages/llms/src/catalog/cline-offered-models.test.ts` (ใหม่) บังคับว่า **ทุกไอดีที่ feed ของ Cline เสนอ ต้องมี entry ที่ *อธิบายได้* ใน catalog** (มี capability หรือ reasoning control — ไม่ใช่แค่มีชื่อ) · 9 ไอดีที่ feed เสนอ **ผ่านทั้งหมดหลัง fix.27** (ก่อน fix.27 เคยไม่ผ่านทั้งกลุ่มเพราะ `preferCanonicalModelIds` ทิ้งไอดีของเส้นทางฟรี — คลาสเดียวกับ GLM)
- ระดับ reasoning ของ 9 ตัวที่ feed เสนอ: **effort + toggle** = `cline-free/deepseek-v4.1-flash` (low/high/max) · `moonshotai/kimi-k3` (low/high/max) · **effort อย่างเดียว** = `openai/gpt-6-astra` · `x-ai/grok-4.5` · `z-ai/glm-5.3-flash` (low/high/max) · `cline-free/muse-spark-1.3-contributor` (minimal…max) · **toggle อย่างเดียว** = `cline-free/solar-pro4` · `poolside/laguna-s-2.1:free` ⇒ สองตัวหลัง **ถูกต้อง** ที่ไม่มีระดับ Effort ให้เลือก (แผงขึ้น "No effort options for this model") — ดูคล้ายบั๊ก GLM แต่ไม่ใช่
- **อาการ "กระโดด/เพี้ยนชั่วขณะ" กระทบทุกโมเดลที่มีรายการระดับ** (คือ 6 ใน 9 ตัวข้างต้น) เพราะรากอยู่ที่การแคชคำตอบ + การ clamp ตำแหน่ง ไม่ใช่ที่โมเดล · ตัวที่ toggle อย่างเดียวเคย "เพี้ยน" เหมือนกัน (ภาพแรกในรายงานคือ `poolside/laguna-s-2.1:free` ที่ชั่วขณะหนึ่งขึ้น 6 ระดับ + notice Minimal)

### หลักฐาน smoke ของ fix.27 (ทรานสคริปต์จริง)

- iCline รอบ 1 (`1789954155116_6knc5`, GLM 5.3 Flash Free): 20 ข้อความ · เครื่องมือที่ใช้ = `editor` (หลายครั้ง) + `run_commands` (ตรวจไฟล์/เปิด Chrome) · **ใช้ native tool-call path ล้วน** — `<run_commands>` = 0 · `</tool_call>` = 0 · `agent.tool_calls.recovered_from_text` = 0 · compaction = 0 · จบด้วยสรุปงานครบ ⇒ รอบนี้ **ตัวกู้คืนสำเนียงที่ 5 ไม่ต้องทำงานเลย** (ตรงกับที่ maintainer เห็นว่าผ่านทั้ง iCline และ Cline)
- Cline (extension เทียบ) รอบเดียวกันก็จบงาน — ยืนยันว่ารอบนี้ความต่างอยู่ที่ provider ไม่ใช่ที่ชั้นแปลของเรา

### คิวถัดไป (อัปเดตหลัง fix.28)

1. **e2e ของการกู้คืน markup:** ยังไม่มีข้อไหนพิสูจน์บน VS Code จริงว่า "เทิร์นที่โมเดลเขียน markup → การ์ดเครื่องมือ + notice" (ต้องมี mock provider ที่ตอบ markup รูป element form) — ค้างจาก fix.27
2. **telemetry รายโมเดล:** `agent.tool_calls.recovered_from_text` เพิ่งมีข้อมูลจาก smoke 2–3 รอบ ควรอ่านค่าจริงก่อนตัดสินใจเรื่องการรับสำเนียงเก่าของ Cline
3. **`STREAM_IDLE_TIMEOUT_MS` เป็นค่าคงที่** — ถ้า smoke เจอว่า free tier เงียบนานกว่านี้จริง ให้พิจารณายกเป็นค่าที่ผู้ใช้ตั้งได้ (ตอนนี้ตั้งใจให้เป็นนโยบายเดียว ไม่ใช่คอนโทรลอีกตัว)

---

## 🧪 dev.6-fix.27 — fix.26 "ยังเพี้ยนตอนเริ่มทำงานจริง" (สำเนียงที่ 5: element form) + GLM 5.3 Flash **ตั้งค่าได้จริงแค่ไหน** (2026-09-21)

**สถานะ:** ✅ เสร็จ · **ยังไม่ commit** (ทับกับ fix.26 ใน working tree เดียวกัน) · agents **123/123** (ใหม่ 9: parser 5 · runtime 4 → รวมรอบนี้ parser มี 30 ข้อ) · llms **869 ผ่าน / 4 fail** โดย **4 ตัวที่ fail เป็นของเดิม** (`ollama.wire.test.ts` — ทดสอบ vendor package ที่ถูก patch ด้วย `patches/ollama-ai-provider-v2@4.0.1.patch` ซึ่ง **ไม่มีอยู่ในเช็คเอาต์นี้** ∴ ไม่ใช่ของรอบนี้) · core **2,411 ผ่าน / 12 fail** — **12 ตัวเป็นชุดเดิมทุกตัว** (`cron-runner` · `hub/server` · `runtime-builder` MCP 2 · `workspace-manifest` 2 · `hook-file-hooks` · `checkpoint-hooks` · `local-provider-service` offline · `runtime-commands` และ `provider-settings-legacy-migration` **ที่รอบนี้ทำให้พังแล้วแก้กลับแล้ว** — ดู "กับดักที่เจอ") · app `test:unit` **1,036 ผ่าน / 0 fail** (70 ไฟล์) · app vitest **974/975** (flake เดิม 20s: `providerCatalogHandlers` — **ผ่านเดี่ยว 22/22**) · webview **565/565** (67 ไฟล์ · ใหม่ 8) · `tsc` สะอาด: agents · shared · llms · core (`tsconfig.dev.json` + smoke) · app (`tsconfig.json` + `tsconfig.vscode-compat.json`) · webview (`tsc -b`) · biome `--diagnostic-level=error` ไม่มี finding ในไฟล์ที่แตะ · **`bun run repro:tool-call-text` 18/18 PASS** (ใหม่ 7 ข้อของสำเนียง element form ขับ tool set จริง) · **แพ็กแล้ว:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.27.vsix`

**ที่มา (maintainer):** smoke `fix.26` — (ก) "พอจะเริ่มทำงานจริงก็ยังมีปัญหาคล้ายเดิม" · (ข) GLM 5.3 Flash ขึ้นไอคอน Reasoning + ระดับ Effort หลังติดตั้ง fix.26 แต่ **พอกดปิด Thinking ไอคอนทั้งหมดหายและกดเปิดกลับไม่ได้เลย** ⇒ "สรุปแล้ว GLM 5.3 Flash มันตั้งค่าได้มั้ย หรือเป็นแค่การแสดงผล UXUI ผิดเพี้ยน แล้วแบบไหนคือค่าที่ถูกต้อง"

### คำตอบตรงคำถาม: GLM 5.3 Flash ตั้งค่าได้จริง และค่าที่ถูกต้องคือ Low / High / Max

catalog ที่ฝังมากับบิลด์ (ส่วน `cline` ของ `catalog.generated.ts`, คีย์ `z-ai/glm-5.3-flash`) บอกไว้ชัด:

- `capabilities`: `images` · `video` · `tools` · **`reasoning`** · `structured_output` · `temperature` · `prompt-cache` ⇒ **เป็นโมเดล reasoning จริง** มีสิทธิ์มีสวิตช์ Thinking + ไอคอน Reasoning/Vision
- `reasoningOptions`: `[{ type: "effort", values: ["low", "high", "max"] }]` ⇒ **รับ Effort 3 ระดับนี้เท่านั้น** ⇒ ภาพที่เห็น **Minimal/Low/Medium/High/X-High/Max (6 ระดับ) คือการแสดงผลที่ผิด** (เป็นชุดคำศัพท์กลางของ OpenAI ที่ UI ใช้ตอนไม่รู้จักรุ่น) ส่วน **"ไอคอนหาย + กดเปิดกลับไม่ได้" เป็นบั๊กจริง ไม่ใช่การออกแบบ**

### รากของทั้งสองอาการ

1. **แถว GLM 5.3 Flash ไม่มี metadata ที่ไหนเลย** — `buildClineModels()` และ `mergeKnownModels()` ต่างเรียก `preferCanonicalModelIds()` ซึ่ง **ทิ้ง `z-ai/*` ทุกตัวเมื่อมี `zai/*` คู่กัน** แต่คลังที่ผูกมากับบิลด์กลับมีข้อมูลของ *เส้นทางฟรี* อยู่ใต้ชื่อ `z-ai/*` (และ `cline-recommended.generated.ts` ก็คีย์ด้วย `z-ai/*`) ∴ *"ตัวที่ผู้ใช้เลือกจริง"* ไม่มี entry → แถบ `No capability data` · ระดับ Effort ตกไปใช้ชุดกลาง 6 ระดับ · และ **สวิตช์ Thinking มีอยู่ได้เพียงเพราะมีค่าตั้งไว้แล้ว** ⇒ พอเขียน `none` ไม่มีอะไรเหลือให้ยึด ∴ สวิตช์ปิดตัวเองถาวร
2. **`zai/*` กับ `z-ai/*` ไม่ใช่คำสะกดเดียวกันของรุ่นเดียวกัน** — เป็นคนละ **เส้นทาง**: `z-ai/glm-5.3-flash` = ฟรี (pricing 0) และเป็นไอดีที่ session จริงรันอยู่ (bild screenshot ของ maintainer: `Active: cline: z-ai/glm-5.3-flash`) · `zai/*` = เส้นทาง OpenRouter ที่ Vercel gateway ต้องใช้ ∴ การ "พับ" อันหนึ่งทิ้งเพราะมีคู่ canonical = ทิ้งรุ่นที่มีจริงในแอปโดยที่ picker ยังโฆษณาอยู่

### สิ่งที่แก้

- **`sdk/packages/llms/src/providers/builtins.ts` + `sdk/packages/core/src/services/llms/provider-defaults.ts`:** เลิกใช้ `preferCanonicalModelIds` กับ catalog ของ `cline` ⇒ **เก็บทั้งสองไอดี** (คนละเส้นทาง คนละราคา คนละ context window) และเพิ่มส่วน `generatedModels("cline")` เข้าไป ∴ `z-ai/*` · `cline-free/*` **มี metadata ของตัวเอง** (ไอคอน capability · สวิตช์ Thinking · ระดับ Effort ที่ถูก)
- **`pickerCapabilities.ts`:** `effortIsSet` นับค่าที่ผู้ใช้ตั้ง **รวม `none`** (`explicit !== undefined`) — `none` คือการตัดสินใจของผู้ใช้ และเป็นร่องรอยเดียวที่เหลือของโมเดล reasoning ที่ metadata ไม่ครบ ∴ สวิตช์ต้องยังกดกลับได้ · ยังปิดถ้าโมเดลไม่รับอะไรเลยจริง ๆ
- **`QuickModelPicker.tsx`:** (ก) `currentModelInfo` อ่านจาก warm catalog **ก่อน แล้วตกมาใช้ `selectedModelInfo` ของ host** (ตัวนี้ resolve alias ให้แล้ว) ⇒ ป๊อปโอเวอร์บนชิป "โมเดลที่ใช้อยู่" ไม่วาดจาก metadata ว่างอีก · (ข) `useClineSettingsModelList.featuredRow()` **ส่ง catalog entry ทั้งก้อน** ไม่ใช่แค่ `{ name }` ∴ โมเดลฟรีในลิสต์มีข้อมูลครบ
- **`ModelOptionsPanel.tsx` + `modelThinkingOptions.ts` (`withSupportedEfforts`) — รายการ Effort แคบลงตามคำตอบของ host:** host ตอบ `supportedEfforts` มาจาก `decideReasoningEffort()` — **ฟังก์ชันเดียวกับที่ทางเดิน request ใช้ clamp** ∴ ลิสต์ที่สร้างจากมันชื่อระดับที่โมเดลจะไม่รับไม่ได้ · `glm-5.3-flash` จึงเห็น **Low/High/Max** · **คำตอบว่าง = ไม่แคบ** (`registry-missing-model` = ไม่รู้ ไม่ใช่ "ไม่มีระดับ") ต่างจาก `no-effort-control` ที่แผงขึ้นว่า "No effort options for this model" · **ระดับที่เก็บไว้ยังอยู่ในลิสต์เสมอ** ⇒ ปุ่มที่ติ๊กกับข้อความ clamp เล่าเรื่องเดียวกัน
- **สวิตช์ Thinking ที่เปิดกลับ ลงที่ระดับแรกของ *โมเดล* ไม่ใช่ของ *คำศัพท์*:** `readReasoningEffortOutcome()` (export ใหม่ใน hook) อ่านคำตอบที่เพิ่งดึงมา ⇒ GLM เปิดกลับได้ `low` ไม่ใช่ `minimal` ที่ SDK ต้อง clamp เป็น `low` ทีหลัง
- **host (`reasoning-effort-decision.ts` + `resolveReasoningEffort.ts` + proto):** เพิ่ม `resolveReasoningModelLevels()` และส่ง `supportedEfforts` / `registryModelId` / `source` กลับไป**ทุกคำถาม รวมตอนที่ยังไม่มีค่าตั้ง** (เดิมคำถามถูกถามเฉพาะตอนมีค่าแล้ว ∴ คอนโทรลที่ต้องวาดลิสต์ถามไม่ได้) + `reason` แยก `catalog-unknown` ออกจาก `no-effort-control`
- **`fabricated-tool-calls.ts` + `agent-runtime.ts` — สำเนียงที่ 5 (element form):** รูปที่ fix.26 เขียนมาเป็น **"ชื่อ tag = ชื่อเครื่องมือ · ชื่อ element ลูก = argument"** ไม่มี call syntax ใด ๆ (`<run_commands><cmd>…</cmd></run_commands></run_commands>` · `<read_files><paths><path>…</path></paths></read_files></read_files>`) ∴ scanner ทุกสำเนียงเดิมเดินผ่านหมด ⇒ markup ค้างในแชทและเทิร์นถูกรายงานว่าจบคำตอบ · ตัวสแกนใหม่ **ใช้ทะเบียนเครื่องมือจริงเป็นยามกัน prose** (`knownToolNames` — "html ที่โมเดลกำลัง *เขียน*" ต้องไม่กลายเป็น call; เทสต์ปักไว้แล้ว) · รองรับ tag ปิดซ้อน/ไม่มี tag ปิด · เรียกได้หลาย call ในเทิร์นเดียว และยังผ่าน policy → approval → executor ตามเดิม

### กับดักที่เจอ (และแก้แล้ว)

- **การพับ alias ไม่ได้มีไว้ที่ picker ที่เดียว:** `provider-settings-legacy-migration.ts` มี `resolveKnownClineModel()` ที่พับ `z-ai/…` → `zai/…` **เฉพาะเมื่อไอดีนั้นไม่อยู่ใน catalog** ∴ พอเพิ่ม `z-ai/*` เข้า catalog เศษที่เหลือเปลี่ยน: ไอดีที่ catalog มีอยู่แล้ว (13 จาก 16) **คงรูปเดิม** — ซึ่งถูก เพราะการพับมันคือการย้ายผู้ใช้จากเส้นทางฟรีไปเส้นทางเสียเงิน — และตัวที่ catalog ไม่มี (`z-ai/glm-5.3-fast` · `z-ai/glm-5.2-fast` · `z-ai/glm-4.7-flashx`) ยังพับตามเดิม ∴ เทสต์ถูกเขียนใหม่ให้ปัก **ทั้งสองครึ่ง** (เดิมเทสต์ยืนยันว่าครึ่งแรกถูก"พับ" ซึ่งไม่จริงอีกต่อไป)
- **เทสต์ที่ยืนยันพฤติกรรมเก่าของ catalog:** `builtins.test.ts` ("prefers Vercel-style Z.ai model ids") และ `local-provider-service.test.ts` ("uses Cline-specific Z.ai aliases") ถูกเขียนใหม่ให้ปักเจตนาใหม่ — **คนละเส้นทาง ∴ เก็บทั้งคู่**
- **`ReasoningEffortSelector.test.tsx` (Settings):** เดิมปักว่า "ตอน reasoning ปิด ต้องไม่ถาม host เลย" — รอบนี้ตั้งใจให้ถาม **เพราะคำตอบมีรายชื่อระดับของโมเดลด้วย** ∴ เทสต์ถูกแก้เป็น "ปิด = ไม่ *อ้าง* อะไร (ไม่มีข้อความ clamp) แต่ยังถามเพื่อรู้ระดับ"
- **mock ในเทสต์ของ picker:** default เดิมตอบ `supportedEfforts: [request.effort]` ซึ่งอ่านได้ว่า "โมเดลรับเฉพาะระดับที่คุณถาม" — ของเทียมที่หลอกตัวเอง ∴ เปลี่ยนเป็นรูปที่ซื่อสัตย์ว่า catalog ไม่มีรุ่นนี้ (`supportedEfforts: []` · `catalog-unknown` · `registry-missing-model`) แล้วให้เทสต์ที่ต้องการระดับจริง override เอง

### หลักฐาน

- **ทรานสคริปต์ `~/.cline/data/sessions/1789940859679_34wsx/…messages.json` (session ที่ maintainer บอกว่า "ยังเพี้ยน")** — ท้ายเทิร์นที่ 3 คือรูป element form ตรงตัว (คัดมาจากไฟล์จริง อยู่ในหัวข้อ `fabricated-tool-calls.ts`): ไม่มี `<invoke>` ไม่มี `<parameter>` ไม่มี JSON ∴ scanner ทุกตัวของ fix.25/26 แมตช์ศูนย์ตัว ⇒ ไม่มีอะไรถูกกู้ · ไม่มีอะไรล้าง · markup ยังอยู่ในข้อความและไม่มี `tool_use`
- **`bun run repro:tool-call-text` 18/18 PASS** — เพิ่ม 7 ข้อที่ขับ **tool set จริง** (`read_files, search_codebase, run_commands, editor`) ผ่าน `Agent` ตัวจริงด้วยเทิร์น element form 2 call ในเทิร์นเดียว: markup หาย · prose รอบ ๆ อยู่ครบ · call ทั้งคู่กลายเป็น `tool-call` จริงบนเทิร์นนั้น · **คำสั่งรันจริง** (`echo iCline-dialect-five-ok`) · **อ่านไฟล์รันจริง** (เนื้อไฟล์กลับมา) · จบด้วย `completed` · และ "HTML จริงในข้อความไม่ถูกแตะ"
- **webview 565/565** (ใหม่ 8: `withSupportedEfforts` 3 · panel ที่แคบตาม host 1 · toggle-only 1 · switch-on ลงที่ `low` 1 · legacy migration 2) · **agents 123/123** (ใหม่ 9)
- **เทสต์ล้มชั่วคราวที่พิสูจน์ว่าเป็นของเดิม ไม่ใช่ของรอบนี้:** `local-provider-service` ("keeps the bundled catalog available when offline") รันซ้ำโดย **คืน `builtins.ts` + `provider-defaults.ts` จาก `HEAD` ชั่วคราว** ⇒ ยัง fail เหมือนเดิม ∴ ไม่ใช่ของรอบนี้

### จุด smoke (fix.27)

- **GLM 5.3 Flash — ข้อสอบตรงของรอบนี้ (ต้องผ่านทั้ง 3 ข้อในแชทเดียว):** (1) แถว/ชิปมี **ไอคอน Reasoning + Vision** ตั้งแต่ก่อนตั้งค่าอะไร · (2) เปิด Options ⇒ Effort เห็น **Low / High / Max เท่านั้น** (ไม่ใช่ 6 ระดับ) และมีข้อความ caps · (3) **กด Thinking ปิด แล้วกดเปิดกลับได้** ⇒ ไอคอนไม่หาย และเปิดกลับมาลงที่ `low`
- **งานที่ต้องใช้เครื่องมือ (สำเนียง element form):** สั่งงานที่บังคับให้อ่าน/รัน ⇒ โมเดลที่เขียน `<run_commands><cmd>…</cmd></run_commands>` ต้อง **ไม่เห็น tag ในบัลลูน** · มีการ์ดเครื่องมือ + ผลลัพธ์จริง · และมี **notice ว่า the model wrote its tool call as text — recovered and ran `run_commands`** · งานเดินต่อจนได้ผลงาน
- **ห้าม regression:** โมเดล free อื่น (`deepseek-v4.1-flash` · `solar-pro4` · `muse-spark`) ยังมีไอคอน + ระดับ Effort ของตัวเอง · เทิร์นที่โมเดลเขียน HTML ปกติ (ไม่เรียกเครื่องมือ) **ต้องไม่ถูกมองเป็น call** · โมเดลที่ไม่รู้จัก (`registry-missing-model`) ยังเห็นชุดระดับของ provider (ไม่กลายเป็น "ไม่มีระดับ")

### คำถามค้าง

1. ถ้า **Thinking ปิดแล้วไอคอนยังหาย** ให้บอกว่ารุ่นไหน/ไอคอนไหนหาย (ทั้งชุด หรือเฉพาะ Reasoning) — ถ้าทั้งชุด = metadata ยังไม่ครบที่ id นั้น ถ้าเฉพาะ Reasoning = ค่า `none` ยังไม่ถูกนับว่า "ตั้งไว้"
2. ถ้าเห็น **ระดับ Effort ยังเป็น 6 ระดับ** ในรุ่นที่ควรได้ 3 ⇒ ขอภาพ + โมเดล/ไอดีที่ active (เส้นทาง `z-ai/*` กับ `zai/*` ให้ผลต่างกันได้)

---

## 🧪 dev.6-fix.26 — fix.25 "แก้แล้วยังเพี้ยน": โมเดลเขียน tool call **ภาษาอีกสำเนียง** (`<tool_call>name{json}` ไม่มี tag ปิด) ที่ fix.25 ตาบอด (2026-09-21)

**สถานะ:** ✅ เสร็จ · **ยังไม่ commit** · agents `bunx vitest run` **114/114** (ใหม่ 10: parser 8 · runtime 2) · shared **432 ผ่าน / 4 skip** · app `test:unit` **1,036 ผ่าน / 0 fail** (70 ไฟล์) · app vitest **972/974** (2 ตัวที่เป็น timeout 20s ตอนรันขนานโหลดหนัก — `resolveModelInfo` · `providerCatalogHandlers` — **ผ่านเดี่ยวทั้งคู่ 42/42 ใน 18s** ∴ flake เดิมของชุดนี้ ไม่เกี่ยวกับรอบนี้) · webview **557/557** (67 ไฟล์) · `tsc` สะอาด: agents `tsconfig.dev.json` · shared · app `tsconfig.json` + `tsconfig.vscode-compat.json` · webview (`tsc -b` เท่านั้นที่ตรวจจริง) · biome `--diagnostic-level=error` ไม่มี finding ในไฟล์ที่แตะ · e2e บน VS Code จริง **17/17** ผ่าน (`quick-picker-surface` ใหม่ 1 · `quick-picker-hover` ของเดิม · `chat` ที่เคย flaky ถูกแก้ locator แล้ว) · **`bun run repro:tool-call-text` 11/11 PASS** — เพิ่ม 5 ข้อของสำเนียงใหม่ที่ขับ **tool set จริง** (`createBuiltinTools` → `read_files, search_codebase, run_commands, editor`) ผ่าน `Agent` ตัวจริง: บล็อก `run_commands{…}` ที่ไม่ปิด tag ถูกถอดออก · call กลายเป็น `tool-call` จริงบนเทิร์นนั้น · **คำสั่งรันจริงและได้ผลลัพธ์กลับมา** (`echo iCline-dialect-four-ok`) · เทิร์นจบด้วย `completed` · **แพ็กแล้ว:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.26.vsix`

**ที่มา (maintainer):** smoke `fix.25` — iCline รอบ 1 "เริ่มดีแล้วก็กลับไปเพี้ยนเหมือนเดิม" · Cline extension รอบ 2 "พิมพ์ช้ามากสุดท้าย `Upstream idle timeout exceeded`" · บวกภาพ UI: แถบสีเทาโผล่ด้านล่างของ Options panel ตอน hover แถวโมเดลที่ไม่มีไอคอน

### หลักฐาน (อ่านจากทรานสคริปต์จริง ไม่ใช่เดา)

ทรานสคริปต์ `~/.cline/data/sessions/1789940859679_34wsx/…messages.json` (iCline · `model: z-ai/glm-5.3-flash` · `provider: cline` · 8 ข้อความ) — **ท้ายเทิร์นที่ 3 ลงท้ายแบบนี้ตรงตัว**:

```
…ตั้งลำดับโฟลเดอร์ให้ถูกต้องครับ<tool_call>run_commands{"commands": ["dir /b \"d:\\.opencode\\Test-models\"", "dir /b /ad \"d:\\.opencode\\Test-models\""]}
```

- **ไม่มี `</tool_call>`** และ **ไม่มี `<invoke>`** — เป็นรูป `<tool_call>` + **ชื่อเครื่องมือ** + **JSON ดิบ** ∴ ตัวแกะของ fix.25 (ที่ต้องมี `</invoke>` หรือ `</tool_call>` เพื่อจับ) **ไม่แมตช์เลยแม้แต่ตัวเดียว** → ไม่มีอะไรกู้คืน · ไม่มีอะไรล้าง · ยังไม่มี `tool_use` ใน transcript และ markup ยังอยู่ในข้อความ ∴ **อาการเดิมเป๊ะ ๆ ทุกประการ** (และ `run_commands` **เป็นชื่อจริง** ของ runtime นี้ ⇒ ถ้าแกะได้ จะรันได้ทันที)
- เทิร์นสุดท้ายโมเดลพูดว่า *"คำสั่งสำรวจ workspace รอบก่อนยังไม่มีผลลัพธ์กลับมา"* ⇒ ยืนยันว่าไม่มีอะไรถูกป้อนกลับ
- **session ของ Cline extension (`1789940126951_nvwdu`) — โมเดลเดียวกัน provider เดียวกัน — มี `tool_use(run_commands)` เป็นบล็อกจริง** และข้อความ text ว่างเปล่า ⇒ ไคลเอนต์ของ Cline **มีตัวแกะ tool call จากข้อความอยู่แล้ว** (รูปนี้คือ wire format รุ่นคลาสสิกของ Cline) ∴ "Cline ทำงานได้ แต่ iCline ไม่ได้" ไม่ใช่เพราะโมเดลหรือ provider ต่าง — เพราะ **ชั้นแปลของไคลเอนต์ต่างกัน** ซึ่งคือชั้นที่รอบนี้เติม

### สิ่งที่แก้

- **`fabricated-tool-calls.ts` — เพิ่มสำเนียงที่ 4 (ตัวจริงของรอบนี้):** `scanWrapperCalls()` สแกน body ของ `<tool_call(s)>`/`<function_call(s)>` **ด้วยมือ** (ไม่พึ่ง regex tag ปิด) แล้วอ่าน 2 รูป: (ก) **ชื่อเครื่องมือ + JSON object** (`run_commands{…}`) (ข) JSON call object (`{"name":…,"arguments":…}`) ไม่ว่าจะมี `</tool_call>` หรือไม่ · ตัวอ่าน JSON เป็น **brace matcher ที่รู้จัก string/escape** ∴ `}` ใน argument ที่อยู่ในเครื่องหมายคำพูดไม่ตัดค่าก่อนเวลา · **ค่าที่ไม่ปิด = ไม่กู้คืน** (เทิร์นที่ถูกตัดกลางคันต้องไม่รันครึ่ง ๆ)
  - **กัน false positive:** รูป (ก) ต้อง parse เป็น **object จริง** ∴ prose ที่ "อธิบาย markup" (`a call looks like \`<tool_call>read_files{...}\``) ไม่ถูกอ่านเป็น call
  - **ห้ามรันซ้ำ:** dedupe ด้วย signature `ชื่อ:JSON` — รูป JSON ใน wrapper ที่ปิด tag ถูกจับทั้งโดย regex เดิมและ scanner ใหม่
  - **ล้างด้วย span เดียว:** เดิมใช้ `replace` ต่อกัน (ทีละสำเนียง) ซึ่งพังเมื่อมีหลายบล็อก/หลายสำเนียงในข้อความเดียว ∴ เปลี่ยนเป็นเก็บ span บนข้อความตั้งต้นแล้วลบจากท้ายลงมา (รวม span ที่ทับกัน)
- **`agent-runtime.ts` — แยกสองงานออกจากกันให้ชัด:** (ก) **ล้าง markup เสมอ** แม้เทิร์นนั้นจะเรียกเครื่องมือแบบ native สำเร็จแล้ว (ผู้ใช้ไม่ควรอ่าน wire format) (ข) **รับ call จากข้อความเฉพาะเมื่อเทิร์นนั้นไม่มี call ของตัวเอง** (เทิร์นที่มีทั้ง native call และ markup ค้าง ต้องไม่รันงานซ้ำ) · เทิร์น `max-tokens`/`error` ยังถูกข้ามทั้งดุ้น
- **การกู้คืนต้องไม่เงียบอีกต่อไป (ข้อที่ maintainer อนุมัติ):** `announceRecoveredToolCalls()` → **status-notice ในแชท** (`the model wrote its tool call as text — recovered and ran \`run_commands\``) + log + **telemetry ใหม่** `agent.tool_calls.recovered_from_text` (`sessionId/runId/iteration/provider/model/toolNames/toolCount` — ประกาศใน `@cline/shared` ตามแบบ `captureAgentUnexpectedReasoningTokens`) · สองรอบ smoke ที่ผ่านมาเสียไปกับการไล่หา "ทำไมเงียบ" ∴ รอบนี้ความเงียบคือบั๊ก

### เทียบ Cline ↔ iCline (คำถามของ maintainer)

| | Cline extension (v4.1.19) | iCline (SDK) |
|---|---|---|
| เทิร์น 3 ของ GLM 5.3 Flash รอบ 2 | `tool_use(run_commands)` จริง + tool_result | ข้อความล้วนที่มี markup + ไม่มี tool_use |
| ใครแกะ | ไคลเอนต์ Cline แกะข้อความเอง (มีมานาน) | ไม่มีตัวแกะสำหรับสำเนียงนี้ (fix.25 ไม่ครอบ) |
| ช้า/ค้าง | provider ปล่อย token ช้า แล้ว **ไคลเอนต์ตัดที่ idle timeout** → ขึ้น `Upstream idle timeout exceeded` + ปุ่ม Retry | **ไม่มี watchdog ฝั่งสตรีม** ∴ โมเดลที่ปล่อยช้า/เงียบจะค้างยาวจนผู้ใช้กดหยุด |

- **"ช้ามากต่อคำ" ทั้งสองฝั่งคือ provider/โมเดล (free tier) ไม่ใช่โค้ดของเรา** — หลักฐาน: เทิร์นเดียวกันใน iCline ก็ได้ผลลัพธ์เท่าเดิมในเวลาใกล้เคียง และ session ของ Cline ที่ *สำเร็จ* ใช้เวลาเท่ากัน · แต่ **จุดที่โทษเราได้คือการไม่มี idle watchdog**: Cline อย่างน้อยก็ *บอกผู้ใช้* แล้วให้กด Retry ส่วน iCline จะค้างเงียบ ∴ คิวถัดไปข้อ 1 ด้านล่าง
- **เกินเวลาไม่ควรกลืนคำตอบ:** ทุกวันนี้ `AgentRuntime` retry เฉพาะ turn ที่ **ล้มเหลว** (`generateAssistantMessageWithProviderRetry`) — ถ้าไม่มี event เข้ามาเลยก็ไม่มีอะไรให้ retry

### แถบสีเทาใน Options panel (ภาพที่ maintainer ส่ง)

- **หาไม่เจอในของจริง — พิสูจน์ด้วย e2e ไม่ใช่ด้วยตา:** ข้อความนี้เป็น **scrollbar** (สิ่งที่เบราว์เซอร์วาด ไม่ใช่ DOM ∴ หาในต้นไม้ไม่เจอ) ผมจึงเขียนสเปกที่รัน VS Code จริง hover **ทุกแถว** แล้วถาม DOM ว่า *ตัวไหนจริงที่ล้น* — ผล: `quick-picker-surface` ผ่านทั้ง 24 แถว รวมแถว `z-ai/glm-5.3-flash` ที่ **caps = "No capability data" และ efforts = 0** (สภาพเดียวกับภาพ) — **ไม่มี scroll container ไหนใน picker ล้นแนวนอน** และไม่มี children ที่เป็น "แถบ" ทึบใน panel
- **สิ่งที่ทำไป (ปิดโอกาสเชิงโครงสร้าง):** ตั้ง `overflow-x-hidden` ให้สองพื้นผิวของ picker (`data-icline-picker-list` · `data-icline-picker-options`) — ทั้งคู่ควรเลื่อนได้ **แนวตั้งเท่านั้น** (แถวตัดคำ มี hover zoom 7% ที่ดันชื่อแถวเลย padding ขวา = ต้นเหตุคลาสสิกของ scrollbar นอนใต้ปุ่ม) · และทิ้งสเปก `quick-picker-surface` ไว้เป็นยามถาวร (ยืนยันว่าทุกแถวยังได้ panel ที่สมเหตุสมผล: Effort = ระดับ หรือข้อความ "No effort options" และ caps = ไอคอนมี label หรือข้อความ "No capability data")
- **ยังไม่ยืนยันว่าตรงกับที่เห็น:** ถ้ายังเห็นแถบอยู่หลัง fix.26 จะบอกได้จาก 2 จุดนี้ (ดู "คำถามค้าง" ท้ายหัวข้อ)

### จุด smoke (fix.26)

- **GLM 5.3 Flash (หรือโมเดล `cline-free` ที่มีประวัตินี้) — ข้อสอบตรงของรอบนี้ (fix.25 ยังไม่ผ่านข้อนี้):** สั่งงานที่ต้องใช้เครื่องมือ ⇒ ต้อง **ไม่เห็น `<tool_call>`/JSON ดิบในบัลลูน** · มีการ์ดเครื่องมือจริง + ผลลัพธ์ · และมี **ข้อความสถานะหนึ่งบรรทัด** ว่า *the model wrote its tool call as text — recovered and ran `run_commands`* (นี่คือสัญญาณว่ากู้คืนทำงาน)
- **งานเดินต่อ:** หลังกู้คืนแล้ว งานต้องไม่จบที่เทิร์นนั้น — ต้องมีการเรียกเครื่องมือต่อเนื่องไปจนได้ไฟล์/ผลงานจริง
- **แถบสีเทา:** เปิด Quick Picker → hover แถวที่ไม่มีไอคอน (เช่น GLM 5.3 Flash / Kimi K2 0905) ⇒ **ต้องไม่เห็นแถบสีเทา** ใต้ "No capability data" · และ hover แถวที่มีไอคอน → panel ต้องเหมือนเดิม (Thinking/Effort/caps ครบ)
- **ของเดิมต้องยังทำงาน:** โมเดลที่เรียกเครื่องมือแบบ native (muse-spark / solar-pro4) ⇒ ไม่มี call โผล่เพิ่ม ไม่มีข้อความเตือนแปลกปลอม · ออกจากหน้าแชทกลางงานแล้วงานเดินเบื้องหลัง (fix.24) · เทิร์น `max-tokens` ยังขึ้น error เดิม ไม่ถูกเดา

### คำถามค้าง (ตอบแล้วผมปิดได้เลย)

1. ถ้ายังเห็นแถบสีเทา: มันคือ **แถบที่ขอบใน (เหมือน scrollbar)** หรือ **แถบทึบชนขอบทั้งสองข้าง**? และถ้าเอาเมาส์ออก/กลับมาใหม่ ยังอยู่ไหม — บอกได้จะรู้ว่ายังต้องแก้ที่พื้นผิวไหน (หรือเป็นสิ่งที่วาดอยู่ข้างหลัง panel)
2. `Upstream idle timeout exceeded` ฝั่ง iCline เห็นไหม? ถ้าเห็น = มี watchdog อยู่แล้ว · ถ้าค้างเงียบ = ยืนยันคิวข้อ 1 ด้านล่าง

### คิวถัดไป (ยังไม่ทำ — อัปเดตหลัง fix.27)

1. **Idle watchdog ฝั่งสตรีมของโมเดล (ช่องว่างที่เทียบกับ Cline แล้วเห็นชัด · ข้อ 1 ที่ยังไม่ได้ทำ):** `fetchJson` มี timeout 30s แต่ **สตรีมไม่มี** ∴ โมเดล free ที่ปล่อย token ช้า/เงียบจะค้างยาวจนผู้ใช้กดหยุดเอง · ที่ควรเป็น: ไม่มี event เกิน N วินาที → abort สตรีมนั้น แล้วโยนเป็น provider error ที่เข้า retry เดิม (`generateAssistantMessageWithProviderRetry` + backoff) + ขึ้น notice ว่ากำลังลองใหม่ ⇒ ดีกว่า Cline ที่แค่บอกผู้ใช้แล้วรอให้กด Retry
2. **e2e สำหรับตัวกู้คืนเอง:** ทุกวันนี้เป็น unit ระดับ runtime/parser + repro harness ที่ขับ tool set จริง (fix.27 เพิ่ม 7 ข้อของสำเนียง element form) ∴ ยังไม่มีข้อไหนพิสูจน์ว่าบน **VS Code จริง** "เทิร์นที่โมเดลเขียน markup → การ์ดเครื่องมือ + notice โผล่" — ต้องมี mock provider ที่ตอบ markup รูป element form
3. **คำถามค้างข้อ 1 (แถบสีเทา)** — ต้องได้คำตอบก่อนจึงจะรู้ว่าต้องแก้เพิ่มหรือปิดเป็น "วาดจากข้างหลังแผง"
4. ~~สำเนียง element form ที่ fix.26 ตาบอด~~ และ ~~คำถาม "GLM 5.3 Flash ตั้งค่าได้มั้ย / ค่าที่ถูกคืออะไร"~~ ✅ ทั้งคู่ปิดใน fix.27 (Level ที่ถูก = Low/High/Max + แก้สวิตช์ Thinking ที่ปิดตัวเองถาวร)

---

## 🧪 dev.6-fix.25 — แชท GLM 5.3 Flash "ทำงานไม่ได้เลย": โมเดลเขียน tool call เป็น **ข้อความ** แล้ว runtime ตีความว่า "จบคำตอบแล้ว" (2026-09-20)

**สถานะ:** ✅ เสร็จ · agents `bunx vitest run` **101/101** (ใหม่ 19: parser 13 · runtime recovery 6) · core **2,509 เทสต์: 2,410 ผ่าน / 13 fail / 86 skip** โดย **13 ตัวที่ fail เป็นชุดเดิมทุกตัว** (`cron-runner` 3 · `hub/server` 3 · `runtime-builder` MCP 2 · `workspace-manifest` 2 · `hook-file-hooks` · `checkpoint-hooks` · `local-provider-service` offline · `runtime-commands` · `bash` detached log — พังอยู่ก่อนรอบนี้และไม่แตะไฟล์ที่แก้) · app vitest **974/974** (81 ไฟล์) · webview vitest **557/557** (67 ไฟล์) · `tsc` สะอาด (agents `tsconfig.dev.json`) · biome `--diagnostic-level=error` ไม่มี finding ในไฟล์ที่แตะ · **`bun run repro:tool-call-text` 6/6 PASS** (และ **FAIL 4/6 บนบิลด์ก่อนแก้** — ดูด้านล่าง) · **แพ็ก VSIX แล้ว:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.25.vsix` (11,975,751 B @ 2026-09-20T15:45:00Z · 60 files · version ใน VSIX = `0.1.18-dev.6-fix.25` · About = `dev build 6 · fix.25` — ตรวจในไบต์จริง **จากใน VSIX เอง**: host bundle มี `Available tools: ` · `Unknown tool: ` · `function_calls` · `parameter|param` · `antml_invoke` และ webview bundle มี `dev build 6 · fix.25` · สคริปต์คืน `package.json`/`build-metadata.ts` แล้ว ไม่มี `.wip.bak` ตกค้าง)

**ที่มา (maintainer):** smoke `fix.24` รอบ 1 แชท *"การทดสอบ Dev.6-fix.24 รอบที่ 1 (ด้วยโมเดล GLM 5.3 Flash - Free)"* — **"ไม่สามารถทำงานได้เลย"** · ยังไม่ commit: รอบ fix.24 ถูก commit ไปแล้ว (`183764bf8`) ก่อนเริ่มรอบนี้ ∴ diff ของรอบนี้มีแต่ SDK + repro + เอกสาร

### หลักฐานที่อ่านมา (ไม่ใช่การเดา)

ทรานสคริปต์จริงของ session `1789917200875_uxy74` (`~/.cline/data/sessions/…/…messages.json` · `model: z-ai/glm-5.3-flash` · `provider: cline` · 6 ข้อความ · `tokensOut: 990` · `status: completed` · `exit_code: 0`):

- **ทั้ง 3 เทิร์นของ assistant ไม่มี `tool_use` block เลยแม้แต่ตัวเดียว** — แต่ข้อความ *text* ของเทิร์นที่ 2 และ 3 มี `<tool_call><invoke name="list_files"><parameter name="path">…</parameter></invoke></tool_call>` อยู่ในนั้นตรง ๆ
- **`list_files` ไม่ใช่เครื่องมือของ runtime นี้** (ของจริงคือ `read_files`, `search_codebase`, `run_commands`, `editor`, …) — เป็นชื่อเครื่องมือของ Cline รุ่นคลาสสิกที่โมเดลจำมาจากน้ำหนักของตัวเอง · system prompt ก็ไม่ได้ระบุชื่อนี้ (กวดขันไว้ที่ `read_files`/`run_commands`/`editor` เท่านั้น และมีข้อ "do not fabricate tool-call markup inside plain text" อยู่แล้ว)
- **ไม่ใช่ regression ของบิลด์:** ในบิลด์เดียวกันอีกสอง session (`muse-spark` · `solar-pro4`) มี `tool_use: run_commands`/`editor` ครบและทำงานได้ → ปัญหาอยู่ที่โมเดลนี้ + **ช่องว่างใน runtime**
- reasoning ของโมเดลเองก็บอกว่า *"The list_files result didn't come back in transcript"* ⇒ โมเดล **รอผลลัพธ์** อยู่ แต่ไม่เคยได้

### รากของปัญหา (ชั้นที่ทำให้ "ทำงานไม่ได้เลย")

`AgentRuntime` ตัดสิน "จบงาน" จาก **จำนวน `tool-call` part** เท่านั้น: เทิร์นที่ไม่มี part นั้น → `finishRun("completed")` ∴ ทั้งบิลด์รายงานว่าสำเร็จ · ไม่มีเครื่องมือถูกเรียก · ไม่มีอะไรถูกป้อนกลับให้โมเดลแก้ตัว ⇒ เทิร์นถัดไปโมเดลก็เขียน markup เดิมซ้ำ (ผู้ใช้เห็นเป็น XML ดิบ ๆ ในแชท แล้วกด "ต่อเลยครับ" ก็ได้เดิม) · โค้ดเดิมรู้จัก markup นี้ที่เดียวคือ `message-builder.ts` (`TOOL_CALL_MARKUP_PATTERN`) และทำแค่ **ตัดให้สั้นลงเมื่อมันยาวเกิน** — ไม่มีที่ไหนตีความมันเป็น tool call เลย

### สิ่งที่แก้ (ต้นตอ)

- **`sdk/packages/agents/src/fabricated-tool-calls.ts` (ใหม่):** ตัวแกะ/ตัวล้างที่ไม่มี dependency ครอบ 3 ภาษาที่โมเดลจริงใช้เขียน: (1) `<invoke name="x"><parameter name="y">v</parameter></invoke>` (ทั้ง `<param>` และ wrapper `<tool_call(s)>`/`<function_call(s)>`), (2) รูป Cline เก่า `<x><parameter name="y">v</parameter></x>`, (3) JSON ใน wrapper (`{"name":…,"arguments":…}`) · เพดาน 16 call/เทิร์น · ล้างได้เฉพาะ **บล็อกที่สมบูรณ์** ∴ บล็อกที่สตรีมค้างอยู่ไม่ถูกฉีกกลาง และข้อความที่เพียง "พูดถึง" tag ไม่ถูกแตะถ้าไม่มีบล็อกถูกตัดออกจากข้อความเดียวกัน
- **`agent-runtime.ts` — กู้คืนก่อนตัดสินว่าจบ:** เทิร์นที่ **ไม่มี** tool-call part (และ `finishReason` ไม่ใช่ `max-tokens`/`error` — เทิร์นที่ถูกตัดกลางคันอาจขาด argument ∴ ไม่เดา) จะถูกแปลง: markup ถูกถอดออกจากข้อความ, call ที่แกะได้กลายเป็น `tool-call` part **จริงบนเทิร์นนั้นเอง** แล้วเดินผ่านทางเดิมทั้งสาย (policy → approval → executor) · **การเพิ่ม part กลับเข้าไปในข้อความสำคัญ** — transcript ต้องมีเทิร์นที่ *มี* คำขอ ก่อนผลลัพธ์ของมัน ไม่งั้นการ replay จะได้ tool result ที่ไม่มีคำขอ (ผู้ให้บริการปฏิเสธรูปนี้)
- **ชื่อที่ไม่รู้จัก = ผลลัพธ์ที่บอกทางออก:** `Unknown tool: list_files. Available tools: read_files, search_codebase, run_commands, editor` (จากทะเบียนจริงของ session ไม่เกิน 40 ชื่อ) ⇒ โมเดลแก้ตัวเองได้ในเทิร์นถัดไป · **ไม่ทำ alias** (เช่น `list_files` → อะไรก็ตาม) เพราะรูป argument ไม่ตรงกัน — ยัด argument ผิดรูปคือแย่กว่า error ที่พูดความจริง
- **แชทไม่ต้องเห็น XML ดิบ:** ข้อความที่สตรีมก็ถูกล้างด้วย (`assistant-text-delta.accumulatedText`) โดยเปิดตัวตรวจเมื่อพบ tag เท่านั้น (การตรวจผูกกับท้ายบัฟเฟอร์ 64 ตัวอักษร ∴ สตรีมที่ไม่เคยมี markup ยังเป็น O(n)) · เมื่อบล็อกถูกตัดออกจนข้อความว่าง part นั้นหายไป ไม่ทิ้งบัลลูนเปล่า
- **ไม่แตะ `guardrails.ts`:** กติกา "อย่าแต่ง tool-call markup" มีอยู่แล้วและโมเดลนี้ก็ไม่สนใจ — และเทสต์ของ overlay ห้ามเอ่ยชื่อเครื่องมือที่ไม่มีอยู่ (บทเรียน fix.5) ∴ ชั้นที่ถูกคือ **ชั้นที่โมเดลเลี่ยงไม่ได้** (runtime) ไม่ใช่ชั้นคำสั่ง

### หลักฐาน

- **`bun run repro:tool-call-text`** (ใหม่ · `scripts/repro-fabricated-tool-call.ts`) ขับ **tool set จริง** (`createBuiltinTools` → `read_files, search_codebase, run_commands, editor`) ผ่าน **`Agent` ตัวจริง** ด้วยเทิร์น GLM จากทรานสคริปต์:
  - **บนบิลด์ก่อนแก้ (พิสูจน์แล้วด้วยการ stash แล้ว build ใหม่):** `FAIL 4/6` — `requests=1 tool results=0` · markup ยังอยู่ในข้อความ assistant · โดยรวม `status=completed` ⇒ **คือบั๊กของผู้ใช้เป๊ะ ๆ** (รายงานว่าสำเร็จทั้งที่ไม่มีอะไรเกิดขึ้น)
  - **หลังแก้:** `PASS 6/6` — markup หายจากข้อความ assistant · คำขอ `list_files` กลายเป็น tool call จริงบนเทิร์นนั้น · โมเดลได้ `Unknown tool: list_files. Available tools: read_files, …` และเทิร์นถัดไปสั่ง `read_files` จริง (`requests=3 tool results=2`)
- **เทสต์ใหม่ 19 ข้อ:** `fabricated-tool-calls.test.ts` 13 ข้อ (รูปที่พบจริง · JSON · รูป Cline เก่า · single quotes · "ห้ามอ่านซ้ำ" · เพดาน · ข้อความล้วน/XML ล้วนไม่ถูกแตะ · บล็อกค้างสตรีมไม่ถูกฉีก) และ `agent-runtime.fabricated-tool-calls.test.ts` 6 ข้อ (รันจริง · ชื่อไม่รู้จักได้รายชื่อเครื่องมือ · ล้างตอนสตรีม · เทิร์นปกติไม่ถูกแตะ · เทิร์น `max-tokens` ไม่กู้คืน · เพดาน 16)
- **ของเดิมไม่พัง:** agents 101/101 (รวม `agent-runtime.test.ts` 74 ข้อเดิม) · core/app/webview ตามตัวเลขด้านบน · `repro:editor-write` ยังผ่าน

### จุด smoke (fix.25)

- **โมเดลที่เขียน tool call เป็นข้อความ ต้องทำงานได้จริง (ข้อสอบตรงของรอบนี้):** เลือกโมเดลในกลุ่ม `cline-free` ที่มีประวัตินี้ (เช่น GLM 5.3 Flash) → สั่งงานที่ต้องใช้เครื่องมือ (เช่น "สร้างโฟลเดอร์ของตัวเอง แล้วใส่ไฟล์ HTML สวย ๆ ไว้ข้างใน") ⇒ **ต้องไม่เห็น `invoke`/`tool_call` ปนในบัลลูนข้อความเลย** และ **ต้องมีการ์ดเครื่องมือ + ผลลัพธ์ตามมา** แล้วงานเดินต่อได้
- **ชื่อเครื่องมือที่ไม่มีอยู่ ต้องได้คำตอบที่บอกทางออก:** ในการ์ดผลลัพธ์ของ call ที่ชื่อเพี้ยน ต้องอ่านได้ว่า `Unknown tool: <ชื่อ> . Available tools: read_files, search_codebase, run_commands, editor` และเทิร์นถัดไปของ agent ต้องเปลี่ยนไปใช้ชื่อที่ถูก (ไม่วนซ้ำชื่อเดิม)
- **เทิร์นปกติต้องไม่เปลี่ยน:** แชทกับโมเดลที่เรียกเครื่องมือแบบ native (muse-spark / solar-pro4) ⇒ ข้อความ/การ์ดเหมือนเดิมทุกอย่าง (ไม่มีข้อความเตือนแปลกปลอม ไม่มี call โผล่เพิ่ม)
- **ของเดิมของ fix.24 ต้องยังทำงาน:** ออกจากหน้าแชทกลางงาน → งานเดินเบื้องหลัง · badge Working/Waiting/Done บนการ์ด Recent
- **งานที่ถูกตัดกลางคัน (`max-tokens`) ต้องไม่ถูกเดา:** ถ้าเทิร์นถูกตัดกลางคันตอนกำลังเขียน markup ⇒ ต้องเห็น error "max output token limit" ตามเดิม **ไม่ใช่** มีเครื่องมือถูกเรียกด้วย argument ที่ไม่ครบ

---

## 🏃 dev.6-fix.24 — **ออกจากหน้าแชทแล้วงานไม่ตาย** + งานที่สองรอคิว + badge งานที่กำลังทำบนการ์ด Recent (2026-09-20)

**สถานะ:** ✅ เสร็จทั้ง 2 ข้อที่เหลือของชุดที่อนุมัติ (ข้อ 1 + ข้อ 4) · ยัง **ไม่ commit** · app vitest **974/974** (81 ไฟล์ · รัน `--maxWorkers=2`) · webview vitest **557/557** (67 ไฟล์) · `tsc` สะอาดทั้ง app (`tsconfig.json` · `tsconfig.vscode-compat.json`) และ webview (`tsc -b` — ตัวนี้เท่านั้นที่ตรวจจริง เพราะ `webview-ui/tsconfig.json` เป็น `files: []` + project references ∴ `tsc --noEmit` เฉย ๆ ไม่ตรวจอะไร) · biome ที่ `--diagnostic-level=error` ไม่มี finding ในไฟล์ที่รอบนี้แตะเลย (ที่เหลือเป็น format ของ `agent-display-name.ts`/`quickStartPromptStorage.ts` ที่พังอยู่ก่อนและไม่ได้แตะ) · **แพ็ก VSIX แล้ว** (ตัวเลขด้านบน) · เทสต์ใหม่/แก้ในรอบนี้ **+35 ข้อ** ใน 8 ไฟล์

**สิ่งที่เปลี่ยน (จากคำขอ: "งานต้องไม่หยุดหรือตายไปขณะที่เราไปเปิดหน้าอื่น — วันนี้ทำได้ทีละ 1 หน้าแชท")**

- **การนำทางไม่ `stop()` session อีกแล้ว:** `clearTask` / `showTaskWithId` / `startNewSession` พัก session ที่ `isRunning` ไว้เป็น `parkedSession` (`SdkSessionLifecycle.parkActiveSession`) ⇒ ปุ่ม `+` · คลิกการ์ด Recent ไปงานอื่น · กลับหน้าแรก ล้วนไม่ฆ่างานที่กำลังทำ · งานที่ **idle** จบตามเดิม (ไม่มีอะไรต้องรักษา)
- **transcript ของงานที่พักไม่ถูกทิ้ง:** `SdkTaskControlCoordinator` เก็บ task proxy ของงานที่พักไว้ และ event ของงานนั้น (`sdk-session-event-coordinator.trackParkedSessionEvent`) ถูก **แปล + ต่อเข้า transcript ของงานนั้นเอง** โดยไม่ขึ้น webview ⇒ กลับมาแล้วเป็น "ต่อสาย" ไม่ใช่ "เล่นซ้ำ" (ข้อความที่กำลังสตรีมตอนเราออกไป จะต่อในบัลลูนเดิม ไม่กลายเป็น 2 บับ) · จุดนี้บังคับ `bumpConversationFence()` แทน `resetMessageTranslator()` เมื่อมีงานที่พักกำลังวิ่ง (`fenceConversation()`) เพราะ `reset()` ล้าง pointer ของสตรีมที่เปิดอยู่ → **ข้อความเดียวกันจะกลับมาเป็น 2 บับ (บับเดิมค้าง partial + บับใหม่)**
- **คำขออนุมัติ/คำถามของงานเบื้องหลังถูกพักทั้งใบ:** `SdkInteractionCoordinator.deferredAsk` — ไม่เขียนลง transcript ของงานที่แสดงอยู่ (และไม่เปิด diff preview ที่ไม่มีใครเห็น) ⇒ กลับไปงานนั้นแล้ว `surfaceDeferredAskForSession()` แสดงมันขึ้นมา **โดย promise ยังไม่ถูก resolve ∴ ปุ่ม Approve/Reject ใช้ได้ทันที** · `clearPending` ไม่ล้างมะโนคำขอของงานที่พัก
- **งานที่สองรอคิว:** `SdkTaskStartCoordinator` — สั่งงานใหม่ขณะงานเบื้องหลังยังวิ่ง ⇒ เก็บเจตนาไว้ (`hasQueuedTask`) แล้วเริ่มเองเมื่อเจ้าของเดิมถึง `idle` (สัญญาณใหม่ `onParkedSessionIdle` แยกจาก `onDidBecomeIdle` เพื่อไม่ให้ไปสั่ง rebuild วิวที่ผู้ใช้กำลังดู) · งานที่ "รอคำตอบผู้ใช้" (`pending`) ถือว่ายังทำงาน ∴ ไม่ถูกแซง · สั่งซ้ำ = คิวใหม่ทับคิวเดิม (ไม่สะสม)
- **ข้อ 4 — badge บนการ์ด Recent:** `ExtensionState.backgroundTask` (`SdkController.describeBackgroundTask`) = `{ taskId, title, isRunning, awaitingApproval }` **หายไปทั้งก้อนเมื่องานถูกหยุด/ถูกแทน** ∴ badge ไม่มีทางโกหก · **สามสถานะแยกกันที่ `webview-ui/src/icline/backgroundTaskBadge.ts`:** `Working` (สปินเนอร์ · กำลังทำ) · `Waiting` (ระฆัง · รอคำตอบเรา — มาก่อน Working เพราะ `pending` ของ SDK ก็นับเป็น running) · `Done` (เครื่องหมายถูก · **จบแล้วขณะเราไม่ดู**) ⇒ ไมุ่บเป็นอันเดียว เพราะป้ายที่เขียนว่า "Working" ทั้งที่งานจบแล้วคือการโกหก · แบนเนอร์เหนือ Recent บอกชื่องาน + ปุ่ม `View` และต่อท้ายด้วย "your next task starts when it finishes" เฉพาะเมื่อมีคิว (ถ้าเจ้าของคิวรอคำตอบอยู่ ⇒ "your next task waits until you answer it" เพราะคิวเริ่มจาก idle เท่านั้น)
- **กัน phantom:** งานที่พักและ **idle** (จบแล้ว) ถูก `endParkedSession` ทิ้งเมื่อเราออกจากมันครั้งถัดไป (`clearTask:idle` / `showTaskWithId:idle`) ⇒ ไม่มี session ค้างเป็น "งานเบื้องหลัง" ที่ไม่ได้ทำอะไร แต่ยังขึ้นป้ายบนการ์ด
- **กันเคสที่เหลือ:** คลิกการ์ดของงานที่กำลังดูอยู่และยังวิ่ง → เป็น no-op (ไม่ไปโหลดจากดิสก์ทับ transcript ที่ยังสตรีม) · ยกเลิกงานเบื้องหลัง (`cancelTask` ขณะ live session เป็น parked) → abort + `endParkedSession` และ transcript ของงานที่แสดงอยู่ไม่แตะ

### จุด smoke (fix.24)

- **ออกจากหน้าแชทกลางงาน ⇒ งานต้องไม่ตาย:** สั่งงานที่ใช้เวลานาน (เช่น ให้สร้าง/แก้หลายไฟล์) → กด `+` (หรือคลิกการ์ดแชทอื่น) ทันที → **รอ ~15 วินาที** → เปิดการ์ดของงานนั้นกลับมา ⇒ บทสนทนาต้อง **ต่อเนื่องจากที่เห็น** (มีข้อความ/เครื่องมือใหม่ที่เกิดระหว่างที่เราไม่อยู่) และ agent ยังทำงานต่อได้ (ไม่มีการเริ่มใหม่จากต้น)
- **ข้อความที่กำลังสตรีมตอนออกไป ต้องไม่กลายเป็น 2 บับ:** สั่งงานแล้วรอจนข้อความกำลังพิมพ์ขึ้นบนจอ → ออกจากหน้าแชททันทีขณะยังสตรีม → กลับมา ⇒ ข้อความนั้นต้องเป็น **บัลลูนเดียว** ที่มีเนื้อหาต่อเนื่อง (ไม่ใช่บับแรกค้างมีสปินเนอร์ + บับที่สองที่ต่อข้อความเดิม)
- **คำขออนุมัติของงานเบื้องหลังต้องรอ:** ให้งานเบื้องหลังขออนุมัติเครื่องมือ (หรือถามคำถาม) ขณะที่เราอยู่แชทอื่น ⇒ **ต้องไม่มี** ปุ่ม Approve/Reject โผล่ในแชทที่เรากำลังดู (และต้องไม่มี diff เปิดขึ้น) · พอกลับไปงานนั้นต้องเห็นคำขอนั้นและกดได้จริง (งานเดินต่อได้)
- **งานที่สองรอคิว:** ระหว่างที่งานแรกยังวิ่ง กด `+` แล้วพิมพ์งานใหม่ → หน้าแรกต้องขึ้นแบนเนอร์ "Still working in the background: … — your next task starts when it finishes" และ **งานใหม่ต้องยังไม่เริ่ม** · เมื่องานแรกจบ งานที่พิมพ์ค้างไว้ต้อง **เริ่มเอง** พร้อมข้อความที่พิมพ์ครบ
- **badge ต้องบอกความจริงทั้งสามแบบ:** ดูการ์ด Recent ขณะมีงานเดินเบื้องหลัง ⇒ การ์ดนั้นขิ้น `Working` (และ `Waiting` ถ้ามันรอคำสั่งเรา) · ปล่อยให้งานเบื้องหลัง **จบ** ระหว่างที่เราอยู่หน้าแรก ⇒ ป้ายต้องเปลี่ยนเป็น `Done` **ไม่ใช่ค้างที่ Working** · แล้วเมื่อเราออกจากงานนั้นอีกครั้ง ป้ายต้อง**หายไป** (ไม่ค้างเป็นงานผี)
- **ของเดิมต้องไม่พัง:** ย้ายวิว (Secondary Side Bar) กลางงานที่กำลังทำ ⇒ งานต้องไม่ตายเช่นกัน · กด Stop บนงานที่กำลังทำอยู่หน้าจอ → ได้แถว Resume ตามเดิม · เปิดแชทเก่าจากประวัติแล้วปิด ⇒ งานเบื้องหลังยังอยู่

---

## 🔧 dev.6-fix.23 — เพดาน `editor` 6,000 → 32,000 ตัวอักษร + **ย่อรูปก่อนเข้าโมเดล** (2026-09-20)

**สถานะ:** ✅ เสร็จ (2 ใน 4 ข้อที่อนุมัติ — อีก 2 ข้อปิดใน `dev.6-fix.24`) · core `bun run build` สะอาด · core รวม **2,504 เทสต์: 2,397 ผ่าน / 21 fail / 86 skip** โดย **21 ตัวที่ fail ไม่เกี่ยวกับรอบนี้เลย** (`cron-runner` 10 · `hub/server` 3 · `runtime-builder` MCP 2 · `workspace-manifest` 2 · `hook-file-hooks` · `checkpoint-hooks` · `local-provider-service` offline · `runtime-commands` — ทุกตัวพังอยู่ก่อนและไม่แตะไฟล์ที่รอบนี้แก้) · กลุ่มที่แตะ: `media` + `extensions/tools` + `message-builder` + `user-input-builder` **428 ผ่าน** · app vitest `hooks-adapter`/`tool-write-pipeline`/`guardrails` **27/27** · `bun run repro:editor-write` **PASS ทุกข้อ** · e2e บน VS Code จริง `oversized-editor-write` **3/3 (24.4s)** · `tsc` สะอาด (app compat · e2e generated) · biome ไม่มี error ใหม่ · **แพ็กแล้ว:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.23.vsix` (12,089,267 B @ 2026-09-20T13:02:26Z · 60 files) — ยังอยู่ใน `dist/` (ห้ามเขียนทับ) — ตรวจในไบต์จริงแล้วว่า host bundle มี `-character per-call limit` + `32000` + `downscaled to fit the model's image input` และ webview bundle มีสตริง `fix.23` · สคริปต์คืน `package.json`/`build-metadata.ts` แล้ว (ไม่มี `.wip.bak` ตกค้าง · `git status` มีแต่ไฟล์ที่ตั้งใจแก้)

### ข้อ 2 — ลบกำแพง 6,000 ตัวอักษรของ `editor` (รากของคำขอที่บานปลาย)

- **หลักฐานจากแชทจริง:** 6 ใน 9 ครั้งของข้อความสีส้มคือ `Editor input too large: new_text was 6079/6113/6729/7144/8181 characters` ⇒ ทุกไฟล์ HTML/CSS/JS ที่ยาวกว่านี้ถูก **ปฏิเสธก่อนแตะดิสก์** แล้วโมเดลต้องฉีกเป็น 2–4 คำขอ (แต่ละครั้ง = provider round trip เต็ม) · ตอนที่มาถึงเครื่องมือ argument นั้น **ถูกส่งมาครบและ parse สำเร็จแล้ว** ⇒ เพดานนี้ไม่ได้กันอะไรในจังหวะที่มันปฏิเสธ
- **แก้:** `EDITOR_INPUT_CHAR_LIMIT = 32_000` (ใหม่ ใน `extensions/tools/schemas.ts` ใช้ทั้งการตรวจขนาด + คำอธิบาย schema ที่โมเดลอ่าน) · `INPUT_ARG_CHAR_LIMIT = 6000` ยังอยู่ตามเดิมในฐานะ "งบคำแนะนำ" ของข้อความ command เท่านั้น (ไม่มีการบังคับใช้) · ข้อความปฏิเสธใหม่บอก **ขนาดจริง + ยังไม่เขียนอะไรลงดิสก์ + วิธีส่งใหม่ (chunk + `insert_line`)** ในข้อความเดียว (เดิมมีถ้อยคำ "less likely to be truncated or time out" ที่ชี้สาเหตุผิด) และ **ตัดถ้อยคำซ้ำ** ที่ fork ต่อท้ายอีกชั้นออก
- **ตัวเลขเพดานต้องมีที่เดียว:** fork เห็นผ่าน `EDITOR_INPUT_CHAR_LIMIT` ที่ `apps/vscode/src/icline/harness/guardrails.ts` (vitest alias `@cline/core` เป็น stub ∴ import ค่าจริงไม่ได้ — มีเทสต์ปักตัวเลข + `bun run repro:editor-write` พิสูจน์กับเครื่องมือจริง) · overlay ที่โมเดลอ่านตอนนี้บอกว่า **"ไฟล์ทั้งไฟล์ลงในคำขอเดียวได้ ไม่ต้องฉีก"** แล้วค่อยบอกวิธีฉีกเมื่อเกินเพดาน
- **พิสูจน์ขอบเขตจริง (`bun run repro:editor-write`, เครื่องมือจริง + ดิสก์จริง):** 32,000 สำเร็จ/32,001 ถูกปฏิเสธ · แบทช์ขนาน 4 คำขอที่ "ขนาดเดิมจากทรานสคริปต์" (5000 · 7020 · 6741) **ลงดิสก์ได้ทุกใบในคำขอเดียว** (ก่อนรอบนี้ 7020/6741 ถูกปฏิเสธ) และเฉพาะ 32,500 ที่ถูกปฏิเสธ ⇒ `success=[true,true,true,false]`
- e2e บนหน้าต่าง VS Code จริง (`oversized-editor-write.test.ts`) อัปเดตมาใช้เพดานใหม่ (fixture ดึงขนาดจากค่าคงที่ของแอปเอง ∴ เลื่อนหลุดขอบเขตไม่ได้) และยังยืนยันครบ 4 อย่าง: ไม่มีไฟล์ลงดิสก์ · ข้อความของเครื่องมือถึงโมเดล · ไม่มี ENOENT · มีวิธีส่งใหม่ในข้อความที่ผู้ใช้เห็น

### ข้อ 3 — รูปต้องถูกย่อก่อนเข้าโมเดล (dependency-free PNG codec)

- **ทำไม:** รูปที่อยู่ในทรานสคริปต์ถูกส่งซ้ำ **ทุกคำขอต่อจากนั้น** และผู้ให้บริการย่อรูปเองอยู่แล้ว (Anthropic 1,568px · OpenAI-compatible ~2048px + เพดาน image token) ⇒ พิกเซลที่เกินกว่านั้นไม่มีใครเห็น แต่ต้องจ่ายค่าส่งทุกคำขอ
- **โค้ดใหม่ `sdk/packages/core/src/media/png.ts`** (ไม่มี dependency เพิ่ม — `node:zlib` + ถอด/เข้ารหัส PNG เอง): รองรับ colour type 0/2/3/4/6 · bit depth 8 · non-interlaced · box filter แบบ **premultiplied alpha** (กันขอบดำ/halo) · เข้ารหัสใหม่เป็น RGBA ที่ deflate ระดับ 3 (วัดแล้ว: ระดับ 6 แพงกว่า ~5 เท่าเพื่อลดขนาดไม่ถึง 10% และงานนี้วิ่งอยู่ใน tool call)
- **ย่อที่จุดที่รูป "เข้า" ไม่ใช่ตอนส่ง** (ราคา decode/encode ต่อเทิร์นจะแพงกว่าที่ประหยัด): `read_files` ที่อ่านไฟล์ `.png` · `buildInitialUserContent` สำหรับรูปที่ผู้ใช้แปะ ⇒ ทั้งคู่เรียก `downscalePngIfNeeded` / `downscaleBase64Png`
- **ทุกทางออกของความล้มเหลว = คืนของเดิม:** ไม่ใช่ PNG · เล็กกว่าเพดานอยู่แล้ว · ถอดรหัสไม่ได้ (16-bit/ย่อย palette/interlaced/ไฟล์ขาด) · **หรือไฟล์ที่เข้ารหัสใหม่ไม่เล็กกว่าเดิม** ⇒ GIF/JPEG/WEBP ผ่านไปทั้งไบต์ (GIF animated ห้าม re-encode)
- **ตาข่ายกันล้มของ `MessageBuilder` เปลี่ยนจาก "ทิ้ง" เป็น "ย่อ":** รูปที่เกินงบต่อใบเคยถูกแทนด้วย `[media omitted: …]` (โมเดลอ่านแต่ placeholder) ⇒ ตอนนี้ลองย่อให้พอดีก่อนตัดสินใจทิ้ง และทำ **เฉพาะเส้นทางที่เกินงบอยู่แล้ว** ∴ ไม่มี CPU เพิ่มในเส้นทางปกติ
- เทสต์ใหม่ 20 ข้อ: `media/png.test.ts` 14 (round-trip · ฟิลเตอร์ 1–4 ที่ทดสอบด้วย PNG ที่สร้างฟิลเตอร์เอง · palette + tRNS · grayscale/gray+alpha · ข้อกำหนด "คืน undefined ไม่เดา" · box filter + alpha) · `file-read.test.ts` (+1: รูป 2400×1600 ถูกย่อเป็น 1568×1045 และรายงานขนาดเดิม→ใหม่) · `user-input-builder.test.ts` ใหม่ 5 · `message-builder.test.ts` (+1: เกินงบ ⇒ ย่อให้พอดี ไม่ใช่ทิ้ง)

### จุด smoke (fix.23)

- **ไฟล์ใหญ่ลงในคำขอเดียว:** ให้ agent สร้างไฟล์ HTML/CSS ที่ยาว ~7,000–10,000 ตัวอักษร ⇒ **ต้องไม่เห็น** `Editor input too large` และ **ไม่ต้องมีคำขอเขียนไฟล์ซ้ำ/แยกชิ้น** (ก่อนแก้: ทุกไฟล์ถูกปฏิเสธแล้วฉีก 2–4 คำขอ)
- **เพดานยังทำงานเมื่อเกินจริง:** ถ้าเจอ `Editor input too large` ต้องบอกขนาดจริง + "nothing was written" + วิธีส่งใหม่ (และต้องมีแค่ที่เดียว ไม่ซ้ำเป็นสองบรรทัด)
- **รูปไม่กินคอนเทกซ์:** ให้ agent อ่านรูป `.png` ขนาดใหญ่ (screenshot หน้าจอเต็ม) ⇒ ผลลัพธ์ต้องมีข้อความ `… (downscaled to fit the model's image input: 3024x1964 → 1568x1019, …)` และ **คำขอถัด ๆ ไปต้องไม่พา base64 ขนาดเดิมไปด้วย** (ดู `inputTokens` ต่อคำขอ — ไม่ควรกระโดดเป็นแสนเพราะรูปใบเดียว)
- **รูปที่แปะจากผู้ใช้:** แนบ screenshot ใหญ่ในช่องแชท ⇒ รูปย่อในช่องแชท **ไม่** เปลี่ยนขนาดที่เห็น (การย่อเกิดฝั่งส่งเข้าโมเดล) และยังส่งได้ตามปกติ
- ของเดิมทั้งหมดของ fix.18–fix.22 ยังใช้ได้

### คิวถัดไป (2 ข้อนี้ **ปิดแล้วใน fix.24**)

1. ~~**งานเดินต่อได้ขณะออกจากหน้าแชท**~~ ✅ fix.24 — พัก session (`parkedSession`) แทน `stop()` + transcript ของงานที่พักถูกเก็บไว้ + คำขออนุมัติถูกพัก
2. ~~**Working badge บนการ์ด Recent**~~ ✅ fix.24 — `ExtensionState.backgroundTask` + ป้าย `Working`/`Waiting` + แบนเนอร์พร้อมปุ่ม `View`

**คิวที่เหลือจาก fix.24 (ยังไม่ทำ):**

- **ลบงานที่พักทีหลัง?** ข้อจำกัดที่รู้อยู่: วันนี้มีงานที่พักได้ **หนึ่งงานต่อหนึ่งวิว** เท่านั้น (สั่งงานที่สาม = คิวต่อจากงานที่สอง) · งานที่พักอยู่จะถูก `stop()` จริงเมื่อเริ่มงานใหม่/ปิด extension
- **ยังไม่ได้ยืนยัน:** เคสเปิด VS Code สองหน้าต่างพร้อมกัน (`parkedSession` เป็นของ SdkController ต่อวิว/api instance — ถ้าแยกกันก็ไม่มีปัญหา)
- **งานที่พักและรอคำตอบค้างไว้จะกันคิวไว้ไม่ให้เริ่ม** (เจตนา: มีงานได้ทีละหนึ่ง) แต่ยังไม่มีทาง "ข้ามคิว" จาก UI — ต้องกลับไปตอบงานนั้นก่อน

---

## 🔬 dev.6-fix.22 — ตรวจแชท smoke จริงของ fix.21 → รากของ "auto-compacting ถี่ + ช้าลง" คือ **base64 ของรูปใน `read_files`** (2026-09-20)

**สถานะ:** ⏳ รอบนี้ยังไม่แพ็ก VSIX · เทสต์ที่รัน: shared `436` (ใหม่ `tokens` 10) · core `extensions/context` **92** (ใหม่ skip-log 1) · llms `gateway` **156** · webview vitest **545/545** (ใหม่ `recentTime` 7 + `HistoryPreview` 1) · extension bun unit `Logger` **4** · `tsc` สะอาด (app · webview · shared · core) · biome ไม่มี error ใหม่ (เหลือ a11y info เดิม 4 ตัว) · **ยังไม่ commit**

### หลักฐานที่อ่านมา (ไม่ใช่การเดา)

ตรวจจากของจริงบนเครื่องผู้ใช้ ไม่ได้ดูแค่ภาพหน้าจอ:
- **ทรานสคริปต์ของ session จริง:** `~/.cline/data/sessions/1789900461463_19uqa/` — `การทดสอบ Dev.6-fix.21 รอบที่ 1 (DeepSeek-v4.1-Flash)` · 246 ข้อความ · 108 คำขอ · 75 นาที · `inputTokens` รวม **15.08M** · `inputTokens` ต่อคำขอโตจาก 4,413 → **166,027** · กลางทางมี **สองจุดที่ prompt ลดฮวบ** (220,329 → 114,060 ตอน +53 นาที · 252,871 → 91,449 ตอน +66 นาที)
- **sidecar ของการ compact:** `…compaction.json` (ตัด 177 ข้อความ → เหลือ 65) · **log ของ VS Code:** `%APPDATA%/Code/logs/20260919T193604/window1/exthost/output_logging_20260920T170810/1-Cline.log` (9 MB · `Context compaction diagnostics` 110 ครั้ง · `Performed agentic compaction` **1 ครั้ง** ที่ 11:40:11Z)
- **ขนาดข้อความในทรานสคริปต์:** 4 ข้อความกินพื้นที่ **~3.96 MB จาก 5.26 MB ทั้งหมด** และทั้งสี่คือ `tool_result` ของ **`read_files` ที่อ่านไฟล์ `.png`** (`nodal-hero-1440` 987k ตัวอักษร · `nodal-gallery` 1.16M · `nodal-physics` 891k · `nodal-thai-drum` 918k — เวลา 11:39:55 / 11:40:05 / 11:41:23 / 11:44:56 น. ซึ่งคือ **นาทีก่อนและหลังการ compact ครั้งเดียวที่สำเร็จ**)

### คำตอบ 4 ข้อที่ maintainer ถาม

**1) ข้อความสีส้ม = tool ล้มเหลวจริง ไม่ใช่บั๊ก และไม่ใช่ Error ของแอป**
ทั้ง 9 ครั้งเป็นผลลัพธ์ของเครื่องมือที่ล้มเหลวและถูกทำเครื่องหมาย `is_error` อย่างถูกต้อง ⇒ สีส้มคือความหมาย "เครื่องมือนี้ล้มเหลว" ที่ควรมี · **แต่วิธีแสดงซ้ำซ้อนเกินไป** — ข้อความเดียวกันโผล่สองที่ (ผลลัพธ์ของ tool + แถวสรุป `1 tool call(s) failed: [editor] …` ซึ่งมาจาก MistakeTracker ใน `session-runtime-orchestrator.ts`) · และ 6 ใน 9 ครั้งเป็นเรื่องเดียวกัน: **`editor` รับ `new_text` ได้ไม่เกิน 6,000 ตัวอักษรต่อการเรียก** (`INPUT_ARG_CHAR_LIMIT` ใน `sdk/packages/core/src/extensions/tools/schemas.ts`) ซึ่งชนกับงานเขียนไฟล์ HTML/CSS/JS ทั้งไฟล์ทันที (6079 · 8181 · 6113 · 6729 · 7144 ตัวอักษร) ⇒ โมเดลต้องฉีกเป็น 2–4 คำขอเพิ่มทุกครั้ง (นี่คือสาเหตุหลักของ "คำขอเยอะขึ้น" ไม่ใช่บั๊กของ UI)

**2) `auto-compacting` / `auto-compaction-skipped` ถี่ = compaction ถูกกระตุ้นด้วย "ขนาด base64 ของรูป" ไม่ใช่จำนวน token จริง**
- เกณฑ์กระตุ้นคือ `estimated request ≥ 90% × maxInputTokens` และตัวประเมินคือ `estimateRequestInputTokens` = `JSON.stringify(ทั้งคำขอ).length / 3` (`CHARS_PER_TOKEN = 3`) — **ไม่มีกรณีพิเศษสำหรับบล็อกรูป** ⇒ รูป 1 ใบ ~0.9–1.2 MB ถูกคิด **~300,000 token** แทนที่จะเป็น ~1,600 token ที่ผู้ให้บริการคิดจริง (สูงเกิน ~200 เท่า)
- พอโมเดลอ่านภาพ 2 ใบ (11:39:55 + 11:40:05) ตัวเลขประเมินก็กระโดดข้ามเกณฑ์ 90% ทันที ⇒ `auto-compacting` แล้วจึงสำเร็จ 1 ครั้ง ⇒ **จากนั้นอ่านรูปเพิ่มอีก 2 ใบ** (11:41:23 + 11:44:56) ⇒ กลับไปเกินเกณฑ์อีก ⇒ **คู่ `auto-compacting`/`auto-compaction-skipped` ทุกตา** และคิวที่ "ยากขึ้นเรื่อย ๆ" = งานที่ต้อง compact ถูกยกขึ้นเป็นคำขอเพิ่ม (prompt พา base64 ไปด้วยทุกคำขอ) — ตรงกับที่ maintainer เห็น
- **ทำไม log เงียบ:** (ก) `Logger` ของ extension จะต่อท้าย payload ให้ **เฉพาะเมื่อ `IS_DEV=true`** ⇒ ใน VSIX (`1-Cline.log` 9 MB) คำว่า `requestInputTokens`/`maxInputTokens` **ไม่ปรากฏเลยแม้แต่ครั้งเดียว** (ข) เส้นทาง `return undefined` ของการ compact (มี 3 จุด: ทรานสคริปต์สั้นเกินไป / ไม่มีจุดตัดที่ปลอดภัย / ไม่มีอะไรใหม่เหนือจุดตัด) **ไม่ log อะไรเลย** ⇒ เห็นแต่ข้อความ notice บนจอที่ไม่ได้ถูกเก็บลงทรานสคริปต์
- **สาเหตุที่ไม่ใช่ "compact เร็วเกิน" แบบ fix.32/33:** รอบนั้นแก้เรื่องหน้าต่างของโมเดล (1.0M) ให้ runtime รู้จัก (fix.33 เป็นบรรพบุรุษของ HEAD นี้แล้ว) · รอบนี้คือ **ตัวประเมินนับรูปผิด** ซึ่งทำให้เกินเกณฑ์ได้แม้หน้าต่างจริงยังห่างไกล (จริง ๆ prompt อยู่ที่ 166k / 1.0M = 17%)

**3) ลำดับของประวัติแชท** → เพิ่ม **ป้ายบอกความใหม่** บนการ์ด (ข้อ 3 ของรายการที่ทำด้านล่าง)

**4) ทำงานเบื้องหลัง + Working badge** → **ยังไม่ทำในรอบนี้** เพราะเป็นการเปลี่ยนสถาปัตยกรรม (iCline ถือ session เดียวต่อ view) · ต้องออกแบบก่อน (ดู "คิวถัดไป")

### สิ่งที่แก้ในรอบนี้ (ราก+การมองเห็น)

- **`sdk/packages/shared/src/llms/tokens.ts` (รากของเรื่อง):** เพิ่ม `IMAGE_TOKEN_ESTIMATE = 1_600` และ `estimateValueTokens(value)` ที่ **พับ payload ของรูปทิ้งก่อนคิดขนาด** (คืน `[image]` แล้วบวก 1,600 token ต่อรูป) ครอบคลุมทั้ง `{type:'image',data}` · `{type:'image',source:{data}}` (สไตล์ Anthropic) · `{type:'image_url',image_url:{url:'data:image/…'}}` (สไตล์ OpenAI) และ data URL ที่ลอยอยู่ทั่วไป · **`estimateRequestInputTokens` และ `createTokenEstimator` ของ compaction ใช้ตัวเดียวกัน** ⇒ เกณฑ์กระตุ้น, หน้าต่าง `preserveRecentTokens`, และสูตรจุดตัด อ่านหน่วยเดียวกันหมด (เดิมตัวประเมินเองก็เป็นเหตุให้ "โซนเก็บท้าย" ยุบเหลือ 1–2 ข้อความเมื่อมีรูป ⇒ บางตาก็ไม่มีอะไรให้ fold ⇒ skip)
- **การมองเห็น:** `apps/vscode/src/shared/services/Logger.ts` — payload ถูกเก็บไว้เสมอสำหรับข้อความวินิจฉัยที่ตั้งใจให้อ่านในสนาม (`Context compaction diagnostics` · `Context compaction completed` · `Skipped compaction…` · `Agentic compaction …` · `Agent model request diagnostics`) และมี `CLINE_LOG_PAYLOADS=true` เป็นสวิตช์เปิดทั้งหมด (พร้อมตัดที่ 2,000 ตัวอักษรต่อ payload กัน log บวม)
- **เหตุผลของ skip ถูกบันทึกแล้ว:** `agentic-compaction.ts` ทั้ง 3 จุดที่เคย `return undefined` เงียบ ๆ + จุดที่ wrapper เห็นว่าไม่ได้ผล ⇒ `Skipped agentic compaction: …` / `Skipped compaction: strategy returned no result`
- **Recent บอกลำดับได้:** `webview-ui/src/icline/recentTime.ts` — ป้ายบอกความใหม่ "just now" → "14:32" (วันเดียวกัน) → "Yesterday" → "Fri" → "Sep 10" + `title` เป็นวันเวลาเต็ม · **ไม่เพิ่มความสูงการ์ด** และไม่แตะกริด/จำนวนคอลัมน์

### จุด smoke (fix.22)

- **รูปไม่ทำ compaction พัง:** แชทที่ `cline-free/*` (หน้าต่าง 1.0M) → ให้ agent อ่าน **ไฟล์ภาพ 3–4 ใบ** ผ่าน `read_files` ⇒ **ต้องไม่เห็น `auto-compacting` เลย** (ก่อนแก้: 1–2 ใบก็กระตุ้นแล้ว) และ `1-Cline.log` ต้องมี `Context compaction diagnostics` **พร้อมตัวเลข** (`requestInputTokens`, `maxInputTokens ~1,048,576`, `shouldCompact=false`)
- **ถ้ามี skip ต้องรู้สาเหตุ:** ถ้าเห็น `auto-compaction-skipped` ให้เปิด `1-Cline.log` ต้องเจอบรรทัด `Skipped agentic compaction: …` หรือ `Skipped compaction: strategy returned no result` ระบุเหตุผล
- **Recent อ่านลำดับออก:** หน้าแรกที่มีแชทวันนี้ ≥ 3 แชทและของเมื่อวาน ⇒ การ์ดบนสุดต้องเป็น **เวลา** (เช่น `14:32`) เรียงลงมา แล้วจึงเป็น `Yesterday` · hover ต้องเห็นวันที่เต็ม
- ของเดิมทั้งหมดของ fix.21/20/19/18 ยังใช้ได้

### คิวถัดไปที่โผล่จากรอบนี้ (ยังไม่ทำ — รออนุมัติ)

1. **งานเดินต่อได้ขณะออกจากหน้าแชท (หลาย session พร้อมกัน) + Working badge บนการ์ด Recent** — สถาปัตยกรรมวันนี้ถือ session เดียวต่อ view (`SdkController` + lifecycle ของวิว); ต้องมีโมเดล "หลาย task ที่ยัง active" ฝั่ง host ก่อน จึงจะใส่ badge ได้ · ขนาดงาน: ใหญ่ (proto/state/host + UI) ⇒ ต้องตกลงขอบเขตก่อน
2. **เพดาน 6,000 ตัวอักษรต่อการเรียกของ `editor`** — เป็นขีดจำกัดของ runtime (`INPUT_ARG_CHAR_LIMIT`) ที่กินคำขอเพิ่ม 2–4 ครั้งทุกไฟล์ที่ยาวกว่านี้ · ทางเลือก: ยกเพดานเฉพาะ `new_text` หรือให้ runtime **ฉีกเป็นชิ้นให้เอง** แล้วสรุปผลเป็นครั้งเดียว ⇒ ต้องเลือกนโยบาย
3. **ย้าย "N tool call(s) failed" ให้เป็นบรรทัดเดียวกับการ์ดผลลัพธ์** (ตอนนี้ข้อความเดียวกันขึ้นสองที่) — เล็ก แต่แตะ MistakeTracker/UI

---

## 🧰 dev.6-fix.21 — "Recent" หลายคอลัมน์บนหน้าแรก + **แก้บั๊ก: draft ในช่องแชทหายเมื่อย้ายวิว** (2026-09-20)

**สถานะ:** ✅ เสร็จ · webview vitest **537/537** (เดิม 501 + ใหม่ 36: `recentGrid` 15 · `HistoryPreview` 5 · `composerDraftStorage` 10 · `useChatState` 6) · `tsc` สะอาดทั้ง app (`tsconfig.vscode-compat.json`) และ e2e (`tsconfig.test.generated.json`) · biome: **ไม่มี finding ใหม่** (แก้ format ของตัวเอง 2 ไฟล์ · เหลือ a11y info 4 ตัวเดิมของ `HistoryPreview.tsx`) · e2e บน VS Code จริง **16/16 ที่ 3 worker (2m00s)** รวม assertion ใหม่ของ draft · ⚠️ **ยังไม่ commit** (pack จาก working tree ก่อน ⇒ เนื้อไฟล์เหมือนที่จะ commit) · **แพ็กแล้ว:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.21.vsix` — ⏳ รอ maintainer smoke

**ที่มา (maintainer อนุมัติ 2 ข้อ):**
1. เก็บ **draft ของช่องแชท** ไว้ให้รอดการย้ายวิว (ข้อที่ fix.20 บันทึกไว้ว่า "ไม่ได้แก้": ข้อความ/ไฟล์ที่พิมพ์ค้างหายเพราะ VS Code สร้าง webview ใหม่)
2. หน้าแรก: Recent ยัง **3 แถวเท่าเดิม** แต่ให้ปรับเป็น 2–3 คอลัมน์ตามความกว้างที่ใช้จริง (ชื่อ session สั้น ⇒ แถวยาว 1 คอลัมน์เหลือที่ว่างเยอะ) ⇒ เห็น 6–9 แชทก่อนต้องกด View All

**สิ่งที่ทำ (1) — draft รอดการย้ายวิว:**
- โมดูลใหม่ `webview-ui/src/icline/composerDraftStorage.ts` (พี่น้องกับ `quickStartPromptStorage.ts`): **one slot** ไม่ใช่ต่อ task (ช่องแชทมีใบเดียว · การสลับ task วันนี้ก็ไม่ล้างข้อความ) · **แยกคีย์ `text` กับ `attachments`** เพราะการพิมพ์ทุกคีย์สโตรกต้องไม่ลากการ re-serialize รูป base64 ทั้งก้อน · เพดานไฟล์แนบ `1_000_000` ตัวอักษร ⇒ รูปที่เกินถูกตัด (เก่าสุดก่อน) และ `console.warn` ครั้งเดียวต่อ session
- `useChatState` อ่าน draft **ตอน mount** (ก่อน paint แรก ⇒ ไม่กระพริบว่าง) แล้ว **เขียนผ่านทุกครั้งที่ช่องแชทเปลี่ยน** ⇒ ไม่ต้องมีคำสั่ง "save draft" ที่ไหน และ **การส่งข้อความ (ที่ล้างช่องแชทอยู่แล้ว) = ล้าง draft เอง** · เทสต์ `useChatState.test.ts` จำลอง "webview ถูกสร้างใหม่" ด้วย unmount → mount ใหม่
- **ทำไม localStorage ไม่ใช่ state ของ host:** VS Code สร้าง webview ใหม่ให้ view เดิมใน **origin เดิม** ⇒ localStorage รอด (ยืนยันบนหน้าต่างจริง ด้านล่าง) และไม่ต้องแตะ proto/host state เลย · ข้อจำกัดที่ยอมรับ: ถ้าเปิด VS Code สองหน้าต่างพร้อมกัน หน้าต่างที่สองอาจเห็น draft ของหน้าต่างแรก (ยังไม่ยืนยันว่า origin แยกต่อหน้าต่างหรือไม่)
- **หลักฐานบนหน้าต่างจริง (probe):** พิมพ์ใน composer ของ sidebar ⇒ `localStorage` มีคีย์ `icline-composer-draft-text` และค่าเป็นข้อความนั้น · หลังย้ายวิว webview ใหม่ได้ **origin เดิม** (`vscode-webview://0tvl…`) และอ่านค่าเดิมได้ ⇒ `secondary-side-bar.test.ts` เพิ่ม assertion: พิมพ์ draft ค้างไว้ก่อนย้าย → หลังย้าย `chat-input` ต้องมีค่าเดิม (ก่อนรอบนี้ได้ `""`)

**สิ่งที่ทำ (2) — Recent หลายคอลัมน์:**
- โมดูลใหม่ `webview-ui/src/icline/recentGrid.ts`: `recentColumnCount(width)` (≥240px ต่อการ์ด + gap 8px · เพดาน 3) · `recentVisibleCount(columns)` = columns × 3 · `sliceRecentTasks` · `useRecentColumnCount(element)`
- `HistoryPreview.tsx`: จาก list 1 คอลัมน์ (`px-4` + `.history-preview-item { margin-bottom: 8px }`) เป็นกริด `repeat(var(--history-columns), minmax(0,1fr))` + `gap: 8px` · ติด `data-icline-recent-grid` / `data-columns` ให้เทสต์กับคนอ่าน DOM · **ความสูงการ์ดไม่แตะ** (ชื่อยัง clamp 2 บรรทัด) และการ์ดในแถวเดียวกันสูงเท่ากัน (`align-items: stretch`)
- **การวัด:** ฮุกใช้ **callback ref** (กริดเกิดหลังประวัติมาถึง — ถ้าใช้ ref object ธรรมดา effect จะพลาดกริดที่ยังไม่มี) + `ResizeObserver` บนตัวกริด (jsdom ไม่มี ⇒ ถอยไปฟัง `window.resize`) · ผลจริง: pane ~843px อย่างที่ maintainer ใช้ = **3 คอลัมน์** · ~600px = 2 · sidebar ~300px = 1 (ค่าเดิม)
- เทสต์: `recentGrid.test.ts` 15 ข้อ (สูตร/ขอบเขต/NaN/กริดที่เกิดทีหลัง/ทั้งสองเส้นทางการวัด) · `HistoryPreview.test.tsx` 5 ข้อ (mock `ResizeObserver` แล้วป้อนความกว้าง ⇒ 3→6→9 การ์ด · 3 คือเพดาน · คลิกเปิด session · View All · สถานะว่าง)

**จุด smoke (fix.21):** ของเดิมทั้งหมดของ fix.18/19/20 ยังใช้ได้ + เพิ่ม 2 ข้อ:
- **Recent หลายคอลัมน์:** เปิดหน้าแรก (ต้องมีประวัติ ≥ 4 แชท) บนหน้าแชทกว้าง (~875px) ⇒ ต้องเห็น **3 คอลัมน์ × 3 แถว = 9 แชท** โดยความสูงแถวเท่าเดิม · ลากขอบให้แคบลง ⇒ 3 → 2 → 1 คอลัมน์ แต่ยัง **3 แถวเสมอ** · ที่เกิน 9 ยังใช้ View All
- **draft รอดการย้ายวิว:** พิมพ์ข้อความค้างไว้ (ยังไม่ส่ง) + แนบรูป 1 รูป ⇒ ย้ายวิวไป Secondary Side Bar ⇒ ข้อความ **และรูปย่อ** ต้องยังอยู่ในช่องแชท ⇒ ส่งได้ตามปกติ (ส่งแล้ว draft ต้องไม่กลับมาอีก)

---

## 🧰 dev.6-fix.20 — e2e รันขนานได้ + fixture ย้ายวิวไป Secondary Side Bar + **แก้บั๊ก: ย้ายวิวแล้วแชทหาย** (ทั้ง "หน้าจอว่าง" และ "task ถูกเคลียร์") (2026-09-20)

**สถานะ:** ✅ เสร็จ (รวม **รอบเสริม 2** ด้านล่าง: ปิดเคส "ย้ายวิวกลางบทสนทนา" + ล้างเทสต์ที่พังเพราะ env ของเครื่อง) · e2e บน VS Code จริง **16/16 ทั้งชุด × 5 รอบติดกัน ไม่มี retry** (3 รอบแรกหลังทำขนาน: 2m19s / 2m17s / 2m21s · 2 รอบหลังรอบเสริม 2: **2m07s / 2m04s** ที่ 3 worker เทียบกับ **4m24s** ตอน `workers: 1` — เร็วขึ้น ~2 เท่า) · unit tests ฝั่ง extension **1032 pass / 0 fail** (69 ไฟล์ — ตัวที่เคย fail คือ `shell.test.ts` › "expands and selects the first configured profile path when it exists" ตอนนี้ผ่านแล้ว ดู "รอบเสริม 2") · `tsc` สะอาดทั้ง app และ e2e (`tsconfig.test.generated.json`) · biome: **ไม่มี warning ใหม่** — รอบแรก **ลบ warning เดิมออก 1 ตัว** (`helpers.ts` ตัวแปรตายของ fixture `clineTestDir`) และที่เหลือ 2 ตัวเป็น warning เดิมของ `src/__tests__/config.test.ts` · **แพ็กแล้ว:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.20.vsix` (12,084,123 B @ 2026-09-20T09:28:31Z · 60 files · About = `dev build 6 · fix.20`) — ⏳ รอ maintainer smoke

**ที่มา (maintainer อนุมัติ 2 ข้อ):**
1. แยกชุด e2e ให้รัน **หลาย worker** เพื่อให้รอบต่อไปเร็วขึ้น (โดยไม่ให้ fixture ที่แชร์กันทำเทสต์ล้มกัน)
2. ขยาย fixture ของ pane ให้ **ย้ายวิวไป auxiliary bar** (Secondary Side Bar) ได้ แล้วเพิ่มเทสต์ยืนยันว่าแถบแชท/ป็อปโอเวอร์ยังทำงานถูกเมื่อผู้ใช้ย้ายเอง

**สิ่งที่ทำ (1) — e2e ขนาน:** `playwright.config.ts` → `workers = E2E_WORKERS ?? (CI ? 2 : 3)` (เดิมตรึง `workers: 1`) · `fullyParallel` คงไว้ + คอมเมนต์ว่าทำไมปลอดภัย · สิ่งที่ต้องแก้ก่อนจึงขนานได้จริง:
- **mock server ผูกพอร์ต 7777 ตายตัว** ⇒ worker ที่สอง `listen` ล้ม · `ClineApiServerMock.startGlobalServer(0)` ขอพอร์ตว่างจาก OS แล้วอ่านกลับจาก socket (`getMockApiServerUrl()`) · ค่าปริยายของสคริปต์อื่นยังเป็น 7777
- **extension host ไม่รู้จัก `CLINE_API_BASE_URL`** (มีแต่ SDK ที่รู้ — `apps/vscode/src/config.ts` ฮาร์ดโค้ด `localhost:7777` ให้ `local`) ⇒ เพิ่ม override ให้ `getEnvironment()` เคารพ env ตัวเดียวกัน (แต่ย้ายแค่ `apiBaseUrl` ไม่แตะ `mcpBaseUrl` ที่ตั้งใจชี้โฮสต์สาธารณะ) + unit test 4 ข้อใน `src/__tests__/config.test.ts` · harness ส่งค่านี้เป็น env ตอน launch
- **teardown กวาด `os.tmpdir()` หา `cline-e2e-*` ทั้งหมด** ⇒ ขนานแล้วจะลบโฟลเดอร์ CLINE_DIR ที่ worker อื่นกำลังใช้อยู่ · เปลี่ยนเป็นลบเฉพาะของ launch ตัวเอง (และลบ fixture `clineTestDir` ที่ตายอยู่ทิ้ง)
- **workspace ใช้ไฟล์ที่ commit ไว้ร่วมกัน** (extension แก้ไฟล์จริง: `file-edit` 2 เทสต์เขียน `test.ts` ไฟล์เดียวกัน) ⇒ เพิ่ม fixture `privateWorkspaces` = สำเนาชุด fixture ลง temp ต่อ **หนึ่งเทสต์** · `workspaceDir`/`multiRootWorkspaceDir` ชี้เข้าไปในสำเนา ⇒ เทสต์ไม่ผูกกับลำดับ/กันเองอีก
- **ดาวน์โหลด VS Code แข่งกันตอน cache เย็น** ⇒ `global.setup.ts` อุ่นเครื่องก่อน worker ไหนเริ่ม
- รอบขนานทำให้ timeout ปริยายของ assertion ที่ต้องรอ "ทั้งเทิร์น" แคบไป 2 จุด ⇒ ใส่ budget ให้ตรงความหมาย: `chat.test.ts` รอข้อความตอบ (`{ timeout: 20_000 }`) และ `settings-model-selection.test.ts` อ่านลิสต์โมเดลแบบ **poll จนกว่าจะมีข้อมูล** (`expect(async () => …).toPass()`) แทนการอ่านครั้งเดียว

**สิ่งที่ทำ (2) — fixture + เทสต์ใหม่:**
- `utils/pane.ts` เพิ่ม `location()` (อยู่ part ไหน) และ `moveToAuxiliaryBar()` ที่ขับ UI ของ VS Code เอง: palette → `View: Move View` → เลือกวิว → `New Secondary Side Bar Entry` แล้ว poll จน webview ย้าย part จริง · คืน **frame ใหม่** เพราะการย้ายสร้าง webview ใหม่
- หา "ตัววิว" ไม่ได้ด้วยชื่อ: วิวของ iCline ประกาศชื่อเป็น **ค่าว่าง** (`contributes.views[].name = ""`) และ palette ทำให้วิวเสียโฟกัส (`focusedView` ว่าง ⇒ picker ไม่ preselect) ⇒ แถวของวิวเราคือแถวที่ **เริ่มกลุ่ม** (aria-label ออกมาเป็น `", Side Bar / iCline"`) ส่วนแถวคำสั่งใช้ label ตรง ๆ เพราะ ranking ของ palette ไม่ได้เรียงตามที่พิมพ์ (`Move View` ดัน `Move Panel Views…` ขึ้นก่อน)
- หา part ของวิวด้วย **เรขาคณิต ไม่ใช่ ancestry**: webview ถูกวางในเลเยอร์ overlay ของ workbench (ancestor ไม่มี `.part.*`) ⇒ เทียบ rect ของ webview กับ rect ของ part
- `helper.getSidebar()` เดิมรับ frame ที่ยัง **`#pending-frame`** (webview ใหม่ยังโหลดไม่เสร็จ แต่ title ขึ้น "Cline" แล้ว) ได้ ⇒ ข้าม pending frame และรอตัวที่ active จริง
- เทสต์ใหม่ `secondary-side-bar.test.ts`: ย้ายวิว ⇒ ยืนยัน `location() === "auxiliarybar"` ⇒ ขยายแถบข้างใหม่ผ่าน fixture ⇒ ส่งข้อความจริง 1 เทิร์น (ได้ข้อความตอบจาก mock) ⇒ เปิดเมนูโมเดล แล้วตรวจว่า `data-align` ตรงกับ **สูตรกลาง** (`triggerLeft + 320 + 8 ≤ viewportWidth`) และแผงยังอยู่ในกรอบ pane
- ต้องปิด toast ของ VS Code ก่อน: harness รันด้วย `--disable-extensions` ⇒ VS Code เด้ง "Reload and Enable Extensions" ที่มุมล่างขวา ซึ่ง **ทับปุ่มส่งในโหมด auxiliary bar พอดี** ⇒ ใช้ `toggleNotifications(page)` ของ harness (ไม่ใช่บั๊กของ iCline)

**สิ่งที่ทำ (3) — บั๊กที่เทสต์ใหม่เจอ (และแก้แล้ว):** หลังย้ายวิวไป Secondary Side Bar **หน้าแชทว่างเปล่า** ทุกครั้ง
- **ราก:** `VscodeWebviewProvider` ผูก `webviewView.onDidDispose` ⇒ `this.dispose()` ⇒ `controller.dispose()` (ทิ้ง task history/session ทั้งก้อน) — แต่การ **ย้ายวิว** ไม่ได้จบเซสชัน: VS Code dispose วิวเดิมแล้ว resolve วิวใหม่ใน part ปลายทาง ⇒ วิวใหม่ถูกต่อกับ controller ที่ตายแล้ว · Console ยืนยันชัด: `SdkTaskHistory has been disposed` + `this.unsubscribeHostTelemetrySettings is not a function` ⇒ webview โหลดแล้วแอปบูตไม่ขึ้น (frame ว่าง ไม่มี `[data-testid]` เลย นานกว่า 30 วิ)
- **แก้:** `onDidDispose` ทิ้งแค่ reference ของวิว (`this.webview`) ไม่แตะ controller · controller ถูกทิ้งตอน **extension deactivate** (`WebviewProvider.disposeAllInstances()` ใน `common.ts`) ซึ่งเป็นตอนที่เซสชันจบจริง · หลังแก้ console **ไม่มี error เลย** และหน้าแชทกลับมาทำงานพร้อมเซสชันเดิม
- **ขอบเขตผลกระทบ:** ผู้ใช้ที่ลากวิว iCline ไป Secondary Side Bar (หรือ panel/แถบข้างอีกด้าน) แล้วแชทหาย = เคสเดียวกันนี้

**จุด smoke (fix.20):** ของเดิมทั้งหมดของ fix.18/19 ยังใช้ได้ + เพิ่ม 2 ข้อ:
- **ย้ายวิว:** เปิดแชทให้ล็อกอินแล้ว ⇒ ลาก/ย้ายวิว iCline ไป **Secondary Side Bar** (หรือ `F1` → `View: Move View` → `New Secondary Side Bar Entry`) ⇒ แชทต้องกลับมาแสดง **พร้อมประวัติเดิม** (ไม่ว่างเปล่า) ส่งข้อความได้ และเปิด Quick Picker/แผง Options ได้ตามปกติ (ป็อปโอเวอร์ยังเกาะขอบตามกฎ)
- **ย้ายกลับ:** ย้ายวิวกลับไปแถบข้างเดิม ⇒ ต้องยังทำงานเหมือนเดิม ไม่ต้อง reload หน้าต่าง และไม่มีข้อความ error ใหม่ใน Notification

### รอบเสริม 2 (2026-09-20, รอบที่สองของ fix.20) — "ย้ายวิวกลางบทสนทนา" + เทสต์ shell ที่พังเพราะ env ของเครื่อง

**สถานะ:** ✅ e2e บน VS Code จริง **16/16 × 2 รอบ** (2m07s / 2m04s) · unit **1032/0** · `tsc` + biome สะอาด · **แพ็ก fix.20 จาก HEAD นี้แล้ว** — รอบนี้แก้ **extension host** อีก ⇒ `fix.19` ไม่ครอบทั้งสองบั๊กของเรื่องย้ายวิว

**ที่มา (maintainer อนุมัติ 2 ข้อ + "แก้ตัวที่ fail ถ้าจำเป็น"):** ต่อจากบั๊กที่เทสต์ย้ายวิวเจอในรอบก่อน — "ย้ายวิวแล้วแชทหาย" แก้ไปแล้วครึ่งเดียว (controller ไม่ตายแล้ว) ∴ ให้ตรวจว่ายังมีที่ไหนที่ **คิดว่าอายุของวิว = อายุของเซสชัน** อีกไหม แล้วแก้ `shell.test.ts` ถ้าจำเป็น

**บั๊กที่สองของเรื่องเดียวกัน:** `resolveWebviewView()` เรียก `controller.clearTask()` **ทุกครั้งที่ resolve** (คอมเมนต์เดิม: "if the extension is starting a new session, clear previous task state") — แต่ **การย้ายวิวก็ resolve วิวใหม่** ⇒ ผู้ใช้ที่ย้ายวิวระหว่างมีบทสนทนาอยู่ **เห็นแชทหายทั้งเธรด** (ไม่ใช่แค่หน้าจอว่าง: `taskControl.clearTask()` → `sessions.endActiveSession("clearTask")` + state กลับเป็น idle จริง)
- **แก้:** เคลียร์เฉพาะ `resolve` **ครั้งแรกของ session** (`hasResolvedView`) ⇒ วิวที่ย้ายมาใหม่ได้ state ปัจจุบันเองผ่าน `subscribeToState` ตอน mount (มันส่ง state ก้อนแรกให้ subscriber ใหม่เสมอ) ⇒ บทสนทนากลับมาครบ
- **หลักฐานก่อน/หลัง (เทสต์เดียวกัน บน VS Code จริง):** **ก่อนแก้** หลังย้ายวิว `getByText("mock Cline API response")` ได้ **0 ตัว** (แชทว่าง) · **หลังแก้** ผ่าน — บทสนทนาอยู่ครบ + ส่งเทิร์นที่สองใน part ใหม่ได้

**ผลการ audit (รอบนี้):**
- **ตัวสดับของ "วิว" อยู่ในถังของ "extension"** — `onDidChangeVisibility` / `onDidDispose` / `onDidReceiveMessage` ถูก push เข้า `this.disposables` ซึ่งถูกล้างตอน extension deactivate เท่านั้น ⇒ ทุกการย้ายทิ้งตัวสดับของวิวที่ตายแล้วค้างไว้ชุดหนึ่ง · แยกเป็น `viewDisposables` + `disposeViewScope()` ที่ถูกเรียก (1) ตอนวิวถูก dispose (2) ตอน re-resolve ก่อนลงทะเบียนชุดใหม่ (3) ตอน extension deactivate · คง **identity ของ array** ไว้เพราะ VS Code ถือเป็นถัง disposable ของ listener ที่มันลงทะเบียนไว้
- **ไม่ได้แก้ (บันทึกไว้):** `telemetryService.capturePanelOpened("sidebar_resolved")` ยังนับ 1 ครั้งต่อการ resolve ⇒ การย้ายวิวจะนับ "panel opened" เพิ่ม 1 ครั้งต่อการย้าย (ไม่กระทบผู้ใช้ ⇒ ปล่อยไว้โดยเจตนา)
- **ไม่ได้แก้ (บันทึกไว้):** ระหว่างย้ายวิว **ข้อความ/ไฟล์ที่พิมพ์ค้างแต่ยังไม่ส่งในช่องแชทหายไป** เพราะ VS Code สร้าง webview ใหม่ทั้งใบ ⇒ ถ้าจะให้รอดต้องเก็บ draft ไว้ฝั่ง host (คนละเรื่องกับ lifecycle · ยังไม่มีใครขอ)

**เทสต์เข้มขึ้น (`secondary-side-bar.test.ts`):** ของเดิมย้ายวิว **ก่อน** ส่งข้อความ ⇒ แยกไม่ออกระหว่าง "เซสชันเดิม" กับ "เซสชันใหม่" · เปลี่ยนเป็น: ส่ง 1 เทิร์นในแถบข้าง → ยืนยันข้อความตอบ **1 ตัว** → ย้ายวิว → ยืนยันบทสนทนายังอยู่และพิมพ์ข้อความเดิม (ที่ส่งไปแล้ว) ยังเห็น **1 ตัว** → ส่งเทิร์นที่สอง → ข้อความตอบเป็น **2 ตัว** → ตรวจป็อปโอเวอร์เกาะขอบตามสูตรกลาง ⇒ ครอบทั้ง "session รอด" และ "วิวใหม่ทำงานได้"

**กับดักของ fixture (`utils/pane.ts`) ที่กินเวลารอบละหนึ่งตัว:**
1. **composer แย่งโฟกัสกลับ** — `ChatView` โฟกัสช่องพิมพ์เองทุกครั้งที่เทิร์นจบ (~50ms หลัง turn เป็น idle) และ VS Code **ซ่อน quick input ทันทีที่ input นั้นเสียโฟกัส** ⇒ palette ที่เปิดในจังหวะนั้นปิดตัวเองโดยที่คำสั่งยังอยู่ในกล่องที่ถูกซ่อน (วัดได้: `document.activeElement` เป็น `<iframe>` ของ webview และ widget ถูกซ่อนภายใน 500ms หลังเขียน query) ⇒ เพิ่ม `typeInPalette()` ที่เปิด palette ซ้ำจนกว่าจะอยู่ · และเขียน query ด้วย `fill` ไม่ใช่ `pressSequentially` (ของเดิมถูกตัดเหลือ `>Move V` แล้วขั้นถัดไป timeout) · **ห้าม `fill("")`** เพราะ `>` คือโหมดของ palette (ว่างแล้วกลายเป็น file picker)
2. **แถวของ quick pick มีสองชั้น** — `.quick-input-list-row` ที่คลิกอยู่ข้างในเป็น label wrapper (กว้างตามเนื้อหา + มีพี่น้องสูง 0px) ⇒ คลิกไม่ติด · เปลี่ยนไปคลิก `.monaco-list-row[role="option"]` (ตัวที่มี hit area + accessible name) และ `clickRow()` match **ชื่อขึ้นต้น** ไม่ใช่เป๊ะ เพราะแถวที่เปิดกลุ่มมีชื่อกลุ่มต่อท้าย ("New Secondary Side Bar Entry, Secondary Side Bar") · แถวที่ไม่มีจะรายงานแถวที่ picker แสดงจริงแทน timeout เปล่า ๆ

**`shell.test.ts` — พังเพราะ env ของเครื่อง ไม่ใช่บั๊กของ env expansion:** เทสต์ตั้ง `process.env.windir = "C:\Windows"` แต่บน Windows จริงมี `WINDIR=C:\WINDOWS` อยู่ก่อนแล้ว และ SUT อ่านชื่อ env **แบบไม่สนตัวพิมพ์** (`getEnvironmentVariable`) · `afterEach` คืนค่า `process.env` จาก snapshot (`{ ...process.env }`) ⇒ สำเนามีคีย์สะกดของโฮสต์ติดมาด้วย ⇒ `Object.entries().find()` เจอ `WINDIR` (ของโฮสต์) ก่อน ⇒ ได้ `C:\WINDOWS\Sysnative\cmd.exe` ไม่ตรงกับที่เทสต์เขียน ⇒ fail เฉพาะบน Windows · แก้ด้วย `setEnv()` ที่ลบสะกดอื่นก่อนเขียน (ใช้กับทุกตัวที่เทสต์ตั้ง: `windir`/`PATH`/`ProgramW6432`/`LOCALAPPDATA`/`COMSPEC`/`SHELL`) ⇒ **31/31** · ผลพลอยได้: เทสต์ "falls through configured profile paths in order" ที่ก่อนหน้านี้ผ่านแบบบังเอิญ (ได้ `SHELL_PATHS.CMD` เพราะ resolve ไม่เจออะไรเลย) ตอนนี้ผ่านด้วยเหตุผลจริง

**จุด smoke เพิ่ม (รอบเสริม 2):**
- **ย้ายวิวกลางบทสนทนา (เคสหลักของรอบนี้):** ส่งข้อความให้ได้คำตอบ 1 เทิร์น → **ขณะที่แชทมีบทสนทนาอยู่** ย้ายวิวไป Secondary Side Bar → ต้องยังเห็นบทสนทนาเดิมครบ (ไม่ใช่หน้า welcome) → พิมพ์ต่อได้และได้คำตอบที่สอง
- **ย้ายไป-กลับ:** ย้ายวิวกลับแถบข้างเดิม ⇒ ยังเห็นบทสนทนาเดิมและทำงานได้ ไม่ต้อง reload หน้าต่าง
- (ของเดิม) จุด smoke ของ fix.18/19 ยังใช้ได้ทั้งหมด

---

## 🧰 dev.6-fix.19 — รวมนิสัย popover เป็นฮุกกลาง + guard สแกนซอร์ส + e2e พิสูจน์โหมดขอบซ้ายบนหน้าต่างจริง (2026-09-20)

**สถานะ:** ✅ เสร็จ · webview vitest **501/501** · `tsc` สะอาดทั้งสองฝั่ง · biome ไม่มี finding ใหม่ · e2e บน VS Code จริง **15/15 ทั้งชุด** (หลังรอบเสริมด้านล่าง — ไม่มี retry) · **commit แล้ว** (`690e703e4` refactor + `6bd8adf2c` e2e) · **แพ็กแล้ว:** `dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.19.vsix` (11,967,453 B @ 2026-09-20T06:07:27Z, About = `dev build 6 · fix.19`)

**ที่มา (maintainer อนุมัติ 2 ข้อต่อจากรอบ fix.18):**
1. เพิ่ม e2e ที่ทำให้หน้าแชท **กว้างพอ** เพื่อพิสูจน์โหมดหลัก (ขอบซ้ายของปุ่ม) บนหน้าต่าง VS Code จริง — ของเดิมพิสูจน์ได้แค่โหมดถอย เพราะ sidebar ของ harness แคบ
2. รวม "นิสัยของ popover" (ขอบที่เกาะ · รูปมือทั้งเมนู · ข้อยกเว้นช่องพิมพ์) เป็นคอมโพเนนต์/ฮุกกลาง + เทสต์ guard ที่ fail เมื่อเมนูใหม่ไม่ผ่านข้อตกลง ⇒ "ครอบคลุมและยืดหยุ่นสำหรับอนาคต"

**สิ่งที่ทำ (1) — e2e:** `composer-status-options.test.ts` เพิ่มเทสต์ที่ 2: เปิดแผง Options ตอนหน้าแชทยังแคบ (ยืนยันเงื่อนไขก่อนว่าแคบจริง + `data-align="end"`) ⇒ ขยายหน้าต่าง Electron ผ่าน `app.evaluate(BrowserWindow.setSize(1800,1000))` ⇒ **ลาก sash ของ VS Code จริง** เพื่อขยาย pane ⇒ ยืนยันว่าแผงที่เปิดอยู่**ยังเปิดอยู่** และย้ายไป `data-align="start"` โดยขอบซ้ายตรงกับปุ่ม ≤1px
- ยืนยันรหัส pane/ sash ไม่ได้ฮาร์ดโค้ด id ของ part:หาจาก **webview id** ใน query (`id=<guid>` ของ iframe ด้านนอกที่ตรงกับเฟรมที่เทสต์ขับ) ⇒ ใช้ได้ทั้ง sidebar และ auxiliary bar (VS Code ซ้อน iframe สองชั้น: `frameElement()` ของเฟรมเราเป็น `#active-frame` ด้านใน ซึ่งไม่รู้จัก `.part`/`.monaco-sash` เลย — จุดนี้ทำให้รอบแรกของเทสต์ fail)
- sash ที่ต้องลาก = `.monaco-sash` แนวตั้งที่ไม่ติด `disabled` และอยู่ใกล้ขอบซ้าย/ขวาของ iframe ≤ 40px (ของจริงใน sidebar = `primary-sidebar-sash` ที่ x=348) · วัดผลได้: pane 297px → 900px, ปุ่ม `x=277.7` คงที่, แผงย้ายจาก `x=73` (`end`) ไป `x=278` (`start`, ต่าง 0.27px)

**สิ่งที่ทำ (2) — ฮุกกลาง + guard:** โมดูลใหม่ `webview-ui/src/icline/menuPopover.ts` รวม `pickMenuPopoverAlign` (สูตรเดิมจาก `quickModelPickerList.ts` — ย้ายมา ไม่มี copy) · `useMenuPopoverAnchor({ open, setOpen, triggerRef, panelWidth })` (วัดจาก trigger ตอนเปิด ⇒ ภาพแรกถูกข้าง ไม่กระพริบ · วัดซ้ำเมื่อ `resize` · คืน `align` + `onOpenChange` ให้ Radix) · `MENU_SURFACE_CLASS` · `MENU_TEXT_FIELD_CLASS` ⇒ picker เรียก **2 ครั้ง** (เมนูโมเดล 320px และแผง Options 236px ตัดสินคนละคำตอบได้)
- `menuPopover.guard.test.ts` สแกนซอร์สทุก "เมนูของ iCline" (นิยาม = `<PopoverContent>` ที่มี `data-icline-*`) แล้ว fail ถ้าไม่ใช้ `MENU_SURFACE_CLASS` · `align` เป็นค่าคงที่ · ไม่ import โมดูล · หรือ `<input>` ไม่ใช้ `MENU_TEXT_FIELD_CLASS` · มี liveness assert กัน guard ตาย (สแกนไม่พบอะไร = fail) · พิสูจน์แล้วว่ามันกัดจริงโดยวางไฟล์ตัวอย่างที่ผิดข้อตกลง → เทสต์ fail 4 ข้อ → ลบไฟล์ทิ้ง
- เทสต์เดิมย้ายตาม: สูตร align → `src/icline/menuPopover.test.ts` (quickModelPickerList.test.ts เหลือหมายเหตุชี้ทาง) และ `QuickModelPickerRealPopover.test.tsx` เพิ่มเทสต์ "แต่ละเมนูตัดสินข้างของตัวเอง" (สลับเป็น `end` เมื่อชิปถูกดันชิดขอบ)

**สิ่งที่ต้องรู้:** พฤติกรรมที่ผู้ใช้เห็นของ fix.19 = fix.18 ทุกข้อ (รอบนี้เป็นการจัดบ้าน + เพิ่มหลักฐาน) ⇒ ถ้าติดตั้ง fix.18 ไว้แล้วยัง smoke ต่อได้ หรือใช้ fix.19 แทนได้เลย · `fix.18` ใน `dist/` ไม่ถูกเขียนทับ

**จุด smoke (fix.19):** ใช้รายการเดียวกับ fix.18 ทั้ง 5 ข้อ + เพิ่ม 1 ข้อ:
- ข้อ 2 (ต่อ): ลากขอบ sidebar ให้แคบ/กว้าง**ขณะเปิดแผง Options อยู่** — แผงต้องสลับข้างเองโดยไม่ปิด-เปิดใหม่ (e2e พิสูจน์แล้ว 297→900px) · เปิด picker ของโมเดลแล้วทำเหมือนกัน ⇒ เมนูโมเดลก็สลับข้างเองเช่นกัน

### รอบเสริม (test-only — หลังแพ็ก fix.19 แล้ว): ทำเทคนิคขยาย pane เป็น fixture + ล้างเทสต์ที่พังเพราะ sidebar แคบ

**สถานะ:** ✅ e2e บน VS Code จริง **15/15 (ทั้งชุด ไม่มี retry)** · `tsc -p tsconfig.test.generated.json` สะอาด · biome ไม่มี finding ใหม่ · ❗ **ไม่ต้องแพ็ก VSIX ใหม่** — รอบนี้แตะแค่ `src/test/e2e` (ไม่เข้า bundle ของ extension) ⇒ artefact `fix.19` ยังตรงกับโค้ดที่ ship อยู่

- **fixture ใหม่:** `src/test/e2e/utils/pane.ts` → `createPaneController({ app, page, sidebar })` มี `measure()` / `widenTo(target = 900)` (ขยายหน้าต่าง Electron ก่อน + ลาก sash ของ VS Code จริง โดยหา sash จาก **webview id** ไม่ใช่ part id ⇒ ใช้ได้ทั้ง sidebar/auxiliary bar · ถ้าลากไม่ถึงเป้าจะ throw ไม่ปล่อยให้เทสต์ผ่านแบบหลอก ๆ) และใน `helpers.ts` มี fixture `pane` (คอนโทรลเลอร์) กับ `widePane` (ใส่ชื่อในเทสต์ = ขยาย pane ให้ก่อนเข้า body แล้วคืนความกว้างที่ได้)
- **`chat.test.ts` ผ่านแล้ว** (พังมาก่อนหน้ารอบนี้ทุกครั้ง): สาเหตุคือ composer row ใน sidebar ~300px ซ้อนกันเอง จนชื่อโมเดลที่ถูกตัด (`<span class="truncate max-w-[180px]">`) ทับสวิตช์ Plan/Act ⇒ `planButton.click()` ถูก intercept ทุกครั้ง · ใช้ `widePane` แล้วผ่าน — พร้อมแก้ locator ที่เปราะอีก 3 จุดที่เจอตอนวิ่งถึง: (1) ปุ่ม New Task ถูก re-render ของ header กลืนคลิก ⇒ คลิก-แล้ว-ยืนยันด้วย `expect(async () => {…}).toPass()`, (2) เมนู slash command เมนู "Context mentions" ต้องอ้างเป็น **การ์ดข้อเสนอแนะ (ARIA option)** ไม่ใช่ `getByText` เพราะข้อความเดียวกันมีอยู่ใน live-region สำหรับ screen reader (`Problems, 2 of 2`) และมี Problems สองแถว ⇒ ใช้ `getByRole("option", { name: "Problems", selected: true })` (แถวที่เมนูไฮไลต์คือแถวที่ใส่เมนชันได้จริง)
- **`composer-status-options` ใช้ fixture แทนโค้ดในไฟล์** (ลบ `widenChatPane`/`findSash` ในเทสต์ออกแล้ว เหลือ `await pane.widenTo(PANE_WIDE_WIDTH_PX)`)
- **ประโยชน์ต่ออนาคต:** เทสต์ใดก็ได้ที่ต้องการแถบข้างกว้างแค่ใส่ `widePane` ในรายการ fixture (หรือเรียก `pane.widenTo(n)` เมื่ออยากทดสอบการเปลี่ยนความกว้างกลางทาง)

---

## 🔎 dev.6-fix.18 — ตำแหน่ง popover ของ Options · เคอร์เซอร์รูปมือ · รูปย่อในช่องแชทขึ้นด้านบนและใหญ่ขึ้น (2026-09-20)

**สถานะ:** ✅ เสร็จ · webview vitest **494/494** · `tsc` สะอาดทั้งสองฝั่ง · biome ไม่มี finding ใหม่ (warning เท่ากับ HEAD) · e2e บน VS Code จริงผ่าน **5/5** (`composer-status-options` + `quick-picker-hover` + `quick-picker-effort-notice` + `quick-picker-org-policy`) · **commit แล้ว** (`3012c6df5` feat · `ddf4a372a` test(e2e)) · **แพ็กแล้ว:** `dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.18.vsix` (11,967,298 B @ 2026-09-20T05:36:02Z, About = `dev build 6 · fix.18`) · ⏳ **รอ maintainer smoke**

**ที่มา (3 เรื่องจาก maintainer, อนุมัติพร้อมกัน + เสริมรอบถัดมา):**

1. **ตำแหน่ง popover ของ Options** — ขอบซ้ายของแผงต้องอยู่ที่ขอบซ้ายของปุ่มที่เปิดมัน **เป็นหลัก** และ **รองรับทั้งสองแบบ**: ถ้าหน้าแชทถูกบีบแคบจริง ๆ ให้กลับไปเกาะขอบขวาของปุ่มแบบเดิม (ความกว้างที่ maintainer ทำงาน ≈ 930px — ดูภาพที่แนบมา)
2. **เคอร์เซอร์** — Quick Picker ทั้ง "ของโมเดล" และ "ของ Option" รวมทั้ง **หน้าเมนูโมเดลและแผง Options ทั้งหมด** (ไม่ใช่แค่แถวที่กดได้) ต้องเป็นรูปมือเหมือนไอคอน 4 ตัวแรกใต้ช่องแชท (Add Context · Add Files · Servers · Cline Rules)
3. **รูปย่อในช่องแชท** — ย้ายจากด้านล่างขึ้นด้านบน (ยังอยู่ในช่องแชท) และเพิ่มขนาดขึ้น

**รากของ (1):** `PopoverContent` ของชิปสถานะตั้ง `align="end"` ⇒ ขอบ**ขวา**ของแผง 236px ไปตรงกับขอบขวาของปุ่มสถานะ (ปุ่มกว้าง ~32px) ⇒ แผงเลื่อนไปทางซ้ายไกลจากไอคอนที่กด
**แก้ (1):** ขอบซ้าย (align="start") เป็น **ค่าตั้งต้น** และใช้ `pickOptionsPopoverAlign({ triggerLeft, viewportWidth })` ใน `quickModelPickerList.ts` ตัดสินข้างจาก **ตำแหน่งของปุ่ม** ตอนเปิด ⇒ `triggerLeft + 236 + 8 ≤ viewportWidth` = `start` ไม่งั้นถอยเป็น `end` (ค่าเดิม) · วัดซ้ำเมื่อมี `resize` ขณะแผงเปิดอยู่ ⇒ ลาก sidebar แคบ/กว้างแล้วแผงสลับข้างเองได้ · ตรวจได้จาก `data-align` ใน DOM (กว้าง ~930px ได้ `start`, sidebar ปริยาย ~300px ได้ `end`)

**รากของ (2):** ปุ่มที่ iCline วาดเองเป็น `<button>` เปล่า ⇒ webview คืนลูกศรของ OS ขณะที่ `VSCodeButton` (ไอคอน 4 ตัวนั้น) ให้รูปมือเอง
**แก้ (2):** เติม `cursor-pointer` ให้ทุกเป้าคลิกที่ผู้ใช้ตั้งใจกด — ชิปโมเดล · ชิปสถานะ · แถวโมเดล · หัว provider · ไอคอน footer (refresh/edit) · ปุ่มระดับ Effort ในแผง Options · สวิตช์ Thinking (มี pointer จาก `ui/switch`) · **และคลุมทั้งเมนู**: ตัวห่อ popover ทั้งสองตัว + รากของ `ModelOptionsPanel` ⇒ หัวข้อ/model id/ระยะหว่างแถว/แถว capability/ข้อความ "Active ·" เป็นรูปมือทั้งหมด (ลูกสืบทอด cursor จากตัวห่อ) · ข้อยกเว้นเดียวคือช่องค้นหาที่เป็น `cursor-text` (I-beam) · ปุ่มที่ `disabled` ยังขึ้น `not-allowed` เพราะ specificity ของ `disabled:` สูงกว่า

**รากของ (3):** `ChatTextArea` วาง `Thumbnails` แบบ `absolute` ที่ `bottom: 14` และป้อน `border-bottom` โปร่งใสของ textarea ด้วย `thumbnailsHeight` ⇒ ช่องว่างสำหรับรูปถูกจองที่ **ล่าง** · ขนาดชิปฮาร์ดโค้ด 34px เท่ากับ transcript
**แก้ (3):**
- ย้ายไป `top: 14` (ยังในกรอบช่องแชท) และย้ายที่ว่างไปเป็น **`border-top` โปร่งใส** ของ textarea + `padding-top` ของ highlight layer (ต้องตรงกัน ไม่งั้นไฮไลต์ mention/slash ลอยขึ้น)
- **เหตุผลที่ยังใช้ border ไม่เปลี่ยนไปใช้ padding:** พอถึง `maxRows` textarea จะ scroll — ข้อความที่ scroll จะเลื่อนขึ้นไปทับรูปย่อในเขต padding แต่ไม่เข้าเขต border (คอมเมนต์ในโค้ดอธิบายไว้)
- เพิ่ม prop `size` ให้ `components/common/Thumbnails.tsx` (ปริยาย 34 = transcript ไม่เปลี่ยน) และให้ composer ส่ง **44px** · ขนาดป้ายลบ/offset/ไอคอน/ฟอนต์ชื่อไฟล์คำนวณจาก `size` ตัวเดียว

**เทสต์ที่ปักไว้:**
- unit `quickModelPickerList.test.ts`: สูตร `pickOptionsPopoverAlign` — หน้าแชท ~930px ได้ `start` · sidebar ~300px ได้ `end` · สลับที่ `panel + margin` พอดีเป๊ะ · กว้างขึ้นแล้วไม่ถอยกลับไป `end`
- unit `QuickModelPickerRealPopover.test.tsx`: `data-align` = `start` ในหน้าแชทกว้าง · **สลับเป็น `end` เมื่อปุ่มถูกดันไปชิดขอบขวา แล้วกลับเป็น `start` เมื่อมีที่พออีกครั้ง** (จำลองด้วย `getBoundingClientRect` + `resize`) · ตัวห่อ popover ทั้งสอง + ราก `ModelOptionsPanel` มี `cursor-pointer` · ช่องค้นหามี `cursor-text` · ชิปโมเดล/ชิปสถานะ/หัว provider/ปุ่มระดับ Effort มี `cursor-pointer`
- unit **ใหม่** `components/common/Thumbnails.test.tsx`: ไม่ส่ง `size` = 34px (transcript คงเดิม) · ส่ง 44 = ชิป 44px + ป้ายลบ 17px + ฟอนต์ชื่อไฟล์ 9px (กัน "ชิปใหญ่แต่ป้ายลบเท่าเดิม")
- e2e `composer-status-options` (บน VS Code จริง): `data-align` ต้องตรงกับสูตรของ pane จริง (`start` เมื่อปุ่ม + 236px + 8px พอ · ไม่งั้น `end`) · เมื่อมีที่พอของข้างที่เลือก **ขอบต้องตรงกัน ≤1px** (ซ้ายกับ `start` / ขวากับ `end`)

**สิ่งที่ต้องรู้ (harness):** sidebar ของ e2e กว้างปริยาย ~297px (CSS) ขณะที่แผง 236px และแถว composer เต็มไปด้วยไอคอน 4 ตัว + ชื่อโมเดล ⇒ หน้าต่างนี้ **ตกไปที่โหมดถอย (`align="end"`)** ซึ่งเป็นโหมดที่เทสต์ยืนยันบนหน้าต่างจริง ส่วนโหมดหลัก (`start`) ถูกปักด้วยเทสต์หน่วย (สูตร + การสลับข้าง) และเทสต์ webview ที่จำลองหน้าแชทกว้าง · Radix ยังคงเลื่อนแผงกลับเข้ากรอบอีกชั้น ⇒ "ขอบตรงกันเป๊ะ" ตรวจได้เมื่อมีที่พอเท่านั้น **ห้ามปิด `avoidCollisions`** เพื่อบังคับให้ตรง

**จุด smoke (fix.18):**
1. ช่องแชท: คลิกชิปโมเดล → popover รายการโมเดล · **hover ทุกส่วนของเมนู (หัวข้อ provider, แถวโมเดล, ระยะหว่างแถว, footer, ข้อความ Active) ต้องเป็นรูปมือ** (เทียบกับไอคอน 4 ตัวซ้าย) ยกเว้นช่องค้นหาที่ยังเป็น I-beam
2. คลิกชิปสถานะ (ชุดไอคอน/badge) → แผง Options: **ขอบซ้ายของแผงต้องอยู่ที่ขอบซ้ายของปุ่มสถานะ** (ที่ความกว้างแชทปกติ ~930px) · ลากขอบ sidebar ให้แคบลงเรื่อย ๆ ⇒ แผงสลับไปเกาะ**ขอบขวา**ของปุ่มแทนโดยไม่ล้นออกนอกหน้าต่าง · ทุกส่วนในแผง (หัวข้อ, model id, ปุ่ม Effort, capability) เป็นรูปมือ
3. แนบ/วางรูปในช่องแชท → รูปย่ออยู่ **ด้านบน** ของช่องแชท ใหญ่กว่าเดิม (44px) · พิมพ์ข้อความยาวถึงบรรทัดสูงสุดแล้วเลื่อน ข้อความ **ห้ามทับรูปย่อ** · ไฮไลต์ `@`/`/` ต้องอยู่ตรงกับตัวอักษรจริง
4. เปิด picker ตอนมีรูปแนบ — รูปย่อยังอยู่ด้านบน ไม่ทับช่องค้นหาหรือแถว provider
5. About: `dev build 6 · fix.18` (ตรวจแล้วในบันเดิลที่แพ็ก — `webview-ui/build/assets` มีสตริงนี้จริง)

**ยังไม่ทำ:** ไม่ได้แตะ hover Options panel ของ picker (ด้านขวาของแถว — โครงสร้างล็อกจาก mock v11 ยังเดิม) · ไม่ได้แก้ `chat.test.ts` ที่ fail อยู่ก่อนรอบนี้ (ปุ่ม Plan/Act ถูก `<span class="truncate max-w-[180px]">` ของชิปโมเดลบังใน sidebar ~300px — อาการ layout ก่อนรอบนี้ ไม่เกี่ยวกับ diff รอบนี้)

---

## 🎛️ dev.6-fix.17 — ชิปสถานะแยกปุ่ม + เปิด Options ของโมเดลที่ใช้อยู่ + นโยบายองค์กรมีหลักฐานบน VS Code จริง (2026-09-20)

**สถานะ:** ✅ เสร็จ · unit/tsc/biome ผ่าน · e2e บน VS Code จริง **5/5** · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.17`)

**ที่มา (2 เรื่องที่ maintainer อนุมัติพร้อมกัน):**
1. ทำเส้นทาง "provider ที่องค์กรไม่อนุญาต" ของ fix.16 ให้มีหลักฐาน e2e บน VS Code จริง (เดิมพิสูจน์ได้แค่ระดับ unit เพราะ harness ไม่มี control plane ที่ส่ง remote config ได้)
2. ปรับ UXUI ชิปใต้ช่องแชท: ไอคอนสถานะถูก“ฝัง”รวมกับปุ่มชื่อโมเดล (คลิกเดียวเปิดรายการโมเดล) ⇒ อยากกดที่ไอคอนเพื่อเปิดแผง Options ของโมเดลที่ใช้อยู่ (เปลี่ยน Thinking/Effort โดยไม่สลับโมเดล) — และแยกไอคอนให้ออกมาอยู่ข้างปุ่มชื่อ

**วิธีแก้ (1) — harness:** `fixtures/server/api.ts` + `index.ts` เพิ่ม state `remoteConfig` + 2 endpoint ที่ extension อ่านจริง (`GET /api/v1/users/me/remote-config` = discovery คืน `data: null` เมื่อไม่มีนโยบาย, `GET /api/v1/organizations/{id}/remote-config` = `{ value: JSON, enabled }`) + helper `/.test/setRemoteConfig` + `setRemoteConfig()` บนคลาส mock (เพิ่ม endpoint `/organizations/{orgId}/api-keys` ที่ implement ไว้ก่อนหน้านี้ไม่ครบด้วย)

**เทสต์ e2e ใหม่:** `src/test/e2e/quick-picker-org-policy.test.ts` — signin → เผยแพร่นโยบาย "Cline เท่านั้น" → เข้า org ผ่าน **Account view จริง** (`tab-account` → select `random-org-id`) ซึ่งเป็นเส้น `setUserOrganization` → `fetchRemoteConfig` (await จริง ⇒  deterministic) → กลับหน้า chat → เปิด picker → assert (ก) provider ทุกตัวที่ไม่อนุญาตมีล็อก `data-icline-org-blocked="<id>"` และ cline ไม่มี (ข) ขยาย provider ที่ถูกห้ามจนเจอตัวที่มีโมเดล → คลิกโมเดล → ขึ้น `[data-icline-org-provider-block]` + popover ยังเปิด + **ชื่อโมเดลบนชิปไม่เปลี่ยน**

**วิธีแก้ (2) — webview:**
- คอมโพเนนต์ใหม่ `components/chat/ModelOptionsPanel.tsx` = เนื้อหาแผง Options (หัวข้อ/model id/Thinking/Effort/capability + `ReasoningEffortNotice`) ที่**ทั้งสองที่**เรนเดอร์: แผง hover ของ picker และ popover ของชิป · `CAPABILITY_ICONS` export จาก `ModelStatusIcons` เป็นนิยามเดียว (ลบตารางที่สองใน picker)
- ชิปแยกเป็น 2 ปุ่ม: `data-icline-model-trigger` (ชื่อ + chevron → รายการโมเดล) และ `data-icline-model-status-button` (ชุดไอคอน/badge → popover `data-icline-status-options`) · ซ่อนปุ่มสถานะเมื่อไม่มีอะไรแสดง (caps ว่าง + ไม่มี badge)
- เขียนค่าผ่าน handler ตัวเดิม (`handleThinkingToggle`/`handleEffortChange`) ⇒ โมเดลที่ใช้อยู่เขียนลง configuration จริง (ไม่ใช่ preference) และเรียก `useReasoningEffortOutcome` ตัวที่สองสำหรับโมเดลปัจจุบันเพื่อให้ popover แสดงประโยค clamp เดียวกับแผง hover
- i18n: `statusOptionsTooltip` (en/th)

**เทสต์ unit ใหม่:** `QuickModelPickerRealPopover.test.tsx` — "splits the composer chip..." : assert ไอคอนไม่อยู่ในปุ่มชื่อ · status button ไม่เปิดรายการโมเดล · popover แสดง model id/switch/effort ของโมเดลที่ใช้อยู่ · คลิก Max ⇒ `handleModeFieldChange({plan,act}, "max", "act")` และ **ไม่เรียก `commitModelSelection`** · badge บนชิปขยับตาม

**แก้เทสต์ e2e เดิม:** `quick-picker-hover` / `quick-picker-effort-notice` เลิกใช้ selector `button:has(span[class~="max-w-[180px]"])` (ราะปุ่มชื่อถูกจัดวางใหม่) → ใช้ `[data-icline-model-trigger]`

**หมายเหตุที่ต้องรู้ (harness):** ถ้าไม่มีนโยบาย discovery ตอบ `data: null` ⇒ host เรียก `clearRemoteConfig()` ตามเดิม · `vscode-dropdown` **ไม่ใช่** `<select>` (เป็น combobox ของ webview-toolkit: `role="combobox"` + `vscode-option` เป็น light DOM ที่ถูก slot เข้า shadow listbox) ⇒ ต้อง **คลิก dropdown แล้วคลิก `vscode-option[value=...]`** (ห้ามใช้ `selectOption` และ `getByRole("option")` จะมองไม่เห็นตอน listbox ปิด) · `showNavbar: false` ใน `platform-configs.json` ⇒ ใน VS Code ไม่มี navbar (`tab-account`) ต้องเปิด Account view ผ่านปุ่ม view-title ของ host (`.action-label[aria-label="Account"]:visible`) ซึ่งคือคำสั่ง `iCline.accountButtonClicked`

**ผลตรวจ (รอบนี้):** webview vitest **486/486** · `tsc -b` + biome ผ่าน · e2e บน VS Code จริง **5/5** = `composer-status-options` (ใหม่ 16.9s) · `quick-picker-org-policy` (ใหม่ 17.9s) · `quick-picker-hover` (19.0s) · `quick-picker-effort-notice` (39.5s) · `settings-model-selection` (17.4s) — รันบน VSIX `dist/e2e.vsix` ที่แพ็กจาก commit รอบนี้ (ยืนยันว่าบันเดิล webview มี `data-icline-model-status-button` + `data-icline-status-options`)

**VSIX:** `dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.17.vsix` (11,966,957 B @ 2026-09-20T03:45:49Z · About = `dev build 6 · fix.17`) · `build-metadata.ts` / `package.json` ถูก restore กลับสภาพเดิมหลังแพ็ก (ไม่มีไฟล์ค้าง)

**ยังไม่ทำ (ตัดสินใจไว้):** เส้นทาง "นโยบายองค์กร" ที่พิสูจน์ด้วย e2e นี้ครอบ sign-in → เข้า org ผ่าน UI → lock + คลิก blocked; ยังไม่ได้จำลองเคส **องค์กรปัก provider จริง** (remote config ที่มี `providerSettings` ของ provider อื่น + API keys) เพราะ harness ยังไม่มีคีย์ปลอมให้ resolve โมเดลของ provider นั้น

---

## 🔎 dev.6-fix.15 — แจ้งเมื่อ Effort ถูกลดระดับ + Settings เด้งกลับ Cline + dropdown ทับกัน + ไอคอนสถานะใต้ช่องแชท (2026-09-20)

**สถานะ:** ✅ แก้แล้ว + unit/e2e ผ่านบน VS Code จริง · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.15`)

**ที่มา (4 เรื่องรวมรอบเดียว — 3 เรื่องเป็นรายงานจาก maintainer, 1 เรื่องเป็นคิวที่ค้างจาก fix.14):**

1. **คิวจาก fix.14:** "ถ้าอยากให้ผู้ใช้เห็น `Max → X-High` ต้องมี surface แจ้ง (ยังไม่มี)"
2. **Settings ของ Sakana:** menu dropdown ของ Model โผล่**หลัง**ค่า Effort (maintainer แนบภาพ · ตีกรอบเหลือง)
3. **xAI Grok (OAuth & Subscription):** เลือกโมเดลในลิสต์ที่หน้า Settings แล้วหน้าเด้งกลับไป Cline (Quick Picker เลือกได้ปกติ)
4. **ใต้ช่องแชท:** ชื่อโมเดลไม่มีไอคอนสถานะเหมือนที่เมนู picker มี

**รากของ (1):** Effort เก็บที่ระดับ **mode** ไม่ใช่ต่อโมเดล และ dropdown ทุกตัวจงใจเสนอพจนานุกรมเต็ม ⇒ ค่าหนึ่งอาจบังคับใช้กับโมเดลที่ไม่รับค่านั้น แล้ว **SDK gateway** เป็นผู้ลดระดับให้ (ไม่ใช่ UI) — ไม่มีใครบอกผู้ใช้

**วิธีแก้ (1):**
- SDK: แยกการตัดสินออกมาเป็น **`decideReasoningEffort()`** (ฟังก์ชันเดียวกับที่ `normalizeReasoningRequest` เรียกทุก request) + export ออกจาก `@cline/llms` + เทสต์ `reasoning-options.test.ts` (รวม "โชว์เหตุผลครบทุกแบบ")
- host: `src/sdk/reasoning-effort-decision.ts` — ตอบ `{requested, applied, supportedEfforts, reason, clamped, suppressedByBudget, source}` โดยอ่าน controls จาก **registry เดียวกับที่ gateway ใช้** (`getProviderCollectionSync` + `toSdkProviderId`, matching ตรงเป๊ะแบบเดียวกับ gateway) · rpc ใหม่ `resolveReasoningEffort` (proto + handler `core/controller/models/resolveReasoningEffort.ts` + protos regenerate) — ไม่แตะ network ⇒ webview ถามทุก hover ได้
- webview: hook `useReasoningEffortOutcome` (cache ต่อ `provider|model|effort|budget` + กันคำตอบค้างเก่าด้วย key) + คอมโพเนนต์เดียว `ReasoningEffortNotice` ใช้ทั้ง **แผง Options ของ picker** และ **Effort control ใน Settings** ⇒ สองที่ไม่มีทางพูดไม่ตรงกัน · เงียบเมื่อ: ไม่รู้คำตอบ / ส่งตามที่เลือก / สิ่งที่ออกไปคือ thinking budget
- เทสต์: `reasoning-effort-decision.test.ts` (host) · `ReasoningEffortNotice.test.tsx` (กติกาข้อความ) · `useReasoningEffortOutcome.test.ts` (cache/race) · `ReasoningEffortSelector.test.tsx` · **e2e บน VS Code จริง** `quick-picker-effort-notice`
- **บทเรียนสำคัญของเทสต์:** รอบแรกผมเขียนเทสต์โดยสมมติว่า "โมเดล Fugu ที่มีปุ่ม Max ต้องถูก clamp" — **ผิด** (`sakana/fugu-max` ใน registry รองรับ `high/xhigh/max` จริง ⇒ `exact`) เทสต์ที่ผ่านในรอบนั้นผ่านเพราะ *ไม่มีการยืนยันอะไรเลย* ตอนนี้เทสต์ **คำนวณความคาดหมายจาก registry เดียวกับ host** (`decideReasoningEffort`) แล้ว assert ทั้งสองด้าน (clamp ต้องมีข้อความพร้อม label ของค่าที่ออกจริง · exact ต้องเงียบ)

**รากของ (2):** `vscode-dropdown` วาง listbox ไว้ในคอนเทนเนอร์ ⇒ list ถูกวาดที่ z-index ของคอนเทนเนอร์ · สอง sibling ที่ `position: relative` และ **z-index เท่ากัน** ตัดสินด้วยลำดับ DOM ⇒ ตัวหลัง (Effort) ทับ list ของตัวก่อน (Model) — ค่าเดิม `DROPDOWN_Z_INDEX - 100` เท่ากันทุกตัวในฟอร์ม

**วิธีแก้ (2):** `formDropdownZIndex(position)` ใน `common/ModelSelector.tsx` + กติกา "ฟอร์มต้องไล่ลง": Sakana billing 0 · protocol 1 · model 2 · effort 3 (ข้ามไฟล์ `SakanaProvider` ↔ `SakanaModelPicker` มีคอมเมนต์กำกับ) · ZenMux protocol 0 · routing 1 · เทสต์ `ModelSelector.test.tsx` ปักทั้ง "ไล่ลงจริง" และ "เรนเดอร์บนคอนเทนเนอร์จริง"

**รากของ (3):** `setApiConfiguration()` ส่ง settings ต่อเข้า **`remoteConfigCache`** (`filterAllowedRemoteConfigFields` เก็บ `planModeApiProvider`/`actModeApiProvider`) — และ remote เป็นชั้น**สูงสุด**ใน `remote > session > task > global` ⇒ **การเขียน settings ทั่วไปกลายเป็น "นโยบายองค์กร" ปลอม**: provider ที่เป็นอยู่ตอนนั้นถูกปักไว้ถาวร หลังจากนั้นการเลือกโมเดลของ provider อื่น commit สำเร็จแค่ *โมเดล* (provider ถูก shadow) — จับได้จาก log ชั้น precedence ของ host เอง:

```
COMMIT provider=xai model=grok-build mode=act
BATCH {"actModeApiProvider":"xai", …, "actModeApiModelId":"grok-build"}
LAYER actModeApiProvider remote=cline session=undefined task=undefined global=xai   ← remote ชนะ
STATE post plan=cline (grok-build) act=cline (grok-build)
```

**วิธีแก้ (3):** `setApiConfiguration` ไม่แตะ remote cache อีก (มีคอมเมนต์อธิบาย + ชี้เส้นทางที่ถูกคือ `applyRemoteConfig`/`setRemoteConfigField`) · เทสต์ใหม่ `remote-config/provider-pin.test.ts` — (ก) เขียน provider ธรรมดาต้องไม่ทิ้งร่องรอยใน remote layer (ข) remote pin ที่มาจาก control plane ต้องชนะจริงและ `clearRemoteConfig()` คืนค่าท้องถิ่นได้ · **e2e บน VS Code จริง** `settings-model-selection`: เปิด Settings → เลือก provider xAI → เลือกโมเดล Grok → **provider ต้องยังเป็น xAI** (ก่อนแก้ เห็น `Cline Usage-Billing`)

**รากของ (4):** ไอคอน + badge อยู่เฉพาะในแถวของ picker (`CapabilityIcons` เป็น local function ภายใน `QuickModelPicker.tsx`) ⇒ ชิปใต้ช่องแชทมีแค่ชื่อโมเดล

**วิธีแก้ (4):** แยกเป็นคอมโพเนนต์กลาง `components/chat/ModelStatusIcons.tsx` (capability icons + effort badge + `statusTooltip`) แล้วให้ทั้ง **แถวของ picker** และ **ชิปของ composer** เรนเดอร์ตัวเดียวกันจาก `status` ก้อนเดียวกัน (`statusForModel(currentProvider, currentModelId, warmModelsFor(...))`) · บอลลูนเดิมคร่อมทั้งชิป → ย้ายให้ครอบเฉพาะชื่อโมเดล กันบอลลูนซ้อนบอลลูน · เทสต์ใหม่ใน `QuickModelPickerRealPopover.test.tsx`: ชิปต้องมี caps/states/badge **ชุดเดียวกับแถว** ของโมเดลเดียวกัน

**ผลตรวจ:** webview vitest **477/477** · `tsc -b` (webview) · biome (ไฟล์ที่แตะทั้งหมด) · bun unit `reasoning-effort-parity` 2/2 · sdk vitest `reasoning-options` 16/16 · host vitest ใหม่ (`reasoning-effort-decision` 8/8 · `remote-config/provider-pin` 2/2) · **e2e บน VS Code จริง 4/4** (`quick-picker-effort-notice` 39.8s · `quick-picker-hover` 19.6s · `settings-model-selection` 17.9s)

**หลักฐานว่าแก้ตรงจุด (ข้อ 3):** รัน probe เดิมก่อนแก้ ⇒ ชิป provider = `Cline Usage-Billing` หลังเลือกโมเดล xAI · หลังแก้ ⇒ คงเป็น `xAI Grok (OAuth & Subscription)` ตลอดทั้ง 12 ตัวอย่างที่เก็บ (ทุก 250ms)

**พิสูจน์ว่า e2e เป็นยามจริง (falsification):** ใส่บรรทัด `this.setRemoteConfigState(settingsUpdates)` กลับเข้า `StateManager` ⇒ rebuild VSIX ⇒ e2e `settings-model-selection` **fail จริง** ด้วย `provider-selector-input` = `"Cline Usage-Billing"` (ตรงกับที่ maintainer เห็น) · ถอดออก + rebuild ⇒ ผ่านทั้ง 4 e2e อีกครั้งบน VSIX ที่แพ็กเป็น fix.15

**ยังเหลือ → ปิดใน fix.16 ทั้งสองข้อ:** (ก) การ commit ของ provider ที่องค์กรไม่อนุญาตถูก shadow เงียบ ๆ — ขึ้นข้อความแล้ว (ข) clip ของ `ReasoningEffortNotice` บนโมเดลที่ไม่มี effort control — ตรวจแล้วว่า**เกิดไม่ได้จริง** และปิดด้วยเทสต์สแกน registry

---

## 🏢 dev.6-fix.16 — provider ที่องค์กรไม่อนุญาต + ยามกันข้อความ Effort ผิดรูป (2026-09-20)

**สถานะ:** ✅ เสร็จ + unit/tsc/biome ผ่าน · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.16`)

**ที่มา:** 2 ข้อ P2 ที่ค้างจาก fix.15

**รากของ (ก):** `ApiOptions` กรองรายการ provider ด้วย `remoteConfigSettings.remoteConfiguredProviders` — provider ที่องค์กรไม่อนุญาต**ไม่โผล่**ใน Settings เลย แต่ **Quick Picker โชว์โมเดลของทุก provider** ⇒ คลิกโมเดลของ provider ที่ถูกห้าม = "เหมือนสำเร็จ" แต่ชั้น remote (นโยบายองค์กร, precedence สูงสุด) คง provider เดิมไว้ แล้วการ echo ของ picker ก็อ้างว่าสลับ provider สำเร็จ (ก่อนที่ state push ถัดไปจะกลับ) — อาการเดียวกับบั๊ก pin ของ fix.15 แต่รอบนี้เกิดจากนโยบายจริง

**วิธีแก้ (ก):**
- `webview-ui/src/icline/orgProviderPolicy.ts` — กติกาเดียวกับฝั่ง host (`isProviderValid`): ลิสต์ว่าง = ไม่มีนโยบาย, provider นอก lisต์ = เลือกไม่ได้ · เทสต์ `orgProviderPolicy.test.ts` 4 เคส (รวมเคสมีช่องว่างในลิสต์)
- `components/common/OrgProviderPolicyNotice.tsx` + คอมโพเนนต์**เรนเดอร์ใน popover** (ไม่ปิด popover) เพื่อให้คำอธิบายอยู่ตรงที่คลิก
- picker: (1) provider ที่ถูกห้ามมีไอคอนล็อก `Building2` + บอลลูนอธิบาย (`data-icline-org-blocked`) ⇒ รู้ก่อนคลิก (2) คลิกโมเดลของ provider ที่ถูกห้าม = **ไม่ส่ง commit** และไม่ echo provider (มีคอมเมนต์อธิบายเหตุผล: commit จะเขียนโมเดลที่ provider ที่ถูกปักใช้ไม่ได้ + echo จะอ้างการสลับที่ host ย้อน) แล้วขึ้นข้อความจาก `orgProviderBlocked`
- i18n: `orgProviderBlocked` / `orgProviderBlockedHint` (en/th)

**รากของ (ข):** ข้อความแจ้งใช้ `{applied}` เมื่อ reason เป็น `nearest-supported`/`catalog-unknown` — ถ้ามีเคสที่ `clamped` แต่ไม่มี `applied` และ reason เป็นสองตัวนั้น จะได้ `Max →  · …` (ช่องว่าง)

**วิธีแก้ (ข):** เขียน **เทสต์สแกน registry ทั้งหมด** (`reasoning-effort-decision.test.ts`) ครอบ provider × model × ระดับทุกตัว (ตัด `none`) assert 3 ข้อ: `clamped` ⇒ reason ไม่ใช่ `exact` · ไม่มี `applied` ⇒ reason ต้องเป็น `no-effort-control` · reason `no-effort-control` ⇒ ต้องไม่มี `applied` · **ผล: ผ่านทั้งหมด ⇒ เคสข้อ (ข) เกิดไม่ได้จริง** — ที่อาจารย์กังวลเป็นเพียงสมมติฐานจากอ่านโค้ด จึงไม่ได้ซ่อมข้อความที่ไม่มีบั๊ก แต่ (1) ยามด้วยเทสต์ (2) เพิ่ม fallback ใน `effortClampNotice`: ถ้าประโยคที่ต้องมีระดับไม่มีระดับ ⇒ ใช้ประโยค "ไม่ส่ง" แทน + เทสต์ (และเทสต์ assert ว่าไม่มี `→` หลุดไปด้วย)

**ผลตรวจ:** webview vitest **485/485** · `tsc -b` · biome · host vitest `reasoning-effort-decision` **9/9** (เดิม 8 + สแกน registry)

---

## 🔎 dev.6-fix.14 — พจนานุกรม Effort เดียวทั้งแอป + ปิดฟอร์ม Settings ของ Sakana ที่ซ้อนกัน (2026-09-19)

**สถานะ:** ✅ แก้แล้ว + unit/e2e ผ่านบน VS Code จริง · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.14`)

**ที่มา (2 เรื่องที่รวมรอบเดียวกัน เพราะแก้ "ค่า/สิ่งที่แสดง ไม่ตรงกับสิ่งที่ทำงานจริง" เหมือนกัน):**

1. **มีพจนานุกรม effort 3 ชุด** — SDK (`REASONING_LEVELS`) รับ `none·minimal·low·medium·high·xhigh·max` / แอปเก็บได้แค่ 5 ตัว (ขาด `minimal`,`max`) / gate ตอนส่ง request ผ่านแค่ `low|medium|high` (fix.13 บันทึกไว้เป็น "ข้อสังเกตที่ยังไม่ได้แก้")
2. **Settings ของ Sakana.ai มีสองฟอร์มเรนเดอร์ซ้อนกัน** (รายงานจาก maintainer: "UXUI มีส่วนทับซ้อนกัน")

**รากของ (1):** `normalizeOpenaiReasoningEffort()` แปลงค่าที่ไม่อยู่ในลิสต์ 5 ตัวเป็น `medium` และมันถูกเรียกบนเส้นทาง task settings จริง (`updateTaskSettings.ts` · `newTask.ts`) → **`max` ของ Sakana กลายเป็น `medium` เงียบ ๆ** ส่วน `xhigh` รอดชั้นนั้นแต่ถูกทิ้งที่ gate (`sdk-api-handler.ts` + `cline-session-factory.isReasoningEffort`)

**วิธีแก้ (1):**
- `src/shared/storage/types.ts` — `OPENAI_REASONING_EFFORT_OPTIONS` = พจนานุกรมเดียวของแอป ตรงกับ SDK เป๊ะ + `isReasoningEffortValue()` (ค่าที่ forward ได้ = ทั้งชุดยกเว้น `none`)
- **เทสต์กันหลุด:** `src/shared/storage/__tests__/reasoning-effort-parity.test.ts` — assert ว่าลิสต์ของแอป **เท่ากับ `REASONING_LEVELS` ของ `@cline/shared`** (deep equal ทั้งค่าและลำดับ) → หลุดกันอีกไม่ได้
- gate ทั้งสองชั้นใช้ `isReasoningEffortValue` ตัวเดียวกัน (`sdk-api-handler.ts` · `cline-session-factory.ts` ลบ `isReasoningEffort` ที่ฮาร์ดโค้ด 4 ค่า)
- **UI อ่านพจนานุกรมเดียวกัน:** `OPENAI_EFFORT_LEVELS` สร้างจาก `OPENAI_REASONING_EFFORT_OPTIONS` (ไม่ใช่ลิสต์ที่เขียนซ้ำ) + ตาราง label `Record<OpenaiReasoningEffort, …>` ⇒ เพิ่มค่าใหม่ที่ storage แล้ว **คอมไพเลอร์บังคับให้ใส่ label**
- **catalog ชนะชุด generic:** ถ้า `modelInfo.reasoningEffortOptions` มีค่า ใช้ชุดนั้น **ทุก provider** (เดิมจำกัดที่ OCA) และ label ของค่าที่ catalog เผยแพร่ใช้คำเดียวกับพจนานุกรม (`xhigh` → "X-High") + ค่า `none` ที่ catalog เผยแพร่ถูกทำเป็น off ⇒ ไม่โผล่เป็นปุ่มข้างสวิตช์ Thinking
- ค่าคอมเมนต์ที่ค้างชี้ 5 ค่า: `proto/cline/models.proto` · `src/sdk/model-catalog/contracts.ts` อัปเดตแล้ว

**รากของ (2):** SDK builtin ของ Sakana ประกาศ `protocol: "openai-responses"` (+ generated catalog ว่า `openai-chat`) ซึ่ง**ทั้งคู่อยู่ใน allowlist ของฟอร์ม generic** → `isGenericProviderListing()` เป็น true → `ApiOptions` เรนเดอร์ `GenericProviderSettings` **และ** `SakanaProvider` พร้อมกัน (API key 2 ช่อง · model picker 2 ตัว)

**วิธีแก้ (2):** ลงทะเบียน `sakana` ใน `CUSTOM_PROVIDER_SETTINGS_IDS` (มีฟอร์มของตัวเอง) → generic form หาย · เทสต์ใหม่ `providerSettingsRegistry.test.ts` ปักว่า `isGenericProviderListing(sakana) === false` และ getter ทั้งสองคืน `undefined` · ลบ `<VSCodeLink>` ไปหน้า /pricing ที่ซ้ำสองอันในย่อหน้า (ปุ่ม Pay-as-you-go / Subscription เป็นเจ้าของ action นั้น)

**หลักฐานที่ยืนยันด้วยรันจริง:** `getProviderCollectionSync("sakana")` รายงาน `{ id: sakana, name: "Sakana AI", protocol: "openai-chat" }` — ยืนยันว่าก่อนแก้ predicate ของฟอร์ม generic จับ Sakana จริง

**ผลตรวจ:** webview vitest **453/453** · `tsc -b` (webview) · extension `tsc --noEmit` · extension vitest (935/937 — 2 เคส timeout จาก lazy import หนัก ๆ เมื่อรันพร้อมกัน, ผ่านเมื่อรันไฟล์เดียว) · bun unit ใหม่ผ่าน 2/2 · biome · **e2e บน VS Code จริง 2/2** (`quick-picker-hover`: แผงต้องอ่านได้ `Minimal/Low/Medium/High/X-High/Max` และ Sakana `High/X-High/Max`)
**VSIX:** `dev.6-fix.14` มี marker ใน bundle จริง (webview มี `X-High`/`Minimal` · host มี `["none","minimal","low","medium","high","xhigh","max"]` 12 จุด) — repack ครั้งสุดท้าย 2026-09-19 16:57Z ให้ตรงกับ commit ที่ลงแล้ว

**เปลี่ยนแปลงพฤติกรรมที่ตั้งใจ:** (1) dropdown Effort ของทุกฟอร์มมี 7 ระดับเท่ากับที่แอปเก็บได้ (เดิม 5) — ค่าที่โมเดลไม่รับจะถูก SDK clamp ไม่ใช่ถูก UI ตัด (2) `xhigh` ใน Quick Picker เปลี่ยนจาก "Max" เป็น **X-High** ให้ตรง Settings เพราะ `max` เป็นระดับจริงอีกตัวแล้ว (เฉพาะคำที่แสดง ค่าที่เก็บไม่กระทบ) (3) สวิตช์ Thinking ที่เปิดกลับใช้ระดับแรกจริง = `minimal` แทน `low`

**ยังเหลือ (ต่อจากรอบนี้):** cloud/routing layer ตัวแทน provider ที่รับ `xhigh`/`max` ไม่ได้ถูกตรวจซ้ำ — SDK เป็นผู้ clamp ให้แล้ว แต่ถ้าอยากให้ผู้ใช้เห็น "ขอ Max แต่ได้ X-High" ต้องมี surface แจ้ง (ยังไม่มี)

---

## 🔎 dev.6-fix.13 — ชุดค่า Effort ต่อ provider ย้ายขึ้นเป็น metadata ของ provider (2026-09-19)

**สถานะ:** ✅ refactor เสร็จ + unit/e2e ผ่านบน VS Code จริง · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.13`)

**ที่มา:** ต่อจาก fix.12 ที่ยก "นโยบายว่าอะไรตั้งได้" ขึ้นเป็นโมดูลกลาง — แต่ **"ชุดค่าที่ตั้งได้"** ยังเป็นความรู้ของ UI: ชุด adaptive (`["none","low","medium","high","xhigh"]`) ถูกเขียนซ้ำใน 6 คอมโพเนนต์ และ Sakana มี `SAKANA_REASONING_EFFORTS = ["high","xhigh","max"]` + default ต่อโมเดลของตัวเอง ขณะที่ Quick Picker มีสูตรที่สี่ (`OPENAI_REASONING_EFFORT_OPTIONS` ตัด `none` ออก)

**วิธีแก้:** ใน `webview-ui/src/utils/modelThinkingOptions.ts` เพิ่ม metadata ของ **levels** ต่อ provider
- `EffortLevel { value, label, short, isOff }` · `ProviderEffortLevels { id, levels, default, defaultFor?, label, description }`
- ชุดที่นิยามไว้: `openai` (None/Low/Medium/High/X-High — ค่าตรงกับ `OPENAI_REASONING_EFFORT_OPTIONS` เป๊ะ), `adaptive-thinking` (ชุดเดียวกัน label "Adaptive Thinking" + คำอธิบาย "Use None…"), `sakana` (High/X-High/Max + `defaultFor`: `fugu-ultra*` → X-High) และ `model-declared` (OCA — สร้างจาก `reasoningEffortOptions` ที่ catalog เผยแพร่จริง)
- `resolveEffortLevels({ providerId, modelId, modelInfo })` เป็นทางเดียวที่ทุก dropdown ใช้ — เลือกชุดจาก **policy ตัวเดียวกับที่ตัดสินว่ามีคอนโทรลหรือไม่** (`adaptive-thinking` → ชุด adaptive, ที่เหลือ → ชุดของ provider, `effortDefault` ของ provider เช่น openai-compatible ที่ว่างเปล่า = `none` ไม่ใช่ `medium`)
- helper ประกอบ: `defaultEffortValue` (default ต่อโมเดล), `firstOnEffortValue` (สวิตช์เปิดกลับไประดับจริง ไม่ใช่ off), `normalizeEffortValue`, `effortBadge`, `declaredEffortDefault`
- **`ReasoningEffortSelector`** เลิกรับ `allowedEfforts`/`defaultEffort`/`label`/`description` ทั้งหมด — รับ `providerId`/`modelId`/`modelInfo` แล้วอ่าน metadata (รวมกรณี adaptive ที่ default มาจากค่าที่ "มีผลจริง" ผ่าน `resolveClaudeOpusAdaptiveThinking` → ลบโค้ดซ้ำใน 6 ฟอร์ม)
- **SakanaModelPicker** สร้าง `VSCodeOption` จาก levels + ใช้ `description` จาก metadata (ลบ `SAKANA_REASONING_EFFORTS`/`defaultSakanaReasoningEffort`/`normalizeSakanaReasoningEffort`)
- **OcaModelPicker** ทั้งการ render และค่า default ตอนเปลี่ยนโมเดลอ่าน metadata ตัวเดียวกัน (ลบ `reasoningEffortOptions[0]` ที่เขียนซ้ำสองที่)
- **QuickModelPicker** ดึง levels ของ **โมเดลที่ hover** (ไม่ใช่ชุดเดียวตายตัว) → Sakana ใน picker แสดง High/X-High/Max, OCA แสดงค่าที่ catalog เผยแพร่ · label แปลตาม i18n ยังอยู่ (`effortMax` เพิ่มใหม่) · `pickerCapabilities` ตัดตาราง badge ซ้ำ (`MODEL_EFFORT_SHORT`) ทิ้ง ใช้ `effortBadge` และรับค่า `max` ได้ (เดิม `isOpenaiReasoningEffort` กรองทิ้ง)
- `ChatModelPreference.reasoningEffort` กว้างเป็น `string` (ค่า `max` ของ Sakana ต้องเก็บได้)

**กันถอยหลัง:**
- unit: `modelThinkingOptions.test.ts` +5 เทสต์ (ชุด openai ตรงกับ enum ที่เก็บจริง · adaptive label/off · Sakana 3 ระดับ + default ต่อโมเดล + badge `M` · OCA ตาม catalog และ `declaredEffortDefault` = ค่าแรก/undefined · openai-compatible ว่างเปล่า = `none` และ `firstOnEffortValue` = `low`) และการ์ดใหม่ "ห้ามไฟล์ใน `components/settings` มี array literal ของ level" — **พิสูจน์แล้วว่าฟ้องจริง** ด้วยไฟล์ probe (fail) แล้วลบออก (pass)
- jsdom: `QuickModelPickerRealPopover.test.tsx` เพิ่มเทสต์ provider Sakana — แผงต้องมี `[high, xhigh, max]`, ไม่มี `none`, `data-icline-effort-set=sakana`, ชิปแถว = `M`
- e2e `quick-picker-hover.test.ts` บน VS Code จริง: อ่าน `data-icline-effort-set` ของแผงแล้ว assert ชุดค่าตรงของจริง (sakana = High/X-High/Max) และกฎร่วม (ไม่มี None, ไม่ซ้ำ, ไม่ว่าง) — ผ่าน 2/2 (ชุด openai/adaptive ถูกขยายเป็น Minimal/Low/Medium/High/X-High/Max ใน **fix.14**)
- ผ่าน: webview `tsc -b` · vitest ทั้งชุด **449/449** · extension `tsc --noEmit` · biome lint · VSIX fix.13 มี marker `data-icline-effort-set`

**ข้อสังเกต (ปิดใน fix.14 แล้ว):** `src/sdk/sdk-api-handler.ts` ส่งต่อ effort แค่ `low|medium|high` → `xhigh` และ `max` ถูกตัดเงียบ ๆ — fix.14 ขยายพจนานุกรมแอปให้ตรง SDK และให้ gate ทั้งสองชั้นใช้ตัวเดียวกัน

**เปลี่ยนแปลงพฤติกรรมที่ตั้งใจ:** (1) คอนโทรล Effort ของ Sakana แสดงตลอด (เดิม gate ด้วย `effortIsSet` → ต้องมีค่าตั้งค้างอยู่ก่อน) (2) label ของ `xhigh` ใน Settings เป็น `X-High` แทน `Xhigh` (config เดิมไม่กระทบ)

---

## 🔎 dev.6-fix.12 — นโยบาย Effort/Thinking เป็นโมดูลกลางตัวเดียวที่ Settings และ Quick Picker เรียกใช้ (2026-09-19)

**สถานะ:** ✅ refactor เสร็จ + unit ทั้งชุดผ่าน · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.12`)

**ที่มา:** คำถาม "ระหว่าง Settings กับ Quick Picker ใครถือแหล่งความจริงเดียว" → คำตอบคือ **ค่าจริง (value truth) เป็นของ host config** (`planMode/actModeReasoningEffort`, `...ThinkingBudgetTokens`) แต่ **นโยบายว่าอะไร "ตั้งได้"** ยังตัดสินซ้ำกันหลายที่: Settings มีกฎกระจายอยู่ในฟอร์ม provider ~15 แห่ง (บางที่ดูจาก id, บางที่ดู metadata, บางที่มีรายการโมเดลฮาร์ดโค้ดของตัวเอง) ส่วน Quick Picker มีสูตรที่สี่ของตัวเอง → สองหน้าจอตอบไม่ตรงกันได้ทั้งที่ค่าจริงถูกต้อง

**โมดูลกลาง:** `webview-ui/src/utils/modelThinkingOptions.ts` → `resolveModelThinkingOptions({ providerId, modelId, modelInfo, effortIsSet, budgetIsSet })` คืน `{ showEffort, showThinkingBudget, builtinReasoning, effortSource, budgetSource }`
- ตาราง `POLICIES` ต่อ provider — แต่ละแถบบันทึกว่าจำลองมาจากฟอร์ม Settings ตัวไหน (xai / anthropic / bedrock / claude-code / qwen / qwen-code / openrouter / vercel-ai-gateway / requesty / zenmux / cline / vertex / oca / litellm / openai-native / openai-codex / openai-compatible) ที่เหลือใช้ `DEFAULT_POLICY` (heuristic เดิมของ picker)
- หลักการ 2 ข้อ: (1) กฎต่อ provider ต้อง**ซื่อตรงกับของเดิม** — รายการโมเดลฮาร์ดโค้ดยังอยู่ (`ANTHROPIC_THINKING_BUDGET_MODELS`, `BEDROCK_…`, `CLAUDE_CODE_…`, `QWEN_…`, fragment ของ gateway) แต่ย้ายมาอยู่ที่เดียว และให้ metadata (`thinkingConfig`, `supportsThinkingLevel`) ชนะเมื่อ catalog รู้จักโมเดลนั้น (2) **คอนโทรลต้องเข้าถึงได้เสมอ** — ค่าที่ตั้งไว้แล้วทำให้คอนโทรลของค่านั้นยังโผล่ (`stored-preference`) โดย budget ที่ค้างอยู่ไม่กลายเป็นคอนโทรล effort
- `effortSource`/`budgetSource` มีไว้ให้เทสต์และรายงานบั๊ก — บอกว่า "ทำไมคอนโทรลนี้โผล่"

**ย้ายเข้าโมดูลกลางรอบนี้ (ปิดงานที่ค้างจากรอบก่อน):**
- `providers/AnthropicProvider.tsx` — เลิกรายการ `SUPPORTED_ANTHROPIC_THINKING_MODELS` ในคอมโพเนนต์ + ใช้ policy
- `providers/BedrockProvider.tsx` — เลิกรายการ `SUPPORTED_BEDROCK_THINKING_MODELS` · โมเดล custom ถูกตัดสินด้วย **base model id** เหมือนเดิม
- `providers/VertexProvider.tsx` — ใช้ policy และแยก "สองหน้าตา" ของ effort ด้วย `effortSource` (`adaptive-thinking` = ตัวมี label/None, `thinking-level` = ตัวธรรมดา)
- `providers/OcaModelPicker.tsx` — ทั้ง dropdown Effort และ budget slider อ่าน policy เดียวกัน (effort = ต้องมี `reasoningEffortOptions` จริง)
- `SakanaModelPicker.tsx` — ให้ policy ตัดสินว่าโมเดลไหนมีคอนโทรล Effort (ระดับ `high/xhigh/max` ยังเป็นของ Sakana ตามที่ provider map เอง)
- `utils/pricingUtils.ts` — `hasThinkingBudget` ย้ายไปเรียก `hasThinkingBudgetConfig` ตัวเดียวกัน
- `utils/providerUtils.ts` — ลบ `supportsReasoningEffortForModelId` ที่ตายแล้วทิ้ง พร้อมคอมเมนต์กันคนกลับมาเขียน helper ซ้ำ

**กันถอยหลัง (สำคัญ):** เพิ่มเทสต์ใน `utils/__tests__/modelThinkingOptions.test.ts`
- คู่เทียบ "Settings กับ Quick Picker ตอบเหมือนกัน" — รวมเคสที่เคยขัดกัน (Claude id ที่ Settings ให้เป็น budget แต่ heuristic เดิมของ picker เรียกร้อง effort)
- เทสต์การ์ดกันซ้ำ (สแกนไฟล์ใน `components/settings` จริง): ไฟล์ไหนเรนเดอร์ `ThinkingBudgetSlider`/`ReasoningEffortSelector` ต้อง import `@/utils/modelThinkingOptions` · และห้ามมีไฟล์ไหนเก็บรายการโมเดล thinking ฮาร์ดโค้ดของตัวเองอีก — **พิสูจน์แล้วว่าเทสต์ฟ้องจริง** โดยวางไฟล์ probe ที่ผิดกฎชั่วคราว (fail) แล้วลบออก (pass)

**ผลตรวจ:** webview `tsc -b` · vitest ทั้งชุด **442/442** · extension `tsc --noEmit` · biome — ผ่านทั้งหมด

**ยังเหลือ (Settings-only, ยังไม่ย้าย):** ฟอร์มที่ถือ "ค่าที่รองรับ" ของตัวเองเป็นชุด dropdown แบบ provider-specific (เช่น Sakana `high/xhigh/max`) — ถ้าจะให้จบในชั้นเดียว ต้องยกชุดค่าพร้อม mapping ขึ้นเป็น metadata ของ provider

---

## 🔎 dev.6-fix.11 — Quick Picker: แผง Options ตรง mock v11 + ไอคอน/สถานะตรงกับค่าที่ตั้งจริง (2026-09-19)

**สถานะ:** ✅ แก้แล้ว + unit/e2e ผ่านบน VS Code จริง · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.11`)

**อาการ:**
1. เนื้อหาแผง Options ไม่ตรง design lock — mock v11 มีหัวข้อ "Options" + บรรทัด model id + สวิตช์ Thinking + ปุ่ม Effort ชื่อ Low/Medium/High/Max (ไม่มี Off) และรายการ capability ส่วนล่างเป็นไอคอนเทา ๆ ส่วนของเราหัวเป็นชื่อโมเดล + label "Reasoning effort"/"Capabilities" + ชิป Off/Low/Med/High/Max
2. ทดสอบ fix.10 แล้วพบว่า "การตั้งค่าและไอคอนแสดงสถานะไม่สอดคล้องกัน" — แผงบอกว่าตั้ง Effort ไว้ ขณะที่แถวโมเดลไม่แสดงสถานะอะไรเลย

**ต้นตอ (ข้อ 2 — ปมหลัก):** แถวโมเดล**ไม่ได้รับค่าจริงเลย** — `renderModelSections` เรียก `<ModelRow>` โดยไม่ส่ง prop `effort` ขณะที่แผงคำนวณค่าของตัวเองแยก → สองฝ่ายอ่าน input คนละชุด จึงตรงกันไม่ได้เลยแม้จะไม่มีบั๊กอื่น นอกจากนี้ค่าที่ตั้งใหม่จะยังไม่ขึ้นจนกว่า state push จาก host จะมาถึง (`handleModeFieldChange` ไม่ได้ optimistic update) จึงเห็น "ตั้งค่าแล้วไอคอนไม่ขยับ"

**วิธีแก้:**
- เพิ่ม `resolveModelStatus()` + `resolveModelOptionSupport()` ใน `icline/pickerCapabilities.ts` — แหล่งความจริงเดียวที่**ทั้งแถวและแผง**อ่านร่วมกัน: อะไรที่ตั้งได้ (พอร์ตตรรกะ `getModelOptionSupport` จาก picker 0.1.17 ตัวที่ shipped: xAI 3-mini = effort, xAI non-reasoning = ไม่มีอะไรให้ตั้ง, xAI reasoning/multi-agent = คิดในตัว, อื่น ๆ = effort เมื่อ `supportsReasoningEffortForModel`/`supportsReasoning` หรือ thinking budget เมื่อมี `thinkingConfig`) + สถานะเปิด/ปิดจริง + ชิปตัวอักษร L/M/H/X
- ไอคอน Reasoning/Thinking บนแถวใช้**สีตามสถานะจริง** (สีประจำความสามารถเมื่อเปิด, จาง 50% เมื่อปิด) พร้อม tooltip บอกระดับจริง — ส่วน Vision ยังเป็นสีความสามารถล้วน (ไม่มีสถานะ)
- เก็บค่าใหม่ที่ผู้ใช้เพิ่งแก้ไว้ใน session (`sessionThinking`) เพื่อให้แถวกับแผงขยับพร้อมกันทันทีโดยไม่รอ push และล้างเมื่อเปิด picker ใหม่ (ตอนนั้น config คือความจริง)
- สวิตช์ Thinking เขียนค่าจริงแบบเดียวกับ Settings: โมเดลแบบ effort → กลับไประดับเดิม (ดีฟอลต์ `medium`) หรือ `none`; โมเดลแบบ budget → `ANTHROPIC_MIN_THINKING_BUDGET` หรือ 0
- ปิดช่องที่เจอระหว่างทาง: ค่า thinking budget ที่เก็บรายโมเดล (localStorage) เคยไม่ถูกนำกลับเข้า config ตอนเลือกโมเดล — ตอนนี้ `applyStoredThinking()` เขียน effort + budget **ในการเรียกเดียว** (`handleModeFieldsChange`) เพราะสองครั้งเรียงกันจะแข่งกับ state push แล้วตัวหลังเขียนทับด้วย snapshot เก่า (คลาสเดียวกับบั๊ก stale write-back ของ fix.9)
- แผง Options ปรับโครงตาม mock v11: หัวข้อ Options → บรรทัด model id → สวิตช์ Thinking → ปุ่ม Effort Low/Medium/High/Max (มี ✓ ที่ระดับที่เลือก) หรือข้อความ "No effort options for this model" → รายการ capability (ไอคอนเทาแบบ mock) หรือ "No capability data" และเว้นวรรค/ขนาดให้ตรง mock (py 10 / px 12, gap 4px, กว้าง 236px, max-height 320px)

**กันถอยหลัง:**
- unit: `pickerCapabilities.test.ts` ครอบกฎ option support + สถานะ (off จนกว่าจะตั้ง, budget เก่า + ไม่มี effort → `high` ตาม `resolveClaudeOpusAdaptiveThinking`, `none` = ปิดจริง, โมเดลไม่มีอะไรให้ตั้ง = ไม่มีคอนโทรล); `QuickModelPickerRealPopover.test.tsx` เพิ่ม 2 เทสต์: โครงแผง mock v11 (Options + model id + สวิตช์ + Low/Medium/High/Max) และ "แถวกับแผงต้องตรงกัน" (ชิป `H` + ไอคอน on + สวิตช์ on + ระดับที่เลือก ตรงกันหมด แล้วสลับปิด/เปิดกลับมาระดับเดิม)
- e2e `quick-picker-hover.test.ts` ยืนยันบน VS Code จริง: แผงเป็นผิว mock v11 (Options/Effort/สวิตช์ 1 ตัว) และไล่ hover สูงสุด 12 แถว ตรวจว่าทุกแถวที่ hover มี model id + สถานะไอคอน + ชิป effort **ตรงกับแผงทุกแถว**
- ผ่าน: webview `tsc -b` + vitest ทั้งชุด 427/427 · extension `tsc --noEmit` · biome · e2e 2/2

**หมายเหตุ:** ชื่อระดับ Effort คงเป็นอังกฤษ (Low/Medium/High/Max) ทั้งสองภาษาเหมือน mock v11 — และไอคอนสีบอกสถานะเป็นพฤติกรรมที่ตั้งใจให้ต่างจาก mock (mock เป็นภาพนิ่ง) ตามข้อ "ไอคอนต้องตรงกับการทำงานจริง"

---

## 🔎 dev.6-fix.10 — Quick Picker: แผง Options ตามแถวได้แค่ไม่กี่แถวบน (ต่อจาก fix.9) (2026-09-19)

**สถานะ:** ✅ ต้นตอพิสูจน์จาก mock v11 จริง + แก้แล้ว + e2e ตรวจสูตรตรง mock · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.10`)

**อาการ:** แผง Options โผล่แล้ว (fix.9) แต่ขยับตามเมาส์แค่รายการช่วงบน ๆ — พอเลื่อนลงต่ำแผงหยุดค้าง

**ต้นตอ:** สูตรจัดตำแหน่งของ mock v11 (`.icline/plans/quick-picker-redesign/mock.v11-locked-2026-09-16.html`) คือ

```js
const desiredTop = rr.top - pr.top - 6;
const maxTop = pr.height - options.offsetHeight - 10;   // ← ความสูง “จริง” ของแผง
options.style.top = Math.max(38, Math.min(desiredTop, maxTop)) + "px";
```

แต่โค้ดจริงใช้ `OPTIONS_PANEL_MAX_HEIGHT_PX` (320 ค่าคงที่) แทน `options.offsetHeight` → `maxTop` = 422−10−320 = **92px** → ทุกแถวที่ต่ำกว่า ~92px ถูก pin ที่ค่าเดียว (แผงดูเหมือนตามได้แค่ 3 แถวแรก)

**วิธีแก้:**
- ย้าย geometry + สูตร clamp เป็น pure helper `computeOptionsPanelTop()` ใน `quickModelPickerList.ts` (unit-test ได้)
- วัดความสูงจริงของแผง (ซึ่งแปรตามโมเดล 157–264px) ใน `useLayoutEffect` หลังเรนเดอร์ แล้วค่อยใส่ `top`
- ปรับค่าอื่นให้ตรง mock: gap 4px (จาก 6), กว้าง 236px (จาก 232), min-top 38px (กันทับช่องค้นหา), nudge 6px, margin ล่าง 10px
- side flip: ไปขวาเป็นหลักเหมือน mock — จะพลิกซ้ายเมื่อด้านขวาไม่พอ **และ** ด้านซ้ายมีที่จริง (กันเคส sidebar แคบดันแผงหลุดจอ)

**กันถอยหลัง:** unit test ของ `computeOptionsPanelTop` ใช้ตัวเลขที่วัดจาก mock จริง (row 311/panel 227 → 267; row 352/panel 157 → 337; row 439/panel 260 → 234) + e2e `quick-picker-hover.test.ts` ยืนยันว่าตำแหน่งแผงตรงสูตร (±1.5px) และยังตามแถวล่างได้

**หมายเหตุ (แก้แล้วใน fix.11):** เทียบ mock แล้ว เนื้อหาแผงยังต่างกัน — mock มีหัวข้อ "Options" + บรรทัด model id + สวิตช์ Thinking และปุ่ม Effort ใช้ชื่อ Low/Medium/High/Max (ไม่มี Off) ขณะที่ของเรามีหัวเป็นชื่อโมเดล + label "Reasoning effort"/"Capabilities" + ชิป Off/Low/Med/High/Max → ยกไปทำใน `dev.6-fix.11`

---

## 🔎 dev.6-fix.9 — Quick Picker: เมนู Options ไม่ขึ้นตอน hover (regression ของ fix.8) (2026-09-19)

**สถานะ:** ✅ ต้นตอพิสูจน์บน VS Code จริง + แก้แล้ว + มี e2e กันถอยหลัง · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.9`)

**อาการ:** เปิด Quick Picker แล้ว hover รายการโมเดล — แผง Options ไม่โผล่เลย (fix.8)

**ต้นตอ:** แผงผูกกับ event ผ่าน `list.addEventListener("pointermove", …)` ที่ใส่ใน `useEffect` โดยมี deps `[open, handleModelHover, scheduleOptionsClose]` ฝั่ง Radix `Presence` **mount เนื้อหา popover หลัง commit ที่ `open` กลายเป็น true หนึ่งจังหวะ** (layout effect ยิง `send("MOUNT")` แล้ว setState) ลำดับจึงเป็น:

1. commit A — `open=true` แต่ content ยังไม่ mount → effect รัน → `listRef.current === null` → `return` (ไม่มี cleanup)
2. commit B — `send("MOUNT")` → ลิสต์ mount จริง, `listRef.current` ถูกตั้งค่า
3. deps ไม่เปลี่ยนอีก → **effect ไม่ re-run → listener ไม่เคยถูก attach** → hover ตาย

พิสูจน์ด้วย e2e probe บน VS Code จริง: ไม่มี `pointermove` listener ถูก attach เลย; อ่าน React fiber ได้ hook effect (deps=3) `ran=false` ขณะ `open=true` และ `listRef.current` ชี้ div จริง (`rowMetaRef` มี 291 แถว) — และเป็นเหตุผลที่ scroll-pin ยังทำงาน เพราะ effect นั้นอ่าน `listRef` ข้างใน rAF

**วิธีแก้:** เปลี่ยนเป็น **React prop `onPointerMove` บนลิสต์** (`handleListPointerMove`) ซึ่งผูกตอน render จึงไม่มีทางพลาดจังหวะ mount — ลบ effect แบบ native listener ทิ้ง

**กันถอยหลัง:** unit test (จริง Radix Popover ตัวจริง) "hovering a model row mounts the Options panel and follows the hovered row" + e2e `src/test/e2e/quick-picker-hover.test.ts` (ไดรฟ์เมาส์จริงบน VS Code: แผงโผล่วันแรกที่ hover และขยับตามแถวที่สอง)

---

## 🔎 dev.6-fix.8 — e2e บน VS Code จริง: `editor` เขียนเกินขีดจำกัด ต้องขึ้นล้มเหลวพร้อมข้อความจริง (2026-09-19)

**สถานะ:** ✅ รันผ่านบน VS Code จริง (ยืนยันซ้ำ 2026-09-19) · ⏳ ยังไม่ commit

**ที่มา:** รอบ fix.7 พิสูจน์ "editor create รายงานสำเร็จแต่ไฟล์ไม่ลงดิสก์" ด้วย core script (`bun run repro:editor-write`) + vitest เท่านั้น — ยังไม่มีหลักฐานในหน้าต่าง VS Code จริงว่าปลายทางผู้ใช้เห็นอะไร

**ทำอะไร:** harness e2e ที่ให้ mock server stream tool call `editor` ขนาดเกินขีดจำกัด (6,000 ตัวอักษรต่อการเรียก) แล้วยืนยันว่าแถว tool ในแชทขึ้น **ล้มเหลวพร้อมข้อความจริงจาก runtime** (ไม่ใช่ `ENOENT` ซึ่งเป็นอาการเดิมที่ทับหลักฐาน)

**ไฟล์:** `src/test/e2e/oversized-editor-write.test.ts` (ใหม่) · `src/test/e2e/fixtures/server/{api,index}.ts` (mock stream tool call + model list) · `scripts/repro-editor-write.ts` + `src/sdk/tool-write-pipeline.test.ts` + `src/icline/harness/tool-trace.ts(+test)` (ชั้น core/observability ของ fix.7)

**หลักฐาน:** `bun run test:e2e:build && node src/test/e2e/utils/build.mjs && npx playwright test oversized-editor-write` → **3 passed** (setup + Single Root + Multi-Roots, ~36s)

---

## 🔎 dev.6-fix.7 — ไล่ "editor create รายงานสำเร็จแต่ไฟล์ไม่ลงดิสก์" (2026-09-19)

**สถานะ:** ✅ ต้นตอพิสูจน์แล้ว + แก้แล้ว · ⏳ รอ maintainer smoke (VSIX `dev.6-fix.7`)

### กองที่ 1 — บั๊กของเรา (iCline): guardrail เขียนทับหลักฐาน

`runIclinePostWriteVerification` (`apps/vscode/src/sdk/hooks-adapter.ts`) เดิมตัดสินว่าสำเร็จ/ล้มเหลวจาก **ธง `isError` เท่านั้น** แต่ฝั่ง SDK คืน "การปฏิเสธระดับ input" มาเป็น **envelope ที่ return กลับมา** — `{ query, result: "", error, success: false }` — โดย **ไม่ throw** ดังนั้น `isError` จึงว่างเสมอ

ผลลัพธ์เป็นสองหน้าตาที่ไม่สมมาตรกัน:

| เคส | สิ่งที่เกิดก่อนแก้ | สิ่งที่โมเดลเห็น |
|---|---|---|
| `editor` **สร้างไฟล์ใหม่** oversized (ไฟล์ยังไม่มี) | guardrail เข้าใจว่าสำเร็จ → `verifyWrittenFile` stat ไฟล์ที่ไม่มีวันมี → **เขียนทับข้อความจริงด้วย ENOENT** | "ไฟล์หาย" → เดา → ส่งคำสั่งเดิมซ้ำ |
| `editor` **แก้ไฟล์เดิม** oversized (ไฟล์มีอยู่) | guardrail ตรวจผ่านเงียบ ๆ → envelope ยังอยู่ครบ | ข้อความจริงอยู่ แต่ **ไม่ถูกทำเครื่องหมายว่าล้มเหลว** → โมเดลเล็กส่งซ้ำอยู่ดี |

**แก้แล้ว:** ตรวจ envelope **ก่อน** การ verify (เก็บข้อความของ executor ไว้), คืน `isError: true`, เติมสูตรที่ลงมือได้จริง (แยกก้อน + `insert_line` สำหรับต่อท้าย), และในเส้นทาง verify-fail จะแนบ "The tool reported: …" กลับไปด้วย หลักฐานจึงไม่หายอีก — ดู "ทางป้องกัน/ทางกู้" ท้ายหัวข้อ

### กองที่ 2 — ขีดจำกัดของ runtime (ไม่ใช่บั๊ก iCline แต่ต้องรู้)

| ข้อจำกัด | ค่าจริง | หลักฐาน |
|---|---|---|
| `editor` จำกัด `new_text`/`old_text` **ต่อการเรียก 1 ครั้ง** | 6000 ตัวอักษร (`INPUT_ARG_CHAR_LIMIT`, `@cline/core` `extensions/tools/schemas.ts`) | `bun run repro:editor-write`: 6000 → ลงดิสก์, 6001 → ถูกปฏิเสธ (envelope) |
| `insert_line` ต้องอยู่ในช่วง 1..(บรรทัดสุดท้าย) ของไฟล์ | ปฏิเสธพร้อมข้อความบอกช่วงที่ถูก | session ล่าสุด msg#31 (`insert_line: 21` แต่ไฟล์มี 18 บรรทัด) |
| `old_text` ไม่ตรงเป๊ะ | "No replacement performed" | 40 เคสใน 47 session iCline — **พฤติกรรมโมเดล** ไม่ใช่บั๊ก |

เส้นแบ่ง 6000 ยืนยันจากคลัง session (ตัวเลขจากตาราง size bucket ด้านล่าง): `create` ที่ **>6000 ล้ม 28 จาก 28** (`ok` 0) · `create` ที่ **≤6000 สำเร็จ 56 จาก 65** — และ 9 เคสที่ล้มนั้นเป็น `Editor operation failed: Parameter \`old_text\`` ทั้งหมด (โมเดลส่งคำสั่งแก้ไฟล์ที่ยังไม่มี) **ไม่เกี่ยวกับขนาด** · `edit` ที่ **>6000 ล้ม 23 จาก 23**

### กองที่ 3 — observability: envelope ไม่เคยถูกทำเครื่องหมายเป็น error เลย

สแกน `~/.cline/data/sessions` ด้วย `.icline/scratch/analyze-session.mjs --envelope`:

```
envelope rejections flagged as errors  : 0
envelope rejections reported as SUCCESS: 74  {"ENVELOPE_FAILURE_UNFLAGGED":11,"SIZE_REJECTED_UNFLAGGED":23,"NO_MATCH_UNFLAGGED":40}
by session (14)  — new_text ที่ถูกปฏิเสธเพราะใหญ่เกิน: 6044…26310 (23 ค่า)
```

**74/74 ไม่เคยถูก flag** — ไม่มีแม้แต่ครั้งเดียวที่การปฏิเสธระดับ input กลายเป็น error ที่ UI/ลูปมองเห็น จึงไม่แปลกที่รอบก่อน ๆ สรุปว่า "ข้อความ `Editor input too large` ไม่เคยถึงโมเดล"

> **ตัววิเคราะห์เองก็มองไม่เห็นบั๊กนี้** — `classifyResult` เดิมแยกชนิดจาก `is_error` อย่างเดียว เคส envelope จึงถูกนับเป็น `ok` ต้องแก้เป็นอ่าน payload (`success: false` + `error`) ก่อน ตัวเลข "23/23 ไม่มี flag" จึงโผล่

### สิ่งที่แก้/เพิ่มในรอบนี้

| # | ไฟล์ | ทำอะไร |
|---|---|---|
| 1 | `src/sdk/hooks-adapter.ts` | ตรวจ failure envelope ก่อน verify · เก็บข้อความ executor · เติมสูตรแยกก้อน · คืน `isError: true` · ส่ง `apply_patch` ด้วย |
| 2 | `src/icline/harness/guardrails.ts` | `EDITOR_INPUT_CHAR_LIMIT` (สะท้อนค่าจริง 6000) + `getLargeWriteGuidance()` ใช้ร่วมกันทั้ง overlay และ guardrail · overlay สอนวิธีเขียนไฟล์ใหญ่ก่อนล้ม |
| 3 | `src/icline/harness/tool-trace.ts` | แหล่งหลักฐาน JSONL (`~/.cline/data/logs/icline-tool-trace.jsonl`): tool name / call id / path / คำอ้างของ tool / ผล verify · เขียนเฉพาะตอนล้มเหลวในบิลด์ปกติ, เปิดทั้งหมดด้วย `ICLINE_TOOL_TRACE=1` · จำกัดขนาด 2 MB · ห้าม throw เข้าลูป |
| 4 | `apps/vscode/scripts/repro-editor-write.ts` | harness กับ **core จริง** (`bun run repro:editor-write`) — vitest alias `@cline/core` เป็น stub จึงพิสูจน์ไม่ได้ชั้นนั้น |

**ทางป้องกัน:** overlay ของ harness บอกทุก session ว่ารอบเดียวรับได้ ~6000 ตัวอักษร และให้แยกก้อน + ต่อด้วย `insert_line`
**ทางกู้:** ถ้าโดนปฏิเสธ guardrail ส่งข้อความจริงของ executor + สูตรที่ลงมือได้กลับไปพร้อม `isError: true` แทน ENOENT ที่ทำให้เข้าใจผิด

### เทสต์กันถอยหลัง

| ไฟล์ | คุมอะไร |
|---|---|
| `src/sdk/tool-write-pipeline.test.ts` | สัญญาของ guardrail (envelope ใหญ่/ไม่ใหญ่, เก็บคำอ้าง, เงียบเมื่อสำเร็จจริง, ไม่แตะเมื่อ tool throw แล้ว) |
| `src/sdk/hooks-adapter.test.ts` | +4 เคส: envelope → error จริง · เติมสูตรเมื่อ oversized · envelope ที่ `error: ""` ยังต้อง verify · `apply_patch` ไม่เติมสูตรของ editor |
| `src/icline/harness/tool-trace.test.ts` | เงียบในบิลด์ปกติ · เก็บเคสล้มเหลวเสมอ · เขียนพร้อมกันไม่ปนบรรทัด · ตัด backlog เมื่อเกิน 2 MB |

### 🧪 วิธี smoke fix.7

| # | ทดสอบ | คาดหวัง |
|---|-------|--------|
| 1 | About | `dev build 6 · fix.7` |
| 2 | สั่งให้เขียนไฟล์ใหญ่ (> 6000 ตัวอักษร) ในคำสั่งเดียว | โมเดลต้อง**ไม่**รายงานว่าสำเร็จลอย ๆ — ถ้าโดนปฏิเสธต้องเห็นข้อความ `Editor input too large` **พร้อมสูตรแยกก้อน** และแถว tool ต้องเป็นสีแดง (ไม่ใช่เขียว) |
| 3 | ให้โมเดลสร้างไฟล์ 2 ไฟล์พร้อมกันโดยไฟล์หนึ่งใหญ่เกิน | ไฟล์เล็กต้องลงครบ · ไฟล์ใหญ่ต้องรายงานเหตุผลจริง |
| 4 | `ICLINE_TOOL_TRACE=1` แล้วลองซ้ำข้อ 2 | มีบรรทัดใหม่ใน `~/.cline/data/logs/icline-tool-trace.jsonl` ที่มี `event` / `toolName` / `newTextChars` |
| 5 | Quick Picker: เปิดจากแถบหัวแชท | กว้าง 320px · กลุ่ม **Free ก่อน Standard** + จำนวน · badge FREE · ไอคอน capability มี tooltip (บอลลูน **ด้านบน** ไม่ใช่ title เนทีฟ) · chevron ตัวเดียว**หน้า**ชื่อ provider ยุบแล้วชี้ขวา |
| 6 | hover แถวโมเดล | มี Options panel โผล่**ด้านขวา** ขอบบนตรงกับแถว · เดินเมาส์เข้าไปกด Effort ได้โดย panel ไม่หาย · **scroll ลิสต์แล้ว panel ต้องปิด** |
| 7 | ตั้ง General Settings → Preferred Language = `Thai - ไทย` แล้วเปิด picker | ข้อความใน picker เป็นไทย (ช่องค้นหา / Free / ใช้งานอยู่) |
| 8 | Settings → provider `jan` (หรือ custom ที่ใช้ฟอร์ม OpenAI-compatible) | dropdown **Model ID** ต้องเข้าธีม (ไม่ใช่สีขาวของเบราว์เซอร์) |

### คิวถัดไปที่ยังค้างจากรอบนี้

- **e2e บน VS Code จริง** ผ่าน mock server ที่ stream tool call `editor` ขนาดใหญ่ — เลย์เอาต์ที่พิสูจน์ได้ตอนนี้คือ `bun run repro:editor-write` (real core) + vitest (เลเยอร์เรา); debugger F5 ใช้ได้ แต่ `debug-harness` ของ upstream เป็น macOS-only
- `old_text` ไม่ตรง 40 เคส = คุณภาพโมเดล ไม่ใช่บั๊ก — ถ้าจะลด ต้องแก้ที่ prompt/overlay ไม่ใช่โค้ดเครื่องมือ

---

### 🔀 dev.6 Wave 1 — SDK fast-forward ถึง upstream Sep-16 (`ce25d8b15`, เปิดรอบ)

| # | งาน | Smoke |
|---|-----|-------|
| W1-1 | SDK packages (core/shared/llms/agents) ยกทั้งก้อนถึง upstream `173837314` — ครอบ stream retry, terminal reliability, PowerShell fail-fast, editor/CRLF recovery, MCP hang/stdio/OAuth/timeout, checkpoints perf, CVE axios/js-yaml/mermaid/protobufjs | ⏳ รอ smoke |
| W1-2 | identity re-applied: builtins Sakana/Jan/ZenMux · fix.26 catalog merge logic · JAN enum · upstream cline-free catalog supersede fix.26 blocks | ⏳ ร่วมกับด้านบน |
| W1-3 | vscode adapt: ลบ onRetryAttempt pass-through, stored-overrides boundary cast, default models ใหม่ (sonnet-5/gemini-3.8) | ⏳ ร่วมกับด้านบน |

**known-failures (ไม่บล็อก):** llms ollama.wire ×4 (third-party serialization เวอร์ชันลอย) · core ~16–26 (upstream tests flaky บน Windows: cron timers/hub listeners/locale sort/git-init/python/bun-ENONENT) · **suite ต้องรัน `--no-file-parallelism` (OOM บน dists ใหม่)**

| **fix.2** | provider parity กับ official: Sakana ลบ static list → generated 8 โมเดล (fugu-ultra-v2/namazu/prompt-cache) · Jan ย้ายไปฟอร์ม OpenAI-compatible (auto model list จาก Base URL — กลไกเดียวกับ official, Jan = iCline-only) · การ์ดสถิติ Providers/Models/Free · Wave-2 hand-port ffd6a6b1d (summarizer เคารพ Max Output Tokens) — `4b2aec563` | ❌ smoke เจอ P0: เลือก/สลับ provider+model ไม่ติด (รากมาจาก fix.1 + trigger ใหม่ — → fix.3) |
| **fix.3** | P0 selection stuck — ราก 3 ชั้น: (1) stale write-back race (effort apply หลัง commit ส่ง snapshot เก่าแทนที่ config — trigger = official บันทึก reasoning ลง shared providers.json 9 ตัว) → effort ก่อน commit + handlers อ่าน state สด (getState) (2) push delivery แตกเงียบ → host retry + webview re-subscribe (3) debounce กลืนคีย์แรก → user edit เคลียร์ skip flag · + model leakage fix + การ์ดย้ายไปชิดขวาแถวหัวข้อ — `de487d3e8` | ❌ smoke: commits ทำงาน 47 ครั้งแต่ display ยังค้าง (ติด Cline หลังเลือก) · jan picker ว่าง · ClinePass หายจาก list → fix.4 |
| **fix.4** | (1) **optimistic provider echo** — commit สำเร็จ → patch *ModeApiProvider ใน webview ทันที (ไม่รอ push) ทั้ง picker+settings (2) **jan picker fallback** — catalog ว่าง → ถาม server ของผู้ใช้ (`{baseUrl}/models` เดียวกับหน้า Settings) เฉพาะ dynamic-list providers (3) **ClinePass กลับมา** — flag default ON ทั้ง host/webview (backend ยัง override ได้) — `c2b71008c` | ✅ **ส่วนใหญ่ผ่าน (2026-09-19)** — สลับ Cline Usage Billing เข้า/ออกได้ · ClinePass กลับมา · jan picker มีลิสต์จาก server · การ์ดชิดขวา |
| **หมายเหตุ fix.4 smoke** | (a) ลิสต์ jan = จาก `{baseUrl}/models` ของ Jan server ผู้ใช้เอง — server รายงาน**ไฟล์ทั้งหมดที่เสิร์ฟได้** (ทุก quant + embedding) ขณะที่ Jan app UI คัดเฉพาะ chat models → ไม่ตรงกัน = พฤติกรรม Jan server ไม่ใช่บั๊ก iCline (official จะเห็นลิสต์เดียวกัน) (b) glm-5.3-flash (free) พิมพ์ tool XML เป็น**ข้อความล้วน** (transcript: text-only, ไม่มี tool_use แม้ชิ้นเดียว; deepseek รอบเดียวกันปกติ) = ขีดจำกัดของโมเดล ไม่ใช่บั๊ก iCline | 📝 บันทึกไว้ |
| **fix.6** | การ์ดคำตอบสุดท้ายแบบ official: แถว text สุดท้าย → การ์ด COMPLETED + copy ขวาบน (mock: plans/completion-card/) — `8440e4bb6` | ⏳ รอ smoke |
| **fix.6 v2** (repack) | ปรับตาม feedback: tint **คราม/ฟ้าจาง** (rgba(99,102,241,.07)) · **copy ย้ายเข้าแถว COMPLETED ขวาบน แสดงตลอด** · **COMPLETED สีน้ำเงิน** (charts-blue) · **Thinking → Thought** เมื่อจบคิด — repack ทับ `dev.6-fix.6` (11,948,077 B @ 09-19 08:02) — `9702f2191` | ⏳ รอ smoke (ติดตั้งตัวใหม่ 15:02 น.) |
| **คิวถัดไป** | Quick Picker redesign (mock รอบ 11) + restyle dropdown ดิบ (jan Model ID) — จัดคิวใน STATUS แล้ว ทำหลังปิด smoke | ✅ **ทำใน fix.7** (พร้อมงานไล่บั๊ก editor) ⏳ รอ smoke |
| **fix.5** | glm-5.3-flash พิมพ์ tool XML เป็นข้อความ — **รากฝั่งเรายืนยันด้วย prompt diff**: overlay ของเราสั่ง "must use a tool" ขณะ official ไม่มีคำสั่งนี้เลย (glm เจอคำสั่งขัดแย้งกับ base จึงเขียน markup ลง text) → overlay ใหม่ห้าม fabricate markup + guard เทส — `f05e92253` | ⏳ รอ smoke |
**รอบ dev.5 ปิดแล้ว (2026-09-18)** — ตารางด้านล่างคือบันทึกประวัติศาสตร์ของ dev.5

**Release plan:** finish this Quick Picker worktree on **dev.5** → merge to main when ordered → ClinePass after that merge. Dynamic model lists for remaining providers stay **dev.6**.

### Compact durable smoke (fix.28–32, branch `fix/compact-durable`)

| Pack | งาน | Maintainer smoke |
|------|-----|------------------|
| fix.28 | แถบ context คงค่าหลังปิด/เปิดแชทจาก History (sidecar persist + re-apply estimate) — `094c9166c` | ⏳ ยังไม่ปิด |
| (packer) | WIP VSIX คอมไพล์ production host (`b1ba27416`) | — |
| fix.29 | แชทแสดงสาเหตุเมื่อ compact ล้มเหลว — `f213d55b2` | ✅ ใช้งานได้จริง — 403 "product surfaces" ถูกเปิดเผย (นำไปสู่ fix.30) |
| fix.30 | manual compact แนบ Cline identity headers เดียวกับแชท (`User-Agent`, `X-CLIENT-*`, `X-Task-ID`) แก้ 403 บน `cline-free/*` + เก็บหนี้ tsc — `8278c6e5a` | ❌ เผยชั้นถัดไป: auto-compact 401 (re-authenticate) |
| fix.31 | `syncOAuthCredentials` อัปเดต `providerConfig.apiKey` ที่ compact ถือ snapshot ไว้ — แก้ 401 หลัง token หมุนเวียน + rebuild core dist — `ae8a40c45` | ✅ **ผ่าน (2026-09-17)** — auto+manual compact ทำงาน ไม่มี 401 |
| **fix.32** | rebuild llms dist → เปิดใช้ fix.26 catalog merge ให้ SDK เห็น context window จริงของ cline-free (แก้ trigger เร็วเกิน + manual ตัดแรง) — `1e7a34425` | ❌ display เห็น 1.0m แล้วแต่ trigger ยัง 115.2k ทุกครั้ง — เผยชั้นถัดไป: runtime knownModels อ่านคนละ pipeline (→ fix.33) |
| **fix.33** | `buildSessionConfig` resolve knownModels ผ่าน `resolveProviderConfig` (pipeline เดียวกับ picker/bar/CLI) — แก้ที่มา: runtime อ่าน registry static ที่ไม่มี cline-free เลย — `e7f9149cc` | ✅ **ผ่านด้าน trigger (2026-09-18)** — ไม่มี auto-compact ตลอดช่วงทดสอบ; session glm-5.3-flash วิ่งถึง 276k เงียบ (fix.32 ต้อง compact แล้ว ≥2 รอบ) = เกณฑ์ใหม่มีผลจริง; เกณฑ์จริง ~849k ยังไม่ถูกกระตุ้น end-to-end |
| **fix.34** | "Task Completed" ซ้ำ 1–3 แถวหลังตอบกลับ — ราก: tool `attempt_completion` ฝั่งเรา (vscode-runtime-builder.ts:65) ไม่มี `lifecycle: { completesRun: true }` → agent loop ไม่จบ, completion echo กลับเป็น tool_result โมเดลตอบซ้ำ + เสีย request เต็ม context ทุกรอบ — เพิ่ม flag 1 บรรทัด + property test — `40fafc6ea` | ✅ **ผ่าน (2026-09-18, 3 รอบ)** — DeepSeek: attempt_completion 1 ครั้ง/turn แล้วจบรอ feedback (ก่อนแก้ซ้ำ 3) · อาการอื่นที่พบ (Solar Pro 4 เริ่มงานซ้ำ, Laguna ตีความ prompt ผิด/เรียก write_file ชื่อเก่า) = พฤติกรรมโมเดลเล็กล้วน — system prompt hash เดียวกันทุกรอบ, harness fail-fast แล้วโมเดลแก้ตัวถูกต้อง |
| **fix.35** | overlay ของ harness สั่งทุก session ใช้ `ask_followup_question` (tool ที่ไม่มีใน runtime) — จุดเริ่มที่ทำ Solar Pro 4 วนเริ่มงานใหม่ (พิสูจน์ด้วยรอบ 4 เทียบ official) — แก้เป็น `ask_question` + ย้าย suite เป็น vitest พร้อม guard ชื่อ tool ค้าง 10 ตัว — `d3619d263` | ⚠️ **บางส่วน (2026-09-18)** — อาการวนหายจริง (โมเดลลงมือทำงานทันที สร้าง folder+file สำเร็จ) แต่เจอ **บั๊กใหม่**: หลังลบไฟล์ข้างนอกผ่าน terminal, editor create รายงานสำเร็จแต่ไฟล์ไม่ลงดิสก์ (verification hook จับได้) → **fix.36 candidate** (dev-log ต่อ 3) · ส่วน prompt base เก่า = Wave 1–2 |

### Worktree smoke (fix.15–27)

| Pack | งาน | Maintainer smoke |
|------|-----|------------------|
| fix.15–16 | Picker activate / requested-id | ❌ ไม่ผ่าน |
| fix.17 | stacked activate | คลิกข้าม provider ดู OK แล้วอาการเดิมกลับหลัง Cline Usage-Billing |
| fix.18 | Settings = แหล่งความจริงของลิสต์ Cline | ลิสต์ตรงแล้ว |
| fix.19 | Featured Recommended/Free ใน Picker | ✅ กลุ่ม Free ตรง Settings |
| fix.20 | เปิด Picker แล้วเลื่อนไป provider ที่ใช้ | ✅ |
| fix.21 | โมเดลที่เลือกอยู่ตำแหน่ง A–Z เดิม | ✅ |
| fix.22 | Grok 4.6 = 500k ในตาราง | ❌ ยังขึ้น 2M (แคชสมัครสมาชิก) |
| fix.23 | บังคับ 500k ทุกเส้นทางแสดง | ✅ Grok 4.6 = 500K |
| fix.24 | แถบแชทอ่านแคตตาล็อกชุดเดียวกับ Settings | ✅ Laguna 262K; โมเดล Cline อื่นยังเพี้ยน |
| fix.25 | ห้ามแปะเลขโมเดลก่อน | ❌ Solar/ตัวอื่นยัง 1.0m หรือ 500k |
| fix.26 | รวม featured เข้าแคตตาล็อก `cline` | ❌ ยัง leftover 1.0m/500k |
| **fix.27** | ห้ามใช้ snapshot ตอน miss + alias slug | ✅ Solar Pro 4 = **524.3k** (2026-09-16) |

---

## ✅ ข้อ 1 — Jan Setting

**สถานะ:** แก้มา 3 รอบแล้ว — รอผู้ใช้ smoke test รอบล่าสุด

| Commit | งาน | สถานะ |
|--------|-----|--------|
| `05d72f2be` | ลบ duplicate Base URL + migrate JanProvider ไป SDK hooks | ✅ แก้แล้ว |
| `fbf4aeae5` | แก้ checkbox ไม่จำค่า + ป้องกัน debounce ล้าง baseUrl | ✅ แก้แล้ว |
| `b54b34265` | ส่ง apiConfiguration ที่ถูกต้อง + เพิ่ม jan case ใน modelDisplayName | ✅ แก้แล้ว |

### ผล smoke test:
- ✅ Checkbox จำค่าได้หลังปิด/เปิด settings panel (แก้ใน `fbf4aeae5`)
- ⏳ Model list โหลดอัตโนมัติ — ยังไม่ confirm (แก้ใน `b54b34265`)
- ⏳ สลับ provider/model แล้วชื่อแสดงถูก — ยังไม่ confirm (แก้ใน `b54b34265`)

---

## 🔧 ข้อ 2 — xAI / Grok Provider

**สถานะ:** แก้ในโค้ดแล้ว (2026-08-05, รอบ TS + catalog sync) — รอผู้ใช้ smoke test

| # | ปัญหา | สถานะ | รายละเอียด |
|---|-------|--------|-----------|
| 2a | ชื่อ Provider ไม่ตรง dev.4 | ✅ แก้แล้ว | `HOST_PROVIDER_LABELS.xai` = `"xAI Grok (OAuth & Subscription)"` ใน `catalog.ts` |
| 2b | Model list ไม่ครบ | ✅ แก้แล้ว | `XaiProvider` + catalog `resolveXaiAuthAwareModels` ใช้ `getXaiModelsForAuth` รวม CLI + subscription cache + API key |
| 2c | แชทไม่ได้ | ✅ แก้แล้ว | `buildSessionConfig` เรียก `resolveXaiAuth` → ส่ง OAuth/CLI token เป็น `apiKey`; CLI models ไป `cli-chat-proxy` + headers |
| 2d | TS build break | ✅ แก้แล้ว | เพิ่ม `xaiDefaultFromCatalog` ใน `XaiProvider.tsx` (TS2304) — webview `tsc -b` ผ่าน |

**ไฟล์หลัก:** `cline-session-factory.ts`, `XaiProvider.tsx`, `catalog.ts`  
**Verify:** webview + extension `tsc` ผ่าน (2026-08-05)

> หมายเหตุ: live `/v1/models` มี path อยู่แล้ว แต่ auto-refresh ทุก provider เต็มรูปแบบ = งาน **dev.6**

---

## 🔧 ข้อ 3 — Quick picker บน chat header

**สถานะ:** แก้ในโค้ดแล้ว (2026-08-05, รอบ sync กับ API Config) — รอ smoke test

| # | ปัญหา | สถานะ | รายละเอียด |
|---|-------|--------|-----------|
| 3a | แสดงชื่อ active ผิด | ✅ แก้แล้ว | ใช้ `getSelectedModelIdForProvider` อ่าน field ต่อ provider (jan/zenmux/sakana ฯลฯ) ไม่พึ่งแค่ generic `*ModeApiModelId` |
| 3b | สลับ provider/model | ✅ แก้แล้ว | `commitModelSelection` + ปิด popover; ใช้ model id ที่ถูกต้องต่อ provider |
| 3c | บังคับขยาย Provider | ✅ แก้แล้ว | `handleOpenChange` seed expand **ครั้งเดียวตอนเปิด** — ยุบ active provider ได้โดยไม่ถูก force เปิดใหม่ |
| 3d | ตัวเลือก Effort หาย | ✅ แก้แล้ว | แถบ Reasoning effort chips (Low/Med/High/Max/Off) สำหรับโมเดล active |
| 3e | ลิสต์โมเดล xAI ไม่ตรง API Config | ✅ แก้แล้ว | `resolveSdkModels` แยก path `xai` → `getXaiModelsForAuth` (CLI + subscription) แทน SDK PAYG-only |
| 3f | เรียง Providers ตามตัวอักษร | ✅ แก้แล้ว | sort ตาม display name ใน `listSdkProviderListings`, `ApiOptions`, และ `QuickModelPicker` |

**ไฟล์หลัก:** `QuickModelPicker.tsx`, `ApiOptions.tsx`, `catalog.ts`  
**Verify:** webview `tsc -b` ผ่าน

---

## ⏳ ข้อ 4 — Push origin/main

**สถานะ:** ยังไม่ push (รอคำสั่ง maintainer ชัดเจน)

**หมายเหตุแผน:**
- ตอนนี้ work อยู่บน `sync/upstream-v4.0.0` (ยังไม่ merge เข้า `main`)
- Local `main` ยัง ahead origin จากรอบ dev.4 บางส่วน
- แนะนำ: commit งาน restore บน branch นี้ → smoke ผ่าน → ค่อย merge/push ตามที่คุณสั่ง

---

## ✅ ข้อ 5 — 4 คำถาม policy (ตัดสินแล้ว 2026-08-05)

**สถานะ:** maintainer ยืนยัน **ใช้ตามแนะนำทั้งชุด**

| # | การตัดสินใจ |
|---|-------------|
| **5a Sync timing** | หลัง restore/dev นิ่ง + เมื่อ upstream มี major/security/ฟีเจอร์ที่ต้องการ — ไม่ sync กลางคันตอน dev.5 ยังไม่ smoke ผ่าน |
| **5b ClinePass** | เปิดให้เลือกได้ แต่ไม่เป็น default ของ iCline |
| **5c Marketplace** | Stable = VS Marketplace + Open VSX · Dev/Beta = GitHub VSIX / pre-release |
| **5d Subagents** | dev.5 ปิดตาม upstream · เปิดทีหลังเมื่อ harness นิ่ง |

**เพิ่มจาก maintainer:** ยัง **ไม่ Publish Stable** จนกว่าจะปิดทุก dev แล้วตัด **Release 0.1.18** (ไม่ใช่ปล่อย Stable กลางทาง dev.5/dev.6)

### Upstream gap (ตรวจ 2026-08-05 หลัง `git fetch upstream`)

| รายการ | ค่า |
|--------|-----|
| iCline branch | `sync/upstream-v4.0.0` @ `b5b4ce1ff` (+ WIP uncommitted) |
| merge-base กับ upstream | `402b9994d` |
| upstream/main | `64993e78d` ≈ **v4.1.3 + 42 commits** (`v4.1.3-42-g64993e78d`) |
| แท็กรีลีสล่าสุดที่เห็น | **v4.1.3** (ไม่ใช่ 4.1.13) |
| commits ที่เรายังไม่มี | **~282** |
| commits ของเราที่ upstream ไม่มี | **~93** |

**คำแนะนำ:** อย่า sync รอบใหม่ตอนนี้ — ปิด smoke dev.5 ก่อน แล้วค่อยวางแผน sync แบบมี checklist (ดูด้านล่าง)

---

## 🔧 ข้อ 6 — Agent แนะนำตัวเองว่า "Cline"

**สถานะ:** แก้ในโค้ดแล้ว (2026-08-05) — รอ smoke test

| # | ปัญหา | สถานะ | รายละเอียด |
|---|-------|--------|-----------|
| 6a | ระหว่างทำงาน | ✅ ถูกต้อง | "iCline read 1 file:" — แสดงถูก |
| 6b | แนะนำตัวเอง | ✅ แก้แล้ว | `applyIclineAgentIdentity` rewrite "You are Cline" → "You are iCline" + identity rule ใน harness overlay |

---

## Git state (local WIP)

- **Branch:** `sync/upstream-v4.0.0`
- **Uncommitted (ประมาณ):**
  - `apps/vscode/src/icline/harness/guardrails.ts`
  - `apps/vscode/src/sdk/cline-session-factory.ts` + `.test.ts`
  - `apps/vscode/src/sdk/model-catalog/catalog.ts`
  - `apps/vscode/webview-ui/.../XaiProvider.tsx`
  - `apps/vscode/webview-ui/.../QuickModelPicker.tsx`
  - `docs/icline/smoke-test-tracker.md`
- **Tag เดิม:** `v0.1.18-dev.5` (ก่อน WIP นี้ — หลัง smoke อาจ tag ใหม่หรือ rebuild VSIX ทับ)
- **Push:** ยังไม่ทำ

---

## ก่อน Build VSIX dev.5 (checklist)

- [x] ข้อ 2 โค้ด + unit tests
- [x] ข้อ 3 โค้ด + tsc webview
- [x] ข้อ 6 โค้ด
- [x] ข้อ 5 policy ตัดสินแล้ว
- [ ] ข้อ 4 — เฉพาะเมื่อคุณสั่ง push
- [x] Build VSIX WIP (2026-08-05) — รอคุณติดตั้ง smoke
- [ ] Smoke ผ่าน → ค่อย commit
- [ ] **ห้าม** sync upstream เพิ่มจนกว่า smoke dev.5 ผ่าน

### ติดตั้ง smoke (PowerShell)

```powershell
code --install-extension "D:\.grok\iCline\cline-wt-quick-model-picker-activate\apps\vscode\dist\i-mrdedchai.iCline-0.1.18-dev.5-fix.27.vsix" --force
```

แล้ว **Developer: Reload Window**

จุดที่ควรเช็ค: Jan · xAI OAuth+chat · Quick picker (expand/effort) · agent แนะนำตัว iCline · History export/import

---

## 🔧 fix.30 — compact 403 "Cline product surfaces" (2026-09-17)

**สถานะ:** แพ็ก VSIX แล้ว — **รอ maintainer smoke** (ยังไม่ปิดรอบ)

อาการจาก fix.29: compact บน `cline-free/deepseek-v4.1-flash` → `Error 403: ... only available via Cline product surfaces` (Cline Official compact แชทเดียวกันได้)

**Root cause:** manual compact สร้าง provider config ใหม่ที่**ไม่มี headers ระบุตัวตน** (`User-Agent: Cline/<ver>`, `X-CLIENT-*`) ต่างจากแชทที่ bootstrap เติมให้ทุก turn — เซิร์ฟเวอร์บังคับว่าโมเดล `cline-free/*` ต้องมาจาก client ที่ระบุตัวตน (Official ผ่านเพราะใช้ strategy `basic` ซึ่งไม่ยิง network; เคส agentic เป็นบั๊กแฝงของ upstream เอง)

**แก้:** coordinator แนบ headers เดียวกับแชททุก byte ผ่าน `resolveProviderRequestHeaders` (ไม่ปลอมเวอร์ชัน) — non-cline provider ไม่ถูกแตะ + เก็บหนี้ tsc 4 errors จาก fix.26–29 (type-level เท่านั้น)

**วิธี smoke:** แชทยาวด้วย cline-free (agentic) → Compact ต้องสำเร็จ · compact paid model ของ cline · provider อื่น (xAI/OpenRouter) ไม่ regression · auto-compact ปกติ · About ขึ้น `fix.30`

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.30.vsix` · Commit `8278c6e5a`

---

## 🔧 fix.35 — overlay อ้าง tool ที่ไม่มีใน runtime (2026-09-18)

**สถานะ:** ⚠️ **smoke บางส่วน (2026-09-18)** — อาการวนเริ่มงานใหม่หายไปจริง (โมเดลลงมือทำโจทย์ทันที สร้าง folder+file สำเร็จ) แต่ชน **บั๊กใหม่คนละ subsystem**: หลังโมเดลลบไฟล์ข้างนอกผ่าน terminal (Remove-Item) editor create รายงานสำเร็จแต่ไฟล์ไม่เคยลงดิสก์อีก — verification hook ของเราจับได้ (ทำงานถูกดีไซน์) — → **fix.36 candidate** ต้องใช้ debugger agent หาราก (dev-log 2026-09-18 ต่อ 3) · terminal "output could not be captured" = Wave 1 terminal reliability ตอบตรง · มติเสนอ: ปิด dev.5 → Wave 1+2

อาการต้นทาง: Solar Pro 4 วนเริ่มงานใหม่บน iCline แต่ prompt/โจทย์เดิมบน official ทำงานปกติ (รอบ 4 = controlled experiment ของ maintainer) — กลับคำสรุปเดิมที่ว่า "โมเดลล้วน"

**Root cause:** system prompt ของทุก session iCline มี overlay ของ harness (`guardrails.ts:84`) สั่งว่า ACT MODE ต้องตอบด้วย `attempt_completion` หรือ **`ask_followup_question`** — ชื่อ classic Cline ที่**ไม่มีใน SDK runtime** (จริงคือ `ask_question`) · โมเดลที่เชื่อตาม = โดน reject แบบ write_file · โมเดลเล็กสับสนจนหลุดโฟกัส (base prompt ของเรายังเป็นรุ่น 21 ก.ค. เก่ากว่า official 752 commits เสริมความต่าง)

**แก้ (`d3619d263`):** overlay → `ask_question` · audit ทั้งไฟล์แล้วมีจุดเดียวที่ค้าง · `ask_followup_question` ที่เหลือใน bundle 5 จุด = display-compat (message-translator สำหรับ session เก่า + responses.ts formatResponse ผ่าน DiffViewProvider) — ยืนยันแล้วไม่ถึง system prompt

**Test-first:** ย้าย `guardrails.test.ts` mocha→vitest (เดิมรันได้แค่บน Electron host หนัก ไม่อยู่ suite ด่วน — ตาม pattern TaskHistoryTransfer) + regression guard ห้าม overlay match ชื่อ tool ค้าง 10 ตัว + ต้องมี ask_question · RED 2 เคส → GREEN 6/6 · vscode sdk 839/839 · check-types สะอาด · marker A/B: `attempt_completion or ask_question` fix.34=0 → fix.35=1

**วิธี smoke:** ติดตั้ง → **session ใหม่ Solar Pro 4 + prompt/โจทย์เดิมรอบ 1** → ไม่วนเริ่มงานใหม่/จบ turn ด้วย tool ครั้งเดียว (ใกล้พฤติกรรม official) · DeepSeek ไม่เปลี่ยนพฤติกรรม · About `fix.35` · หมายเหตุ: ส่วนต่าง prompt ที่เหลือกับ official ปิดด้วย upstream waves

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.35.vsix` · Commit `d3619d263`

---

## 🔧 fix.34 — "Task Completed" ซ้ำหลังตอบกลับ (2026-09-18)

**สถานะ:** ✅ **smoke ผ่าน (2026-09-18, ทดสอบ 3 โมเดล)** — หลักฐานชี้ขาดจาก session จริง: DeepSeek-v4.1-flash จบ turn ด้วย attempt_completion tool_use **1 ครั้ง** แล้วรอ feedback ผู้ใช้ทันที (ก่อนแก้: ซ้ำ 3 ครั้ง) · อาการที่พบเพิ่มระหว่างทดสอบไม่ใช่บั๊ก iCline: Solar Pro 4 เริ่มงานใหม่ซ้ำหลังทุก nudge (ไม่เคยเรียก attempt_completion เลย — จบ turn ด้วย text ล้วน + thinking มีภาษาจีนปน), Laguna ตีความ prompt ผิด (ไปค้น "fix.34" ในโค้ดแทนแนะนำตัว) และเรียก `write_file` (ชื่อ tool สมัย Cline คลาสสิกที่ไม่มีใน SDK) → harness ปฏิเสธ fail-fast พร้อมลิสต์ tool ที่มี แล้วโมเดลแก้ตัวเป็น `editor` ทันที = ทำงานตามดีไซน์ · **system prompt hash เดียวกันทุกรอบ (md5 2ee4904843)** → ทุกความต่าง = ตัวโมเดล · ไม่ต้องทำ fix.35 จากผลนี้

อาการ: หลังผู้ใช้ตอบกลับทั่วไป ("ว้าวมากๆ ครับ") โมเดลเรียก attempt_completion ซ้ำ 1–3 ครั้งใน turn เดียว — UI วาดแถว Task Completed ใหม่ทุกครั้ง และเสีย request เต็ม context ไป 1–3 รอบ (พิสูจน์จาก transcript จริง session muse-spark รอบทดสอบ fix.33: [65][67][69] คือ attempt_completion ต่อเนื่อง จบด้วย text ล้วน [71])

**Root cause:** tool `attempt_completion` ที่ฝั่ง iCline สร้างเองตอน migrate v4.0.0 SDK (`createAttemptCompletionTool`, vscode-runtime-builder.ts:65 — upstream ไม่มี tool นี้) **ไม่ได้ตั้ง `lifecycle: { completesRun: true }`** — agent runtime จบ run เฉพาะเมื่อ tool ที่ถูกเรียกมี flag นี้ (agent-runtime.ts:1318 `findCompletingToolMessage` → :722 `finishRun("completed")`) เมื่อไม่มี ผล completion ถูก echo กลับเป็น tool_result โมเดลจึงตอบด้วย completion อีก วนจน emit text ล้วน · SDK built-in `submit_and_exit` ตั้ง flag เดียวกันนี้ไว้แล้ว (definitions.ts:813) · ตรงกับอาการเก่า "Task Completed สรุปซ้ำหลายรอบ" ใน STATUS

**แก้ (fix.34, `40fafc6ea`):** เพิ่ม `lifecycle: { completesRun: true }` ใน createTool ของ createAttemptCompletionTool — 1 บรรทัด + comment · ไม่แตะ SDK dist

**Test-first:** RED — property test ใหม่ (`vscode-runtime-builder.test.ts`) assert `attempt_completion.lifecycle.completesRun === true` fail บนโค้ดเดิม → GREEN — vscode sdk 839/839 · check-types สะอาด · marker A/B: `completesRun:!0` ใน extension.js fix.33 = 2 → fix.34 = 3 (+1 พอดี)

**วิธี smoke:** จบงานใหม่ → Task Completed ต้องขึ้น **ครั้งเดียว** แล้วรอ feedback · ตอบกลับทักทายทั่วไป → ไม่มีแถวซ้ำ ไม่มี request ตามหลัง · compaction/picker/provider อื่นไม่เปลี่ยนพฤติกรรม · About ขึ้น `fix.34`

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.34.vsix` · Commit `40fafc6ea`

---

## 🔧 fix.33 — runtime knownModels อ่านคนละ pipeline กับ display (2026-09-17)

**สถานะ:** ✅ **smoke ด้าน trigger ผ่าน (2026-09-18)** — log จริง: ไม่มี auto-compact แม้ครั้งเดียวตลอดช่วงทดสอบ (22:43–00:59) · session glm-5.3-flash (247 messages) วิ่งถึง **276,093 input tokens โดยไม่ compact** — ภายใต้เกณฑ์เดิม (115.2k) ต้อง compact แล้ว ≥2 รอบ → เกณฑ์ใหม่มีผลจริง · glm-5.3-flash window จริง 1,310,720 (trigger ≈1.18M), muse-spark 1,048,576 (trigger ≈943,718) ตรง design · งานยาวถึงเกณฑ์จริง (~849k) ยังไม่ได้ทดสอบ end-to-end แต่ใช้กลไกเดียวกับ fix.31/32 ที่ผ่านแล้ว · **บั๊กใหม่ที่เจอระหว่าง smoke = "Task Completed" ซ้ำ → fix.34 (รออนุมัติ)**

**Root cause (จบที่ต้นทางเดียว):** `buildSessionConfig` อ่าน knownModels จาก `getModelsForProvider` (registry static) ซึ่งไม่มี entry ของ provider `cline` เลย — live catalog (ที่ fix.26 รวมไว้แล้ว) ไม่เคย `registerModel` ลง registry, store ไม่มี key `cline`, state hint เขียน undefined ตอน commit → display (resolveProviderConfig) กับ runtime (registry) แตกเป็นสอง pipeline ตั้งแต่ยุค fix.18

**แก้:** `cline-session-factory.ts` เปลี่ยนมา resolve ผ่าน `resolveProviderConfig(sdkProviderId, { loadLatestOnInit, loadPrivateOnAuth, failOnError:false }, runtimeConfig)` — pipeline เดียวกับ picker/bar/CLI (CLI main.ts:1031-1051 ทำแบบนี้แล้ว) · คง injection committedRuntimeModel ต่อท้าย (user override ชนะเหมือนเดิม) · ไม่แตะ core/llms (ไม่ต้อง rebuild dist)

**Test-first:** RED ยืนยัน (resolveProviderConfig ถูกเรียก 0 ครั้งบนโค้ดเก่า) → เขียว: factory 60/60 · vscode sdk 838/838 · core compaction 56/56 (มี pin 943,718.4) · llms 415/415 · check-types สะอาด · marker `loadPrivateOnAuth:!0,failOnError:!1}` ใน extension.js (fix.32 = 0, fix.33 = 1)

**วิธี smoke:** ⚠️ **ต้องเริ่ม task/session ใหม่** (session เก่าถือ config เดิมตอนสร้าง) → งานยาว cline-free: auto-compact ต้องเงียบจน bar เข้าใกล้ ~849k (943,718×0.9) · log "Context compaction diagnostics" ต้องโชว์ `maxInputTokens ≈ 943,718` · manual compact ตัดพอดีจริง · Solar Pro 4 ยัง 524.3k · provider อื่น (xAI/OpenRouter/anthropic) ไม่ regression · About ขึ้น `fix.33`

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.33.vsix` · Commit `e7f9149cc`

---

## 🔧 fix.32 — auto-compact trigger เร็วเกินบน cline-free (2026-09-17)

**สถานะ:** ❌ **smoke แล้ว (2026-09-17) — display เห็น 1.0m แต่ trigger ยัง 115.2k** → พิสูจน์แล้วว่า runtime อ่าน knownModels คนละ pipeline → **fix.33** (ด้านบน)

อาการหลัง fix.31 ผ่าน: auto-compact ทำงานแต่ "ถี่เกิน" — คู่แถว `auto-compacting`/`auto-compaction-skipped` บ่อย และ compact สำเร็จตั้งแต่ bar ~55k/1.0m · manual compact ตัดแรง (237 → 18)

**Root cause:** SDK runtime ไม่รู้จัก context window จริงของ `cline-free/*` (llms dist เก่า ไม่มี catalog ของ free models) → trigger ใช้ default 128k (เกณฑ์ ~115.2k estimator ซึ่งสูงกว่าเลข bar) และ manual target ใช้ fallback 64k

**เกณฑ์ trigger จริง (อ้างอิง):** estimated input ≥ 90% × input budget (`COMPACTION_TRIGGER_RATIO = 0.9`, default 128k เมื่อไม่รู้จักโมเดล)

**แก้:** rebuild `@cline/llms` dist (src delta นับจาก 21 ก.ค. = fix.26 เท่านั้น) — merge recommended/free models + OpenRouter specs เข้า catalog `cline` ให้ trigger/target/bar ใช้แหล่งเดียวกัน · พิสูจน์ด้วย marker `(e.recommended??[])` ใน dist ใหม่ (เก่า = 0) และใน VSIX · **32a (bar unknown) ถือไว้ก่อน** — หลักฐานชี้ 1.0m เป็นข้อมูลจากเซิร์ฟเวอร์

**วิธี smoke:** งานยาว cline-free → auto-compact trigger ถูกสัดส่วนขึ้น (แถว skipped ลดลง) · manual compact ตัดพอดี · ลิสต์ Cline ไม่เพี้ยน · About fix.32

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.32.vsix` · Docs commit `1e7a34425`

---

## 🔧 fix.31 — auto-compaction 401 "re-authenticate" (2026-09-17)

**สถานะ:** แพ็ก VSIX แล้ว — **รอ maintainer smoke** (ยังไม่ปิดรอบ)

อาการบน fix.30: แชทปกติ แต่ auto-compact วน `auto-compacting` → `Unauthorized: Please make sure you're using the latest version of Cline and re-authenticate your Cline account.`

**Root cause:** auto-compact ใช้ token สำเนาจากตอน session start (`createContextCompactionPrepareTurn` capture providerConfig ไว้) ขณะที่แชทเด้ง refresh token ทุก turn — token หมุนเวียนกลาง session เมื่อไหร่ compact ก็ส่งตัวเก่า → 401 (retry ที่มีอยู่ก็กลับไปเจอ snapshot เดิม) · fix.30 แก้ประตู identity ทำให้เห็นชั้น auth นี้ชัดขึ้น

**แก้:** `syncOAuthCredentials` propagate token ใหม่ลง `providerConfig.apiKey` ด้วย · **lesson สำคัญ:** VSIX กิน `@cline/core` จาก `dist/` ที่เก่าตั้งแต่ 2026-07-21 — แก้ `sdk/packages/*/src` ต้อง `bun run build` package นั้นก่อนแพ็ก (ครั้งนี้ build เฉพาะ core; ห้าม build llms/agents/shared จนกว่าจะตั้งใจรับ)

**วิธี smoke:** เล่นงานยาว cline-free/agentic ต่อ (หรือทิ้งข้ามช่วง token หมุนเวียน) → auto-compact ต้องทำงาน ไม่ขึ้น Unauthorized · manual Compact ผ่าน · provider อื่นไม่ regression · About ขึ้น `fix.31`

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.31.vsix` · Commit `ae8a40c45`

---

## 🔧 fix.29 — compact failure reason in chat (2026-09-17)

**สถานะ:** แพ็ก VSIX แล้ว — **รอ maintainer รายงานอาการที่ทดสอบล่าสุด** (ยังไม่ปิดรอบ)

ตอน compact ล้มเหลว แชทเคยบอกแค่ "Couldn't compact the conversation." ทำให้วิเคราะห์ไม่ได้ — `SdkCompactionCoordinator.compactTask` ตอนนี้แนบ error message เดิมต่อท้าย `(detail)` เพื่อให้เห็นสาเหตุจริง (เช่น sidecar persist)

**วิธี smoke:** ทำให้ compact ล้มเหลว (หรือรายงานอาการที่เจอ) → ข้อความในแชทต้องแสดงสาเหตุในวงเล็บ ไม่ใช่ข้อความกลาง ๆ

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.29.vsix` · Commit `f213d55b2`

---

## 🔧 fix.28 — compact durable context bar (2026-09-16)

**สถานะ:** แพ็ก VSIX รอ maintainer smoke — **ยังไม่ปิดรอบ**

กด Compact แล้วแถบลดทันที (C1) ผ่านแล้ว แต่ปิด/เปิดแชทจากประวัติแล้วเลขกลับค่าก่อน compact เพราะแถวประมาณการอยู่แค่ในหน่วยความจำ โหลดประวัติอ่าน transcript เต็มจาก SDK

**วิธี smoke:** แชทยาว → Compact แถบลด → History เปิดทาสกเดิม → แถบขวายังเลขหลัง compact ไม่กลับก้อนใหญ่

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.28.vsix`

---

## 🔧 fix.27 — leftover context window (2026-09-16)

**สถานะ:** ✅ maintainer smoke Solar Pro 4 = **524.3k** (ไม่ใช่ 1.0m / 500k)

**สาเหตุที่ fix.24–26 ยังไม่พอ:** id แท็บ Free ของ Cline เป็น `cline-free/solar-pro4` แต่แคตตาล็อกที่แถบแชทอ่านเป็นคีย์ OpenRouter (`upstage/solar-pro4`). เทสชุดก่อนใส่คีย์ featured ลงแมปล่วงหน้าจึงไม่สะท้อนเคสจริง. ตอน miss โฮสต์คืน `actModeClineModelInfo` ของโมเดลก่อน (DeepSeek 1M / Grok 500k). Laguna ตรงเพราะ featured id **คือ** คีย์ OpenRouter (`poolside/laguna-s-2.1:free`).

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.27.vsix`  
**HEAD:** `cdd4d139b`

งานในรอบนี้:
- `resolveModelInfo`: Cline แคตตาล็อกอุ่นแต่ไม่มี id ที่ขอ → ไม่คืน leftover snapshot; alias last-segment ถ้า unik (`cline-free/solar-pro4` → `upstage/solar-pro4`)
- `commitModelSelection` write-through ล้าง `*ClineModelInfo` ใน task/session
- `useNormalizedApiConfiguration` lookup slug เดียวกัน

จุดทดสอบที่เหลือ: สลับ Grok 4.6 (500k) → Laguna (262k) → Solar (524.3k) → โมเดล Free อื่น ห้ามค้างเลขตัวก่อน

---

## 🔧 fix.26 — merge Cline featured into `cline` catalog (2026-09-16)

**สถานะ:** smoke ไม่ผ่าน (Solar ยัง 1.0m / บางที 500k) — ส่งต่อ fix.27

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.26.vsix`

---

## 🔧 fix.25 — bind context to selected id only (2026-09-16)

**สถานะ:** smoke ไม่ผ่าน (สลับโมเดลแล้วยัง 1.0m / 500k) — ส่งต่อ fix.26

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.25.vsix`

---

## 🔧 fix.24 — chat bar uses live Settings catalog (2026-09-16)

**สถานะ:** Laguna 262K ตรง Settings — โมเดล Cline อื่นยังเพี้ยน → fix.25

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.24.vsix`

---

## 🔧 fix.23 — Grok 4.6 500k on every display path (2026-09-16)

**สถานะ:** ✅ Grok 4.6 ขึ้น 500K (ไม่ใช่ 2M)

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.23.vsix`

---

## 🔧 fix.22 — Grok 4.6 table 500k not 2M (2026-09-16)

**สถานะ:** smoke ไม่ผ่าน (ยัง 2M จากแคชสมัครสมาชิก xAI) — ส่งต่อ fix.23

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.22.vsix`

---

## 🔧 fix.21 — selected model stays in A–Z place (2026-09-16)

**สถานะ:** ✅ โมเดลที่เลือกอยู่ตำแหน่งเดิม มีแค่เครื่องหมายถูก

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.21.vsix`

Mock redesign ชะลอ — ล็อกที่ `D:\.grok\iCline\cline-temp\.icline\plans\quick-picker-redesign\mock.v11-locked-2026-09-16.html`

---

## 🔧 fix.20 — scroll picker to active provider (2026-09-16)

**สถานะ:** ✅ เปิดเมนูแล้วโฟกัส provider/โมเดลที่กำลังใช้

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.20.vsix`

ClinePass ทำหลัง merge สาขานี้เข้า main เท่านั้น

---

## 🔧 fix.19 — Cline featured lists in picker (2026-09-16)

**สถานะ:** ✅ กลุ่ม Recommended/Free ตรง Settings (RPC + badge)

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.19.vsix`

---

## 🔧 fix.18 — Settings source of truth for Cline list (2026-09-16)

**สถานะ:** ลิสต์ Settings/Picker ใช้ policy ชุดเดียว — อาการ mismatch หลัง Usage-Billing หาย

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.18.vsix`

---

## 🔧 fix.17 — stacked Quick Picker activate (2026-09-15)

**สถานะ:** คลิกข้าม provider ดู OK แล้วอาการเดิมกลับหลังเลือก Cline Usage-Billing ใน Settings — ส่งต่อ fix.18

**สาเหตุที่ fix.16 ยังไม่พอ:** header/picker อ่านคนละ map; popover Portal ทำให้คลิกถูก dismiss ก่อน commit; host เคย mirror id ลงช่อง generic; hot-swap ไป session เก่าหลัง write-through

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.17.vsix`

จุดทดสอบ:
1. คลิกโมเดลข้าม provider — ชื่อบนแถบต้องเป็น `provider: model` ของตัวที่คลิก ไม่เงียบ ไม่คนละคู่
2. คลิกโมเดลใน provider เดิม (เช่น Composer → Grok 4.6) — แถบ + แชทต้องเป็นโมเดลนั้น
3. About: `dev build 5 · fix.17`

---

## 🔧 fix.16 — Quick Picker click + same-provider session (2026-09-15)

**สถานะ:** smoke ไม่ผ่าน (คลิกแล้วยังไม่ active + แสดงผล provider/model เพี้ยน) — ส่งต่อ fix.17

**สาเหตุที่ fix.15 ยังไม่พอ:** invariant กันแค่การ snap ชื่อหลัง commit สำเร็จ — ถ้าคลิกถูก webview กิน (popover unmount ก่อน `click`) หรือสลับโมเดลใน xAI เดิมโดยไม่รีสตาร์ท session อาการ “คลิกแล้วไม่ active” ยังอยู่

**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.16.vsix`

จุดทดสอบ:
1. คลิกโมเดลใน provider อื่น (ไม่ใช่ตัวที่ active) ต้องสลับได้ ไม่เงียบ
2. คลิกโมเดล xAI อื่น (เช่น Grok 4.6) ชื่อบนแถบ + แชทต้องเป็นโมเดลนั้น
3. About: `dev build 5 · fix.16`

---

## 🔧 fix.15 — Quick Picker requested-id invariant (2026-09-15)

**สถานะ:** smoke ไม่ผ่าน — ส่งต่อ fix.16

**Branch:** `fix/quick-model-picker-activate`  
**VSIX:** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.5-fix.15.vsix`

งานในรอบนี้ (root-cause, ไม่แปะชื่อบน header):
- `resolveModelInfo` / `pickFromCatalog`: ถ้ามี requested model id แล้ว id นั้นไม่อยู่ใน catalog → **ห้าม** แทนด้วย `defaultModelId`
- ถอด workaround ที่ header โชว์ id ที่ขอแต่ metadata เป็นของ Composer
- Picker โชว์ข้อความ error ถ้า `commitModelSelection` พัง

จุดที่ควรคลิกทดสอบ:
1. Quick Picker บนหน้าแชท — คลิกโมเดล xAI ที่ไม่ใช่ Composer (เช่น Grok 4.3 / 4.5 / 4.6) แล้วชื่อบนแถบต้องเป็นโมเดลนั้น ไม่เด้ง `xai: grok-composer-2.5-fast`
2. คลิกโมเดลข้าม provider แล้วแถบหัว + แชทต้องเป็น provider/model ที่คลิก
3. ลิสต์ติ๊กถูกตรงกับที่ active
4. About แสดง `dev build 5 · fix.15`

รอบแพ็กก่อนหน้าใน worktree นี้: fix.10–fix.14 (VSIX ใน `dist/`)

---

## 🔧 fix.8 smoke (2026-09-14)

| # | รายการ | ผล |
|---|--------|-----|
| 1 | xAI models แสดงใน picker ครบ | ✅ ผ่าน |
| 2 | คลิกเลือกโมเดลข้าม Provider ใน picker | ❌ **เลือกได้เฉพาะ Provider ที่ active อยู่** — คลิกโมเดลเจ้าอื่นไม่ตอบสนอง (P0 ใหม่ → fix.9) |
| 3 | Sakana protocol dropdown ทำงาน | ⏸️ UI layout ซ้อนทับ (Model/Reasoning Effort ใต้ API protocol) → แก้ใน fix.9 · ทดสอบแชทรอ API key |
| 4 | About metadata + branding | ✅ ผ่าน (`dev build 5 · fix.8`, walkthrough/คลิกขวา iCline) |

## 🔧 SDK history / compact (`fix/sdk-history-reopen-turnstate`)

**สถานะ:** ✅ **Smoke ผ่านบน `0.1.18-dev.5-fix.7`** (maintainer ยืนยัน 2026-09-14: ทำงานดีขึ้น/ถูกต้องขึ้นโดยรวม — เจอจุดใหม่จะรายงานเพิ่ม)

| # | Item | How to smoke | Pass |
|---|------|----------------|------|
| H1 | Reopen **completed** task | Finish a task (green box / Start New Task) → New Task → History → open it | ✅ Footer = Start New Task, not Thinking/Cancel |
| H2 | Reopen **incomplete** task | Cancel mid-tool → History → reopen | ✅ Footer = Resume Task; interrupted tool rows render as **finished** (finalize strips `partial`) — the footer is the Resume signal, not the row |
| H3 | Reopen **follow-up** chat | Let a turn end without completion tool → History → reopen | ✅ Input enabled, no Resume / Start New Task |
| H4 | Switch away from pending approval | While Approve/Reject is showing, open another history item | ✅ Old approval must not fire on the next keystroke |
| C1 | Compact metrics | Long chat → Compact | ✅ Context bar drops; header token/cost totals do **not** jump by the estimate |

## กฎ sync ปลอดภัย (กันซ้ำรอย v4.0 กลืนฟีเจอร์ iCline)

1. **อย่า sync กลาง restore** — จบ smoke / commit WIP ก่อน  
2. **tag backup** ก่อน merge ทุกครั้ง (`pre-upstream-sync-…`)  
3. **merge ทีละช่วง** (เช่น v4.0.x → v4.1.0 → v4.1.3) ไม่กระโดด 282 commits ทีเดียวถ้าเลี่ยงได้  
4. **checklist หลัง merge:** Grok OAuth+chat, Quick picker, History export/import, branding iCline, Jan/Sakana/ZenMux, harness identity  
5. **Dev build เท่านั้น** หลัง sync → smoke → แล้วค่อย Beta/Stable  
6. Stable **0.1.18** ปล่อยเมื่อ dev ปิดครบ ไม่ปล่อยกลางทาง
