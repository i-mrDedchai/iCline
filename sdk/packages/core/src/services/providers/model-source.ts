export interface ModelSourceEntry {
	id: string;
	name?: string;
	contextWindow?: number;
	maxInputTokens?: number;
	maxTokens?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInt(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value > 0
		? Math.floor(value)
		: undefined;
}

function firstPositive(values: unknown[]): number | undefined {
	for (const value of values) {
		const parsed = positiveInt(value);
		if (parsed !== undefined) return parsed;
	}
	return undefined;
}

/**
 * Per-model limits as published by the provider's own `/models` payload.
 *
 * OpenAI-compatible gateways disagree on field names, so the common spellings
 * are all read: OpenRouter (`context_length`, `top_provider.max_context_length`,
 * `top_provider.max_completion_tokens`), vLLM/SGLang (`max_model_len`),
 * llama.cpp (`n_ctx`), LiteLLM (`max_input_tokens`/`max_tokens`), and generic
 * `context_window`/`max_output_tokens`. What a provider declares here is the
 * provider's own statement of its limits — the most faithful source available
 * ("as stated on the provider's website").
 */
function readEntryMetadata(entry: Record<string, unknown>): {
	name?: string;
	contextWindow?: number;
	maxInputTokens?: number;
	maxTokens?: number;
} {
	const topProvider = isRecord(entry.top_provider) ? entry.top_provider : undefined;
	const limits = isRecord(entry.limits) ? entry.limits : undefined;
	return {
		name: typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : undefined,
		contextWindow: firstPositive([
			entry.context_length,
			entry.context_window,
			entry.max_context_length,
			entry.n_ctx,
			entry.max_model_len,
			topProvider?.max_context_length,
			limits?.context,
		]),
		maxInputTokens: firstPositive([
			entry.max_input_tokens,
			entry.max_prompt_tokens,
			topProvider?.max_input_tokens,
			limits?.input,
		]),
		maxTokens: firstPositive([
			entry.max_output_tokens,
			entry.max_completion_tokens,
			entry.max_tokens,
			topProvider?.max_output_tokens,
			topProvider?.max_completion_tokens,
			limits?.output,
		]),
	};
}

function readEntry(item: unknown): ModelSourceEntry | undefined {
	if (typeof item === "string") {
		const id = item.trim();
		return id ? { id } : undefined;
	}
	if (!isRecord(item)) return undefined;
	// Id resolution stays exactly as before: id, then name, then model.
	let id = "";
	for (const value of [item.id, item.name, item.model]) {
		if (typeof value === "string" && value.trim()) {
			id = value.trim();
			break;
		}
	}
	if (!id) return undefined;
	const metadata = readEntryMetadata(item);
	return {
		id,
		...(metadata.name && metadata.name !== id ? { name: metadata.name } : {}),
		...(metadata.contextWindow !== undefined ? { contextWindow: metadata.contextWindow } : {}),
		...(metadata.maxInputTokens !== undefined ? { maxInputTokens: metadata.maxInputTokens } : {}),
		...(metadata.maxTokens !== undefined ? { maxTokens: metadata.maxTokens } : {}),
	};
}

function parseModelIdList(input: unknown): string[] {
	if (!Array.isArray(input)) return [];
	return input
		.map((item) => {
			if (typeof item === "string") return item.trim();
			if (item && typeof item === "object") {
				const entry = item as { id?: unknown; name?: unknown; model?: unknown };
				for (const value of [entry.id, entry.name, entry.model]) {
					if (typeof value === "string" && value.trim()) {
						return value.trim();
					}
				}
			}
			return "";
		})
		.filter((id) => id.length > 0);
}

/**
 * Extract model entries (id + whatever per-model limits the payload declares)
 * from a `/models` response. Supports root arrays, `{data:[…]}`,
 * `{models:[…]}`, `{models:{id:…}}` maps, and provider-scoped
 * `{providers:{<id>:{models:[…]}}}` shapes.
 */
export function extractModelsFromPayload(
	payload: unknown,
	providerId: string,
): ModelSourceEntry[] {
	const out: ModelSourceEntry[] = [];
	const seen = new Set<string>();
	const consume = (item: unknown): void => {
		const entry = readEntry(item);
		if (entry && !seen.has(entry.id)) {
			seen.add(entry.id);
			out.push(entry);
		}
	};

	if (Array.isArray(payload)) {
		for (const item of payload) consume(item);
		return out;
	}
	if (!isRecord(payload)) return out;

	const direct = payload.data ?? payload.models;
	if (Array.isArray(direct)) {
		for (const item of direct) consume(item);
		if (out.length > 0) return out;
	}
	if (isRecord(direct)) {
		for (const [id, value] of Object.entries(direct)) {
			consume(isRecord(value) ? { ...value, id: value.id ?? id } : { id });
		}
		if (out.length > 0) return out;
	}
	// Legacy map shape (keys are ids) without a wrapping data/models array.
	if (isRecord(payload.models)) {
		for (const [id, value] of Object.entries(payload.models)) {
			consume(isRecord(value) ? { ...value, id: value.id ?? id } : { id });
		}
		if (out.length > 0) return out;
	}

	const scoped = isRecord(payload.providers)
		? payload.providers[providerId]
		: undefined;
	if (isRecord(scoped)) {
		const nested = scoped.models ?? scoped;
		if (Array.isArray(nested)) {
			for (const item of nested) consume(item);
		} else if (isRecord(nested)) {
			for (const [id, value] of Object.entries(nested)) {
				consume(isRecord(value) ? { ...value, id: value.id ?? id } : { id });
			}
		}
	}
	return out;
}

export function extractModelIdsFromPayload(
	payload: unknown,
	providerId: string,
): string[] {
	const rootArray = parseModelIdList(payload);
	if (rootArray.length > 0) return rootArray;
	return extractModelsFromPayload(payload, providerId).map((entry) => entry.id);
}

export interface FetchModelSourceOptions {
	/**
	 * API key for endpoints that require authentication. Sent as an
	 * `Authorization: Bearer` header first (the OpenAI-compatible standard);
	 * the `x-api-key` spelling is added only as a retry after the key was
	 * refused the Bearer way.
	 */
	apiKey?: string;
}

export async function fetchModelsFromSource(
	url: string,
	providerId: string,
	options: FetchModelSourceOptions = {},
): Promise<ModelSourceEntry[]> {
	const token = options.apiKey?.trim();
	// The primary attempt is exactly the OpenAI-compatible standard: a Bearer
	// header alone. Some gateways (LiteLLM-style proxies) validate `x-api-key`
	// against a DIFFERENT credential table and refuse the request outright
	// when it carries an unknown one — so that spelling must never ride along
	// unconditionally. It is added only as a retry after the key was refused
	// the Bearer way (401/403), covering gateways that read `x-api-key`
	// instead.
	const attempts: Array<Record<string, string>> = token
		? [
				{ Authorization: `Bearer ${token}` },
				{ Authorization: `Bearer ${token}`, "x-api-key": token },
			]
		: [{}];
	let lastStatus = 0;
	for (const headers of attempts) {
		const response = await fetch(url, {
			method: "GET",
			headers,
			signal: AbortSignal.timeout(5_000),
		});
		if (response.ok) {
			return extractModelsFromPayload(
				(await response.json()) as unknown,
				providerId,
			);
		}
		lastStatus = response.status;
		// Only an auth refusal may escalate to the alternative spelling; any
		// other failure is the endpoint's own answer and stands.
		if (response.status !== 401 && response.status !== 403) {
			break;
		}
	}
	throw new Error(`failed to fetch models from ${url}: HTTP ${lastStatus}`);
}

export async function fetchModelIdsFromSource(
	url: string,
	providerId: string,
	options: FetchModelSourceOptions = {},
): Promise<string[]> {
	const entries = await fetchModelsFromSource(url, providerId, options);
	return entries.map((entry) => entry.id);
}

function trimTrailingSlash(value: string): string {
	return value.replace(/\/+$/, "");
}

export function resolveModelsSourceUrl(
	baseUrl: string | undefined,
	defaultBaseUrl: string | undefined,
	modelsSourceUrl: string | undefined,
): string | undefined {
	const source = modelsSourceUrl?.trim();
	if (!source) return undefined;
	const configuredBase = baseUrl?.trim();
	if (!configuredBase || !defaultBaseUrl?.trim()) return source;

	try {
		const sourceUrl = new URL(source);
		const defaultBase = new URL(defaultBaseUrl);
		const configured = new URL(configuredBase);
		if (sourceUrl.origin !== defaultBase.origin) return source;

		const defaultPath = trimTrailingSlash(defaultBase.pathname);
		const configuredPath = trimTrailingSlash(configured.pathname);
		if (defaultPath && sourceUrl.pathname.startsWith(`${defaultPath}/`)) {
			const suffix = sourceUrl.pathname.slice(defaultPath.length);
			configured.pathname = `${configuredPath}${suffix}`;
		} else {
			configured.pathname = sourceUrl.pathname;
		}
		configured.search = sourceUrl.search;
		configured.hash = sourceUrl.hash;
		return configured.toString();
	} catch {
		return source;
	}
}

/**
 * Derive a model-list URL for an endpoint the user configured themselves
 * (`{baseUrl}/models`) when the provider has no model source of its own.
 * Custom OpenAI-compatible gateways (resellers, proxies) publish their model
 * specs — including context windows — through exactly this endpoint.
 */
export function deriveEndpointModelsUrl(
	baseUrl: string | undefined,
): string | undefined {
	const configuredBase = baseUrl?.trim();
	if (!configuredBase) return undefined;
	try {
		const url = new URL(configuredBase);
		url.pathname = `${trimTrailingSlash(url.pathname)}/models`;
		url.search = "";
		url.hash = "";
		return url.toString();
	} catch {
		return undefined;
	}
}
