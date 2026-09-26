/**
 * Editor Executor
 *
 * Built-in implementation for filesystem editing operations.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { AgentToolContext } from "@cline/shared";
import { type EditFileInput, normalizeInsertLine } from "../schemas";
import type { EditorExecutor } from "../types";
import { writeFileToDisk } from "./file-writes";
import {
	detectLineEnding,
	normalizeLineEndings,
	normalizeNewFileLineEndings,
} from "./line-endings";

/**
 * Options for the editor executor
 */
export interface EditorExecutorOptions {
	/**
	 * File encoding used for read/write operations
	 * @default "utf-8"
	 */
	encoding?: BufferEncoding;

	/**
	 * Restrict relative-path file operations to paths inside cwd.
	 * Absolute paths are always accepted as-is.
	 * @default true
	 */
	restrictToCwd?: boolean;

	/**
	 * Maximum number of diff lines in str_replace output
	 * @default 200
	 */
	maxDiffLines?: number;
}

function resolveFilePath(
	cwd: string,
	inputPath: string,
	restrictToCwd: boolean,
): string {
	const isAbsoluteInput = path.isAbsolute(inputPath);
	const resolved = isAbsoluteInput
		? path.normalize(inputPath)
		: path.resolve(cwd, inputPath);
	if (!restrictToCwd) {
		return resolved;
	}

	// Absolute paths are accepted directly; cwd restriction applies to relative inputs.
	if (isAbsoluteInput) {
		return resolved;
	}

	const rel = path.relative(cwd, resolved);
	if (rel.startsWith("..") || path.isAbsolute(rel)) {
		throw new Error(`Path must stay within cwd: ${inputPath}`);
	}
	return resolved;
}

function countOccurrences(content: string, needle: string): number {
	if (needle.length === 0) return 0;
	return content.split(needle).length - 1;
}

interface ContentLine {
	/** Offset of the first character of the line. */
	start: number;
	/** Offset just past the line's text, excluding its EOL. */
	contentEnd: number;
	/** Offset just past the line's EOL (equals contentEnd on the last line). */
	end: number;
	/** Line text with its EOL stripped and trailing whitespace trimmed. */
	normalized: string;
}

function splitLinesWithSpans(content: string): ContentLine[] {
	const lines: ContentLine[] = [];
	let start = 0;
	while (start <= content.length) {
		let eol = content.indexOf("\n", start);
		const hasEol = eol !== -1;
		if (!hasEol) eol = content.length;
		const contentEnd =
			hasEol && eol > start && content[eol - 1] === "\r" ? eol - 1 : eol;
		const raw = content.slice(start, contentEnd);
		lines.push({
			start,
			contentEnd,
			end: hasEol ? eol + 1 : eol,
			normalized: raw.replace(/[\t ]+$/u, ""),
		});
		if (!hasEol) break;
		start = eol + 1;
	}
	return lines;
}

interface NormalizedMatch {
	count: number;
	start: number;
	end: number;
}

/**
 * Fallback matcher for old_text that drifted only in trailing whitespace or
 * EOF newlines (the tool trace shows whole-file rewrites failing with
 * oldTextChars/newTextChars within one character). Matches old_text as a
 * window of right-trimmed lines; the span covers the file's original bytes so
 * untouched text keeps its exact whitespace. Conservative: no match, or more
 * than one window, leaves the caller's error behavior unchanged.
 */
function findNormalizedLineMatch(
	content: string,
	oldStr: string,
): NormalizedMatch {
	const oldLinesRaw = oldStr.split(/\r\n|\n/);
	const oldEndsWithNewline =
		oldLinesRaw.length > 1 && oldLinesRaw[oldLinesRaw.length - 1] === "";
	if (oldEndsWithNewline) oldLinesRaw.pop();
	const oldLines = oldLinesRaw.map((line) => line.replace(/[\t ]+$/u, ""));
	if (oldLines.length === 0) return { count: 0, start: 0, end: 0 };

	const contentLines = splitLinesWithSpans(content);
	let count = 0;
	let start = 0;
	let end = 0;
	for (let i = 0; i + oldLines.length <= contentLines.length; i++) {
		let matches = true;
		for (let k = 0; k < oldLines.length; k++) {
			if (contentLines[i + k].normalized !== oldLines[k]) {
				matches = false;
				break;
			}
		}
		if (!matches) continue;
		count++;
		if (count === 1) {
			const last = contentLines[i + oldLines.length - 1];
			start = contentLines[i].start;
			end = oldEndsWithNewline ? last.end : last.contentEnd;
		}
	}
	return { count, start, end };
}

// Reads produced via readline strip "\r", so models emit LF-only text even
// for CRLF files; edits must be normalized to the file's own EOL (see
// ./line-endings) or they create mixed line endings and break subsequent
// exact-match replacements.

