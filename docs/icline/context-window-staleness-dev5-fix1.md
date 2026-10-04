# Context-window staleness: แชทค้าง 128K, Settings ถูก 1M (dev.5-fix.1)

**วันที่:** 2026-10-04 · **เวอร์ชันที่พบ:** `0.1.19-dev.5-fix.1` · **สถานะ:** วิเคราะห์รากแล้ว, ยังไม่แก้โค้ด (รอบนี้ docs + commit เท่านั้น, ไม่แพ็ก fix)
**โมเดลที่พบ:** `cline-free/muse-spark-1.3-con…` (provider `cline`) — ค่าจริง 1M, แชทแสดง 128K

---

## 1) อาการ (ตรงตามที่ maintainer รายงาน)

1. เริ่มแชทใหม่จาก Quick Start → หัวแชทแสดง Context 128K ทั้งที่โมเดลคือ 1M
2. ส่งข้อความเพิ่ม ตัวเลขก็ยังค้าง 128K (sticky ข้ามเทิร์น)
3. เปิด Settings → แสดง 1M ถูกต้อง
4. กลับมาหน้าแชท → ตัวเลข "หายเอง" กลายเป็น 1M

รูปแบบ "ผิดในแชท → ถูกใน Settings → หายเองเมื่อกลับมา" คือลายเซ็นของ **stale cache** ไม่ใช่ค่าผิดถาวร

---

## 2) เส้นทางของตัวเลข (อ่านจากโค้ดจริง, ไม่ได้เดา)

หัวแชท (`TaskHeader` → `ContextWindow`) ไม่ได้อ่านค่าตรงจาก backend ทุกครั้ง แต่อ่านผ่าน hook ตัวเดียวกับ footer:

```
TaskHeader / ChatTextArea / QuickModelPicker
  └─ useNormalizedApiConfiguration(mode)          (webview-ui/src/hooks/useNormalizedApiConfiguration.ts)
       ├─ (1) liveCatalogInfo: providerModelsByProvider[provider].models[modelId]   ← ชนะก่อนเสมอ
       ├─ (2) RPC resolveModelInfo(provider, modelId)                               ← ถ้า (1) ไม่มี
       └─ (3) unknownModelInfo (ไม่มี contextWindow → ซ่อนแถบ meter)                ← ถ้า (2) ไม่รู้
```

ส่วน Settings (`ClineModelPicker`) อ่านอีกทาง:

```
ClineModelPicker
  ├─ useProviderModels("cline")  →  forceRefresh: true ทุกครั้งที่ mount  (hooks/useProviderModels.ts)
  └─ selectedModelInfo = { ...persistedSnapshot, ...liveCatalog }  ← live ชนะ persisted
```

### cache มี 2 ชั้น

| ชั้น | อยู่ที่ไหน | TTL / การ refresh |
|---|---|---|
| (A) webview `providerModelsByProvider` | `ExtensionStateContext` ฝั่ง webview | **ไม่มี TTL** — เติมเฉพาะเมื่อ component ใด mount `useProviderModels(provider)`; แชทไม่เคย mount ตัวนี้ให้ active provider เอง (`QuickModelPicker` ดึงเฉพาะ provider ที่กางดูใน popover) |
| (B) host catalog cache | `sdk/model-catalog/catalog.ts` (`DEFAULT_MODEL_CACHE_TTL_MS` = 5 นาที) | `resolveModelInfo` ใช้ peek + resolve แบบ cache-first; มีเพียง `resolveProviderModels(forceRefresh: true)` เท่านั้นที่ทะลุ cache |

---

## 3) รากของปัญหา

**หัวแชทเชื่อ webview cache เก่า (ชั้น A) ก่อนเสมอ และไม่มีทาง revalidate ด้วยตัวเอง**

ลำดับเหตุการณ์ที่อธิบายอาการได้ครบทุกข้อ:

