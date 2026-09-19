**Last updated:** 2026-09-19
**Branch:** `feat/upstream-waves-1-2` (จาก main @ `78ebd0923` — รวม dev.5 แล้ว, tag `pre-merge-dev.5`, ยังไม่ push)
**HEAD:** ดู `git log` (ไม่ตรึง hash ไว้ตรงนี้ — มันตกหล่นทุกครั้งที่มี commit เอกสารตามหลัง) · commit สุดท้ายที่แตะโค้ด = `bde5f2df1` · **fix.7–fix.14 commit แล้ว ยังไม่ push**
**vsix (ล่าสุด):** `apps/vscode/dist/i-mrdedchai.iCline-0.1.18-dev.6-fix.14.vsix` (11,962,218 B @ 2026-09-19 16:57Z · About = `dev build 6 · fix.14`) — ⏳ **รอบนี้คือ fix.14** · do not overwrite `fix.1`–`fix.13` ใน `dist/` (repack ทับ fix.14 หลัง lint-staged จัดรูปแบบ 3 ไฟล์ ⇒ bundle ต่างจาก pack แรก 483 B — ของเดิมยังทำงานเหมือนกัน แต่ repack เพื่อให้ artefact ตรงกับ commit)

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
