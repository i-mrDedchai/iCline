import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApplyPatchExecutor } from "./apply-patch";

const fsControl = vi.hoisted(() => ({
	renameFails: false,
	/** When set, only renames AFTER this many successes fail (a patch dying midway). */
	failRenameAfter: null as number | null,
	renameCalls: 0,
}));

// Fail the final step of the atomic write on demand, so the temp-file + rename
// contract can be proven here exactly as in editor.test.ts: targets keep their
// old bytes and temp files are cleaned up when the rename itself errors.
// `failRenameAfter: N` fails only the (N+1)th rename, so a patch that dies AFTER
// an earlier file already landed can be pinned too.
vi.mock("node:fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs/promises")>();
	return {
		...actual,
		rename: async (...args: Parameters<typeof actual.rename>) => {
			if (fsControl.renameFails) {
				throw new Error("simulated rename failure");
			}
			fsControl.renameCalls += 1;
			if (
				fsControl.failRenameAfter !== null &&
				fsControl.renameCalls > fsControl.failRenameAfter
			) {
				throw new Error("simulated rename failure");
			}
			return actual.rename(...args);
		},
	};
});

// Windows chmod only maps the read-only bit (so a mode round-trip is not
// observable) and file symlinks need Developer Mode to create — the two
// filesystem contracts below are therefore skipped on win32, like the mode
// test in editor.test.ts.
const itOnPosix = process.platform === "win32" ? it.skip : it;