1. webview เคยดึงรายการโมเดล `cline` ไว้ก่อนแล้ว (เช่น ตอนอยู่หน้า Welcome/Quick Start ที่ `OnboardingView` mount `useProviderModels("cline")`, หรือ Settings รอบก่อน) — ตอนนั้น backend ยังประกาศ `muse-spark-1.3-con…` ไว้ที่ **128K** (โมเดลใหม่ ชุดข้อมูลฝั่ง gateway อัปเดตตามหลัง) ค่า 128K นี้จึงค้างในชั้น A
   - ย้ำ: นี่**ไม่ใช่** fabrication เก่า — fabrication 128K ถูกถอนรากไปแล้วตั้งแต่รอบ `round-context-128k-report.md` (store fallback / shape-adapter / picker ไม่ปั๊มเลขแล้ว) เลข 128K รอบนี้คือค่าจริง-but-ล้าสมัยจาก catalog entry
2. Quick Start → แชทใหม่: `liveCatalogInfo` hit ค่าเก่า 128K → hook return ทันที **โดยไม่เรียก RPC** → meter แสดง 128K
3. ส่งข้อความกี่ครั้งก็ไม่เปลี่ยน: runtime ของ task ปัก model info ตั้งแต่ต้นเทิร์น และไม่มีการ revalidate catalog เมื่อส่งข้อความ — เลขจึง sticky
4. เปิด Settings: `ClineModelPicker` mount → `forceRefresh: true` → ทะลุ host cache (ชั้น B) ไปดึงค่าปัจจุบัน **1M** → เติมลงชั้น A ใหม่ → `ModelInfoView` (ที่ merge live ทับ snapshot) แสดง 1M ถูก
5. กลับหน้าแชท: `liveCatalogInfo` ตอนนี้คือ 1M → "หายเอง"

พูดสั้น ๆ: **แชทอ่าน snapshot เก่าที่ตัวเองไม่มีสิทธิ์ refresh; Settings refresh ให้เป็นผลพลอยได้ เลยดูเหมือนหายเอง**

---

## 4) ทำไม "ส่งข้อความต่อ" ถึงไม่ช่วย (คำถามที่ต้องตอบให้ชัด)

- Task runtime resolve model ตอนเริ่ม task แล้วปักไว้ (ดู `commitModelSelection` + `cline-session-factory`) — ทุกเทิร์นถัดไป reuse ค่าเดิม
- meter บนหัวอ่านจาก selection/catalog state ไม่ได้อ่านจาก response ของแต่ละ message
- ไม่มี code path ใดที่ "ส่งข้อความ" จะ trigger `resolveProviderModels` หรือ invalidate ชั้น A
- ดังนั้นเลขจะค้างจนกว่าจะมีอะไรมา refresh ชั้น A (ซึ่งบังเอิญคือการเปิด Settings)

---

## 5) แนวทางแก้อย่างยั่งยืน (ยังไม่ทำรอบนี้ — เสนอเพื่อทำรอบ fix ถัดไป)

เรียงตามความคุ้มค่า:

