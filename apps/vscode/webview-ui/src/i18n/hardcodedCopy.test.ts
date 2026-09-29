import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * The guard that keeps a migrated surface migrated.
 *
 * Moving copy into `@/i18n` is a one-time edit, but nothing stops the next change
 * from typing a new English label straight into the JSX — and the regression is
 * invisible until someone switches the interface language and finds one line still
 * in English. So every file listed here is scanned for user-visible text that is not
 * coming from a translator: JSX text nodes, and the attributes screen readers and
 * tooltips read out (`title`, `placeholder`, `aria-label`, `label`).
 *
 * Add a file to `MIGRATED` in the same commit that migrates it. The list is the
 * worklist too: what is not on it yet is simply not migrated yet, not exempt
 * forever.
 */
const MIGRATED = [
	"components/settings/PreferredLanguageSetting.tsx",
	"components/settings/sections/GeneralSettingsSection.tsx",
	"components/settings/sections/DebugSection.tsx",
	"components/settings/sections/TerminalSettingsSection.tsx",
	"components/settings/sections/ApiConfigurationSection.tsx",
	// The provider forms in the api-config tab: the shared fields every form renders,
	// then the forms themselves.
	// The per-provider model dropdowns render the same label and hints as the forms.
	"components/settings/BasetenModelPicker.tsx",
	"components/settings/ClineModelPicker.tsx",
	"components/settings/GroqModelPicker.tsx",
	"components/settings/HicapModelPicker.tsx",
	"components/settings/HuggingFaceModelPicker.tsx",
	"components/settings/OpenRouterModelPicker.tsx",
	"components/settings/RequestyModelPicker.tsx",
	"components/settings/SapAiCoreModelPicker.tsx",
	"components/settings/VercelModelPicker.tsx",
	"components/settings/ZenmuxModelPicker.tsx",
	"components/settings/providers/OcaModelPicker.tsx",
	// The settings shell itself: the rail, the view header, the stats and the provider
	// selector are one screen with the tabs they switch between.
	"components/common/ViewHeader.tsx",
	"components/settings/ApiOptions.tsx",
	"components/settings/CustomProviderManager.tsx",
	"components/settings/ProviderStatsCard.tsx",
	"components/settings/SettingsView.tsx",
	"components/settings/providers/OcaProvider.tsx",
	"components/settings/common/ApiKeyField.tsx",
	"components/settings/common/BaseUrlField.tsx",
	"components/settings/common/ModelAutocomplete.tsx",
	"components/settings/common/ModelInfoView.tsx",
	"components/settings/common/ModelSelector.tsx",
	"components/settings/common/RemotelyConfiguredInputWrapper.tsx",
	"components/settings/providers/ModelPickerWithManualEntry.tsx",
	"components/settings/providers/OpenAICompatible.tsx",
	"components/settings/providers/SapAiCoreProvider.tsx",
	"components/settings/providers/AihubmixProvider.tsx",
	"components/settings/providers/AnthropicProvider.tsx",
	"components/settings/providers/AskSageProvider.tsx",
	"components/settings/providers/BedrockProvider.tsx",
	"components/settings/providers/ClaudeCodeProvider.tsx",
	"components/settings/providers/DifyProvider.tsx",
	"components/settings/providers/GenericProviderSettings.tsx",
	"components/settings/providers/HicapProvider.tsx",
	"components/settings/providers/HuggingFaceProvider.tsx",
	"components/settings/providers/LMStudioProvider.tsx",
	"components/settings/providers/OllamaProvider.tsx",
	"components/settings/providers/SakanaProvider.tsx",
	"components/settings/providers/VertexProvider.tsx",
	"components/settings/providers/ZenmuxProvider.tsx",
	"components/settings/providers/MoonshotProvider.tsx",
	"components/settings/providers/OpenAINative.tsx",
	"components/settings/providers/LiteLlmProvider.tsx",
	"components/settings/providers/OpenAiCodexProvider.tsx",
	"components/settings/providers/OpenRouterProvider.tsx",
	"components/settings/providers/QwenCodeProvider.tsx",
	"components/settings/providers/QwenProvider.tsx",
	"components/settings/providers/RequestyProvider.tsx",
	"components/settings/providers/VSCodeLmProvider.tsx",
	"components/settings/providers/VercelAIGatewayProvider.tsx",
	"components/settings/providers/XaiProvider.tsx",
	"components/settings/providers/ZAiProvider.tsx",
	"components/settings/sections/FeatureSettingsSection.tsx",
	"components/settings/sections/RemoteConfigSection.tsx",
	"components/settings/sections/AboutSection.tsx",
	// Migrated in the picker round; kept here so a new English string cannot slip in
	// beside the translator that is already in use.
	"components/chat/ModelOptionsPanel.tsx",
	"components/chat/ModelStatusIcons.tsx",
	"components/chat/QuickModelPicker.tsx",
	"components/common/OrgProviderPolicyNotice.tsx",
	"components/common/ReasoningEffortNotice.tsx",
	"components/settings/ReasoningEffortSelector.tsx",
	// The welcome screen: the two mode headings live here, the cards and their
	// popover in `icline/`. fix.48 adds the hero, the history preview, the chat
	// composer and the auto-approve bar + modal — one screen with its footer.
	"components/welcome/SuggestedTasks.tsx",
	"components/welcome/HomeHeader.tsx",
	"components/welcome/icline/IclineQuickStartCard.tsx",
	"components/welcome/icline/QuickStartPromptPopover.tsx",
	"components/history/HistoryPreview.tsx",
	"components/chat/ChatView.tsx",
	"components/chat/ChatTextArea.tsx",
	"components/chat/auto-approve-menu/AutoApproveBar.tsx",
	"components/chat/auto-approve-menu/AutoApproveModal.tsx",
	"components/chat/auto-approve-menu/AutoApproveMenuItem.tsx",
	// fix.49a: the Customize modal (Rules / Hooks / Skills) plus the MCP server
	// surfaces and the full history view with its row items — one screen each.
	"components/cline-rules/ClineRulesToggleModal.tsx",
	"components/cline-rules/NewRuleRow.tsx",
	"components/cline-rules/RuleRow.tsx",
	"components/cline-rules/HookRow.tsx",
	"components/cline-rules/RulesToggleList.tsx",
	"components/mcp/chat-display/McpDisplayModeDropdown.tsx",
	"components/mcp/configuration/tabs/add-server/AddRemoteServerForm.tsx",
	"components/mcp/configuration/tabs/installed/server-row/ServerRow.tsx",
	"components/history/HistoryView.tsx",
	"components/history/HistoryViewItem.tsx",
	// fix.49b: the standalone views — shared ui primitives take a translated label
	// from their caller, and Worktrees / Team / Marketplace / Account / Onboarding /
	// Browser render from the `surfaces` namespace.
	"components/ui/alert.tsx",
	"components/ui/dialog.tsx",
	"components/common/WhatsNewModal.tsx",
	"components/worktrees/WorktreesView.tsx",
	"components/worktrees/CreateWorktreeModal.tsx",
	"components/worktrees/DeleteWorktreeModal.tsx",
	"components/team/TeamPanel.tsx",
	"components/marketplace/MarketplaceView.tsx",
	"components/account/AccountView.tsx",
	"components/account/AccountWelcomeView.tsx",
	"components/account/ClineAuthStatus.tsx",
	"components/account/CreditBalance.tsx",
	"components/account/CreditsHistoryTable.tsx",
	"components/onboarding/OnboardingView.tsx",
	"components/browser/BrowserSettingsMenu.tsx",
]

