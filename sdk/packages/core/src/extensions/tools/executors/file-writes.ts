/**
 * Shared atomic file-write helpers for the file-writing executors (editor,
 * apply_patch).
 *
 * Both executors promise the same invariant: a failed or rejected write leaves
 * the target exactly as it was — "nothing was written" is a filesystem fact,
 * not just a message. Bytes only arrive through a sibling temp file + rename,
 * so the target either keeps its old content or gains all of the new content,
 * never a mixture.
 */

import { randomBytes } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Resolve where a write should land, together with the mode the result must keep.
 *
 * A temp-file + rename write would replace a symlink itself instead of its
 * target, so an existing file is realpathed first; the mode rides along so the
 * rename cannot drop what an in-place write used to preserve (e.g. the
 * executable bit on a script).
 */
export async function resolveWriteTarget(
	filePath: string,
): Promise<{ targetPath: string; mode: number | undefined }> {
	try {
		const targetPath = await fs.realpath(filePath);
		const stat = await fs.stat(targetPath);
		return { targetPath, mode: stat.mode & 0o7777 };
	} catch {
		return { targetPath: filePath, mode: undefined };
	}
}

/**
 * Write `data` through a sibling temp file, then rename it over `targetPath`.
 *
 * The rename is atomic, so the target either keeps its previous contents or
 * gains all of the new ones — a failed or interrupted write can never leave a
 * half-written file behind, which is the invariant the tools promise
 * ("nothing was written"). On failure the temp file is removed and the
 * original error propagates; nothing partial survives anywhere.
 */
export async function writeFileAtomic(
	targetPath: string,
	data: string,
	encoding: BufferEncoding,
	mode: number | undefined,
): Promise<void> {
	const tempPath = `${targetPath}.${process.pid}.${randomBytes(6).toString(
		"hex",
	)}.icline-tmp`;
	try {
		await fs.writeFile(tempPath, data, { encoding });
		if (mode !== undefined) {
			await fs.chmod(tempPath, mode);
		}
		await fs.rename(tempPath, targetPath);
	} catch (error) {
		await fs.rm(tempPath, { force: true }).catch(() => {});
		throw error;
	}
}

/**
 * Atomic-write `data` at `filePath`: mkdir for creates is the caller's job
 * (it knows whether the write is a create), the target resolution (symlink +
 * mode) and the temp + rename protocol are shared here.
 */
export async function writeFileToDisk(
	filePath: string,
	data: string,
	encoding: BufferEncoding,
): Promise<void> {
	const { targetPath, mode } = await resolveWriteTarget(filePath);
	await writeFileAtomic(targetPath, data, encoding, mode);
}

/** The temp-file suffix every atomic write uses; tests assert none is left behind. */
export const TEMP_FILE_MARKER = ".icline-tmp";

/** Re-exported so executors can place temp files next to their targets. */
export { path };
