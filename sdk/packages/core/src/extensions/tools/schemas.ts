/**
 * Zod Schemas for Default Tool Inputs
 *
 * These schemas define the input structure for each default tool
 * and are used for both validation and JSON Schema generation.
 */

import { z } from "zod";

/**
 * Soft per-call character budget advertised to the model for free-form command
 * text. It shapes guidance only; nothing rejects input at this size.
 */
export const INPUT_ARG_CHAR_LIMIT = 6000;

/**
 * Hard ceiling on the text payload of a single `editor` call (`old_text` /
 * `new_text`). A larger payload is rejected before anything reaches disk; at or
 * below it the write lands whole, in one call — this is a safety net against
 * payloads no single response could have produced, not a size policy for
 * ordinary writes.
 *
 * Was 6000 until dev.6-fix.23 (smaller than an ordinary source file: six of the
 * nine orange tool failures in the dev.6-fix.21 smoke chat were this guard
 * alone), then 32_000 — which still refused files real chats produce: the
 * dev.6-fix.29 smoke hit `Editor input too large: new_text was 40243
 * characters`. The ceiling now sits where the guard can only catch garbage:
 * 2M chars is ~500k tokens, above any model's single-response output budget,
 * while ordinary writes are executed as-is. Writes are atomic (temp file +
 * rename in `executors/editor.ts`), so even a payload at this size either lands
 * completely or leaves the target exactly as it was.
 */
export const EDITOR_INPUT_CHAR_LIMIT = 2_000_000;

/**
 * Chunk size the recovery recipe recommends when a write really is above
 * `EDITOR_INPUT_CHAR_LIMIT`: it fits comfortably in every catalog model's
 * context, so the model can append the remainder without blowing its window.
 * Guidance only — nothing rejects input at this size.
 */
export const EDITOR_CHUNK_CHAR_LIMIT = 32_000;

/**
 * Schema for read tool input
 */
const AbsolutePath = z
	.string()
	.describe("The absolute path of a text file to read content from");

export const ReadFileLineRangeSchema = z
	.object({
		// Models sometimes emit line numbers as strings; coerce so a `"3"` does not
		// reject the whole tool call. The advertised JSON Schema is unaffected.
		start_line: z.coerce
			.number()
			.int()
			.positive()
			.nullable()
			.optional()
			.describe(
				"Optional one-based starting line number to read from; use null or omit for the start of the file",
			),
		end_line: z.coerce
			.number()
			.int()
			.positive()
			.nullable()
			.optional()
			.describe(
				"Optional one-based ending line number to read through; use null or omit to read to the end of the file or the read cap, whichever comes first",
			),
	})
	.describe("Optional inclusive one-based file line range");

export const ReadFileRequestSchema = z
	.object({
		path: AbsolutePath,
		start_line: ReadFileLineRangeSchema.shape.start_line,
		end_line: ReadFileLineRangeSchema.shape.end_line,
	})
	.describe(
		"A file read request with optional inclusive one-based line bounds. Always include path; start_line/end_line must be on the same object as the path they apply to, never in a separate array element",
	);

/**
 * Schema for read_files tool input
 */
export const ReadFilesInputSchema = z.object({
	files: z
		.array(ReadFileRequestSchema)
		.describe(
			"Array of file read requests; each element is one file and must include path. Omit start_line/end_line or set them to null to read from the start; provide integers on the same object as the path to return only that inclusive one-based line range — never emit a range as its own array element. Reads are capped, so page through long files with start_line/end_line. Prefer this tool over running terminal command to get file content for better performance and reliability.",
		),
});

const ReadFileRangeAliasFields = {
	start_line: ReadFileLineRangeSchema.shape.start_line,
	end_line: ReadFileLineRangeSchema.shape.end_line,
};

/**
 * Tolerant per-entry schema for read requests. Some models emit the path
 * under `file_path`/`filePath` instead of `path`; normalize those aliases to
 * the canonical shape so downstream code only ever sees `path`.
 */
const LooseReadFileRequestSchema = z.union([
	ReadFileRequestSchema,
	z
		.object({ file_path: AbsolutePath, ...ReadFileRangeAliasFields })
		.transform(({ file_path, ...rest }) => ({ path: file_path, ...rest })),
	z
		.object({ filePath: AbsolutePath, ...ReadFileRangeAliasFields })
		.transform(({ filePath, ...rest }) => ({ path: filePath, ...rest })),
]);

/**
 * Union schema for read_files tool input, allowing either a single string, an array of strings, or the full object schema
 */
