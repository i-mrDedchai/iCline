import { afterEach, describe, expect, it, vi } from "vitest";
import {
	deriveEndpointModelsUrl,
	extractModelIdsFromPayload,
	extractModelsFromPayload,
	fetchModelsFromSource,
} from "./model-source";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("extractModelsFromPayload", () => {
	it("keeps parsing plain id lists (backward compatible)", () => {
		expect(extractModelsFromPayload(["a", " b ", ""], "p")).toEqual([
			{ id: "a" },
			{ id: "b" },
		]);
		expect(extractModelIdsFromPayload(["a", "b"], "p")).toEqual(["a", "b"]);
	});

	it("reads OpenRouter-style limits including top_provider", () => {
		const payload = {
			data: [
				{
					id: "gpt-5.6-sol",
					name: "GPT-5.6 Sol",
					context_length: 1_050_000,
					top_provider: {
						max_context_length: 1_050_000,
						max_completion_tokens: 128_000,
					},
				},
			],
		};
		expect(extractModelsFromPayload(payload, "p")).toEqual([
			{
				id: "gpt-5.6-sol",
				name: "GPT-5.6 Sol",
				contextWindow: 1_050_000,
				maxTokens: 128_000,
			},
		]);
	});

	it("reads vLLM/llama.cpp/LiteLLM limit spellings", () => {
		const payload = {
			data: [
				{ id: "vllm-model", max_model_len: 65_536 },
				{ id: "llama-model", n_ctx: 32_768 },
				{
					id: "litellm-model",
					max_input_tokens: 100_000,
					max_tokens: 8_192,
				},
			],
		};
		expect(extractModelsFromPayload(payload, "p")).toEqual([
			{ id: "vllm-model", contextWindow: 65_536 },
			{ id: "llama-model", contextWindow: 32_768 },
			{ id: "litellm-model", maxInputTokens: 100_000, maxTokens: 8_192 },
		]);
	});

	it("reads models-map and provider-scoped shapes", () => {
		expect(
			extractModelsFromPayload(
				{ models: { "map-model": { context_window: 200_000 } } },
				"p",
			),
		).toEqual([{ id: "map-model", contextWindow: 200_000 }]);

		expect(
			extractModelsFromPayload(
				{ providers: { scoped: { models: [{ id: "scoped-model", context_length: 9_999 }] } } },
				"scoped",
			),
		).toEqual([{ id: "scoped-model", contextWindow: 9_999 }]);
	});
});

describe("fetchModelsFromSource", () => {
	it("sends the API key as both Authorization and x-api-key", async () => {
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({ data: [{ id: "m", context_length: 1_000 }] }),
		}));
		vi.stubGlobal("fetch", fetchMock);

		const entries = await fetchModelsFromSource(
			"https://clean.example/v1/models",
			"openai-compatible",
			{ apiKey: "sk-test" },
		);

		expect(entries).toEqual([{ id: "m", contextWindow: 1_000 }]);
		const [, init] = fetchMock.mock.calls[0] as unknown as [
			string,
			{ headers: Record<string, string> },
		];
		expect(init.headers.Authorization).toBe("Bearer sk-test");
		expect(init.headers["x-api-key"]).toBe("sk-test");
	});

	it("omits auth headers when no key is configured", async () => {
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({ data: [{ id: "m" }] }),
		}));
		vi.stubGlobal("fetch", fetchMock);

		await fetchModelsFromSource("https://x.example/v1/models", "p");

		const [, init] = fetchMock.mock.calls[0] as unknown as [
			string,
			{ headers: Record<string, string> },
		];
		expect(init.headers).toEqual({});
	});
});

describe("deriveEndpointModelsUrl", () => {
	it("appends /models to a configured endpoint", () => {
		expect(deriveEndpointModelsUrl("https://clean.example/v1")).toBe(
			"https://clean.example/v1/models",
		);
		expect(deriveEndpointModelsUrl("https://clean.example/v1/")).toBe(
			"https://clean.example/v1/models",
		);
		expect(deriveEndpointModelsUrl(undefined)).toBeUndefined();
		expect(deriveEndpointModelsUrl("not a url")).toBeUndefined();
	});
});
