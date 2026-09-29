/**
 * The `quickStart` namespace: the welcome screen's Quick Start cards.
 *
 * Scope note that matters for review: only the **card copy** lives here — the title
 * and the one-line description a user reads, plus the popover's own labels. The
 * `prompt` each card sends to the model stays English in `iclineQuickStartTasks.ts`,
 * on purpose: it is an instruction to the model, not interface copy. The language the
 * model *answers* in is already driven by Preferred Language, so translating the
 * payload would add a second, weaker lever over the same behaviour while moving the
 * one prompt path every smoke round exercises off the English rails it was tuned on.
 * The popover lets a user rewrite any prompt for themselves if they want it in their
 * own language (`quickStartPromptStorage`).
 *
 * Task ids live in `iclineQuickStartTasks.ts`; the `*Title`/`*Description` keys here
 * are named after them, and the type of `titleKey`/`descriptionKey` on a task makes a
 * missing or misspelled key a compile error rather than a blank card.
 *
 * The two welcome headings keep their emphasis inside the string, as `[bracketed]
 * words` that the component renders in the brighter colour. One key per heading with
 * no styling seam means a translator can move the emphasis — or drop the brackets and
 * get a plain heading — without the layout forcing English word order on them.
 */
import type { TranslatedLocale } from "../locales"

/** English is the source of truth for the key set; every locale must cover it. */
const en = {
	// The welcome screen's two mode headings. `[ … ]` is the emphasised run.
	headingQuickWins: "Quick [Wins] with Cline",
	headingQuickStarts: "Quick [starts] with iCline",
	explainCodeTitle: "Explain this codebase",
	explainCodeDescription: "Walk through structure, entry points, and how pieces connect",
	refactorTitle: "Refactor safely",
	refactorDescription: "Pick a small, verifiable improvement without a large rewrite",
	writeTestsTitle: "Write tests",
	writeTestsDescription: "Add or extend tests around a critical path",
	debugTitle: "Debug an issue",
	debugDescription: "Reproduce, isolate root cause, and fix with evidence",
	reviewChangesTitle: "Review my changes",
	reviewChangesDescription: "Code review: risks, gaps, and concrete improvements",
	architectureReviewTitle: "Architecture review",
	architectureReviewDescription: "Assess structure, coupling, and maintainability risks",
	securityPassTitle: "Security pass",
	securityPassDescription: "Lightweight audit for secrets, injection, and unsafe patterns",
	fixCiTitle: "Fix CI / failing tests",
	fixCiDescription: "Read logs, reproduce failures, and get the pipeline green",
	updateDocsTitle: "Update docs",
	updateDocsDescription: "Sync README, comments, and docs with the actual code",
	planFeatureTitle: "Plan a feature",
	planFeatureDescription: "Break down scope, files, risks — plan before coding",
	performanceCheckTitle: "Performance check",
	performanceCheckDescription: "Spot bottlenecks, heavy bundles, or wasteful patterns",
	dependencyAuditTitle: "Dependency audit",
	dependencyAuditDescription: "Outdated packages, vulnerabilities, and upgrade plan",
	// Popover (the pencil beside each card)
	popoverEditAriaLabel: "Edit prompt for {task}",
	popoverHint: "Edit the prompt, save for next time, or start immediately.",
	popoverReset: "Reset",
	popoverSave: "Save",
	popoverStart: "Start",
} as const

export type QuickStartStringKey = keyof typeof en

const th: Record<QuickStartStringKey, string> = {
	headingQuickWins: "งานเสร็จไว [Wins] กับ Cline",
	headingQuickStarts: "เริ่มไว [Starts] กับ iCline",
	explainCodeTitle: "อธิบายโค้ดเบสนี้",
	explainCodeDescription: "ไล่โครงสร้าง จุดเริ่มเข้า และการเชื่อมกันของแต่ละส่วน",
	refactorTitle: "รีแฟกเตอร์อย่างปลอดภัย",
	refactorDescription: "เลือกการปรับปรุงเล็ก ๆ ที่ตรวจสอบได้ ไม่ใช่รื้อใหม่ทั้งระบบ",
	writeTestsTitle: "เขียนเทสต์",
	writeTestsDescription: "เพิ่มหรือต่อขยายเทสต์ในเส้นทางที่สำคัญ",
	debugTitle: "ดีบักปัญหา",
	debugDescription: "ทำซ้ำ หาสาเหตุที่แท้จริง แล้วแก้พร้อมหลักฐาน",
	reviewChangesTitle: "รีวิวการเปลี่ยนแปลงของฉัน",
	reviewChangesDescription: "รีวิวโค้ด: ความเสี่ยง จุดที่ขาด และข้อปรับปรุงที่ทำได้จริง",
	architectureReviewTitle: "รีวิวสถาปัตยกรรม",
	architectureReviewDescription: "ประเมินโครงสร้าง การผูกกันของโมดูล และความเสี่ยงด้านการดูแลระยะยาว",
	securityPassTitle: "ตรวจความปลอดภัย",
	securityPassDescription: "ตรวจแบบเบา ๆ: secrets, injection และรูปแบบที่เสี่ยง",
	fixCiTitle: "แก้ CI / เทสต์ที่พัง",
	fixCiDescription: "อ่าน log ทำซ้ำความล้มเหลว แล้วทำให้ pipeline กลับมาเขียว",
	updateDocsTitle: "อัปเดตเอกสาร",
	updateDocsDescription: "ทำให้ README คอมเมนต์ และเอกสารตรงกับโค้ดจริง",
	planFeatureTitle: "วางแผนฟีเจอร์",
	planFeatureDescription: "แตกขอบเขต ไฟล์ และความเสี่ยง ก่อนลงมือเขียนโค้ด",
	performanceCheckTitle: "ตรวจประสิทธิภาพ",
	performanceCheckDescription: "หาคอขวด บันเดิลที่หนัก หรือรูปแบบที่สิ้นเปลือง",
	dependencyAuditTitle: "ตรวจสอบ dependencies",
	dependencyAuditDescription: "แพ็กเกจที่ล้าสมัย ช่องโหว่ และแผนอัปเกรด",
	popoverEditAriaLabel: "แก้ไข prompt สำหรับ {task}",
	popoverHint: "แก้ prompt แล้วบันทึกไว้ใช้ครั้งหน้า หรือเริ่มเลย",
	popoverReset: "รีเซ็ต",
	popoverSave: "บันทึก",
	popoverStart: "เริ่ม",
}