export const ReadFilesInputUnionSchema = z.union([
	ReadFilesInputSchema,
	LooseReadFileRequestSchema,
	z.array(LooseReadFileRequestSchema),
	z.array(z.string()),
	z.string(),
	z.object({
		files: z.array(z.union([AbsolutePath, LooseReadFileRequestSchema])),
	}),
	z.object({ files: LooseReadFileRequestSchema }),
	z.object({ files: AbsolutePath }),
	z.object({ file_paths: z.array(AbsolutePath) }),
	z.object({ file_paths: z.string() }),
	z.object({
		paths: z.array(z.union([AbsolutePath, LooseReadFileRequestSchema])),
	}),
	z.object({ paths: LooseReadFileRequestSchema }),
	z.object({ paths: z.string() }),
]);

/**
 * Schema for search_codebase tool input
 */
export const SearchCodebaseInputSchema = z.object({
	queries: z
		.array(z.string())
		.describe("Array of regex search queries to execute"),
});

/**
 * Union schema for search_codebase tool input, allowing either a single string, an array of strings, or the full object schema
 */
export const SearchCodebaseUnionInputSchema = z.union([
	SearchCodebaseInputSchema,
	z.array(z.string()),
	z.string(),
	z.object({ queries: z.string() }),
]);

const CommandInputSchema = z
	.string()
	.describe(
		`The non-interactive shell command to execute - MUST keep input short and concise (within ${INPUT_ARG_CHAR_LIMIT * 2} characters) to avoid timeouts.`,
	);

export const StructuredCommandInputSchema = z.object({
	command: z
		.string()
		.min(1)
		.describe("The executable to run directly without shell parsing."),
	args: z
		.array(z.string())
		.optional()
		.describe("Optional argv list passed directly to the executable."),
});

export const StructuredCommandEntrySchema = z.union([
	CommandInputSchema,
	StructuredCommandInputSchema,
]);

export const RunCommandsInputSchema = z.object({
	commands: z
		.array(CommandInputSchema)
		.describe("Array of complete shell command strings to execute."),
});

const StructuredCommandsInputSchema = z.object({
	commands: z.array(StructuredCommandEntrySchema),
});

/**
 * Union schema for run_commands tool input. More flexible.
 */
export const RunCommandsInputUnionSchema = z.union([
	RunCommandsInputSchema,
	StructuredCommandsInputSchema,
	z.object({ commands: StructuredCommandEntrySchema }),
	z.array(StructuredCommandInputSchema),
	StructuredCommandInputSchema,
	z.object({ command: CommandInputSchema }),
	z.object({ cmd: CommandInputSchema }),
	z.array(z.string()),
	z.string(),
]);

/**
 * Schema for a single web fetch request
 */
export const WebFetchRequestSchema = z.object({
	url: z.string().describe("The URL to fetch"),
	prompt: z.string().min(2).describe("Analysis prompt for the fetched content"),
});

/**
 * Schema for fetch_web_content tool input
 */
export const FetchWebContentInputSchema = z.object({
	requests: z
		.array(WebFetchRequestSchema)
		.describe("Array of the URLs for the web fetch requests"),
});

/**
 * Schema for editor tool input
 */
export const EditFileInputSchema = z
	.object({
		path: z
			.string()
			.min(1)
			.describe("The absolute path for the action to be performed on"),
		old_text: z
			.string()
			.nullable()
			.optional()
			.describe(
				`Exact text to replace (must match exactly once). Omit this when creating a missing file or inserting via insert_line. A replacement of any realistic size is accepted in one call; only above ${EDITOR_INPUT_CHAR_LIMIT} characters is it rejected before anything is written — split such a replacement across multiple calls.`,
			),
		new_text: z
			.string()
			.describe(
				`The new content to write when creating a missing file, the replacement text for edits, or the inserted text when insert_line is provided. A whole file fits in one call, however long — do not split normal files across calls. Only above ${EDITOR_INPUT_CHAR_LIMIT} characters is the call rejected; then split it: create the file with a first chunk, then append the rest with insert_line.`,
			),
		// See start_line above: coerced so a stringified line number still applies.
		insert_line: z.coerce
			.number()
			.int()
			.nullable()
			.optional()
			.describe(
				"Optional positive one-based boundary line. When provided, the tool inserts new_text before that line instead of performing a replacement edit; use line_count + 1 to append at EOF.",
			),
	})
	.describe(
		`Edit a text file by replacing old_text with new_text, create the file with new_text if it does not exist, or insert new_text at insert_line when insert_line is provided. Prefer using this tool for file edits over shell commands. Write a whole file in one call, however long — only above ${EDITOR_INPUT_CHAR_LIMIT} characters is the call rejected, and then create it with a first chunk and append the rest with insert_line.`,
	);

/**
 * Read `insert_line` the way the executor does: 0 means the model did not mean to insert.
 *
 * Zero is never a valid one-based boundary, and it is how a filler for this optional field
 * arrives — `z.coerce.number()` above turns "", "   " and false into 0, so a call can carry
 * 0 without the model having chosen it. The dev.6-fix.30 log refused `Invalid insert_line: 0`
 * eleven times while the model re-sent the identical call, and re-sending rather than
 * correcting is the tell for a filler instead of a boundary: a model that meant to insert
 * at the top writes 1 once the error says "positive one-based". (The same pattern is why
 * `old_text == null` gets its own spelled-out recovery in `executors/editor.ts`.) Treating 0
 * as not-provided therefore loses nothing and lets the replacement the call describes run,
 * instead of failing the whole call over a field the model did not intend to set.
 */