/**
 * Files allowed to contain copy-like literals for reasons that are not translation
 * problems. `PreferredLanguageSetting` renders the language list, whose entries ARE
 * the stored values ("Thai - ไทย") rather than copy; those come from `@shared/Languages`
 * and therefore never appear as literals here, so it needs no exemption — this list
 * stays empty until something genuinely does.
 */
const EXEMPT: ReadonlyArray<string> = []

/**
 * Files on `MIGRATED` that render no copy of their own: every visible string comes
 * from a shared component that is already translated. They stay on the literal scan
 * (that is what stops a later edit from typing English straight into the JSX) but not
 * on the translator-import check — there is nothing for them to translate, and adding
 * an unused import to satisfy a test is noise that hides the real intent.
 */
const DELEGATES_ONLY: ReadonlyArray<string> = [
	"components/settings/providers/OpenAINative.tsx",
	// fix.49b: the shared ui primitives render no copy of their own — the dismiss
	// and close labels arrive translated from the caller (`dismissLabel`,
	// `closeLabel`), so there is nothing for them to translate.
	"components/ui/alert.tsx",
	"components/ui/dialog.tsx",
]

const SRC_DIR = join(__dirname, "..")

/**
 * Text sitting directly before a closing tag, e.g. `>Download</`. Requiring the `</`
 * is what keeps TypeScript out of the scan: `=> Promise<void>` and `Set<X> = new Set<…>`
 * both look like `>text<` to a regex, but neither closes a tag. The cost is that copy
 * followed by an inline element (`<p>Some text <a …>link</a></p>`) is not detected —
 * this is a net, not a proof, and a net that cries wolf gets deleted.
 */
const JSX_TEXT = />[^<>{}\n]*[A-Za-z][^<>{}\n]*<\//g
/**
 * A user-facing attribute given a literal instead of a translated expression.
 * `helpText` is in the list because `ApiKeyField` renders it under the field — a file
 * that translated every label but left an English sentence in this prop reads as
 * half-translated, and no text-node scan can see a prop value.
 */
