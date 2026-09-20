/**
 * Minimal PNG codec + downscaler (no third-party image dependency).
 *
 * Why this exists (dev.6-fix.23): an agent that inspects its own screenshots reads
 * `.png` files through `read_files`, and that tool inlines the file as base64 into
 * the conversation — where it then stays for the rest of the session, re-sent with
 * every request. In the dev.6-fix.21 smoke chat four screenshot reads held 3.96 MB
 * of a 5.26 MB transcript, which is what made the session crawl.
 *
 * Those bytes are almost entirely wasted: providers downscale images before the
 * model ever sees them (Anthropic caps the longest edge at 1568px, OpenAI-compatible
 * providers scale to ~2048px and cap image tokens), so pixels beyond that reach no
 * one. Re-encoding to that ceiling typically cuts a Retina screenshot by ~10x while
 * showing the model exactly the same picture.
 *
 * Scope, deliberately narrow — anything outside it passes through untouched:
 *   - PNG only (the screenshot case). JPEG/GIF/WEBP have no codec here, so callers
 *     keep their bytes; an animated GIF must never be re-encoded anyway.
 *   - 8-bit, non-interlaced, colour types 0/2/3/4/6. Anything else ⇒ unchanged.
 *   - A decode that fails for any reason ⇒ unchanged. A codec bug must degrade to
 *     "sent at full size", never to a corrupt or missing image.
 *
 * `node:zlib` supplies inflate/deflate; the PNG container, filters, box filter and
 * CRC32 are implemented here.
 */

import { deflateSync, inflateSync } from "node:zlib";

/**
 * Longest-edge ceiling applied before an image enters the conversation.
 *
 * Matches Anthropic's own image downscale ceiling, so an image that arrives larger
 * than this is one the provider would have shrunk anyway — the model loses nothing.
 * OpenAI-compatible endpoints scale to ~2048px, so this stays conservative for them.
 */
export const MAX_IMAGE_LONG_EDGE = 1568;

/** Guard against hostile/corrupt headers: 40 MP is beyond any real screenshot. */
const MAX_DECODED_PIXELS = 40_000_000;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

/** Channels per pixel for each supported PNG colour type. */
const CHANNELS_BY_COLOR_TYPE: Record<number, number> = {
	0: 1, // greyscale
	2: 3, // truecolour
	3: 1, // indexed
	4: 2, // greyscale + alpha
	6: 4, // truecolour + alpha
};

export interface RgbaImage {
	width: number;
	height: number;
	/** RGBA, 4 bytes per pixel, row-major, no padding. */
	data: Uint8Array;
}

export interface PngHeader {
	width: number;
	height: number;
	bitDepth: number;
	colorType: number;
	interlace: number;
}

function readUint32(bytes: Uint8Array, offset: number): number {
	return (
		((bytes[offset] << 24) |
			(bytes[offset + 1] << 16) |
			(bytes[offset + 2] << 8) |
			bytes[offset + 3]) >>>
		0
	);
}

