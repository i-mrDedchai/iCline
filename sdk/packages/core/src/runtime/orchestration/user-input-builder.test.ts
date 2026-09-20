import { describe, expect, it } from "vitest";
import { decodePng, encodePng, MAX_IMAGE_LONG_EDGE } from "../../media/png";
import { buildInitialUserContent } from "./user-input-builder";

/** A pasted screenshot: 2200x1400, above the provider's useful resolution. */
function screenshotDataUrl(width = 2200, height = 1400): string {
	const data = new Uint8Array(width * height * 4);
	for (let i = 0; i < width * height; i++) {
		data[i * 4] = (i * 29) % 251;
		data[i * 4 + 1] = (i * 61) % 241;
		data[i * 4 + 2] = (i * 97) % 239;
		data[i * 4 + 3] = 255;
	}
	return `data:image/png;base64,${Buffer.from(
		encodePng({ width, height, data }),
	).toString("base64")}`;
}

describe("buildInitialUserContent", () => {
	it("returns the bare message when there is nothing attached", async () => {
		await expect(buildInitialUserContent("hello")).resolves.toBe("hello");
	});

	it("downscales a pasted screenshot before it enters the conversation", async () => {
		const dataUrl = screenshotDataUrl();
		const content = await buildInitialUserContent("look at this", [dataUrl]);

		expect(Array.isArray(content)).toBe(true);
		const blocks = content as Array<{
			type: string;
			text?: string;
			data?: string;
			mediaType?: string;
		}>;
		expect(blocks[0]).toEqual({ type: "text", text: "look at this" });

		const image = blocks.find((block) => block.type === "image");
		expect(image?.mediaType).toBe("image/png");
		const decoded = decodePng(
			new Uint8Array(Buffer.from(image?.data ?? "", "base64")),
		);
		expect(decoded?.width).toBe(MAX_IMAGE_LONG_EDGE);
		expect(decoded?.height).toBe(
			Math.round((1400 * MAX_IMAGE_LONG_EDGE) / 2200),
		);
		expect(image?.data?.length).toBeLessThan(dataUrl.length);
	});

	it("keeps an already-small screenshot byte-identical", async () => {
		const data = new Uint8Array(40 * 30 * 4).fill(200);
		const base64 = Buffer.from(
			encodePng({ width: 40, height: 30, data }),
		).toString("base64");
		const content = await buildInitialUserContent("tiny", [
			`data:image/png;base64,${base64}`,
		]);

		const blocks = content as Array<{ type: string; data?: string }>;
		const image = blocks.find((block) => block.type === "image");
		expect(image?.data).toBe(base64);
	});

	it("leaves non-PNG attachments alone", async () => {
		// JPEG has no codec here, so it must reach the provider untouched.
		const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString(
			"base64",
		);
		const content = await buildInitialUserContent("photo", [
			`data:image/jpeg;base64,${jpeg}`,
		]);

		const blocks = content as Array<{
			type: string;
			data?: string;
			mediaType?: string;
		}>;
		const image = blocks.find((block) => block.type === "image");
		expect(image).toMatchObject({ mediaType: "image/jpeg", data: jpeg });
	});

	it("still loads text files alongside an image", async () => {
		const content = await buildInitialUserContent(
			"context",
			undefined,
			["/tmp/notes.md"],
			async () => "notes body",
		);

		const blocks = content as Array<{ type: string; path?: string }>;
		expect(blocks.find((block) => block.type === "file")).toMatchObject({
			type: "file",
			path: "/tmp/notes.md",
			content: "notes body",
		});
	});
});