1. **แชท subscribe catalog ของ active provider เอง** — mount `useProviderModels(activeProvider)` (หรือ watcher เบา ๆ) ใน `ChatView`/`ChatTextArea` พร้อม TTL + revalidate เมื่อเริ่ม task ใหม่ / เปลี่ยนโมเดล → ตัดช่องว่าง "แชทไม่มีสิทธิ์ refresh" ตั้งแต่ต้น
2. **แก้ลำดับความเชื่อใน `useNormalizedApiConfiguration`** — อย่าให้ `liveCatalogInfo` ที่อาจเก่าชนะ RPC แบบไม่มีเงื่อนไข: ถ้า RPC ตอบ `sdk-known-models` ตรง id ปัจจุบัน ให้ถือว่าสดกว่า; เก็บ `fetchedAt`/staleness ลง webview cache (ตอนนี้ `isStale` ถูก set `false` ตลอด ไม่มีใคร mark stale เลย)
3. **Host: `resolveModelInfo` ควรบอกความสด** — แนบ `fetchedAt`/source ไปกับ response (หรือ force re-resolve เมื่อ task เริ่ม) เพื่อให้ webview ตัดสิน staleness ได้
4. **UI ซื่อสัตย์เรื่องความสด** — ถ้าค่ามาจาก cache เกิน TTL ให้แสดง badge/stale affordance หรือปุ่ม refresh แทนการอ้างว่าเป็นค่าปัจจุบัน (หลักเดียวกับที่เคยทำ `contextWindowSource` badge)
5. **Regression tests (ต้องมีก่อนปิดงาน):**
   - `useNormalizedApiConfiguration`: seed webview cache เก่า 128K → mock RPC ตอบ 1M (`sdk-known-models`) → ต้องแสดง 1M
   - `resolveModelInfo`: catalog อัปเดตหลัง commit → ต้องไม่ตอบ committed snapshot เก่า
   - `ExtensionStateContext`: response ใหม่ทับ cache เก่า + mark stale ถูกต้อง

**สิ่งที่ไม่ควรทำ:** กลับไป hardcode/default ตัวเลขใด ๆ (จะซ้ำรอย fabrication เดิม), หรือให้แชท `forceRefresh` ทุก render (เปลือง quota + ช้า) — refresh ควรผูกกับ lifecycle (mount chat / task start / model switch) ไม่ใช่ทุก render

---

## 6) วิธีพิสูจน์ซ้ำ (repro) สำหรับรอบ fix

1. ใช้โมเดล `cline` ที่ backend เพิ่งเปลี่ยนประกาศ context (หรือ mock catalog เก่า 128K ในชั้น A)
2. เปิดแชทจาก Quick Start โดย**ไม่**เปิด Settings ก่อน → ต้องเห็น 128K ค้าง
3. เปิด Settings แล้วกลับมา → ต้องเห็น 1M (อาการ heal)
4. หลังแก้: ข้อ 2 ต้องแสดง 1M ตั้งแต่แรก (หรือแสดง placeholder + refresh เอง ไม่ใช่ 128K เก่า)

---

## 7) การแก้ไข (follow-up หลังอนุมัติ — โค้ด + เทสต์, ยังไม่แพ็ก)

- `useNormalizedApiConfiguration`: warm catalog entry มีอายุ (`PROVIDER_MODELS_FRESHNESS_MS` 5 นาที เท่า host TTL) — entry หมดอายุ/ไม่มี `fetchedAt` จะไม่ชนะ RPC authoritative อีก, คืน `catalogStale` ให้ UI
- ใหม่ `useChatProviderCatalogRefresh` (mount ใน `ChatView`): แชท revalidate catalog ของ active provider เองเมื่อเข้าหน้าแชท/สลับโมเดล/กลับจาก surface อื่น — ไม่ต้องพึ่ง Settings เป็นผลพลอยได้
- `ContextWindow` รับ `isStale` (ต่อจาก `TaskHeader`): ค่าไม่สดแสดงแบบ dim + tooltip "Model catalog is refreshing" แทนการอ้างว่าเป็นค่าปัจจุบัน
- เทสต์ใหม่ 9 ข้อ: repro stale-128K→RPC-1M, stale+RPC-unknown→ซ่อน meter, ไม่มี fetchedAt→RPC ชนะ, badge stale/fresh, refresh hook (mount/visible/model-switch/no-render-spam); ปรับ 4 เทสต์เดิมให้ seed `fetchedAt` สด (เจตนาเดิมไม่เปลี่ยน)
- ตรวจ: webview 893/893, tsc สะอาดทั้ง extension และ webview, biome ไม่เพิ่มปัญหาใหม่

## 8) follow-up หลัง fix.2: completed task ยังเห็น 128K (dev.5-fix.3)

