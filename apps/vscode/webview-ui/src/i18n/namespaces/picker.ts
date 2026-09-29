/**
 * The `picker` namespace (iCline UI Guidelines, กฎที่ 1): every user-visible string in
 * the Quick Picker goes through this table — no hardcoded copy inside the component.
 *
 * Scope is deliberately narrow, and stays narrow now that the strings live in the
 * shared `@/i18n` core: the guideline's fix.9 boundary is the picker plus the
 * reusable tooltip, and the Effort-clamp notice that the picker's Options panel
 * shares with the Settings Effort control (`components/common/ReasoningEffortNotice`).
 * Surfaces outside that boundary add their OWN namespace next to this one rather
 * than growing this table (see `../strings.ts` for the registry).
 *
 * English is the source of truth for the key set; every other locale must cover it,
 * which `../i18n.test.ts` enforces across all namespaces at once.
 */
import type { TranslatedLocale } from "../locales"

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
	// Settings Effort control help (`settings/ReasoningEffortSelector` + the
	// `modelThinkingOptions` sets that name it): one key per set, so a language
	// that needs different grammar per set is not forced through one sentence.
	settingsEffortLabel: "Reasoning Effort",
	settingsEffortAdaptiveLabel: "Adaptive Thinking",
	settingsEffortGenericDesc: "Higher effort improves depth, but uses more tokens.",
	settingsEffortAdaptiveDesc: "Use None to disable adaptive thinking. Higher effort increases response detail and token usage.",
	settingsEffortSakanaDesc: "Fugu Ultra defaults to X-High. Higher effort improves depth but uses more tokens.",
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
	settingsEffortLabel: "ระดับการคิด (Reasoning Effort)",
	settingsEffortAdaptiveLabel: "การคิดแบบปรับตัว (Adaptive Thinking)",
	settingsEffortGenericDesc: "ระดับสูงขึ้นคิดลึกขึ้น แต่ใช้โทเคนมากขึ้น",
	settingsEffortAdaptiveDesc: "เลือก None เพื่อปิดการคิดแบบปรับตัว · ระดับสูงขึ้นให้รายละเอียดมากขึ้นแต่ใช้โทเคนมากขึ้น",
	settingsEffortSakanaDesc: "Fugu Ultra เริ่มต้นที่ X-High · ระดับสูงขึ้นคิดลึกขึ้นแต่ใช้โทเคนมากขึ้น",
	effortClampNearest: "{requested} → {applied} · โมเดลนี้ไม่รับ {requested} จะส่ง {applied} แทน",
	effortClampCatalogUnknown: "{requested} → {applied} · ไม่มีข้อมูล Effort ของโมเดลนี้ จะส่ง {applied} แทน",
	effortClampNoControl: "ไม่ส่ง {requested} · โมเดลนี้ไม่มีตัวเลือก Effort",
	orgProviderBlocked: "องค์กรของคุณจัดการ provider — {provider} ไม่อยู่ในรายการที่อนุญาต จึงไม่ได้เปลี่ยนตามที่เลือก",
	orgProviderBlockedHint: "องค์กรของคุณจัดการ — {provider} ไม่อยู่ในรายการ provider ที่อนุญาต",
	footerRefreshTooltip: "โหลดรายชื่อโมเดลใหม่",
	footerEditTooltip: "แก้ไข provider นี้ใน Settings",
	commitFailed: "เปิดใช้งานโมเดลนี้ไม่สำเร็จ",
}

const ja: Record<PickerStringKey, string> = {
	triggerTooltip: "モデルを切り替え",
	statusOptionsTooltip: "使用中モデルの Thinking と Effort — クリックするとモデルを切り替えずに変更できます",
	searchPlaceholder: "プロバイダーまたはモデルを検索…",
	loadingProviders: "プロバイダーを読み込み中…",
	noProvidersFound: "プロバイダーが見つかりません。",
	loadingModels: "モデルを読み込み中…",
	noModelsLoaded: "モデルがまだありません — Refresh を試してください。",
	noModelsMatch: "一致するモデルがありません。",
	sectionRecommended: "おすすめ",
	sectionFree: "無料",
	sectionStandard: "標準",
	badgeFree: "無料",
	activePrefix: "使用中",
	effortBadgeTooltip: "このモデルには推論 Effort が設定されています — Options で変更できます",
	statusThinkingOn: "Thinking オン · Effort",
	statusThinkingBudgetOn: "Thinking オン — トークン上限を設定済み",
	statusThinkingOff: "Thinking オフ — Options で有効にできます",
	statusThinkingBuiltin: "このモデルは推論を内蔵しています",
	statusThinkingFixed: "このモデルは Thinking に対応していません",
	capReasoning: "推論 — Options で Effort レベルを選択",
	capThinking: "このモデルでは拡張思考を利用できます",
	capVision: "画像入力に対応",
	capAudio: "音声入力",
	capVideo: "動画入力",
	capTraining: "データが学習に使われます",
	capLabelReasoning: "推論",
	capLabelThinking: "Thinking",
	capLabelVision: "画像",
	capLabelAudio: "音声",
	capLabelVideo: "動画",
	capLabelTraining: "学習に使用",
	optionsTitle: "オプション",
	optionsThinkingLabel: "Thinking",
	optionsEffortLabel: "Effort",
	optionsNoEffort: "このモデルには Effort の選択肢がありません",
	optionsNoCaps: "ケイパビリティ情報がありません",
	optionsToggleThinking: "Thinking モードのオン/オフ",
	// Effort レベルの名前は全言語で英語のまま（mock v11 の決定）
	effortMinimal: "Minimal",
	effortLow: "Low",
	effortMedium: "Medium",
	effortHigh: "High",
	effortXhigh: "X-High",
	effortMax: "Max",
	settingsEffortLabel: "Reasoning Effort",
	settingsEffortAdaptiveLabel: "Adaptive Thinking",
	settingsEffortGenericDesc: "Effort を上げると深く考えますが、トークンを多く使います。",
	settingsEffortAdaptiveDesc:
		"Adaptive Thinking を無効にするには None を選びます。Effort を上げると詳細になりますが、トークンも増えます。",
	settingsEffortSakanaDesc: "Fugu Ultra の既定は X-High です。Effort を上げると深く考えますが、トークンを多く使います。",
	effortClampNearest: "{requested} → {applied} · このモデルは {requested} を受け付けないため {applied} を送信します",
	effortClampCatalogUnknown: "{requested} → {applied} · このモデルの Effort 情報がないため {applied} を送信します",
	effortClampNoControl: "{requested} は送信されません · このモデルには Effort 設定がありません",
	orgProviderBlocked: "組織がプロバイダーを管理しています — {provider} は許可リストにないため、この選択は適用されませんでした",
	orgProviderBlockedHint: "組織による管理 — {provider} は許可されたプロバイダー一覧にありません",
	footerRefreshTooltip: "モデル一覧を再読み込み",
	footerEditTooltip: "Settings でこのプロバイダーを編集",
	commitFailed: "このモデルを有効にできませんでした。",
}

