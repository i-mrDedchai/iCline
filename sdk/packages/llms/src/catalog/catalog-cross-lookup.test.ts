import { afterEach, describe, expect, it } from "vitest";
import {
	registerModel,
	resetRegistry,
} from "../providers/model-registry";
import {
	fillCrossProviderModelInfo,
	findCrossProviderModelInfo,
} from "./catalog-cross-lookup";

afterEach(() => {
	resetRegistry();
});

describe("findCrossProviderModelInfo", () => {
	it("resolves a model id that no single provider slot owns but the catalog describes", () => {
		// `gpt-5.6-sol` is not a row of the generic `openai-compatible` provider,
		// yet the generated catalog describes it under 16 reseller keys.
		const match = findCrossProviderModelInfo("gpt-5.6-sol");
		expect(match).toBeDefined();
		expect(match?.providers.length).toBeGreaterThanOrEqual(2);
		expect(match?.providers).toContain("openai-native");
		// Majority vote lands on the vendor-canonical window (13/16 providers,
		// including openai-native: 1,050,000 — not the 1,000,000/372,000 outliers).
		expect(match?.info.contextWindow).toBe(1_050_000);
		expect(match?.agreement).toBeGreaterThan(1);
	});

	it("returns undefined for ids no provider carries", () => {
		expect(findCrossProviderModelInfo("no-such-model-anywhere-xyz")).toBeUndefined();
		expect(findCrossProviderModelInfo("")).toBeUndefined();
	});

	it("reads models.json-style registry registrations live", () => {
		// models.json `registerModel` entries extend an existing provider id.
		registerModel("openai-compatible", "mystery-cross-model", {
			id: "mystery-cross-model",
			contextWindow: 555_000,
		});
		const match = findCrossProviderModelInfo("mystery-cross-model");
		expect(match?.info.contextWindow).toBe(555_000);
		expect(match?.providers).toEqual(["openai-compatible"]);
	});
});

describe("fillCrossProviderModelInfo", () => {
	it("fills a bare model with catalog metadata", () => {
		const filled = fillCrossProviderModelInfo(
			{ id: "gpt-5.6-sol", name: "gpt-5.6-sol" },
			"gpt-5.6-sol",
		);
		expect(filled?.contextWindow).toBe(1_050_000);
		expect(filled?.maxInputTokens).toBeGreaterThan(0);
	});

	it("never overrides values the user or provider already declared", () => {
		const filled = fillCrossProviderModelInfo(
			{ id: "gpt-5.6-sol", name: "gpt-5.6-sol", contextWindow: 128_000 },
			"gpt-5.6-sol",
		);
		expect(filled?.contextWindow).toBe(128_000);
		// Missing fields are still filled.
		expect(filled?.maxInputTokens).toBeGreaterThan(0);
	});

	it("leaves unknown models untouched (no fabrication)", () => {
		const base = { id: "mystery-model", name: "mystery-model" };
		expect(fillCrossProviderModelInfo(base, "mystery-model")).toEqual(base);
		expect(fillCrossProviderModelInfo(undefined, "mystery-model")).toBeUndefined();
	});
});
