import { EDITOR_INPUT_CHAR_LIMIT } from "../../../../icline/harness/guardrails"

export const E2E_REGISTERED_MOCK_ENDPOINTS = {
	"/api/v1": {
		GET: [
			"/generation",
			"/ai/cline/models",
			"/ai/cline/recommended-models",
			"/organizations/{orgId}/balance",
			"/organizations/{orgId}/members/{memberId}/usages",
			"/organizations/{orgId}/api-keys",
			"/organizations/{orgId}/remote-config",
			"/users/me",
			"/users/me/featurebase-token",
			"/users/me/remote-config",
			"/users/{userId}/balance",
			"/users/{userId}/usages",
			"/users/{userId}/payments",
		],
		POST: ["/chat/completions", "/auth/token", "/auth/register", "/users/me/budget/request"],
		PUT: ["/users/active-account"],
	},
	"/.test": {
		GET: [],
		POST: [
			"/auth",
			"/setUserBalance",
			"/setUserHasOrganization",
			"/setOrgBalance",
			"/setSpendLimitExceeded",
			"/setRemoteConfig",
		],
		PUT: [],
	},
	"/health": {
		POST: [],
		GET: ["/", "/ping"],
		PUT: [],
	},
	"/e2e-gateway/v1": {
		GET: ["/models"],
		POST: ["/chat/completions"],
		PUT: [],
	},
}

/**
 * The organization an organization provider policy is published for. It is the one
 * organization `fixtures/server/data.ts` gives every mock user, so a test can switch
 * the account into it and see the policy applied.
 */
export const E2E_REMOTE_CONFIG_ORG_ID = "random-org-id"

/**
 * The provider policy the mock control plane can publish, shaped like the JSON the
 * real `GET /api/v1/organizations/{id}/remote-config` returns in its `value` field.
 * Only the providers named under `providerSettings` are allowed; the host derives
 * `remoteConfiguredProviders` from them (`transformRemoteConfigToStateShape`).
 */
export interface E2ERemoteConfig {
	version: string
	providerSettings?: Record<string, Record<string, unknown>>
}

/**
 * The policy used by the org-policy e2e test: Cline only. Every other provider in the
 * Quick Picker must therefore be locked, and a click on one of its models must be
 * answered with the policy notice instead of a silent revert by the host's remote
 * (highest precedence) layer.
 */
export const E2E_ORG_POLICY_CLINE_ONLY: E2ERemoteConfig = {
	version: "e2e-org-policy-v1",
	providerSettings: { Cline: {} },
}

/**
 * Structured `editor` tool call streamed in response to the `edit_request`
 * prompt. The mock server streams it as OpenAI-format
 * `choices[].delta.tool_calls[]` deltas followed by
 * `finish_reason: "tool_calls"`, which is the only tool-call syntax the SDK
 * runtime executes.
 *
 * The `path` is workspace-relative; the SDK editor executor resolves relative
 * paths against the session cwd, which is the first workspace folder in both
 * the single-root and multi-root e2e workspaces (`fixtures/workspace`).
 */
export const E2E_MOCK_EDITOR_TOOL_CALL = {
	id: "call_e2e_edit_1",
	name: "editor",
	arguments: {
		path: "test.ts",
		old_text: 'export const name = "john"',
		new_text: 'export const name = "cline"',
	},
}

/**
 * Structured `editor` tool call whose new_text exceeds the runtime's hard per-call
 * ceiling (`EDITOR_INPUT_CHAR_LIMIT` — 2,000,000 chars since this build; it was
 * 32000 before, and 6000 before that, each of which this fixture used to trip with
 * an ordinary file). The real tool rejects it BEFORE touching disk by RETURNING a
 * failure envelope (`{ success: false, error: "Editor input too large …" }`)
 * instead of throwing, and the iCline post-write guardrail must surface that
 * message to the model with `isError: true` — once, as a single message, never as
 * a phantom ENOENT or a doubled notice.
 *
 * The size is derived from the extension's own mirror of the limit so the fixture
 * cannot drift below a boundary the real tool would accept. That realistic writes
 * (including the 40,243-char file the fix.29 smoke chat was refused at) land in a
 * single call is pinned by the real-core half, `bun run repro:editor-write`.
 */
export const E2E_MOCK_OVERSIZED_EDITOR_NEW_TEXT_CHARS = EDITOR_INPUT_CHAR_LIMIT + 1020

export const E2E_MOCK_OVERSIZED_EDITOR_TOOL_CALL = {
	id: "call_e2e_oversized_1",
	name: "editor",
	arguments: {
		path: "oversized-repro.txt",
		new_text: "x".repeat(E2E_MOCK_OVERSIZED_EDITOR_NEW_TEXT_CHARS),
	},
}

const edit_request_complete = `I successfully replaced "john" with "cline" in the test.ts file. The change has been completed and the file now contains:

\`\`\`typescript
export const name = "cline"
\`\`\`

The change has been applied and saved to the file.`