const zhCN: Record<PickerStringKey, string> = {
	triggerTooltip: "切换模型",
	statusOptionsTooltip: "当前模型的 Thinking 与 Effort — 点击即可在不切换模型的情况下修改",
	searchPlaceholder: "搜索提供商或模型…",
	loadingProviders: "正在加载提供商…",
	noProvidersFound: "未找到提供商。",
	loadingModels: "正在加载模型…",
	noModelsLoaded: "尚未加载模型 — 请尝试 Refresh。",
	noModelsMatch: "没有匹配的模型。",
	sectionRecommended: "推荐",
	sectionFree: "免费",
	sectionStandard: "标准",
	badgeFree: "免费",
	activePrefix: "使用中",
	effortBadgeTooltip: "该模型已设置推理 Effort — 可在 Options 中修改",
	statusThinkingOn: "Thinking 已开启 · Effort",
	statusThinkingBudgetOn: "Thinking 已开启 — 已设置 token 预算",
	statusThinkingOff: "Thinking 已关闭 — 可在 Options 中开启",
	statusThinkingBuiltin: "该模型内置推理能力",
	statusThinkingFixed: "该模型不支持 Thinking",
	capReasoning: "推理 — 在 Options 中选择 Effort 级别",
	capThinking: "该模型支持扩展思考",
	capVision: "支持图片输入",
	capAudio: "支持音频输入",
	capVideo: "支持视频输入",
	capTraining: "会使用你的数据训练",
	capLabelReasoning: "推理",
	capLabelThinking: "Thinking",
	capLabelVision: "视觉",
	capLabelAudio: "音频",
	capLabelVideo: "视频",
	capLabelTraining: "用于训练",
	optionsTitle: "选项",
	optionsThinkingLabel: "Thinking",
	optionsEffortLabel: "Effort",
	optionsNoEffort: "该模型没有 Effort 选项",
	optionsNoCaps: "没有能力数据",
	optionsToggleThinking: "开启/关闭 Thinking 模式",
	// Effort 级别名称在所有语言中保持英文（mock v11 的决定）
	effortMinimal: "Minimal",
	effortLow: "Low",
	effortMedium: "Medium",
	effortHigh: "High",
	effortXhigh: "X-High",
	effortMax: "Max",
	settingsEffortLabel: "推理强度 (Reasoning Effort)",
	settingsEffortAdaptiveLabel: "自适应思考 (Adaptive Thinking)",
	settingsEffortGenericDesc: "强度越高思考越深入，但消耗的 token 越多。",
	settingsEffortAdaptiveDesc: "选择 None 可关闭自适应思考。强度越高回答越详细，但消耗的 token 越多。",
	settingsEffortSakanaDesc: "Fugu Ultra 默认使用 X-High。强度越高思考越深入，但消耗的 token 越多。",
	effortClampNearest: "{requested} → {applied} · 该模型不接受 {requested}，因此发送 {applied}",
	effortClampCatalogUnknown: "{requested} → {applied} · 没有该模型的 Effort 数据，因此发送 {applied}",
	effortClampNoControl: "不会发送 {requested} · 该模型没有 Effort 控制",
	orgProviderBlocked: "你的组织管理着提供商 — {provider} 不在允许列表中，因此未应用此次选择",
	orgProviderBlockedHint: "由你的组织管理 — {provider} 不在允许的提供商列表中",
	footerRefreshTooltip: "刷新模型列表",
	footerEditTooltip: "在 Settings 中编辑该提供商",
	commitFailed: "无法启用该模型。",
}

/** The picker's copy, one entry per locale the core knows how to render. */
export const pickerStrings: Record<TranslatedLocale, Record<PickerStringKey, string>> = {
	en,
	th,
	ja,
	"zh-CN": zhCN,
}
