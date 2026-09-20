import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
	decodePng,
	downscalePngIfNeeded,
	downscaleRgba,
	encodePng,
	MAX_IMAGE_LONG_EDGE,
	type RgbaImage,
	readPngHeader,
} from "./png";

/** Minimal PNG writer used by the tests so fixtures do not depend on our encoder. */
function chunk(type: string, data: Uint8Array): Uint8Array {
	const out = new Uint8Array(12 + data.length);
	const length = data.length;
	out[0] = (length >>> 24) & 0xff;
	out[1] = (length >>> 16) & 0xff;
	out[2] = (length >>> 8) & 0xff;
	out[3] = length & 0xff;
	for (let i = 0; i < 4; i++) {
		out[4 + i] = type.charCodeAt(i);
	}
	out.set(data, 8);
	// CRC is not verified by the decoder, which is the point: these fixtures exist
	// to exercise pixel reconstruction, not chunk integrity.
	return out;
}

function crc32ForWrite(): Uint8Array {
	return new Uint8Array(4);
}

function buildPng(options: {
	width: number;
	height: number;
	colorType: number;
	bitDepth?: number;
	rows: number[][];
	/** Per-row filter byte to apply (0-4); defaults to all-zero. */
	filters?: number[];
	palette?: number[][];
	transparency?: number[];
}): Uint8Array {
	const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
	const channels = CHANNELS[options.colorType];
	const rowBytes = options.width * channels;
	const filters =
		options.filters ?? new Array(options.height).fill(0).map(() => 0 as number);

	// Apply the PNG filters exactly as the encoder side of the spec defines them.
	const raw = new Uint8Array((rowBytes + 1) * options.height);
	const priorRow = new Uint8Array(rowBytes);
	for (let y = 0; y < options.height; y++) {
		const filter = filters[y];
		const source = Uint8Array.from(options.rows[y]);
		raw[y * (rowBytes + 1)] = filter;
		for (let i = 0; i < rowBytes; i++) {
			const left = i >= channels ? source[i - channels] : 0;
			const up = priorRow[i];
			const upLeft = i >= channels ? priorRow[i - channels] : 0;
			let delta: number;
			switch (filter) {
				case 0:
					delta = source[i];
					break;
				case 1:
					delta = source[i] - left;
					break;
				case 2:
					delta = source[i] - up;
					break;
				case 3:
					delta = source[i] - ((left + up) >> 1);
					break;
				case 4: {
					const p = left + up - upLeft;
					const pa = Math.abs(p - left);
					const pb = Math.abs(p - up);
					const pc = Math.abs(p - upLeft);
					const predictor =
						pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
					delta = source[i] - predictor;
					break;
				}
				default:
					throw new Error(`unsupported filter ${filter}`);
			}
			raw[y * (rowBytes + 1) + 1 + i] = delta & 0xff;
		}
		priorRow.set(source);
	}

	const ihdr = new Uint8Array(13);
	const write32 = (target: Uint8Array, offset: number, value: number) => {
		target[offset] = (value >>> 24) & 0xff;
		target[offset + 1] = (value >>> 16) & 0xff;
		target[offset + 2] = (value >>> 8) & 0xff;
		target[offset + 3] = value & 0xff;
	};
	write32(ihdr, 0, options.width);
	write32(ihdr, 4, options.height);
	ihdr[8] = options.bitDepth ?? 8;
	ihdr[9] = options.colorType;
	ihdr[10] = 0;
	ihdr[11] = 0;
	ihdr[12] = 0;

	const parts: Uint8Array[] = [
		Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk("IHDR", ihdr),
	];
	if (options.palette) {
		parts.push(chunk("PLTE", Uint8Array.from(options.palette.flat())));
	}
	if (options.transparency) {
		parts.push(chunk("tRNS", Uint8Array.from(options.transparency)));
	}
	// Split the compressed stream across two IDAT chunks to exercise concatenation.
	const compressed = new Uint8Array(deflateSync(raw));
	const midpoint = Math.floor(compressed.length / 2);
	parts.push(chunk("IDAT", compressed.subarray(0, midpoint)));
	parts.push(chunk("IDAT", compressed.subarray(midpoint)));
	parts.push(chunk("IEND", crc32ForWrite()));

	const total = parts.reduce((sum, part) => sum + part.length, 0);
	const out = new Uint8Array(total);
	let offset = 0;
	for (const part of parts) {
		out.set(part, offset);
		offset += part.length;
	}
	return out;
}