function createLineDiff(
	oldContent: string,
	newContent: string,
	maxLines: number,
): string {
	const oldLines = oldContent.split(/\r\n|\n/);
	const newLines = newContent.split(/\r\n|\n/);

	// Trim the common prefix and suffix so only the changed region is emitted;
	// a naive positional compare would mispair every line after an edit that
	// changes the line count.
	let start = 0;
	while (
		start < oldLines.length &&
		start < newLines.length &&
		oldLines[start] === newLines[start]
	) {
		start++;
	}
	let oldEnd = oldLines.length;
	let newEnd = newLines.length;
	while (
		oldEnd > start &&
		newEnd > start &&
		oldLines[oldEnd - 1] === newLines[newEnd - 1]
	) {
		oldEnd--;
		newEnd--;
	}

	// Split the line budget between removals and additions so neither side is
	// silently dropped when the other alone would exhaust maxLines.
	const removedCount = oldEnd - start;
	const addedCount = newEnd - start;
	let removedBudget = removedCount;
	let addedBudget = addedCount;
	if (removedCount + addedCount > maxLines) {
		removedBudget = Math.min(
			removedCount,
			Math.max(Math.ceil(maxLines / 2), maxLines - addedCount),
		);
		addedBudget = Math.min(addedCount, maxLines - removedBudget);
	}

	const out: string[] = ["```diff"];
	for (let i = start; i < start + removedBudget; i++) {
		out.push(`-${i + 1}: ${oldLines[i]}`);
	}
	for (let i = start; i < start + addedBudget; i++) {
		out.push(`+${i + 1}: ${newLines[i]}`);
	}

	const omittedRemoved = removedCount - removedBudget;
	const omittedAdded = addedCount - addedBudget;
	if (omittedRemoved > 0 || omittedAdded > 0) {
		out.push(
			`... diff truncated (${omittedRemoved} more removed, ${omittedAdded} more added lines) ...`,
		);
	}

	out.push("```");
	return out.join("\n");
}

async function createFile(
	filePath: string,
	fileText: string,
	encoding: BufferEncoding,
): Promise<string> {
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await writeFileToDisk(
		filePath,
		normalizeNewFileLineEndings(fileText),
		encoding,
	);
	return `File created successfully at: ${filePath}`;
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function replaceInFile(
	filePath: string,
	oldStr: string,
	newStr: string | null | undefined,
	encoding: BufferEncoding,
	maxDiffLines: number,
): Promise<string> {
	const content = await fs.readFile(filePath, encoding);
	const eol = detectLineEnding(content);
	const normalizedOldStr = normalizeLineEndings(oldStr, eol);
	const normalizedNewStr = normalizeLineEndings(newStr ?? "", eol);
	const occurrences = countOccurrences(content, normalizedOldStr);

	if (occurrences === 0) {
		// Exact match failed — retry with the whitespace-insensitive line
		// matcher before giving up, so rewrites whose old_text drifted only in
		// trailing whitespace or EOF newlines still apply.
		const fallback = findNormalizedLineMatch(content, oldStr);
		if (fallback.count > 1) {
			throw new Error(
				`No replacement performed: multiple occurrences of text found in ${filePath}.`,
			);
		}
		if (fallback.count === 1) {
			const updated =
				content.slice(0, fallback.start) +
				normalizedNewStr +
				content.slice(fallback.end);
			await writeFileToDisk(filePath, updated, encoding);
			const diff = createLineDiff(content, updated, maxDiffLines);
			return `Edited ${filePath}\n${diff}`;
		}
		throw new Error(`No replacement performed: text not found in ${filePath}.`);
	}

	if (occurrences > 1) {
		throw new Error(
			`No replacement performed: multiple occurrences of text found in ${filePath}.`,
		);
	}

	// Replacer function so "$"-sequences in new_text ($&, $', $`, $$, $n)
	// are inserted literally instead of being expanded by String.replace.
	const updated = content.replace(normalizedOldStr, () => normalizedNewStr);
	await writeFileToDisk(filePath, updated, encoding);

	const diff = createLineDiff(content, updated, maxDiffLines);
	return `Edited ${filePath}\n${diff}`;
}

async function insertInFile(
	filePath: string,
	insertLineOneBased: number,
	newStr: string,
	encoding: BufferEncoding,
): Promise<string> {
	const content = await fs.readFile(filePath, encoding);
	const eol = detectLineEnding(content);
	const lines = content.split(/\r\n|\n/);
	const maxBoundaryLine = lines.length + 1;

	if (insertLineOneBased < 1 || insertLineOneBased > maxBoundaryLine) {
		throw new Error(
			`Invalid insert_line: ${insertLineOneBased}. insert_line must be a positive one-based boundary line in the range 1-${maxBoundaryLine}. Use ${maxBoundaryLine} to append at EOF.`,
		);
	}

	const insertLine = insertLineOneBased - 1;
	lines.splice(insertLine, 0, ...newStr.split(/\r\n|\n/));
	await writeFileToDisk(filePath, lines.join(eol), encoding);

	return `Inserted content at line ${insertLineOneBased} in ${filePath}.`;
}

/**
 * Create an editor executor using Node.js fs module
 */
export function createEditorExecutor(
	options: EditorExecutorOptions = {},
): EditorExecutor {
	const {
		encoding = "utf-8",
		restrictToCwd = true,
		maxDiffLines = 200,
	} = options;

	return async (
		input: EditFileInput,
		cwd: string,
		_context: AgentToolContext,
	): Promise<string> => {
		const filePath = resolveFilePath(cwd, input.path, restrictToCwd);
		// 0 is a filler for the optional field, not a boundary (see normalizeInsertLine).
		const insertLine = normalizeInsertLine(input.insert_line);

		if (insertLine != null) {
			return insertInFile(
				filePath,
				insertLine, // One-based index
				input.new_text,
				encoding,
			);
		}

		if (!(await fileExists(filePath))) {
			return createFile(filePath, input.new_text, encoding);
		}
		if (input.old_text == null) {
			// Models that fill optional params with null hit this repeatedly and
			// tend to re-send the identical call; spell out the recovery so the
			// next call differs.
			throw new Error(
				`${filePath} already exists, but \`old_text\` was ${
					input.old_text === null ? "null" : "omitted"
				}. To edit an existing file, set \`old_text\` to the exact text in the file that \`new_text\` should replace (read the file first if needed). To insert instead, provide \`insert_line\`. Do not re-send this call unchanged.`,
			);
		}

		return replaceInFile(
			filePath,
			input.old_text,
			input.new_text,
			encoding,
			maxDiffLines,
		);
	};
}