const ja: Record<QuickStartStringKey, string> = {
	headingQuickWins: "Cline ですばやく [Wins]",
	headingQuickStarts: "iCline ですばやく [Starts]",
	explainCodeTitle: "このコードベースを説明",
	explainCodeDescription: "構造・エントリポイント・各部分のつながりをたどります",
	refactorTitle: "安全にリファクタリング",
	refactorDescription: "大規模な書き換えではなく、検証しやすい小さな改善を選びます",
	writeTestsTitle: "テストを書く",
	writeTestsDescription: "重要なパスにテストを追加・拡張します",
	debugTitle: "問題をデバッグ",
	debugDescription: "再現し、根本原因を特定し、根拠とともに修正します",
	reviewChangesTitle: "変更をレビュー",
	reviewChangesDescription: "コードレビュー：リスク、抜け、具体的な改善案",
	architectureReviewTitle: "アーキテクチャレビュー",
	architectureReviewDescription: "構造、結合度、保守性のリスクを評価します",
	securityPassTitle: "セキュリティ確認",
	securityPassDescription: "シークレット、インジェクション、危険なパターンを軽く監査",
	fixCiTitle: "CI / 失敗するテストを修正",
	fixCiDescription: "ログを読み、失敗を再現し、パイプラインを緑に戻します",
	updateDocsTitle: "ドキュメントを更新",
	updateDocsDescription: "README、コメント、ドキュメントを実コードに合わせます",
	planFeatureTitle: "機能を計画",
	planFeatureDescription: "コードを書く前にスコープ・対象ファイル・リスクを分解します",
	performanceCheckTitle: "パフォーマンス確認",
	performanceCheckDescription: "ボトルネック、重いバンドル、無駄な処理を見つけます",
	dependencyAuditTitle: "依存関係の監査",
	dependencyAuditDescription: "古いパッケージ、脆弱性、アップグレード計画",
	popoverEditAriaLabel: "{task} のプロンプトを編集",
	popoverHint: "プロンプトを編集して次回用に保存するか、すぐに開始できます。",
	popoverReset: "リセット",
	popoverSave: "保存",
	popoverStart: "開始",
}

const zhCN: Record<QuickStartStringKey, string> = {
	headingQuickWins: "用 Cline 快速达成 [Wins]",
	headingQuickStarts: "用 iCline 快速开始 [Starts]",
	explainCodeTitle: "解释这个代码库",
	explainCodeDescription: "梳理结构、入口以及各部分如何连接",
	refactorTitle: "安全地重构",
	refactorDescription: "选择一个可验证的小改进，而不是推倒重写",
	writeTestsTitle: "编写测试",
	writeTestsDescription: "在关键路径上新增或扩展测试",
	debugTitle: "调试问题",
	debugDescription: "复现、定位根因，并带证据修复",
	reviewChangesTitle: "审查我的改动",
	reviewChangesDescription: "代码审查：风险、缺口与可落地的改进",
	architectureReviewTitle: "架构评审",
	architectureReviewDescription: "评估结构、耦合与可维护性风险",
	securityPassTitle: "安全检查",
	securityPassDescription: "轻量审计：密钥、注入与不安全模式",
	fixCiTitle: "修复 CI / 失败的测试",
	fixCiDescription: "读日志、复现失败，让流水线恢复绿色",
	updateDocsTitle: "更新文档",
	updateDocsDescription: "让 README、注释和文档与真实代码保持一致",
	planFeatureTitle: "规划功能",
	planFeatureDescription: "在写代码前拆解范围、涉及文件与风险",
	performanceCheckTitle: "性能检查",
	performanceCheckDescription: "找出瓶颈、过大的包或浪费的模式",
	dependencyAuditTitle: "依赖审计",
	dependencyAuditDescription: "过期的包、漏洞与升级计划",
	popoverEditAriaLabel: "编辑 {task} 的提示词",
	popoverHint: "编辑提示词、保存供下次使用，或立即开始。",
	popoverReset: "重置",
	popoverSave: "保存",
	popoverStart: "开始",
}

export const quickStartStrings: Record<TranslatedLocale, Record<QuickStartStringKey, string>> = {
	en,
	th,
	ja,
	"zh-CN": zhCN,
}