function isPng(bytes: Uint8Array): boolean {
	if (bytes.length < 8) {
		return false;
	}
	return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/** Read IHDR without inflating or touching pixel data. */
export function readPngHeader(bytes: Uint8Array): PngHeader | undefined {
	if (!isPng(bytes) || bytes.length < 33) {
		return undefined;
	}
	const chunkLength = readUint32(bytes, 8);
	const chunkType = String.fromCharCode(
		bytes[12],
		bytes[13],
		bytes[14],
		bytes[15],
	);
	if (chunkType !== "IHDR" || chunkLength < 13) {
		return undefined;
	}
	return {
		width: readUint32(bytes, 16),
		height: readUint32(bytes, 20),
		bitDepth: bytes[24],
		colorType: bytes[25],
		interlace: bytes[28],
	};
}

function concat(parts: Uint8Array[]): Uint8Array {
	if (parts.length === 1) {
		return parts[0];
	}
	let total = 0;
	for (const part of parts) {
		total += part.length;
	}
	const merged = new Uint8Array(total);
	let offset = 0;
	for (const part of parts) {
		merged.set(part, offset);
		offset += part.length;
	}
	return merged;
}

function paethPredictor(a: number, b: number, c: number): number {
	const p = a + b - c;
	const pa = Math.abs(p - a);
	const pb = Math.abs(p - b);
	const pc = Math.abs(p - c);
	if (pa <= pb && pa <= pc) {
		return a;
	}
	return pb <= pc ? b : c;
}

/**
 * Reverse the per-row PNG filters into a flat `height * rowBytes` buffer.
 * Returns undefined for an unknown filter byte or a truncated stream.
 */
function unfilterPng(
	raw: Uint8Array,
	height: number,
	rowBytes: number,
	bytesPerPixel: number,
): Uint8Array | undefined {
	const out = new Uint8Array(height * rowBytes);
	for (let y = 0; y < height; y++) {
		const rowStart = y * (rowBytes + 1);
		if (rowStart >= raw.length) {
			return undefined;
		}
		const filter = raw[rowStart];
		const source = raw.subarray(rowStart + 1, rowStart + 1 + rowBytes);
		if (source.length < rowBytes) {
			return undefined;
		}
		const rowOffset = y * rowBytes;
		const priorOffset = rowOffset - rowBytes;
		for (let i = 0; i < rowBytes; i++) {
			const left = i >= bytesPerPixel ? out[rowOffset + i - bytesPerPixel] : 0;
			const up = y > 0 ? out[priorOffset + i] : 0;
			const upLeft =
				y > 0 && i >= bytesPerPixel ? out[priorOffset + i - bytesPerPixel] : 0;
			const value = source[i];
			let reconstructed: number;
			switch (filter) {
				case 0:
					reconstructed = value;
					break;
				case 1:
					reconstructed = value + left;
					break;
				case 2:
					reconstructed = value + up;
					break;
				case 3:
					reconstructed = value + ((left + up) >> 1);
					break;
				case 4:
					reconstructed = value + paethPredictor(left, up, upLeft);
					break;
				default:
					return undefined;
			}
			out[rowOffset + i] = reconstructed & 0xff;
		}
	}
	return out;
}

function toRgba(
	rows: Uint8Array,
	header: PngHeader,
	palette: Uint8Array | undefined,
	transparency: Uint8Array | undefined,
): RgbaImage | undefined {
	const { width, height, colorType } = header;
	const pixels = width * height;
	const rgba = new Uint8Array(pixels * 4);

	if (colorType === 3) {
		if (!palette || palette.length < 3) {
			return undefined;
		}
		for (let i = 0; i < pixels; i++) {
			const index = rows[i];
			const paletteOffset = index * 3;
			if (paletteOffset + 2 >= palette.length) {
				return undefined;
			}
			rgba[i * 4] = palette[paletteOffset];
			rgba[i * 4 + 1] = palette[paletteOffset + 1];
			rgba[i * 4 + 2] = palette[paletteOffset + 2];
			rgba[i * 4 + 3] =
				transparency && index < transparency.length ? transparency[index] : 255;
		}
		return { width, height, data: rgba };
	}

	const channels = CHANNELS_BY_COLOR_TYPE[colorType];
	if (channels === undefined) {
		return undefined;
	}
	if (rows.length < pixels * channels) {
		return undefined;
	}

	for (let i = 0; i < pixels; i++) {
		const source = i * channels;
		const target = i * 4;
		switch (colorType) {
			case 0:
				rgba[target] = rows[source];
				rgba[target + 1] = rows[source];
				rgba[target + 2] = rows[source];
				rgba[target + 3] = 255;
				break;
			case 2:
				rgba[target] = rows[source];
				rgba[target + 1] = rows[source + 1];
				rgba[target + 2] = rows[source + 2];
				rgba[target + 3] = 255;
				break;
			case 4:
				rgba[target] = rows[source];
				rgba[target + 1] = rows[source];
				rgba[target + 2] = rows[source];
				rgba[target + 3] = rows[source + 1];
				break;
			default:
				rgba[target] = rows[source];
				rgba[target + 1] = rows[source + 1];
				rgba[target + 2] = rows[source + 2];
				rgba[target + 3] = rows[source + 3];
				break;
		}
	}
	return { width, height, data: rgba };
}

/**
 * Decode a PNG to RGBA. Returns undefined for anything this module does not
 * handle (16-bit, sub-byte palettes, interlaced, unknown filters, truncation) —
 * callers treat undefined as "use the original bytes".
 */
export function decodePng(bytes: Uint8Array): RgbaImage | undefined {
	const header = readPngHeader(bytes);
	if (!header) {
		return undefined;
	}
	const { width, height, bitDepth, colorType, interlace } = header;
	if (
		interlace !== 0 ||
		bitDepth !== 8 ||
		width <= 0 ||
		height <= 0 ||
		width * height > MAX_DECODED_PIXELS ||
		CHANNELS_BY_COLOR_TYPE[colorType] === undefined
	) {
		return undefined;
	}

	const idatParts: Uint8Array[] = [];
	let palette: Uint8Array | undefined;
	let transparency: Uint8Array | undefined;

	let offset = 8;
	while (offset + 8 <= bytes.length) {
		const chunkLength = readUint32(bytes, offset);
		const chunkType = String.fromCharCode(
			bytes[offset + 4],
			bytes[offset + 5],
			bytes[offset + 6],
			bytes[offset + 7],
		);
		const dataStart = offset + 8;
		const dataEnd = dataStart + chunkLength;
		if (dataEnd + 4 > bytes.length) {
			return undefined; // truncated chunk
		}
		if (chunkType === "IDAT") {
			idatParts.push(bytes.subarray(dataStart, dataEnd));
		} else if (chunkType === "PLTE") {
			palette = bytes.subarray(dataStart, dataEnd);
		} else if (chunkType === "tRNS") {
			transparency = bytes.subarray(dataStart, dataEnd);
		} else if (chunkType === "IEND") {
			break;
		}
		offset = dataEnd + 4;
	}
	if (idatParts.length === 0) {
		return undefined;
	}

	let raw: Uint8Array;
	try {
		raw = new Uint8Array(inflateSync(concat(idatParts)));
	} catch {
		return undefined;
	}

	const channels = CHANNELS_BY_COLOR_TYPE[colorType];
	const rowBytes = width * channels;
	if (raw.length < (rowBytes + 1) * height) {
		return undefined;
	}
	const rows = unfilterPng(raw, height, rowBytes, channels);
	if (!rows) {
		return undefined;
	}
	return toRgba(rows, header, palette, transparency);
}

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[n] = c >>> 0;
	}
	return table;
})();