const LITERAL_ATTRIBUTE = /\b(title|placeholder|aria-label|label|helpText)=(["'])[^"'{}\n]{3,}\2/g
/** Anything that looks like a word: rejects `</div>`, `>=`, punctuation-only nodes. */
const LOOKS_LIKE_COPY = /[A-Za-z]{2}/
/**
 * A one-token text node that is an identifier, not copy: a URL, a key prefix, a model
 * id, a number, or an example value shown as a placeholder (`https://api.sakana.ai/v1`,
 * `sk-ai-v1-`, `llama3.1`, `32768`, `mcp-server`). Provider and server forms render
 * these right beside their prose, and translating one would be a bug — a translated
 * key prefix or example slug cannot work. Requiring a digit, dot, slash or dash is
 * what keeps single-word *labels* (`Retry`, `Model`, `Note:`) inside the net.
 */
const LOOKS_LIKE_IDENTIFIER = /^[A-Za-z0-9._:/#&=@+%-]*[0-9./-][A-Za-z0-9._:/#&=@+%-]*$/
/**
 * The two heuristics that keep TypeScript out of a text scan, both pinned by the
 * `scan itself` test below:
 * - `Set<PickerStringKey> = new Set<…>` looks exactly like `>text<` to a regex, so a
 *   text node with an operator in it is type syntax, not copy.
 * - `</p>` and `/>` leave empty or punctuation-only nodes, and copy starts with a
 *   letter, a digit or an opening quote rather than with a closer.
 */
const LOOKS_LIKE_TYPE_SYNTAX = /[=<>]/
const STARTS_LIKE_COPY = /^[A-Za-z0-9"'(]/

/** One text node's verdict, shared by the scan and its self-tests. */
function looksLikeCopy(text: string): boolean {
	return (
		STARTS_LIKE_COPY.test(text) &&
		!LOOKS_LIKE_TYPE_SYNTAX.test(text) &&
		!LOOKS_LIKE_IDENTIFIER.test(text) &&
		LOOKS_LIKE_COPY.test(text)
	)
}

function violations(file: string): string[] {
	const source = readFileSync(join(SRC_DIR, file), "utf8")
	const found: string[] = []
	for (const match of source.match(JSX_TEXT) ?? []) {
		const text = match.slice(1, -2).trim()
		if (looksLikeCopy(text)) {
			found.push(`text node: ${text}`)
		}
	}
	for (const match of source.match(LITERAL_ATTRIBUTE) ?? []) {
		// A placeholder whose value is an identifier-shaped example (`mcp-server`, a
		// sample URL) is fixture data rendered as a hint, not copy — translating it
		// would break the example it demonstrates.
		const value = match.slice(match.indexOf("=") + 2, -1)
		if (match.startsWith("placeholder") && LOOKS_LIKE_IDENTIFIER.test(value)) {
			continue
		}
		found.push(`attribute: ${match}`)
	}
	return found
}

describe("migrated surfaces carry no hardcoded copy", () => {
	for (const file of MIGRATED) {
		if (EXEMPT.includes(file)) {
			continue
		}

		it(`${file} renders only translated user-visible strings`, () => {
			expect(violations(file)).toEqual([])
		})

		if (DELEGATES_ONLY.includes(file)) {
			continue
		}

		it(`${file} goes through the i18n core`, () => {
			const source = readFileSync(join(SRC_DIR, file), "utf8")
			expect(source, "must import from @/i18n").toMatch(/from "@\/i18n\//)
		})
	}
})

describe("the scan itself", () => {
	it("catches a text node, an attribute and a translated expression alike", () => {
		const source = `
			const Bad = () => <button title="Save changes">Save changes</button>
			const Good = () => <button title={tr("save")}>{tr("save")}</button>
			const Prop = () => <Field helpText="Stored locally" label={tr("key")} />
			const Numbers = () => <span>{count}</span>
			const Ids = () => <p><code>sk-ai-v1-</code><code>https://api.example.com/v1</code><code>llama3.1</code></p>
		`
		const found: string[] = []
		for (const match of source.match(JSX_TEXT) ?? []) {
			const text = match.slice(1, -2).trim()
			if (looksLikeCopy(text)) {
				found.push(text)
			}
		}
		const attributes = source.match(LITERAL_ATTRIBUTE) ?? []
		expect(found).toEqual(["Save changes"])
		expect(attributes).toEqual(['title="Save changes"', 'helpText="Stored locally"'])
	})

	it("does not mistake TypeScript for copy", () => {
		const source = `
			const NAMES: ReadonlySet<PickerStringKey> = new Set<PickerStringKey>(["effortMax"])
			const reset: (global?: boolean) => Promise<void> = async () => {}
			interface Props { onReset: (global?: boolean) => Promise<void> }
			const Bar = ({ label }: { label: string }) => <span className="text-xs" />
		`
		const found: string[] = []
		for (const match of source.match(JSX_TEXT) ?? []) {
			const text = match.slice(1, -2).trim()
			if (looksLikeCopy(text)) {
				found.push(text)
			}
		}
		expect(found).toEqual([])
	})

	it("keeps single-word labels in the net but lets identifiers through", () => {
		expect(["Model", "Retry", "Note:", "Custom", "Docs"].filter(looksLikeCopy)).toEqual([
			"Model",
			"Retry",
			"Note:",
			"Custom",
			"Docs",
		])
		expect(["sk-ai-v1-", "https://api.sakana.ai/v1", "llama3.1", "32768", "gpt-5-mini"].filter(looksLikeCopy)).toEqual([])
	})
})