ผู้ใช้ติดตั้ง fix.2 แล้วยืนยัน: About ขึ้น `dev build 5 · fix.2` จริง, hover ที่ 128.0k ได้ tooltip ปกติ ("Maximum context windows size…") ไม่ใช่ "catalog is refreshing" — แปลว่า fix.2 ถือว่า 128K นี้ authoritative ไม่ใช่ stale (บั๊ก stale-cache ตัวเดิมตายจริง) และแพ็ก fix.2 มี fix bytes ครบ (แกะ VSIX: `catalogStale` ×2 เทียบ fix.1 ×0, +691 ไบต์ — 12.28MB เท่ากันแค่ปัดทศนิยม)

หลักฐานเพิ่ม: SDK bundle ประกาศ id ตรงตัว `cline-free/muse-spark-1.3-contributor` = 1048576 (1M) — 128K ไม่ได้มาจาก bundle; Settings รวม `{...persisted, ...live}` ได้ 1M ขณะที่แชทได้ 128K; เลขซ้าย 203.0k (tokens จริงจาก task messages) > เลขขวา 128.0k พิสูจน์ว่าฝั่งขวาผิด

จุดอ่อนที่เจอจริงระหว่างล่า: `applyProviderModelsResponse` เขียนทับ warm entry ที่ดีด้วย `models: {}` + `fetchedAt` สดเมื่อ refresh ล้มเหลว — freshness gate อ่านว่ารายการว่าง = "ไม่มี ไม่ใช่ stale" (`catalogStale: false`) เลยร่วงไปใช้ committed snapshot เก่าแบบเงียบ ๆ ไม่มี affordance

การแก้ (fix.3, ไม่แตะสูตร selection): แยก transition เป็น pure `reduceProviderModelsResponse` (`webview-ui/src/context/providerModelsState.ts`) — failure คง last-good (models/default/fetchedAt) ไว้ ตั้งแค่ `isStale: true` + error; first-failure คงพฤติกรรมเดิม; success ล้าง flag; stale requestId ถูก drop; `isStale` ใน Settings pickers ที่เคยถูกป้อน `false` ตายตัวเริ่มทำงานจริง เทสต์ใหม่ 4 ข้อ (897 total)

ยังไม่ฟันธง branch สุดท้ายของ 128K (committed snapshot ค้าง vs slug-alias vs live gateway override) — ต้องใช้ source-log จาก runtime ถ้าเกิดซ้ำหลัง fix.3

## อ้างอิงไฟล์ (path ใน `cline-temp/`)

- `apps/vscode/webview-ui/src/hooks/useNormalizedApiConfiguration.ts` (ลำดับ liveCatalog > RPC > unknown)
- `apps/vscode/webview-ui/src/hooks/useProviderModels.ts` (forceRefresh เฉพาะตอน mount)
- `apps/vscode/webview-ui/src/context/ExtensionStateContext.tsx` (ชั้น A: ไม่มี TTL, `isStale: false` ตลอด)
- `apps/vscode/webview-ui/src/components/chat/task-header/TaskHeader.tsx` + `ContextWindow.tsx` (meter อ่าน `selectedModelInfo?.contextWindow`)
- `apps/vscode/webview-ui/src/components/settings/ClineModelPicker.tsx` (merge live ทับ snapshot + trigger refresh)
- `apps/vscode/src/core/controller/models/resolveModelInfo.ts` (RPC: peek → resolve → committed → unknown; cline suppress leftover)
- `apps/vscode/src/sdk/model-catalog/catalog.ts` (ชั้น B: TTL 5 นาที)
- `apps/vscode/src/sdk/model-catalog/store.ts` (`fallbackModelInfo` ไม่ fabricate แล้ว)
- ประวัติ: `docs/icline/round-context-128k-report.md` (fabrication รอบก่อน — คนละชั้นกับบั๊กนี้)