export const E2E_MOCK_API_RESPONSES = {
	DEFAULT: "Hello! I'm a mock Cline API response.",
	/** Assistant text streamed before the structured editor tool call. */
	EDIT_REQUEST_LEAD_IN: `I'll replace "john" with "cline" in the test.ts file.`,
	/** Turn-ending text streamed after the SDK reports the editor tool result. */
	EDIT_REQUEST_COMPLETE: edit_request_complete,
	/** Assistant text streamed before the oversized editor tool call. */
	OVERSIZED_REQUEST_LEAD_IN: `I'll create oversized-repro.txt with the full content in a single editor call.`,
	/** Turn-ending text streamed after the rejected oversized call is reported back. */
	OVERSIZED_REQUEST_COMPLETE: `The editor call was rejected because the content exceeded the per-call input limit, so nothing was written to oversized-repro.txt.`,
}

// ---------------------------------------------------------------------------
// Output-limit stub flow: a scripted "model" that hits its output token limit
// mid-turn and is then continued by the runtime (fix.37/38 + the "turn
// truncated, continuing" chat notice). The mock server keys on the trigger
// prompt below and finishes the FIRST completion with `finish_reason: "length"`
// after streaming partial text — the exact wire shape of a model cut off by
// max_tokens — then answers the runtime's continuation nudge with the completion
// text and `finish_reason: "stop"`.
// ---------------------------------------------------------------------------

/** First-user-message key that selects the output-limit stub flow. */
export const E2E_OUTPUT_LIMIT_TRIGGER = "output_limit_request"

/**
 * Substring of the runtime's continuation nudge
 * (`MAX_TOKENS_CONTINUATION_PROMPT` in the agents package). Present as a user
 * message in the follow-up request, so it separates "truncated" from
 * "continued" requests without keeping server-side state.
 */
export const E2E_OUTPUT_LIMIT_CONTINUATION_FRAGMENT = "cut off by the model's maximum output token limit"

export const E2E_MOCK_OUTPUT_LIMIT_RESPONSES = {
	/**
	 * Streamed before the `length` finish. Ends mid-sentence on purpose: the
	 * user should SEE a turn that was cut, not a tidy sentence.
	 */
	TRUNCATED:
		"OUTPUT_LIMIT_CUT_HERE — the answer was still being written when the output budget ran out, right in the middle of a",
	/** Turn-ending text streamed after the runtime continues the turn. */
	COMPLETE: "OUTPUT_LIMIT_CONTINUED_OK",
}

// ---------------------------------------------------------------------------
// Custom gateway stub: a user-configured OpenAI-compatible endpoint (the
// Cleanapis case) that publishes its model list — context window included —
// through its own `/models` endpoint and REQUIRES the API key to read it
// (401 without one, exactly like cleanapis.com/v1/models). The Settings
// context-window e2e points the OpenAI Compatible provider at this gateway
// and asserts the Settings "Context:" row shows the DECLARED window.
// ---------------------------------------------------------------------------

/**
 * API key the gateway requires on /models — accepted ONLY as a Bearer token.
 * A request carrying an `x-api-key` header is refused with 403 (LiteLLM-style
 * proxy behavior).
 */
export const E2E_GATEWAY_API_KEY = "e2e-gateway-key-444"

/**
 * The model the gateway sells under a catalog-known id while declaring its own
 * context window. `gpt-5.6-sol` on purpose: the bundled catalog's
 * cross-provider majority describes that id as 1,050,000, so a Settings row
 * showing 444,444 proves the value came from the provider's own `/models`
 * payload — and the fix.39 smoke saw a blank row for exactly this id
 * ("Context ไม่แสดงเลย").
 */
export const E2E_GATEWAY_MODEL_ID = "gpt-5.6-sol"

export const E2E_GATEWAY_CONTEXT_LENGTH = 444_444

export const E2E_MOCK_GATEWAY_MODELS = {
	data: [
		{
			id: E2E_GATEWAY_MODEL_ID,
			name: "GPT-5.6 Sol (e2e gateway)",
			context_length: E2E_GATEWAY_CONTEXT_LENGTH,
			top_provider: {
				context_length: E2E_GATEWAY_CONTEXT_LENGTH,
				max_completion_tokens: 64_000,
			},
		},
	],
}

export const E2E_MOCK_CLINE_RECOMMENDED_MODELS = {
	free: [
		{
			id: "z-ai/glm-5",
			name: "z-ai/glm-5",
			description: "Free model for e2e onboarding",
			tags: [],
		},
	],
	recommended: [
		{
			id: "anthropic/claude-sonnet-4.6",
			name: "anthropic/claude-sonnet-4.6",
			description: "Recommended model for e2e onboarding",
			tags: ["BEST"],
		},
	],
}