function rgbaPixels(image: RgbaImage): number[][] {
	const pixels: number[][] = [];
	for (let i = 0; i < image.width * image.height; i++) {
		pixels.push(Array.from(image.data.subarray(i * 4, i * 4 + 4)));
	}
	return pixels;
}

describe("PNG codec", () => {
	it("round-trips RGBA pixels through encode/decode", () => {
		const image: RgbaImage = {
			width: 3,
			height: 2,
			data: Uint8Array.from([
				255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 10, 20, 30, 255, 40, 50,
				60, 255, 70, 80, 90, 255,
			]),
		};

		const decoded = decodePng(encodePng(image));
		expect(decoded).toBeDefined();
		expect(decoded?.width).toBe(3);
		expect(decoded?.height).toBe(2);
		expect(rgbaPixels(decoded as RgbaImage)).toEqual(rgbaPixels(image));
	});

	it("reconstructs every filter type", () => {
		for (const filter of [0, 1, 2, 3, 4]) {
			const rows = [
				[1, 2, 3, 4, 5, 6],
				[7, 8, 9, 200, 201, 202],
				[11, 12, 13, 14, 15, 16],
			];
			const png = buildPng({
				width: 2,
				height: 3,
				colorType: 2,
				rows,
				filters: [filter, filter, filter],
			});
			const decoded = decodePng(png);
			expect(decoded, `filter ${filter}`).toBeDefined();
			const expected: number[][] = [];
			for (const row of rows) {
				for (let i = 0; i < row.length; i += 3) {
					expected.push([row[i], row[i + 1], row[i + 2], 255]);
				}
			}
			expect(rgbaPixels(decoded as RgbaImage), `filter ${filter}`).toEqual(
				expected,
			);
		}
	});

	it("expands greyscale and greyscale+alpha into RGBA", () => {
		const gray = buildPng({
			width: 2,
			height: 1,
			colorType: 0,
			rows: [[10, 200]],
		});
		expect(rgbaPixels(decodePng(gray) as RgbaImage)).toEqual([
			[10, 10, 10, 255],
			[200, 200, 200, 255],
		]);

		const grayAlpha = buildPng({
			width: 2,
			height: 1,
			colorType: 4,
			rows: [[50, 128, 60, 0]],
		});
		expect(rgbaPixels(decodePng(grayAlpha) as RgbaImage)).toEqual([
			[50, 50, 50, 128],
			[60, 60, 60, 0],
		]);
	});

	it("resolves indexed colour through PLTE and tRNS", () => {
		const png = buildPng({
			width: 3,
			height: 1,
			colorType: 3,
			rows: [[0, 1, 2]],
			palette: [
				[255, 0, 0],
				[0, 255, 0],
				[0, 0, 255],
			],
			transparency: [255, 128, 0],
		});

		expect(rgbaPixels(decodePng(png) as RgbaImage)).toEqual([
			[255, 0, 0, 255],
			[0, 255, 0, 128],
			[0, 0, 255, 0],
		]);
	});

	it("returns undefined for anything it does not support instead of guessing", () => {
		const interlacedish = buildPng({
			width: 1,
			height: 1,
			colorType: 2,
			rows: [[1, 2, 3]],
		});
		// Flip the interlace flag in IHDR (byte 28) to simulate Adam7.
		const interlaced = interlacedish.slice();
		interlaced[28] = 1;
		expect(decodePng(interlaced)).toBeUndefined();
		expect(
			decodePng(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8])),
		).toBeUndefined();
		expect(decodePng(new Uint8Array(0))).toBeUndefined();

		const truncated = interlacedish.slice(0, 30);
		expect(decodePng(truncated)).toBeUndefined();
	});

	it("reads the header without decoding pixels", () => {
		const png = buildPng({
			width: 7,
			height: 5,
			colorType: 2,
			rows: new Array(5).fill(new Array(21).fill(9)),
		});
		expect(readPngHeader(png)).toMatchObject({
			width: 7,
			height: 5,
			bitDepth: 8,
			colorType: 2,
			interlace: 0,
		});
	});
});

