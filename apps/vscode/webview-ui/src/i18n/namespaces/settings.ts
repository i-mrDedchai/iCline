/**
 * The `settings` namespace: copy owned by the Settings surface.
 *
 * Grown one tab at a time (the General tab is the first), so a review sees the
 * strings of the screen that changed next to that screen's code. Surfaces that
 * merely *read* Settings — the Quick Picker's Options panel, the shared notices —
 * stay in the `picker` namespace they already had.
 */
import type { TranslatedLocale } from "../locales"

/** English is the source of truth for the key set; every locale must cover it. */
const en = {
	// General → Preferred Language. The setting does two jobs (the language the model
	// answers in, and the language of this interface), so the hint says both: a user
	// hunting for the UI language must not have to guess.
	preferredLanguageLabel: "Preferred Language",
	preferredLanguageHint: "The language Cline uses for its replies and for this interface.",
	// General → telemetry
	telemetryAllow: "Allow error and usage reporting",
	telemetryManaged: "This setting is managed by your organization's remote configuration",
	telemetryNotice:
		"Help improve Cline by sending usage data and error reports. No code, prompts, or personal information are ever sent. See our {overview} and {privacy} for more details.",
	telemetryOverviewLink: "telemetry overview",
	telemetryPrivacyLink: "privacy policy",
} as const

export type SettingsStringKey = keyof typeof en

const th: Record<SettingsStringKey, string> = {
	preferredLanguageLabel: "ภาษาที่ต้องการ",
	preferredLanguageHint: "ภาษาที่ iCline ใช้ตอบกลับ และใช้แสดงผลหน้าจอนี้",
	telemetryAllow: "อนุญาตให้ส่งข้อมูลการใช้งานและรายงานข้อผิดพลาด",
	telemetryManaged: "การตั้งค่านี้ถูกจัดการโดย remote configuration ขององค์กรคุณ",
	telemetryNotice:
		"ช่วยพัฒนา Cline ด้วยการส่งข้อมูลการใช้งานและรายงานข้อผิดพลาด — จะไม่มีการส่งโค้ด คำสั่ง (prompt) หรือข้อมูลส่วนตัวใด ๆ ดู{overview}และ{privacy}สำหรับรายละเอียดเพิ่มเติม",
	telemetryOverviewLink: "ภาพรวมการเก็บข้อมูล",
	telemetryPrivacyLink: "นโยบายความเป็นส่วนตัว",
}

export const settingsStrings: Record<TranslatedLocale, Record<SettingsStringKey, string>> = { en, th }