export function normalizeInsertLine(insertLine: number | null | undefined): number | undefined {
	return insertLine == null || insertLine === 0 ? undefined : insertLine
}

/**
 * Schema for apply_patch tool input
 */
export const ApplyPatchInputSchema = z
	.object({
		input: z
			.string()
			.min(1)
			.describe(
				"The freeform apply_patch payload in the canonical patch grammar (e.g *** Begin Patch, *** Update File:, @@, and *** End Patch).",
			),
	})
	.describe(
		"Modify or create a text file by applying patches using the canonical apply_patch diff grammar. Prefer sending the patch body directly rather than wrapping it in shell syntax. IMPORTANT: large patches can time out, so use small chunks and multiple calls when possible.",
	);
export const ApplyPatchInputUnionSchema = z.union([
	ApplyPatchInputSchema,
	z.string(),
]);

/**
 * Schema for skills tool input
 */
export const SkillsInputSchema = z.object({
	skill: z.string().min(1).describe("Name of the skill to execute."),
	args: z
		.string()
		.nullable()
		.optional()
		.describe("Arguments for the skill; use null when omitted"),
});

/**
 * Schema for ask_followup_question tool input
 */
export const AskQuestionInputSchema = z.object({
	question: z
		.string()
		.min(1)
		.describe(
			'The single question to ask the user. E.g. "How can I help you?"',
		),
	options: z
		.array(z.string().min(1))
		.min(2)
		.max(5)
		.describe(
			"Array of 2-5 user-selectable answer options for the single question",
		),
});

export const SubmitInputSchema = z.object({
	summary: z
		.string()
		.min(10)
		.describe(
			"Summarization of the investigation, steps taken, and resolution status to submit at the end of the session. Before submitting, re-read the task requirements together with any provided tests or assertions, and confirm from your own tool output — not from assumption — that your solution produces the expected results at the expected file locations.",
		),
	verified: z
		.boolean()
		.describe(
			`Have you verified that the issue is resolved to the best of your knowledge, including updating and creating all the requested files and items? 'True' if you have completed the investigation and gathered concrete evidence that every requirement is met.\n'False' if you have done all you can but cannot resolve the issue or if you are stuck and cannot proceed further.\nIMPORTANT: verify by EXECUTION, not by assumption. Before setting 'true' you must have observed evidence in this session that your solution works:\n- If the task provides or references specific tests, run those exact test(s) and include the passing output in your reasoning. If they still fail, revise and re-run.\n- If no tests are provided, construct your own check: actually run the program, script, or command you produced; confirm every required output file exists at the exact path requested; and confirm its contents match the required format, data types, and values. Read the output back as evidence.\nPhrases like "assume it works", "should be correct", or "probably fine" are NOT verification. Do NOT set 'true' unless your tool output shows the requirements are met; if you cannot obtain such evidence, set 'false'.`,
		),
});

// =============================================================================
// Type Definitions (derived from Zod schemas)
// =============================================================================

/**
 * Input for a single file read request
 */
export type ReadFileRequest = z.infer<typeof ReadFileRequestSchema>;

/**
 * Input for the read_files tool
 */
export type ReadFilesInput = z.infer<typeof ReadFilesInputSchema>;

/**
 * Input for the search_codebase tool
 */
export type SearchCodebaseInput = z.infer<typeof SearchCodebaseInputSchema>;

/**
 * Input for the run_commands tool
 */
export type RunCommandsInput = z.infer<typeof RunCommandsInputSchema>;
export type StructuredCommandInput = z.infer<
	typeof StructuredCommandInputSchema
>;

/**
 * Web fetch request parameters
 */
export type WebFetchRequest = z.infer<typeof WebFetchRequestSchema>;

/**
 * Input for the fetch_web_content tool
 */
export type FetchWebContentInput = z.infer<typeof FetchWebContentInputSchema>;

/**
 * Input for the editor tool
 */
export type EditFileInput = z.infer<typeof EditFileInputSchema>;

/**
 * Input for the apply_patch tool
 */
export type ApplyPatchInput = z.infer<typeof ApplyPatchInputSchema>;

/**
 * Input for the skills tool
 */
export type SkillsInput = z.infer<typeof SkillsInputSchema>;

/**
 * Input for the ask_followup_question tool
 */
export type AskQuestionInput = z.infer<typeof AskQuestionInputSchema>;

/**
 * Input for the submit and exit tool
 */
export type SubmitInput = z.infer<typeof SubmitInputSchema>;
