import type { QuickStartStringKey } from "@/i18n/namespaces/quickStart"
import type { QuickWinTask } from "../quickWinTasks"

/**
 * An iCline Quick Start card: a `QuickWinTask` whose *user-visible copy* lives in the
 * `quickStart` namespace instead of here.
 *
 * `title` and `description` are omitted rather than kept as English fallbacks: two
 * copies of one sentence — one in this file, one in the English table — means the
 * second one to be edited is the one that stops being read, and the card would keep
 * showing stale copy in every language. The `*Key` fields are typed against the
 * namespace, so a name that does not exist (or a card added without one) fails the
 * type check instead of rendering a blank card.
 *
 * `prompt` stays here in English on purpose — it is an instruction to the model, not
 * interface copy. See the namespace header for the reasoning.
 */
export interface IclineQuickStartTask extends Omit<QuickWinTask, "title" | "description"> {
	titleKey: QuickStartStringKey
	descriptionKey: QuickStartStringKey
}

export const iclineQuickStartTasks: IclineQuickStartTask[] = [
	{
		id: "icline_explain_code",
		titleKey: "explainCodeTitle",
		descriptionKey: "explainCodeDescription",
		icon: "ExplainIcon",
		actionCommand: "icline/quickStartExplain",
		prompt: "Explore this workspace and explain how the project is organized: main folders, entry points, and how the important modules connect. Keep it practical for a developer onboarding to the repo.",
		buttonText: ">",
	},
	{
		id: "icline_refactor",
		titleKey: "refactorTitle",
		descriptionKey: "refactorDescription",
		icon: "RefactorIcon",
		actionCommand: "icline/quickStartRefactor",
		prompt: "Find one focused refactor opportunity in this codebase (naming, duplication, or clarity). Propose a small, verifiable change — not a speculative rewrite — and implement it with tests if they exist.",
		buttonText: ">",
	},
	{
		id: "icline_write_tests",
		titleKey: "writeTestsTitle",
		descriptionKey: "writeTestsDescription",
		icon: "TestIcon",
		actionCommand: "icline/quickStartTests",
		prompt: "Identify a critical code path that lacks adequate tests. Add focused unit or integration tests using the project's existing test stack. Run the relevant tests and report results.",
		buttonText: ">",
	},
	{
		id: "icline_debug",
		titleKey: "debugTitle",
		descriptionKey: "debugDescription",
		icon: "DebugIcon",
		actionCommand: "icline/quickStartDebug",
		prompt: "Help me debug an issue in this project. Ask what symptom I see if needed, then reproduce with commands, isolate root cause with evidence, and apply the smallest fix that solves it.",
		buttonText: ">",
	},
	{
		id: "icline_review_changes",
		titleKey: "reviewChangesTitle",
		descriptionKey: "reviewChangesDescription",
		icon: "ReviewIcon",
		actionCommand: "icline/quickStartReview",
		prompt: "Review this workspace like a senior engineer (read-only — do not edit files): inspect recent or high-churn areas, call out bugs, edge cases, style issues, and missing tests. Cite specific files and line areas — no vague praise. Prioritize the top 3 actionable fixes. On Windows/PowerShell use Set-Location instead of cmd-style cd /d.",
		buttonText: ">",
	},
	{
		id: "icline_architecture_review",
		titleKey: "architectureReviewTitle",
		descriptionKey: "architectureReviewDescription",
		icon: "ArchitectureIcon",
		actionCommand: "icline/quickStartArchitecture",
		prompt: "Perform an architecture review of this project: module boundaries, coupling, layering, and scalability or maintenance risks. Map the main data and control flows. Recommend structural improvements ranked by impact and effort — explain trade-offs, do not rewrite everything at once.",
		buttonText: ">",
	},
	{
		id: "icline_security_pass",
		titleKey: "securityPassTitle",
		descriptionKey: "securityPassDescription",
		icon: "SecurityIcon",
		actionCommand: "icline/quickStartSecurity",
		prompt: "Run a lightweight security review of this codebase: hardcoded secrets, unsafe dependencies, injection surfaces, auth/session handling, and risky file or shell operations. Cite evidence from the repo. List findings by severity with suggested fixes.",
		buttonText: ">",
	},
	{
		id: "icline_fix_ci",
		titleKey: "fixCiTitle",
		descriptionKey: "fixCiDescription",
		icon: "CiIcon",
		actionCommand: "icline/quickStartCi",
		prompt: "Help fix failing CI or tests in this project. Find the test or build commands, reproduce failures locally, diagnose root cause from logs, and apply the smallest fix. Re-run the relevant commands and report pass/fail with evidence.",
		buttonText: ">",
	},
	{
		id: "icline_update_docs",
		titleKey: "updateDocsTitle",
		descriptionKey: "updateDocsDescription",
		icon: "DocsIcon",
		actionCommand: "icline/quickStartDocs",
		prompt: "Audit documentation in this repo (README, CHANGELOG, inline comments, API docs). Find sections that are stale or missing compared to the code. Propose and apply focused updates — accurate, concise, no marketing fluff.",
		buttonText: ">",
	},
	{
		id: "icline_plan_feature",
		titleKey: "planFeatureTitle",
		descriptionKey: "planFeatureDescription",
		icon: "PlanIcon",
		actionCommand: "icline/quickStartPlan",
		prompt: "Help me plan a feature in this codebase without writing code yet. Ask clarifying questions if needed, then outline scope, affected files/modules, implementation steps, test strategy, and risks. Keep the plan actionable for a single PR or small series of PRs.",
		buttonText: ">",
	},
	{
		id: "icline_performance_check",
		titleKey: "performanceCheckTitle",
		descriptionKey: "performanceCheckDescription",
		icon: "PerformanceIcon",
		actionCommand: "icline/quickStartPerformance",
		prompt: "Review this project for performance issues: slow paths, N+1 queries, unnecessary re-renders, large bundles, blocking I/O, or missing caching. Use evidence from the code and, where useful, run profiling or build analysis commands. Suggest prioritized fixes.",
		buttonText: ">",
	},
	{
		id: "icline_dependency_audit",
		titleKey: "dependencyAuditTitle",
		descriptionKey: "dependencyAuditDescription",
		icon: "DependencyIcon",
		actionCommand: "icline/quickStartDependencies",
		prompt: "Audit dependencies in this project: outdated packages, known vulnerabilities, unused deps, and version pinning risks. Use the project's package manager commands. Propose a safe upgrade order with breaking-change notes — do not bump everything blindly.",
		buttonText: ">",
	},
]
