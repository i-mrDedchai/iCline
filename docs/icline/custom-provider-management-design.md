# ออกแบบ: จัดการ Custom Providers หลายเจ้า (เพิ่ม/แก้ไข/ลบ) ใน iCline VS Code

**วันที่:** 2026-09-28 · **สถานะ:** อนุมัติแล้ว กำลังลงมือ (fix.42)

## คำถามตั้งต้น: "ตอนนี้เพิ่มได้ทีละ 1 เจ้าใช่ไหม?"

**คำตอบสั้น ๆ: ชั้นข้อมูลรองรับกี่เจ้าก็ได้แล้ว แต่ UI ของ iCline จัดการอะไรไม่ได้เลย** — รายละเอียด:

| ชั้น | สถานะปัจจุบัน |
|---|---|
| **ไฟล์ข้อมูล** (`models.json` + `providers.json`) | `models.json` เก็บ providers เป็น **map ต่อ id** หลายเจ้าได้อยู่แล้ว (`StoredProviderEntrySchema` = `z.record(z.string(), …)`) · `providers.json` เก็บ settings (apiKey/baseUrl/headers) ต่อ id |
| **Registry** (`@cline/llms`) | `registerCustomProvider`/`syncStoredProviderRegistration` รองรับหลายเจ้า · `listLocalProviders` รวมเจ้าจากไฟล์เข้า dropdown ให้แล้ว |
| **SDK core CRUD** (`local-provider-service.ts`) | `addLocalProvider` / `updateLocalProvider` / `deleteLocalProvider` / `markLocalProviderEnabled` มีครบ — **แต่ผูกไว้กับ `apps/cline-hub` และ `apps/examples/desktop-app` เท่านั้น ไม่มี RPC ใน VS Code เลย** |
| **UI ของ iCline (VS Code)** | **ไม่มีหน้าจัดการ** — ไม่มีปุ่มเพิ่ม/ลบ/แก้ ฟอร์มที่เห็น (OpenAI-Compatible form) แก้ได้เฉพาะ settings ของเจ้าที่มีอยู่แล้วใน `models.json` (เขียนมือ/มาจาก hub) ทีละเจ้า — เจ้าที่ "เลือกอยู่" |

จึงไม่ใช่ข้อจำกัด "ทีละ 1 เจ้า" แต่เป็น **ไม่มีทางเพิ่ม/ลบจาก UI เลย** — เจ้าที่เห็นใน dropdown คือเจ้าที่คนเขียน `models.json` ใส่ไว้ให้

## เป้าหมาย

จากหน้า Settings ผู้ใช้สามารถ:

1. **เพิ่ม** custom provider ได้ทีละหลายเจ้า (id เฉพาะตัว เช่น `my-gateway`, `jan-local`)
2. **แก้ไข** ชื่อ/baseUrl/API key/headers/โมเดลเริ่มต้น/URL รายการโมเดล ของเจ้าที่เพิ่มไว้
3. **ลบ** เจ้าที่ไม่ใช้แล้ว พร้อม cleanup ทุกชั้น (config/registry/cache)

## สถาปัตยกรรม (ต่อยอดของที่มี ไม่สร้าง storage ใหม่)

```
webview (CustomProviderManager.tsx)
   │ gRPC
   ▼
ModelsService.createCustomProvider / updateCustomProvider / deleteCustomProvider   ← ใหม่ (models.proto)
   │
   ▼
host controllers (core/controller/models/createCustomProvider.ts …)                ← ใหม่
   │  validate + guard + bookkeeping (cache bucket, listings invalidate, active fallback)
   ▼
@cline/core: addLocalProvider / updateLocalProvider / deleteLocalProvider          ← มีอยู่แล้ว
   │
   ▼
models.json (providers map) + providers.json (settings) + @cline/llms registry
```

### 1) Proto (`apps/vscode/proto/cline/models.proto`)

- `ProviderListing` เพิ่ม `bool is_custom = N` — บอกว่าเป็นเจ้าที่มาจากไฟล์ (source `"file"`) เพื่อให้ UI แยก "เจ้าที่ผู้ใช้สร้าง" ออกจาก builtin ได้
- `message CustomProviderMutationRequest` — `provider_id`, `name`, `base_url`, `api_key`, `map<string,string> headers`, `timeout_ms`, `repeated string models`, `default_model_id`, `models_source_url`
- RPCs ใน `ModelsService` (คืน `ProviderListingsResponse` ชุดใหม่เสมอ — UI refresh รอบเดียว):
  - `createCustomProvider(CustomProviderMutationRequest)`
  - `updateCustomProvider(CustomProviderMutationRequest)`
  - `deleteCustomProvider(StringRequest)`

### 2) Host controllers (`src/core/controller/models/`)