describe("downscaleRgba", () => {
	it("averages a box of pixels (opaque, premultiply-free case)", () => {
		// 2x2 checkerboard of black and white -> single mid-grey pixel.
		const image: RgbaImage = {
			width: 2,
			height: 2,
			data: Uint8Array.from([
				0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255,
			]),
		};
		const small = downscaleRgba(image, 1, 1);
		expect(Array.from(small.data)).toEqual([128, 128, 128, 255]);
	});

	it("weights colour by alpha so transparent pixels cannot darken a neighbour", () => {
		const image: RgbaImage = {
			width: 2,
			height: 1,
			data: Uint8Array.from([
				255,
				255,
				255,
				255,
				0,
				0,
				0,
				0, // opaque white next to fully transparent black
			]),
		};
		const small = downscaleRgba(image, 1, 1);
		// Colour stays white (the transparent pixel contributes no colour) while
		// alpha halves.
		expect(Array.from(small.data)).toEqual([255, 255, 255, 128]);
	});

	it("keeps fully transparent boxes transparent", () => {
		const image: RgbaImage = {
			width: 2,
			height: 1,
			data: Uint8Array.from([10, 20, 30, 0, 40, 50, 60, 0]),
		};
		expect(Array.from(downscaleRgba(image, 1, 1).data)).toEqual([0, 0, 0, 0]);
	});
});

describe("downscalePngIfNeeded", () => {
	/** Flat-colour PNG that is cheap to build at any size. */
	function screenshotLike(width: number, height: number): Uint8Array {
		const dat = new Uint8Array(width * height * 4);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const offset = (y * width + x) * 4;
				// A gradient plus a constant band: compresses like a real UI shot.
				dat[offset] = (x * 7) % 256;
				dat[offset + 1] = (y * 5) % 256;
				dat[offset + 2] = x < width / 2 ? 30 : 200;
				dat[offset + 3] = 255;
			}
		}
		return encodePng({ width, height, data: dat });
	}

	it("shrinks an oversized PNG to the longest-edge ceiling", () => {
		const big = screenshotLike(3024, 1964);
		expect(readPngHeader(big)?.width).toBe(3024);

		const result = downscalePngIfNeeded(big);
		expect(result.changed).toBe(true);
		expect(result.width).toBe(MAX_IMAGE_LONG_EDGE);
		expect(result.height).toBe(Math.round((1964 * MAX_IMAGE_LONG_EDGE) / 3024));
		expect(result.bytes.length).toBeLessThan(big.length);

		const decoded = decodePng(result.bytes);
		expect(decoded?.width).toBe(MAX_IMAGE_LONG_EDGE);
		expect(result.note).toContain("3024x1964 →");
	});

	it("leaves an image at or below the ceiling byte-identical", () => {
		const small = screenshotLike(400, 300);
		const result = downscalePngIfNeeded(small);
		expect(result.changed).toBe(false);
		expect(result.bytes).toBe(small);
		expect(result.sourceWidth).toBe(400);
	});

	it("honours a custom ceiling", () => {
		const result = downscalePngIfNeeded(screenshotLike(800, 400), {
			maxLongEdge: 200,
		});
		expect(result.changed).toBe(true);
		expect(result.width).toBe(200);
		expect(result.height).toBe(100);
	});

	it("passes non-PNG bytes through untouched", () => {
		const gif = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
		const result = downscalePngIfNeeded(gif);
		expect(result.changed).toBe(false);
		expect(result.bytes).toBe(gif);
	});

	it("passes an unsupported PNG variant through untouched", () => {
		const interlaced = screenshotLike(2000, 1000);
		interlaced[28] = 1; // interlace flag: nothing here can decode it
		const result = downscalePngIfNeeded(interlaced);
		expect(result.changed).toBe(false);
		expect(result.bytes).toBe(interlaced);
	});
});