describe("createApplyPatchExecutor", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "apply-patch-"));
		fsControl.renameFails = false;
		fsControl.failRenameAfter = null;
		fsControl.renameCalls = 0;
	});

	afterEach(async () => {
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it("applies the documented freeform patch format without shell wrappers", async () => {
		const filePath = path.join(tempDir, "page.tsx");
		await fs.writeFile(
			filePath,
			[
				"export default function Page() {",
				"\treturn (",
				"\t\t<div>",
				'\t\t\t<button onClick={() => console.log("clicked")}>Click me</button>',
				"\t\t</div>",
				"\t);",
				"}",
			].join("\n"),
			"utf-8",
		);

		const execute = createApplyPatchExecutor();
		const result = await execute(
			{
				input: [
					"*** Update File: page.tsx",
					"@@",
					" export default function Page() {",
					" \treturn (",
					" \t\t<div>",
					' \t\t\t<button onClick={() => console.log("clicked")}>Click me</button>',
					'+\t\t\t<button onClick={() => console.log("cancel clicked")}>Cancel</button>',
					" \t\t</div>",
					" \t);",
					" }",
				].join("\n"),
			},
			tempDir,
			{} as never,
		);

		await expect(fs.readFile(filePath, "utf-8")).resolves.toContain(
			'console.log("cancel clicked")',
		);
		expect(result).toContain("Successfully applied patch");
		expect(result).toContain("page.tsx");
	});

	it("accepts the legacy shell wrapper around the patch", async () => {
		const filePath = path.join(tempDir, "note.txt");
		const execute = createApplyPatchExecutor();

		await execute(
			{
				input: [
					"%%bash",
					'apply_patch <<"EOF"',
					"*** Begin Patch",
					"*** Add File: note.txt",
					"+hello",
					"*** End Patch",
					"EOF",
				].join("\n"),
			},
			tempDir,
			{} as never,
		);

		await expect(fs.readFile(filePath, "utf-8")).resolves.toBe("hello");
	});

	it("does not strip valid patch lines that begin with wrapper tokens after the patch prefix", async () => {
		const filePath = path.join(tempDir, "note.txt");
		await fs.writeFile(
			filePath,
			["alpha", "EOF literal", "``` fence", "omega"].join("\n"),
			"utf-8",
		);

		const execute = createApplyPatchExecutor();
		await execute(
			{
				input: [
					"*** Update File: note.txt",
					"@@",
					" alpha",
					" EOF literal",
					" ``` fence",
					"+tail",
					" omega",
				].join("\n"),
			},
			tempDir,
			{} as never,
		);

		await expect(fs.readFile(filePath, "utf-8")).resolves.toBe(
			["alpha", "EOF literal", "``` fence", "tail", "omega"].join("\n"),
		);
	});

	it("accepts an end sentinel with trailing whitespace", async () => {
		const filePath = path.join(tempDir, "note.txt");
		const execute = createApplyPatchExecutor();

		await execute(
			{
				input: [
					"*** Begin Patch",
					"*** Add File: note.txt",
					"+hello",
					"*** End Patch ",
				].join("\n"),
			},
			tempDir,
			{} as never,
		);

		await expect(fs.readFile(filePath, "utf-8")).resolves.toBe("hello");
	});

	// The CRLF branch is exercised for real by Windows CI, where os.EOL is
	// "\r\n" (github.com/cline/cline/issues/13504).
	it("adds new files with the platform-native line ending", async () => {
		const filePath = path.join(tempDir, "added.txt");
		const execute = createApplyPatchExecutor();

		await execute(
			{
				input: [
					"*** Begin Patch",
					"*** Add File: added.txt",
					"+one",
					"+two",
					"*** End Patch",
				].join("\n"),
			},
			tempDir,
			{} as never,
		);

		await expect(fs.readFile(filePath, "utf-8")).resolves.toBe(
			["one", "two"].join(os.EOL),
		);
	});

	it("preserves CRLF line endings when updating a CRLF file", async () => {
		const filePath = path.join(tempDir, "note.txt");
		await fs.writeFile(filePath, "alpha\r\nbeta\r\ngamma", "utf-8");
		const execute = createApplyPatchExecutor();

		// Models emit LF-only patch text even for CRLF files.
		await execute(
			{
				input: [
					"*** Update File: note.txt",
					"@@",
					" alpha",
					"-beta",
					"+BETA",
					"+inserted",
					" gamma",
				].join("\n"),
			},
			tempDir,
			{} as never,
		);

		await expect(fs.readFile(filePath, "utf-8")).resolves.toBe(
			"alpha\r\nBETA\r\ninserted\r\ngamma",
		);
	});

	it("preserves CRLF line endings when a patch moves a CRLF file", async () => {
		const filePath = path.join(tempDir, "old.txt");
		await fs.writeFile(filePath, "one\r\ntwo", "utf-8");
		const execute = createApplyPatchExecutor();

		await execute(
			{
				input: [
					"*** Update File: old.txt",
					"*** Move to: new.txt",
					"@@",
					" one",
					"-two",
					"+TWO",
				].join("\n"),
			},
			tempDir,
			{} as never,
		);

		await expect(
			fs.readFile(path.join(tempDir, "new.txt"), "utf-8"),
		).resolves.toBe("one\r\nTWO");
	});

	it("updates a pure-LF file without introducing CRLF", async () => {
		const filePath = path.join(tempDir, "lf.txt");
		await fs.writeFile(filePath, "one\ntwo\nthree", "utf-8");
		const execute = createApplyPatchExecutor();

		await execute(
			{
				input: [
					"*** Update File: lf.txt",
					"@@",
					" one",
					"-two",
					"+TWO",
					" three",
				].join("\n"),
			},
			tempDir,
			{} as never,
		);

		await expect(fs.readFile(filePath, "utf-8")).resolves.toBe(
			"one\nTWO\nthree",
		);
	});

	it("refuses to add a file that already exists", async () => {
		const filePath = path.join(tempDir, "note.txt");
		await fs.writeFile(filePath, "important data", "utf-8");
		const execute = createApplyPatchExecutor();

		await expect(
			execute(
				{
					input: [
						"*** Begin Patch",
						"*** Add File: note.txt",
						"+overwritten",
						"*** End Patch",
					].join("\n"),
				},
				tempDir,
				{} as never,
			),
		).rejects.toThrow("Add File Error: File already exists: note.txt");

		await expect(fs.readFile(filePath, "utf-8")).resolves.toBe(
			"important data",
		);
	});

	it("rejects incomplete patch sentinels", async () => {
		const execute = createApplyPatchExecutor();

		await expect(
			execute(
				{
					input: "*** Begin Patch\n*** Add File: note.txt\n+hello",
				},
				tempDir,
				{} as never,
			),
		).rejects.toThrow("Invalid patch text - incomplete sentinels");
	});

	it("rejects a patch when a hunk context does not match", async () => {
		const filePath = path.join(tempDir, "note.txt");
		const original = ["alpha", "beta", "gamma"].join("\n");
		await fs.writeFile(filePath, original, "utf-8");
		const execute = createApplyPatchExecutor();

		await expect(
			execute(
				{
					input: [
						"*** Update File: note.txt",
						"@@",
						" unrelated heading",
						" missing middle",
						"+replacement",
						" absent footer",
					].join("\n"),
				},
				tempDir,
				{} as never,
			),
		).rejects.toThrow(/note\.txt: hunk 1: Could not find matching context/);

		await expect(fs.readFile(filePath, "utf-8")).resolves.toBe(original);
	});

	// Atomic-write contract (shared file-writes.ts, same as the editor executor):
	// every write lands through a sibling temp file + rename, so no `.icline-tmp`
	// may survive any action type.
	it("leaves no .icline-tmp files behind after add, update, and move", async () => {
		await fs.writeFile(path.join(tempDir, "a.txt"), "alpha", "utf-8");
		await fs.writeFile(path.join(tempDir, "moving.txt"), "one\ntwo", "utf-8");
		const execute = createApplyPatchExecutor();

		await execute(
			{
				input: [
					"*** Begin Patch",
					"*** Update File: a.txt",
					"@@",
					"-alpha",
					"+ALPHA",
					"*** Update File: moving.txt",
					"*** Move to: moved.txt",
					"@@",
					" one",
					"-two",
					"+TWO",
					"*** Add File: fresh.txt",
					"+fresh",
					"*** End Patch",
				].join("\n"),
			},
			tempDir,
			{} as never,
		);

		await expect(
			fs.readFile(path.join(tempDir, "a.txt"), "utf-8"),
		).resolves.toBe("ALPHA");
		await expect(
			fs.readFile(path.join(tempDir, "moved.txt"), "utf-8"),
		).resolves.toBe("one\nTWO");
		await expect(
			fs.readFile(path.join(tempDir, "fresh.txt"), "utf-8"),
		).resolves.toBe("fresh");
		expect((await fs.readdir(tempDir)).sort()).toEqual([
			"a.txt",
			"fresh.txt",
			"moved.txt",
		]);
	});

	// The invariant behind "nothing was written": when the final rename fails,
	// every target keeps its old bytes (or is never created) and no temp file
	// survives — the patch degrades to "nothing changed", never "half changed".
	it("keeps targets intact and leaves no temp files when the rename fails", async () => {
		const filePath = path.join(tempDir, "a.txt");
		await fs.writeFile(filePath, "alpha", "utf-8");
		const execute = createApplyPatchExecutor();

		fsControl.renameFails = true;
		try {
			await expect(
				execute(
					{
						input: [
							"*** Begin Patch",
							"*** Update File: a.txt",
							"@@",
							"-alpha",
							"+BETA",
							"*** Add File: b.txt",
							"+fresh",
							"*** End Patch",
						].join("\n"),
					},
					tempDir,
					{} as never,
				),
			).rejects.toThrow("simulated rename failure");
		} finally {
			fsControl.renameFails = false;
		}

		await expect(fs.readFile(filePath, "utf-8")).resolves.toBe("alpha");
		await expect(fs.access(path.join(tempDir, "b.txt"))).rejects.toThrow();
		expect(await fs.readdir(tempDir)).toEqual(["a.txt"]);
	});

	// The maintainer's fix.30 smoke point for multi-file patches: one that dies
	// must not leave half-done files. Validation runs for EVERY file before the
	// first write (parse-then-apply), so a bad hunk on a later file must change
	// nothing at all — including files whose own hunk matched.
	it("writes nothing when a later file's hunk does not match", async () => {
		await fs.writeFile(path.join(tempDir, "a.txt"), "alpha", "utf-8");
		await fs.writeFile(path.join(tempDir, "b.txt"), "beta", "utf-8");
		const execute = createApplyPatchExecutor();

		await expect(
			execute(
				{
					input: [
						"*** Begin Patch",
						"*** Update File: a.txt",
						"@@",
						"-alpha",
						"+ALPHA",
						"*** Update File: b.txt",
						"@@",
						" unrelated heading",
						" missing middle",
						"+replacement",
						" absent footer",
						"*** End Patch",
					].join("\n"),
				},
				tempDir,
				{} as never,
			),
		).rejects.toThrow(/b\.txt: hunk 1/);

		await expect(
			fs.readFile(path.join(tempDir, "a.txt"), "utf-8"),
		).resolves.toBe("alpha");
		await expect(
			fs.readFile(path.join(tempDir, "b.txt"), "utf-8"),
		).resolves.toBe("beta");
		expect((await fs.readdir(tempDir)).sort()).toEqual(["a.txt", "b.txt"]);
	});

	// Per-file contract when a LATER file in the same patch dies: bytes land one
	// temp + rename per target, so the file that already landed is complete, the
	// failing target keeps its old bytes (never a mixture), and its temp is
	// cleaned up. Cross-file rollback is deliberately not claimed here.
	it("keeps every file whole when a later write in the patch dies", async () => {
		await fs.writeFile(path.join(tempDir, "a.txt"), "alpha", "utf-8");
		const execute = createApplyPatchExecutor();

		fsControl.failRenameAfter = 1;
		try {
			await expect(
				execute(
					{
						input: [
							"*** Begin Patch",
							"*** Update File: a.txt",
							"@@",
							"-alpha",
							"+BETA",
							"*** Add File: b.txt",
							"+fresh",
							"*** End Patch",
						].join("\n"),
					},
					tempDir,
					{} as never,
				),
			).rejects.toThrow("simulated rename failure");
		} finally {
			fsControl.failRenameAfter = null;
		}

		await expect(
			fs.readFile(path.join(tempDir, "a.txt"), "utf-8"),
		).resolves.toBe("BETA");
		await expect(fs.access(path.join(tempDir, "b.txt"))).rejects.toThrow();
		expect(await fs.readdir(tempDir)).toEqual(["a.txt"]);
	});

	// A plain in-place writeFile kept the mode by keeping the inode; temp + rename
	// replaces it, so the shared helper must carry the mode over (the same contract
	// the editor executor pins in editor.test.ts — apply_patch had no such test).
	itOnPosix("preserves the file mode across an update", async () => {
		const filePath = path.join(tempDir, "script.sh");
		await fs.writeFile(filePath, ["#!/bin/sh", "echo old"].join("\n"), "utf-8");
		await fs.chmod(filePath, 0o755);
		const execute = createApplyPatchExecutor();

		await execute(
			{
				input: [
					"*** Update File: script.sh",
					"@@",
					" #!/bin/sh",
					"-echo old",
					"+echo new",
				].join("\n"),
			},
			tempDir,
			{} as never,
		);

		await expect(fs.readFile(filePath, "utf-8")).resolves.toBe(
			["#!/bin/sh", "echo new"].join("\n"),
		);
		const stat = await fs.stat(filePath);
		expect(stat.mode & 0o7777).toBe(0o755);
	});

	// temp + rename would replace the LINK itself; resolveWriteTarget realpaths
	// the destination first, so the write lands behind the link and the link
	// stays a link (the symlink half of "a failed write leaves the target as it
	// was" — no test covered it on either executor before).
	itOnPosix(
		"writes through a symlink instead of replacing the link",
		async () => {
			const realPath = path.join(tempDir, "real.txt");
			const linkPath = path.join(tempDir, "link.txt");
			await fs.writeFile(realPath, "old", "utf-8");
			await fs.symlink(realPath, linkPath);
			const execute = createApplyPatchExecutor();

			await execute(
				{
					input: ["*** Update File: link.txt", "@@", "-old", "+new"].join("\n"),
				},
				tempDir,
				{} as never,
			);

			await expect(fs.readFile(realPath, "utf-8")).resolves.toBe("new");
			expect((await fs.lstat(linkPath)).isSymbolicLink()).toBe(true);
			expect((await fs.readdir(tempDir)).sort()).toEqual([
				"link.txt",
				"real.txt",
			]);
		},
	);
});
