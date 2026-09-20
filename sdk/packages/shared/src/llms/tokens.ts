/**
 * Conservative chars-per-token approximation used for compaction triggering
 * and request-size diagnostics. Uses 3 chars/token (slightly over-counts vs
 * the conventional 4) so trigger thresholds fire before provider rejection
 * rather than after.
 */

export const CHARS_PER_TOKEN = 3;

/**
 * Token cost charged for one image block. Vision providers bill an image by its
 * pixels (roughly 1-1.6k tokens for a normal screenshot), never by the size of
 * its base64 payload. A chars-based estimate would charge ~300k tokens for a
 * 900 KB PNG — enough for a single screenshot read to trip the compaction
 * trigger on a 1M-token model and start a compaction loop that never shrinks
 * anything (dev.6 fix.21 smoke).
 */
export const IMAGE_TOKEN_ESTIMATE = 1_600;

const IMAGE_BLOCK_TYPES = new Set([
	"image",
	"image_url",
	"input_image",
	"image_base64",
]);

const DATA_URL_IMAGE_PREFIX = "data:image/";

/**
 * Strings shorter than this are never treated as an image payload, so ordinary
 * short fields (media types, ids, base64 of a tiny icon) keep their real cost.
 */
const IMAGE_PAYLOAD_MIN_CHARS = 256;

const BASE64_PROBE_CHARS = 64;

function looksLikeBase64(value: string): boolean {
	return /^[A-Za-z0-9+/=\s]+$/.test(value.slice(0, BASE64_PROBE_CHARS));
}

interface CollapseResult {
	value: unknown;
	/** Images visible as images in this subtree. */
	images: number;
	/** Whether a payload was folded away here (a block counts itself once). */
	payloadFolded: boolean;
}

/**
 * Copy a value with every image payload replaced by a short placeholder so a
 * chars-based estimate no longer pays for base64, while counting the images so
 * they can be charged {@link IMAGE_TOKEN_ESTIMATE} each instead.
 *
 * Inside an image block nothing counts itself: the block charges one image no
 * matter how many payload aliases (data, url, source.data, b64_json) it carries.
 * A data URL outside an image block is an image on its own.
 */
function collapseImagePayloads(
	value: unknown,
	insideImageBlock: boolean,
	depth: number,
): CollapseResult {
	if (typeof value === "string") {
		if (value.length > IMAGE_PAYLOAD_MIN_CHARS) {
			const isDataUrl = value.startsWith(DATA_URL_IMAGE_PREFIX);
			if (isDataUrl || (insideImageBlock && looksLikeBase64(value))) {
				return {
					value: "[image]",
					images: insideImageBlock ? 0 : 1,
					payloadFolded: true,
				};
			}
		}
		return { value, images: 0, payloadFolded: false };
	}
	if (Array.isArray(value)) {
		let images = 0;
		let payloadFolded = false;
		const items = value.map((item) => {
			const collapsed = collapseImagePayloads(
				item,
				insideImageBlock,
				depth + 1,
			);
			images += collapsed.images;
			payloadFolded = payloadFolded || collapsed.payloadFolded;
			return collapsed.value;
		});
		return { value: items, images, payloadFolded };
	}
	if (value === null || typeof value !== "object") {
		return { value, images: 0, payloadFolded: false };
	}
	if (depth > 16) {
		// Pathological nesting: keep it, the caller's stringify will cope.
		return { value, images: 0, payloadFolded: false };
	}

	const record = value as Record<string, unknown>;
	const isImageBlock =
		typeof record.type === "string" && IMAGE_BLOCK_TYPES.has(record.type);
	const childInsideImage = insideImageBlock || isImageBlock;
	const collapsed: Record<string, unknown> = {};
	let images = 0;
	let payloadFolded = false;
	for (const [key, nested] of Object.entries(record)) {
		const result = collapseImagePayloads(nested, childInsideImage, depth + 1);
		collapsed[key] = result.value;
		images += result.images;
		payloadFolded = payloadFolded || result.payloadFolded;
	}
	if (isImageBlock) {
		// The block owns the charge: exactly one image for the whole block.
		return { value: collapsed, images: payloadFolded ? 1 : 0, payloadFolded };
	}
	return { value: collapsed, images, payloadFolded };
}

/**
 * Estimate any value's prompt cost, charging images a flat per-image cost
 * instead of the size of their base64 payload.
 */
export function estimateValueTokens(value: unknown): number {
	const collapsed = collapseImagePayloads(value, false, 0);
	const serialized = safeStringify(collapsed.value);
	return (
		estimateTokens(serialized.length) + collapsed.images * IMAGE_TOKEN_ESTIMATE
	);
}

export function estimateTokens(chars: number): number {
	return Math.max(1, Math.ceil(chars / CHARS_PER_TOKEN));
}

export interface TokenEstimatedRequest {
	systemPrompt?: string;
	messages: readonly unknown[];
	tools?: readonly unknown[];
}

function safeStringify(value: unknown): string {
	const seen = new WeakSet<object>();
	try {
		return (
			JSON.stringify(value, (_key, nestedValue: unknown) => {
				if (typeof nestedValue === "bigint") {
					return nestedValue.toString();
				}
				if (typeof nestedValue !== "object" || nestedValue === null) {
					return nestedValue;
				}
				if (seen.has(nestedValue)) {
					return "[Circular]";
				}
				seen.add(nestedValue);
				return nestedValue;
			}) ?? ""
		);
	} catch {
		return String(value ?? "");
	}
}

/**
 * Estimate the complete provider request payload so request execution and
 * pre-request policies use the same definition of input utilization.
 */
export function estimateRequestInputTokens(
	request: TokenEstimatedRequest,
): number {
	// Deliberately over-estimate slightly to leave room for provider formatting,
	// tool schema overhead, and tokenizer drift. Image payloads are charged per
	// image (see IMAGE_TOKEN_ESTIMATE), not per base64 character.
	return estimateValueTokens({
		systemPrompt: request.systemPrompt,
		messages: request.messages,
		tools: request.tools,
	});
}