export const E2E_MOCK_CLINE_MODELS = [
	{
		id: "z-ai/glm-5",
		name: "z-ai/glm-5",
		description: "Free model for e2e onboarding",
		context_length: 131_072,
		top_provider: {
			max_completion_tokens: 8_192,
			context_length: 131_072,
			is_moderated: false,
		},
		architecture: {
			modality: "text->text",
		},
		pricing: {
			prompt: "0",
			completion: "0",
		},
		supported_parameters: [],
	},
	{
		id: "anthropic/claude-sonnet-4.6",
		name: "anthropic/claude-sonnet-4.6",
		description: "Recommended model for e2e onboarding",
		context_length: 200_000,
		top_provider: {
			max_completion_tokens: 64_000,
			context_length: 200_000,
			is_moderated: false,
		},
		architecture: {
			modality: "text->text",
		},
		pricing: {
			prompt: "0.000003",
			completion: "0.000015",
			input_cache_read: "0.0000003",
			input_cache_write: "0.00000375",
		},
		supported_parameters: ["include_reasoning"],
	},
]

// ---------------------------------------------------------------------------
// Team flow fixtures: a lead spawns two teammates that write files in parallel
// and leave mailbox messages, then the lead records an outcome.
// ---------------------------------------------------------------------------

/** Lead turn 1: spawn both teammates in one (parallel) tool batch. */
export const E2E_MOCK_TEAM_SPAWN_CALLS = [
	{
		id: "call_e2e_spawn_alpha",
		name: "team_spawn_teammate",
		arguments: { agentId: "alpha", rolePrompt: "writer-alpha" },
	},
	{
		id: "call_e2e_spawn_beta",
		name: "team_spawn_teammate",
		arguments: { agentId: "beta", rolePrompt: "writer-beta" },
	},
]

/** Lead turn 2: dispatch both writers as parallel async runs. */
export const E2E_MOCK_TEAM_RUN_CALLS = [
	{
		id: "call_e2e_run_alpha",
		name: "team_run_task",
		arguments: { agentId: "alpha", task: "write-alpha", runMode: "async" },
	},
	{
		id: "call_e2e_run_beta",
		name: "team_run_task",
		arguments: { agentId: "beta", task: "write-beta", runMode: "async" },
	},
]

/** Lead turn 3: collect both runs. */
export const E2E_MOCK_TEAM_AWAIT_CALL = [
	{
		id: "call_e2e_await",
		name: "team_await_runs",
		arguments: {},
	},
]

/** Lead turn 4: record the shared outcome. */
export const E2E_MOCK_TEAM_CREATE_OUTCOME_CALL = [
	{
		id: "call_e2e_outcome",
		name: "team_create_outcome",
		arguments: { title: "E2E Outcome" },
	},
]

/**
 * Lead turn 5: attach the outcome fragment. The outcome id is runtime-generated,
 * so the mock server substitutes the id parsed out of the create result before
 * streaming this call.
 */
export function buildTeamAttachOutcomeCall(outcomeId: string) {
	return [
		{
			id: "call_e2e_attach",
			name: "team_attach_outcome_fragment",
			arguments: {
				outcomeId,
				section: "current_state",
				content: "alpha and beta wrote their files in parallel",
			},
		},
	]
}

/** Teammate turn 1 (each): report to the sibling teammate AND write a file — one parallel batch. */
export const E2E_MOCK_ALPHA_TEAM_CALLS = [
	{
		id: "call_e2e_alpha_msg",
		name: "team_send_message",
		arguments: {
			toAgentId: "beta",
			subject: "ALPHA_REPORT",
			body: "alpha.txt written in parallel",
		},
	},
	{
		id: "call_e2e_alpha_edit",
		name: "editor",
		arguments: { path: "alpha.txt", new_text: "alpha was here" },
	},
]

export const E2E_MOCK_BETA_TEAM_CALLS = [
	{
		id: "call_e2e_beta_msg",
		name: "team_send_message",
		arguments: {
			toAgentId: "alpha",
			subject: "BETA_REPORT",
			body: "beta.txt written in parallel",
		},
	},
	{
		id: "call_e2e_beta_edit",
		name: "editor",
		arguments: { path: "beta.txt", new_text: "beta was here" },
	},
]

export const E2E_MOCK_TEAM_RESPONSES = {
	TEAM_SPAWN_LEAD_IN: "I'll spawn two writers.",
	TEAM_RUN_LEAD_IN: "Dispatching both writers in parallel.",
	TEAM_AWAIT_LEAD_IN: "Waiting for both runs to finish.",
	TEAM_OUTCOME_LEAD_IN: "Recording the shared outcome.",
	TEAM_ATTACH_LEAD_IN: "Attaching the outcome fragment.",
	TEAM_COMPLETE: "TEAM_E2E_DONE",
	ALPHA_LEAD_IN: "ALPHA writing alpha.txt.",
	ALPHA_DONE: "ALPHA_DONE",
	BETA_LEAD_IN: "BETA writing beta.txt.",
	BETA_DONE: "BETA_DONE",
}
