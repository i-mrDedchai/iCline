import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createEditorExecutor } from "./editor";

const fsControl = vi.hoisted(() => ({ renameFails: false }));

// Fail the final step of the atomic write on demand, so the temp-file + rename
// contract can be proven: the target must keep its old bytes and the temp file
// must be cleaned up when the rename itself errors.
vi.mock("node:fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs/promises")>();
	return {
		...actual,
		rename: async (...args: Parameters<typeof actual.rename>) => {
			if (fsControl.renameFails) {
				throw new Error("simulated rename failure");
			}
			return actual.rename(...args);
		},
	};
});

// Windows chmod only maps the read-only bit, so the mode round-trip below would
// not be observable there.
const itWithMode = process.platform === "win32" ? it.skip : it;

const context = {
	agentId: "agent-1",
	conversationId: "conv-1",
	iteration: 1,
};

async function withTempFile(
	content: string,
	run: (filePath: string, dir: string) => Promise<void>,
): Promise<void> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-editor-"));
	const filePath = path.join(dir, "example.txt");
	await fs.writeFile(filePath, content, "utf-8");
	try {
		await run(filePath, dir);
	} finally {
		await fs.rm(dir, { recursive: true, force: true });
	}
}

describe("createEditorExecutor", () => {
	it("creates a missing file when edit is used", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-editor-"));
		const filePath = path.join(dir, "example.txt");

		try {
			const editor = createEditorExecutor();
			const result = await editor(
				{
					path: filePath,
					new_text: "created with edit",
				},
				dir,
				{
					agentId: "agent-1",
					conversationId: "conv-1",
					iteration: 1,
				},
			);

			expect(result).toBe(`File created successfully at: ${filePath}`);
			await expect(fs.readFile(filePath, "utf-8")).resolves.toBe(
				"created with edit",
			);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it("inserts before a one-based line and appends at the EOF boundary", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-editor-"));
		const filePath = path.join(dir, "example.txt");
		await fs.writeFile(filePath, "one\ntwo", "utf-8");

		try {
			const editor = createEditorExecutor();
			await editor(
				{
					path: filePath,
					new_text: "inserted",
					insert_line: 2,
				},
				dir,
				{
					agentId: "agent-1",
					conversationId: "conv-1",
					iteration: 1,
				},
			);

			await expect(fs.readFile(filePath, "utf-8")).resolves.toBe(
				"one\ninserted\ntwo",
			);

			await editor(
				{
					path: filePath,
					new_text: "tail",
					insert_line: 4,
				},
				dir,
				{
					agentId: "agent-1",
					conversationId: "conv-1",
					iteration: 1,
				},
			);

			await expect(fs.readFile(filePath, "utf-8")).resolves.toBe(
				"one\ninserted\ntwo\ntail",
			);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it("emits a minimal diff for an in-place single-line edit", async () => {
		await withTempFile("a\nb\nc", async (filePath, dir) => {
			const editor = createEditorExecutor();
			const result = await editor(
				{ path: filePath, old_text: "b", new_text: "B" },
				dir,
				context,
			);

			expect(result).toBe(
				`Edited ${filePath}\n\`\`\`diff\n-2: b\n+2: B\n\`\`\``,
			);
		});
	});

	it("only emits the changed region when the edit changes the line count", async () => {
		await withTempFile("a\nb\nc\nd\ne\nf", async (filePath, dir) => {
			const editor = createEditorExecutor();
			const result = await editor(
				{ path: filePath, old_text: "b\nc\nd", new_text: "B" },
				dir,
				context,
			);

			// The trailing unchanged lines (e, f) must not be mispaired into
			// the diff even though their positions shifted.
			expect(result).toBe(
				`Edited ${filePath}\n\`\`\`diff\n-2: b\n-3: c\n-4: d\n+2: B\n\`\`\``,
			);
			await expect(fs.readFile(filePath, "utf-8")).resolves.toBe("a\nB\ne\nf");
		});
	});

	it("emits only additions for a pure insertion via str_replace", async () => {
		await withTempFile("a\nb\nc", async (filePath, dir) => {
			const editor = createEditorExecutor();
			const result = await editor(
				{ path: filePath, old_text: "a\nb", new_text: "a\nnew\nb" },
				dir,
				context,
			);

			expect(result).toBe(`Edited ${filePath}\n\`\`\`diff\n+2: new\n\`\`\``);
		});
	});

	it("truncates long diffs at maxDiffLines while keeping both sides visible", async () => {
		const oldLines = Array.from({ length: 10 }, (_, i) => `old-${i}`);
		await withTempFile(oldLines.join("\n"), async (filePath, dir) => {
			const editor = createEditorExecutor({ maxDiffLines: 3 });
			const result = await editor(
				{
					path: filePath,
					old_text: oldLines.join("\n"),
					new_text: "replaced",
				},
				dir,
				context,
			);

			expect(result).toBe(
				`Edited ${filePath}\n\`\`\`diff\n-1: old-0\n-2: old-1\n+1: replaced\n... diff truncated (8 more removed, 0 more added lines) ...\n\`\`\``,
			);
		});
	});

	it("does not drop additions when removals alone exhaust maxDiffLines", async () => {
		const oldLines = Array.from({ length: 6 }, (_, i) => `old-${i}`);
		const newLines = Array.from({ length: 4 }, (_, i) => `new-${i}`);
		await withTempFile(oldLines.join("\n"), async (filePath, dir) => {
			const editor = createEditorExecutor({ maxDiffLines: 6 });
			const result = await editor(
				{
					path: filePath,
					old_text: oldLines.join("\n"),
					new_text: newLines.join("\n"),
				},
				dir,
				context,
			);

			// Budget splits 3/3 instead of removals consuming all 6 lines and
			// reporting +0 additions.
			expect(result).toBe(
				`Edited ${filePath}\n\`\`\`diff\n-1: old-0\n-2: old-1\n-3: old-2\n+1: new-0\n+2: new-1\n+3: new-2\n... diff truncated (3 more removed, 1 more added lines) ...\n\`\`\``,
			);
		});
	});

	it("preserves CRLF line endings when inserting LF-only text into a CRLF file", async () => {
		await withTempFile("one\r\ntwo\r\nthree", async (filePath, dir) => {
			const editor = createEditorExecutor();
			await editor(
				{
					path: filePath,
					new_text: "first\nsecond",
					insert_line: 2,
				},
				dir,
				context,
			);

			await expect(fs.readFile(filePath, "utf-8")).resolves.toBe(
				"one\r\nfirst\r\nsecond\r\ntwo\r\nthree",
			);
		});
	});

	it("replaces multi-line LF old_text in a CRLF file and keeps CRLF endings", async () => {
		await withTempFile("a\r\nb\r\nc\r\nd", async (filePath, dir) => {
			const editor = createEditorExecutor();
			// Reads strip "\r", so the model round-trips LF-only text even
			// though the file on disk is CRLF.
			const result = await editor(
				{ path: filePath, old_text: "b\nc", new_text: "B\nC\nX" },
				dir,
				context,
			);

			expect(result).toBe(
				`Edited ${filePath}\n\`\`\`diff\n-2: b\n-3: c\n+2: B\n+3: C\n+4: X\n\`\`\``,
			);
			await expect(fs.readFile(filePath, "utf-8")).resolves.toBe(
				"a\r\nB\r\nC\r\nX\r\nd",
			);
		});
	});

	// The CRLF branch is exercised for real by Windows CI, where os.EOL is
	// "\r\n" (github.com/cline/cline/issues/13504).
	it("creates new files with the platform-native line ending", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-editor-"));
		const filePath = path.join(dir, "fresh.txt");

		try {
			const editor = createEditorExecutor();
			await editor(
				{ path: filePath, new_text: "one\ntwo\nthree" },
				dir,
				context,
			);

			await expect(fs.readFile(filePath, "utf-8")).resolves.toBe(
				["one", "two", "three"].join(os.EOL),
			);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it("replaces text in a pure-LF file without introducing CRLF", async () => {
		await withTempFile("a\nb\nc", async (filePath, dir) => {
			const editor = createEditorExecutor();
			await editor(
				{ path: filePath, old_text: "b\nc", new_text: "B\r\nC" },
				dir,
				context,
			);

			await expect(fs.readFile(filePath, "utf-8")).resolves.toBe("a\nB\nC");
		});
	});

	it("inserts $-sequences in new_text literally", async () => {
		await withTempFile("a\nb\nc", async (filePath, dir) => {
			const editor = createEditorExecutor();
			await editor(
				{
					path: filePath,
					old_text: "b",
					new_text: "cost=$100 pid=$$ match=$& rest=$'",
				},
				dir,
				context,
			);

			await expect(fs.readFile(filePath, "utf-8")).resolves.toBe(
				"a\ncost=$100 pid=$$ match=$& rest=$'\nc",
			);
		});
	});

	it("rejects insert_line 0 with the valid one-based boundary range", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-editor-"));
		const filePath = path.join(dir, "example.txt");
		await fs.writeFile(filePath, "one\ntwo", "utf-8");

		try {
			const editor = createEditorExecutor();

			await expect(
				editor(
					{
						path: filePath,
						new_text: "invalid",
						insert_line: 0,
					},
					dir,
					{
						agentId: "agent-1",
						conversationId: "conv-1",
						iteration: 1,
					},
				),
			).rejects.toThrow(
				"Invalid insert_line: 0. insert_line must be a positive one-based boundary line in the range 1-3. Use 3 to append at EOF.",
			);
			await expect(fs.readFile(filePath, "utf-8")).resolves.toBe("one\ntwo");
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	// The dev.6-fix.29 smoke chat was refused at 40,243 characters and had to be
	// re-sent in pieces; a file of that size must now land whole, in one call.
	it("writes a 40,243-character file in one call and leaves no temp files", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-editor-"));
		const filePath = path.join(dir, "big.css");
		const content = "x".repeat(40_243);

		try {
			const editor = createEditorExecutor();
			const result = await editor(
				{ path: filePath, new_text: content },
				dir,
				context,
			);

			expect(result).toBe(`File created successfully at: ${filePath}`);
			await expect(fs.readFile(filePath, "utf-8")).resolves.toBe(content);
			// The atomic write's temp file must be gone, not left beside the target.
			expect(await fs.readdir(dir)).toEqual(["big.css"]);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it("leaves no temp files behind after create, replace and insert", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-editor-"));
		const filePath = path.join(dir, "example.txt");

		try {
			const editor = createEditorExecutor();
			await editor({ path: filePath, new_text: "one\ntwo" }, dir, context);
			await editor(
				{ path: filePath, old_text: "one", new_text: "1" },
				dir,
				context,
			);
			await editor(
				{ path: filePath, new_text: "three", insert_line: 2 },
				dir,
				context,
			);

			expect(await fs.readdir(dir)).toEqual(["example.txt"]);
			await expect(fs.readFile(filePath, "utf-8")).resolves.toBe(
				["1", "three", "two"].join(os.EOL),
			);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	// The invariant the size guard promises ("nothing was written") holds for
	// write failures too: bytes only arrive through a rename, so a failure at the
	// last step leaves the original file byte-for-byte and no temp litter.
	it("keeps the original file intact and cleans up the temp file when the rename fails", async () => {
		await withTempFile("original", async (filePath, dir) => {
			const editor = createEditorExecutor();
			fsControl.renameFails = true;
			try {
				await expect(
					editor(
						{ path: filePath, old_text: "original", new_text: "replaced" },
						dir,
						context,
					),
				).rejects.toThrow("simulated rename failure");
			} finally {
				fsControl.renameFails = false;
			}

			await expect(fs.readFile(filePath, "utf-8")).resolves.toBe("original");
			expect(await fs.readdir(dir)).toEqual(["example.txt"]);
		});
	});

	// A plain in-place writeFile used to preserve the mode by keeping the inode;
	// temp + rename replaces it, so the mode must be carried over explicitly.
	itWithMode("preserves the file mode across a replace", async () => {
		await withTempFile("content", async (filePath, dir) => {
			await fs.chmod(filePath, 0o755);
			const editor = createEditorExecutor();
			await editor(
				{ path: filePath, old_text: "content", new_text: "updated" },
				dir,
				context,
			);

			const stat = await fs.stat(filePath);
			expect(stat.mode & 0o7777).toBe(0o755);
		});
	});
});
