import { afterEach, describe, expect, it } from "vitest";
import {
	getModelOverridesForProvider,
	getModelsForProvider,
	getModelsForProviderSync,
	MODEL_COLLECTIONS_BY_PROVIDER_ID,
	registerModel,
	registerProvider,
	resetRegistry,
} from "./model-registry";

const PROVIDER_ID = "model-filter-test";

afterEach(() => {
	resetRegistry();
});

describe("getModelsForProvider", () => {
	it("filters the merged provider catalog through query options", async () => {
		registerProvider({
			provider: {
				id: PROVIDER_ID,
				name: "Model Filter Test",
				defaultModelId: "legacy",
				client: "custom",
				source: "system",
			},
			models: {
				legacy: { id: "legacy", name: "Legacy" },
				chat: {
					id: "chat",
					name: "Chat",
					operation: "language",
					modalities: { input: ["text"], output: ["text"] },
				},
				mixed: {
					id: "mixed",
					name: "Mixed",
					operation: "language",
					modalities: {
						input: ["text", "image"],
						output: ["text", "image"],
					},
				},
				image: {
					id: "image",
					name: "Image",
					operation: "image-generation",
					modalities: { input: ["text"], output: ["image"] },
				},
				transcription: {
					id: "transcription",
					name: "Transcription",
					operation: "transcription",
					modalities: { input: ["audio"], output: ["text"] },
				},
			},
		});
		registerModel(PROVIDER_ID, "speech", {
			id: "speech",
			name: "Speech",
			operation: "speech-generation",
			modalities: { input: ["text"], output: ["audio"] },
		});

		expect(Object.keys(await getModelsForProvider(PROVIDER_ID))).toEqual([
			"legacy",
			"chat",
			"mixed",
			"image",
			"transcription",
			"speech",
		]);
		expect(
			Object.keys(await getModelsForProvider(PROVIDER_ID, { filter: "chat" })),
		).toEqual(["legacy", "chat", "mixed"]);
	});

	it("sync accessor includes runtime-registered models the collection view misses", () => {
		registerProvider({
			provider: {
				id: PROVIDER_ID,
				name: "Model Filter Test",
				defaultModelId: "legacy",
				client: "custom",
				source: "system",
			},
			models: { legacy: { id: "legacy", name: "Legacy" } },
		});
		registerModel(PROVIDER_ID, "wide", {
			id: "wide",
			name: "Wide",
			contextWindow: 1_000_000,
		});

		// The bare collection view is not the merged catalog: models.json
		// entries registered via registerModel only surface through the
		// merged accessors, and consumers that skip them fabricate defaults
		// (e.g. a 128K context window for a 1M model).
		expect(
			MODEL_COLLECTIONS_BY_PROVIDER_ID[PROVIDER_ID]?.models["wide"],
		).toBeUndefined();
		expect(getModelsForProviderSync(PROVIDER_ID)["wide"]).toMatchObject({
			id: "wide",
			contextWindow: 1_000_000,
		});
		expect(getModelsForProviderSync(PROVIDER_ID)["legacy"]).toMatchObject({
			id: "legacy",
		});
	});

	it("exposes runtime model overrides without the bundled provider models", async () => {
		registerModel("anthropic", "custom-claude", {
			id: "custom-claude",
			name: "Custom Claude",
		});

		await expect(getModelOverridesForProvider("anthropic")).resolves.toEqual({
			"custom-claude": {
				id: "custom-claude",
				name: "Custom Claude",
			},
		});
	});
});
