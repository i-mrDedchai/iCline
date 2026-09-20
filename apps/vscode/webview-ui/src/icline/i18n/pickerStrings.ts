/**
 * Picker-scoped i18n (iCline UI Guidelines, กฎที่ 1): every user-visible string in the
 * Quick Picker goes through this map — no hardcoded copy inside the component.
 *
 * Scope is deliberately narrow: the guideline's fix.9 boundary is the picker plus the
 * reusable tooltip, and the Effort-clamp notice that the picker's Options panel shares
 * with the Settings Effort control (`components/common/ReasoningEffortNotice`). Other
 * iCline surfaces stay on their current inline copy until a later round, so this module
 * owns only picker-adjacent strings.
 *
 * Locale resolution order (see `resolvePickerLocale`):
 *   1. an explicit `preferredLanguage` naming Thai → `th`
 *   2. otherwise the language VS Code itself is running in → `th` when it is Thai
 *   3. otherwise English
 * Step 2 is what makes `auto` behave the way the lockup asks for (default follows the
 * VS Code display language) without inventing a second language setting.
 */
import { PICKER_LOCALES, type PickerLocale, resolvePickerLocale } from "./pickerLocale"

export type { PickerLocale }
export { PICKER_LOCALES, resolvePickerLocale }

/** English is the source of truth for the key set; `th` must cover every key. */
const en = {
	// Trigger + tooltips
	triggerTooltip: "Switch model",
	statusOptionsTooltip: "Thinking & Effort of the model in use — click to change them without switching models",
	// Search
	searchPlaceholder: "Search providers or models…",
	// Provider list states
	loadingProviders: "Loading providers…",
	noProvidersFound: "No providers found.",
	loadingModels: "Loading models…",
	noModelsLoaded: "No models loaded — try Refresh.",
	noModelsMatch: "No models match.",
	// Sections
	sectionRecommended: "Recommended",
	sectionFree: "Free",
	sectionStandard: "Standard",
	// Model row affordances
	badgeFree: "FREE",
	activePrefix: "Active",
	effortBadgeTooltip: "Reasoning effort is set for this model — change it in Options",
	// Row status (icon colour + badge carry the real state; see pickerCapabilities)
	statusThinkingOn: "Thinking on · Effort",
	statusThinkingBudgetOn: "Thinking on — token budget set",
	statusThinkingOff: "Thinking off — enable it in Options",
	statusThinkingBuiltin: "Reasoning built into this model",
	statusThinkingFixed: "This model does not support Thinking",
	// Capability tooltips (only rendered for capabilities we have real metadata for)
	capReasoning: "Reasoning — pick an effort level in Options",
	capThinking: "Extended thinking is available on this model",
	capVision: "Vision — accepts image input",
	capAudio: "Audio input",
	capVideo: "Video input",
	capTraining: "Trains on your data",
	// Short capability labels (the Options panel's capability list)
	capLabelReasoning: "Reasoning",
	capLabelThinking: "Thinking",
	capLabelVision: "Vision",
	capLabelAudio: "Audio",
	capLabelVideo: "Video",
	capLabelTraining: "Trains on data",
	// Options panel (structure locked in mock v11: title + model id + Thinking
	// switch + Effort levels + capability list)
	optionsTitle: "Options",
	optionsThinkingLabel: "Thinking",
	optionsEffortLabel: "Effort",
	optionsNoEffort: "No effort options for this model",
	optionsNoCaps: "No capability data",
	optionsToggleThinking: "Toggle thinking mode",
	// Effort labels for the shared levels. Mock v11 spelled `xhigh` "Max", but the
	// vocabulary now holds `xhigh` AND `max` as separate values, so the picker uses
	// the same wording as Settings ("X-High" / "Max") instead of two buttons that
	// read identically.
	effortMinimal: "Minimal",
	effortLow: "Low",
	effortMedium: "Medium",
	effortHigh: "High",
	effortXhigh: "X-High",
	effortMax: "Max",
	// Effort clamp notice — shown when the SDK gateway will NOT send the level the
	// user picked (see components/common/ReasoningEffortNotice). `{requested}` and
	// `{applied}` are level labels.
	effortClampNearest: "{requested} → {applied} · this model does not accept {requested}, so {applied} is sent",
	effortClampCatalogUnknown: "{requested} → {applied} · no Effort data for this model, so {applied} is sent",
	effortClampNoControl: "{requested} is not sent · this model has no Effort control",
	// Organization policy (see icline/orgProviderPolicy): the picker lists every
	// provider's models while Settings filters the blocked ones out, so a click on a
	// blocked provider has to be answered instead of silently reverted.
	orgProviderBlocked:
		"Your organization manages providers — {provider} is not in the allowed list, so this selection was not applied",
	orgProviderBlockedHint: "Managed by your organization — {provider} is not in the allowed provider list",
	// Footer
	footerRefreshTooltip: "Refresh the model list",
	footerEditTooltip: "Edit this provider in Settings",
	// Errors
	commitFailed: "Could not activate this model.",
} as const

export type PickerStringKey = keyof typeof en