- **create:** ตรวจ id slug (`^[a-z0-9][a-z0-9._-]{0,63}$`, ห้ามชน id builtin — core จะ throw `already exists` ให้) + ต้องมี baseUrl หรือ apiKey อย่างน้อยหนึ่ง (กันเข้า compat path "ว่าง = ลบ" ของ `addLocalProvider`) → `addLocalProvider` → **bookkeeping ชุดเดียวกับทุก mutation** (ด้านล่าง)
- **update:** เรียก `updateLocalProvider` (apiKey ว่าง = คงของเดิม) → bookkeeping
- **delete:** อนุญาตเฉพาะเจ้าที่มาจาก `models.json` เท่านั้น (builtin ห้ามลบ) → `deleteLocalProvider` → bookkeeping + **active fallback**: ถ้าเจ้าที่ลบคือ provider ที่ act/plan ใช้อยู่ สลับไป `openai-compatible`… ใช้ค่า default ของระบบแล้ว clear model selection ของเจ้าที่ตาย

**Bookkeeping ร่วมของทุก mutation:**
1. `getProviderCatalog().invalidateProviderListings()` — dropdown ไม่ใช้ snapshot เก่า
2. ล้าง live models cache (fixed slot `openAiCompatible` / per-id bucket) — metadata ของ endpoint เก่าต้องไม่ค้าง (สัญญาเดิมตั้งแต่ fix.40/41)
3. `postStateToWebview()` เมื่อมีการเปลี่ยน provider ที่ใช้งาน

### 3) UI (`webview-ui/src/components/settings/`)

- การ์ด **"Custom providers"** ใน Settings (ใต้ส่วน API Configuration) — ตารางรายเจ้า: ชื่อ · id · baseUrl · โมเดลเริ่มต้น · ปุ่ม Edit / Delete
- ปุ่ม **"Add provider"** → ฟอร์ม (inline form แบบมี mode create/edit):
  - `id` (เฉพา mode create — slug, แก้ทีหลังไม่ได้)
  - `name`, `baseUrl`, `modelsSourceUrl` (ไม่บังคับ), `API key` (write-only — โชว์เป็น mask ของเดิม, ไม่พิมพ์ = คงค่า), `Custom headers` (แถว key/value แบบฟอร์ม OpenAI Compatible), `default model` (free text + autocomplete จาก `/models` ของเจ้านั้น)
- `Delete` = สองจังหวะ (กด Delete → "ยืนยันลบ?") ป้องกันกดพลาด
- หลัง mutation ทุกครั้ง: refresh listings + ปิดฟอร์ม + toast ข้อความ error ถ้า RPC reject (สัญญา "error ต้องมองเห็น" แบบ fix.41)

### 4) กติกา/ความปลอดภัย

- id เป็น immutable หลังสร้าง (เปลี่ยนได้แค่ name) — เลี่ยนปัญหาชี้ id ใหม่ไม่ตรงกับ selection/cache ที่อ้าง id เก่า
- ห้ามลบ/เขียนทับ id builtin (validate ที่ host ไม่ใช่แค่ UI)
- apiKey ไม่เคยส่งกลับไปแสดงจริง (mask เท่านั้น) — ตรง convention `apiKeyLength` ที่ใช้อยู่
- ทุก error ของ RPC ต้องขึ้นเป็นข้อความที่ผู้ใช้เห็น ไม่เงียบ (บทเรียน fix.40)

### 5) ทดสอบ

- unit: controllers (validate/slug/guard/active fallback/bookkeeping) · component: `CustomProviderManager.test.tsx` (list/add/edit/delete flow)
- **e2e ใน VS Code จริง:** เพิ่ม 2 เจ้าชี้ mock gateway → ทั้งคู่อยู่ใน dropdown → แก้เจ้าหนึ่ง → ลบเจ้าหนึ่ง → dropdown/ฟอร์มสะท้อนผลทันที (ปิดจุดที่ "e2e ยังไม่แตะเส้นทาง custom provider creation" ไปในตัว)

## Roadmap

| เฟส | เนื้อหา | สถานะ |
|---|---|---|
| 1 | proto + host controllers + guards + unit tests | รอบนี้ |
| 2 | UI CustomProviderManager + component tests | รอบนี้ |
| 3 | e2e เพิ่ม/แก้/ลบ ใน VS Code จริง | รอบนี้ |
| 4 | ของแถมที่อนุมัติ: smoke checklist อัตโนมัติ · ป้ายแหล่งที่มาค่า Context | รอบถัดไป |

## ข้อจำกัดที่ยอมรับ (รอบแรก)

- ยังไม่มี bulk import/export หลายเจ้าพร้อมกัน (JSON paste) — ถ้าต้องการค่อยต่อยอด
- ยังไม่ย้าย/สำรองค่าอัตโนมัติของ `models.json` (atomic write มีอยู่แล้วใน core)
