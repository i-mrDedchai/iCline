import { describe, expect, it } from "vitest";
import {
	CHARS_PER_TOKEN,
	estimateRequestInputTokens,
	estimateTokens,
	estimateValueTokens,
	IMAGE_TOKEN_ESTIMATE,
} from "./tokens";

const PNG_BASE64 = `iVBORw0KGgoAAAANSUhEUg${"A".repeat(900_000)}`;

describe("estimateTokens", () => {
	it("keeps the chars-per-token rule for text", () => {
		expect(estimateTokens(CHARS_PER_TOKEN * 10)).toBe(10);
		expect(estimateTokens(1)).toBe(1);
	});
});

describe("estimateValueTokens", () => {
	it("charges an image payload per image, not per base64 character", () => {
		const tokens = estimateValueTokens([
			{ type: "text", text: "Successfully read image" },
			{ type: "image", data: PNG_BASE64, mediaType: "image/png" },
		]);

		// The 900k-character payload alone would be ~300k tokens under the
		// chars-based rule, which is what tripped the compaction trigger.
		expect(tokens).toBeLessThan(5_000);
		expect(tokens).toBeGreaterThanOrEqual(IMAGE_TOKEN_ESTIMATE);
	});

	it("charges each image of a multi-image message", () => {
		const twoImages = estimateValueTokens([
			{ type: "image", data: PNG_BASE64 },
			{ type: "image", data: PNG_BASE64 },
		]);
		expect(twoImages).toBeGreaterThanOrEqual(IMAGE_TOKEN_ESTIMATE * 2);
		expect(twoImages).toBeLessThan(IMAGE_TOKEN_ESTIMATE * 2 + 2_000);
	});

	it("collapses a bare data URL wherever it appears", () => {
		const tokens = estimateValueTokens({
			url: `data:image/png;base64,${"B".repeat(600_000)}`,
		});
		expect(tokens).toBeLessThan(5_000);
	});

	it("collapses the anthropic-style nested image source", () => {
		const tokens = estimateValueTokens({
			type: "image",
			source: { type: "base64", media_type: "image/png", data: PNG_BASE64 },
		});
		expect(tokens).toBeLessThan(5_000);
		expect(tokens).toBeGreaterThanOrEqual(IMAGE_TOKEN_ESTIMATE);
	});

	it("collapses the openai-style image url block", () => {
		const tokens = estimateValueTokens({
			type: "image_url",
			image_url: { url: `data:image/png;base64,${"C".repeat(400_000)}` },
		});
		expect(tokens).toBeLessThan(5_000);
	});

	it("keeps short payloads at their real text cost", () => {
		const value = {
			type: "image",
			data: "iVBORw0KGgo=",
			mediaType: "image/png",
		};
		expect(estimateValueTokens(value)).toBe(
			estimateTokens(JSON.stringify(value).length),
		);
	});

	it("does not treat ordinary long text as an image", () => {
		const text = { content: "x".repeat(600_000) };
		expect(estimateValueTokens(text)).toBe(
			estimateTokens(JSON.stringify(text).length),
		);
	});
});

describe("estimateRequestInputTokens", () => {
	it("barely grows when a screenshot is added to the request", () => {
		const textMessage = {
			role: "user",
			content: [{ type: "text", text: "y".repeat(30_000) }],
		};
		const withoutImage = estimateRequestInputTokens({
			messages: [textMessage],
		});
		const withImage = estimateRequestInputTokens({
			messages: [
				textMessage,
				{
					role: "user",
					content: [
						{
							type: "tool_result",
							content: [{ type: "image", data: PNG_BASE64 }],
						},
					],
				},
			],
		});

		expect(withImage - withoutImage).toBeLessThan(IMAGE_TOKEN_ESTIMATE + 1_000);
	});

	it("still counts system prompt, tools, and text messages", () => {
		const tokens = estimateRequestInputTokens({
			systemPrompt: "s".repeat(3_000),
			messages: [{ role: "user", content: "hello" }],
			tools: [{ name: "read_files", description: "d".repeat(3_000) }],
		});
		expect(tokens).toBeGreaterThan(2_000);
	});
});
