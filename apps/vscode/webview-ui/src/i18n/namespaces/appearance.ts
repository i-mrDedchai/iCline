/**
 * The `appearance` namespace: the Settings → Appearance tab, where the user
 * tunes the accent colors of the chat panels.
 *
 * Scope note: the stored value is a *choice id* (`theme`, `green`, `blue`,
 * …), never a color — resolution lives in `@/appearance/appearance`, so a
 * missing or unknown id degrades to the token default. The swatch itself
 * carries the color, so these names stay short on purpose.
 */
import type { TranslatedLocale } from "../locales"

/** English is the source of truth for the key set; every locale must cover it. */
const en = {
	title: "Appearance",
	description: "Tune the accent colors of the chat panels. Defaults follow your editor theme.",
	completedLabel: "Completed box accent",
	completedHint: "The Task Completed panel at the end of a run.",
	replyLabel: "Final-reply card accent",
	replyHint: "The COMPLETED card on the last assistant message.",
	brandLabel: "Brand accent",
	brandHint: "Buttons, badges and the brand-colored chrome.",
	choiceTheme: "Theme default",
	choiceGreen: "Green",
	choiceBlue: "Blue",
	choiceCyan: "Cyan",
	choiceTeal: "Teal",
	choicePurple: "Purple",
	resetAll: "Reset all to theme defaults",
} as const

export type AppearanceStringKey = keyof typeof en

const th: Record<AppearanceStringKey, string> = {
	title: "รูปลักษณ์",
	description: "ปรับสีเน้นของแผงแชท · ค่าเริ่มต้นตามธีมของ editor",
	completedLabel: "สีกล่อง Completed",
	completedHint: "แผง Task Completed ตอนจบงาน",
	replyLabel: "สีการ์ดคำตอบสุดท้าย",
	replyHint: "การ์ด COMPLETED บนข้อความสุดท้ายของ assistant",
	brandLabel: "สีแบรนด์",
	brandHint: "ปุ่ม badge และส่วนที่เป็นสีแบรนด์",
	choiceTheme: "ตามธีม",
	choiceGreen: "เขียว",
	choiceBlue: "ฟ้า",
	choiceCyan: "ฟ้าเขียว",
	choiceTeal: "เขียวน้ำทะเล",
	choicePurple: "ม่วง",
	resetAll: "รีเซ็ตทั้งหมดเป็นค่าธีม",
}

const ja: Record<AppearanceStringKey, string> = {
	title: "外観",
	description: "チャットパネルのアクセントカラーを調整します。既定値はエディターのテーマに従います。",
	completedLabel: "完了ボックスのアクセント",
	completedHint: "タスク終了時の Task Completed パネル。",
	replyLabel: "最終回答カードのアクセント",
	replyHint: "最後のアシスタントメッセージの COMPLETED カード。",
	brandLabel: "ブランドアクセント",
	brandHint: "ボタン、バッジ、ブランド色の UI。",
	choiceTheme: "テーマの既定値",
	choiceGreen: "グリーン",
	choiceBlue: "ブルー",
	choiceCyan: "シアン",
	choiceTeal: "ティール",
	choicePurple: "パープル",
	resetAll: "すべてテーマの既定値に戻す",
}

const zhCN: Record<AppearanceStringKey, string> = {
	title: "外观",
	description: "调整聊天面板的强调色。默认跟随编辑器主题。",
	completedLabel: "完成框强调色",
	completedHint: "任务结束时的 Task Completed 面板。",
	replyLabel: "最终答复卡片强调色",
	replyHint: "最后一条助手消息上的 COMPLETED 卡片。",
	brandLabel: "品牌强调色",
	brandHint: "按钮、徽章和品牌色 UI。",
	choiceTheme: "跟随主题",
	choiceGreen: "绿色",
	choiceBlue: "蓝色",
	choiceCyan: "青色",
	choiceTeal: "青绿色",
	choicePurple: "紫色",
	resetAll: "全部重置为主题默认值",
}

export const appearanceStrings: Record<TranslatedLocale, Record<AppearanceStringKey, string>> = {
	en,
	th,
	ja,
	"zh-CN": zhCN,
}