const th: Record<PickerStringKey, string> = {
	triggerTooltip: "สลับโมเดล",
	statusOptionsTooltip: "สถานะ Thinking & Effort ของโมเดลที่ใช้อยู่ — คลิกเพื่อตั้งค่าโดยไม่ต้องสลับโมเดล",
	searchPlaceholder: "ค้นหา provider หรือโมเดล…",
	loadingProviders: "กำลังโหลด provider…",
	noProvidersFound: "ไม่พบ provider",
	loadingModels: "กำลังโหลดโมเดล…",
	noModelsLoaded: "ยังไม่มีโมเดล — ลองกด Refresh",
	noModelsMatch: "ไม่มีโมเดลที่ตรงกับคำค้น",
	sectionRecommended: "แนะนำ",
	sectionFree: "ฟรี",
	sectionStandard: "ทั่วไป",
	badgeFree: "ฟรี",
	activePrefix: "ใช้งานอยู่",
	effortBadgeTooltip: "โมเดลนี้ตั้งระดับการคิดไว้ — แก้ได้ใน Options",
	statusThinkingOn: "โหมดคิดเปิดอยู่ · ระดับ",
	statusThinkingBudgetOn: "โหมดคิดเปิดอยู่ — ตั้ง budget โทเคนไว้",
	statusThinkingOff: "โหมดคิดปิด — เปิดได้ใน Options",
	statusThinkingBuiltin: "โมเดลนี้คิดเหตุผลในตัว",
	statusThinkingFixed: "โมเดลนี้ไม่รองรับโหมดคิด",
	capReasoning: "โมเดลคิดเหตุผลได้ — เลือกระดับได้ใน Options",
	capThinking: "โมเดลนี้เปิดโหมดคิดแบบขยายได้",
	capVision: "อ่านรูปภาพได้",
	capAudio: "รับเสียงได้",
	capVideo: "รับวิดีโอได้",
	capTraining: "ข้อมูลถูกนำไปฝึกโมเดล",
	capLabelReasoning: "คิดเหตุผล",
	capLabelThinking: "โหมดคิด",
	capLabelVision: "มองเห็น",
	capLabelAudio: "เสียง",
	capLabelVideo: "วิดีโอ",
	capLabelTraining: "ฝึกจากข้อมูล",
	optionsTitle: "ตัวเลือก",
	optionsThinkingLabel: "Thinking",
	optionsEffortLabel: "Effort",
	optionsNoEffort: "โมเดลนี้ไม่มีตัวเลือก Effort",
	optionsNoCaps: "ไม่มีข้อมูล capability",
	optionsToggleThinking: "เปิด/ปิดโหมด Thinking",
	// ชื่อระดับ Effort คงไว้เป็นอังกฤษทั้งสองภาษา (xhigh = X-High, max = Max)
	effortMinimal: "Minimal",
	effortLow: "Low",
	effortMedium: "Medium",
	effortHigh: "High",
	effortXhigh: "X-High",
	effortMax: "Max",
	effortClampNearest: "{requested} → {applied} · โมเดลนี้ไม่รับ {requested} จะส่ง {applied} แทน",
	effortClampCatalogUnknown: "{requested} → {applied} · ไม่มีข้อมูล Effort ของโมเดลนี้ จะส่ง {applied} แทน",
	effortClampNoControl: "ไม่ส่ง {requested} · โมเดลนี้ไม่มีตัวเลือก Effort",
	orgProviderBlocked: "องค์กรของคุณจัดการ provider — {provider} ไม่อยู่ในรายการที่อนุญาต จึงไม่ได้เปลี่ยนตามที่เลือก",
	orgProviderBlockedHint: "องค์กรของคุณจัดการ — {provider} ไม่อยู่ในรายการ provider ที่อนุญาต",
	footerRefreshTooltip: "โหลดรายชื่อโมเดลใหม่",
	footerEditTooltip: "แก้ไข provider นี้ใน Settings",
	commitFailed: "เปิดใช้งานโมเดลนี้ไม่สำเร็จ",
}

export const PICKER_STRINGS: Record<PickerLocale, Record<PickerStringKey, string>> = { en, th }

export type PickerTranslator = (key: PickerStringKey) => string

/** Unknown keys fall back to English, then to the key itself (never blank copy). */
export function createPickerTranslator(locale: PickerLocale): PickerTranslator {
	const table = PICKER_STRINGS[locale] ?? en
	return (key) => table[key] ?? en[key] ?? key
}

/**
 * Fill `{name}` placeholders in a translated string. Missing values are left as the
 * literal placeholder rather than rendering "undefined" — a visibly incomplete
 * sentence is easier to fix than a plausible wrong one.
 */
export function formatPickerString(tr: PickerTranslator, key: PickerStringKey, values: Record<string, string | number>): string {
	return tr(key).replace(/\{(\w+)\}/g, (placeholder, name: string) =>
		values[name] !== undefined ? String(values[name]) : placeholder,
	)
}

/** Reads the two locale inputs the webview actually has, then resolves. */
export function resolvePickerLocaleFromEnvironment(preferredLanguage?: string): PickerLocale {
	const systemLanguage =
		typeof navigator !== "undefined" && typeof navigator.language === "string" ? navigator.language : undefined
	return resolvePickerLocale({ preferredLanguage, systemLanguage })
}