function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (let i = 0; i < bytes.length; i++) {
		crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function writeUint32(target: Uint8Array, offset: number, value: number): void {
	target[offset] = (value >>> 24) & 0xff;
	target[offset + 1] = (value >>> 16) & 0xff;
	target[offset + 2] = (value >>> 8) & 0xff;
	target[offset + 3] = value & 0xff;
}

/** Build one PNG chunk: length, type, data, CRC over type+data. */
function makeChunk(type: string, data: Uint8Array): Uint8Array {
	const chunk = new Uint8Array(12 + data.length);
	writeUint32(chunk, 0, data.length);
	for (let i = 0; i < 4; i++) {
		chunk[4 + i] = type.charCodeAt(i);
	}
	chunk.set(data, 8);
	const crcInput = chunk.subarray(4, 8 + data.length);
	writeUint32(chunk, 8 + data.length, crc32(crcInput));
	return chunk;
}

/**
 * Encode RGBA as an 8-bit truecolour-with-alpha PNG. Every row uses filter 0
 * (none): deflate already handles the redundancy that matters for screenshots,
 * and a filter-free encoder cannot corrupt pixels through filter math.
 *
 * Deflate level 3, not the default 6: measured on a 1568x1019 noisy re-encode,
 * level 6 costs ~5x the CPU for under 10% fewer bytes, and this runs inline in a
 * tool call. The size win here comes from dropping pixels, not from squeezing
 * them — level 3 still lands ~10x below the original screenshot.
 */
export function encodePng(image: RgbaImage): Uint8Array {
	const { width, height, data } = image;
	const ihdr = new Uint8Array(13);
	writeUint32(ihdr, 0, width);
	writeUint32(ihdr, 4, height);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // colour type: RGBA
	ihdr[10] = 0; // compression: deflate
	ihdr[11] = 0; // filter method
	ihdr[12] = 0; // no interlace

	const rowBytes = width * 4;
	const rawRows = new Uint8Array((rowBytes + 1) * height);
	for (let y = 0; y < height; y++) {
		const target = y * (rowBytes + 1);
		rawRows[target] = 0; // filter: none
		rawRows.set(data.subarray(y * rowBytes, (y + 1) * rowBytes), target + 1);
	}

	return concat([
		Uint8Array.from(PNG_SIGNATURE),
		makeChunk("IHDR", ihdr),
		makeChunk("IDAT", new Uint8Array(deflateSync(rawRows, { level: 3 }))),
		makeChunk("IEND", new Uint8Array(0)),
	]);
}

/**
 * Box-filter downscale to exactly `targetWidth` x `targetHeight`.
 *
 * Averaging runs on premultiplied alpha so transparent pixels cannot bleed their
 * (meaningless) colour into a neighbour — the artefact you see as dark halos when
 * a screenshot with rounded corners or a drop shadow is naively averaged.
 */
export function downscaleRgba(
	image: RgbaImage,
	targetWidth: number,
	targetHeight: number,
): RgbaImage {
	const out = new Uint8Array(targetWidth * targetHeight * 4);
	const scaleX = image.width / targetWidth;
	const scaleY = image.height / targetHeight;

	for (let y = 0; y < targetHeight; y++) {
		const startY = Math.floor(y * scaleY);
		const endY = Math.max(
			startY + 1,
			Math.min(image.height, Math.ceil((y + 1) * scaleY)),
		);
		for (let x = 0; x < targetWidth; x++) {
			const startX = Math.floor(x * scaleX);
			const endX = Math.max(
				startX + 1,
				Math.min(image.width, Math.ceil((x + 1) * scaleX)),
			);

			let r = 0;
			let g = 0;
			let b = 0;
			let a = 0;
			let samples = 0;
			for (let sy = startY; sy < endY; sy++) {
				const rowOffset = sy * image.width * 4;
				for (let sx = startX; sx < endX; sx++) {
					const source = rowOffset + sx * 4;
					const alpha = image.data[source + 3];
					const weight = alpha / 255;
					r += image.data[source] * weight;
					g += image.data[source + 1] * weight;
					b += image.data[source + 2] * weight;
					a += alpha;
					samples++;
				}
			}

			const target = (y * targetWidth + x) * 4;
			const averageAlpha = a / samples;
			if (averageAlpha <= 0) {
				out[target] = 0;
				out[target + 1] = 0;
				out[target + 2] = 0;
				out[target + 3] = 0;
				continue;
			}
			const alphaSum = a / 255;
			out[target] = Math.round(r / alphaSum);
			out[target + 1] = Math.round(g / alphaSum);
			out[target + 2] = Math.round(b / alphaSum);
			out[target + 3] = Math.round(averageAlpha);
		}
	}

	return { width: targetWidth, height: targetHeight, data: out };
}

export interface ImageDownscaleResult {
	/** Bytes the caller should send. Identical to the input when nothing changed. */
	bytes: Uint8Array;
	/** Resulting media type (`image/png` either way — the codec only emits PNG). */
	mediaType: string;
	changed: boolean;
	sourceWidth?: number;
	sourceHeight?: number;
	width?: number;
	height?: number;
	/** Human-readable size change, for the tool-result text. */
	note?: string;
}

/**
 * Downscale a PNG so its longest edge fits `maxLongEdge`.
 *
 * Returns the input unchanged (with `changed: false`) whenever that is the right
 * answer: not a PNG, already small enough, a format this codec does not handle, a
 * corrupt file, or — checked explicitly — a re-encode that came out no smaller
 * (common for flat-colour palette PNGs, where RGBA output can grow).
 */
export function downscalePngIfNeeded(
	bytes: Uint8Array,
	options: { maxLongEdge?: number } = {},
): ImageDownscaleResult {
	const maxLongEdge = options.maxLongEdge ?? MAX_IMAGE_LONG_EDGE;
	const unchanged: ImageDownscaleResult = {
		bytes,
		mediaType: "image/png",
		changed: false,
	};

	const header = readPngHeader(bytes);
	if (!header) {
		return unchanged;
	}
	unchanged.sourceWidth = header.width;
	unchanged.sourceHeight = header.height;

	const longEdge = Math.max(header.width, header.height);
	if (longEdge <= maxLongEdge) {
		return unchanged;
	}

	const decoded = decodePng(bytes);
	if (!decoded) {
		return unchanged;
	}

	const scale = maxLongEdge / longEdge;
	const targetWidth = Math.max(1, Math.round(header.width * scale));
	const targetHeight = Math.max(1, Math.round(header.height * scale));
	const resized = downscaleRgba(decoded, targetWidth, targetHeight);
	const encoded = encodePng(resized);
	if (encoded.length >= bytes.length) {
		return unchanged;
	}

	return {
		bytes: encoded,
		mediaType: "image/png",
		changed: true,
		sourceWidth: header.width,
		sourceHeight: header.height,
		width: targetWidth,
		height: targetHeight,
		note: `${header.width}x${header.height} → ${targetWidth}x${targetHeight}, ${formatBytes(bytes.length)} → ${formatBytes(encoded.length)}`,
	};
}

function formatBytes(size: number): string {
	if (size < 1024) {
		return `${size} B`;
	}
	if (size < 1024 * 1024) {
		return `${Math.round(size / 1024)} KB`;
	}
	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Downscale a base64 PNG payload (the shape every image travels in once it is in a
 * message: user attachments and tool results alike). Non-PNG payloads, unparseable
 * base64 and anything the codec cannot handle come back untouched.
 */
export function downscaleBase64Png(
	base64: string,
	options: { maxLongEdge?: number } = {},
): { data: string; changed: boolean; note?: string } {
	let bytes: Uint8Array;
	try {
		bytes = new Uint8Array(Buffer.from(base64, "base64"));
	} catch {
		return { data: base64, changed: false };
	}
	const result = downscalePngIfNeeded(bytes, options);
	if (!result.changed) {
		return { data: base64, changed: false };
	}
	return {
		data: Buffer.from(result.bytes).toString("base64"),
		changed: true,
		note: result.note,
	};
}
