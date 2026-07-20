import type { HistoryItem } from "@shared/HistoryItem"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Controller } from "@/core/controller"
import { exportTaskHistoryArchive, importTaskHistoryArchive } from "./TaskHistoryTransfer"

// Mutable state shared with the mocked HostProvider. vi.hoisted lifts it above
// the vi.mock factory so the factory can close over the live refs.
const state = vi.hoisted(() => ({
	globalStorageFsPath: "",
	zipOutputPath: "",
	importSourcePath: "",
	savedTaskHistory: null as HistoryItem[] | null,
	setGlobalStateCalls: [] as Array<{ key: string; value: unknown }>,
	showMessageCalls: [] as Array<{ type: unknown; message: string }>,
}))

vi.mock("@/hosts/host-provider", () => {
	const instance = () => ({ globalStorageFsPath: state.globalStorageFsPath })
	const windowClient = {
		showSaveDialog: vi.fn(async () => ({ selectedPath: state.zipOutputPath })),
		showOpenDialogue: vi.fn(async () => ({ paths: [state.importSourcePath] })),
		showMessage: vi.fn(async (opts: { type: unknown; message: string }) => {
			state.showMessageCalls.push({ type: opts.type, message: opts.message })
		}),
	}
	const workspaceClient = {
		getWorkspacePaths: vi.fn(async () => ({ paths: [state.globalStorageFsPath] })),
	}
	return {
		HostProvider: Object.assign(
			class {
				static get() {
					return instance()
				}
			},
			{ window: windowClient, workspace: workspaceClient },
		),
	}
})

// execa is used internally by extractZipArchive (PowerShell/unzip); the import
// round-trip test exercises the real extraction path on the host OS.

function makeTaskItem(id: string, task: string): HistoryItem {
	return {
		id,
		ts: Date.now(),
		task,
		tokensIn: 10,
		tokensOut: 20,
		totalCost: 0.001,
	}
}

async function writeTaskFiles(storageRoot: string, taskId: string): Promise<void> {
	const taskDir = path.join(storageRoot, "tasks", taskId)
	await fs.mkdir(taskDir, { recursive: true })
	await fs.writeFile(path.join(taskDir, "ui_messages.json"), "[]", "utf8")
	await fs.writeFile(path.join(taskDir, "api_conversation_history.json"), "[]", "utf8")
}

function makeControllerStub(taskHistory: HistoryItem[]): Controller {
	return {
		stateManager: {
			getGlobalStateKey: vi.fn((key: string) => (key === "taskHistory" ? taskHistory : undefined)),
			setGlobalState: vi.fn((key: string, value: unknown) => {
				state.setGlobalStateCalls.push({ key, value })
			}),
		},
		postStateToWebview: vi.fn(),
	} as unknown as Controller
}

describe("TaskHistoryTransfer export/import round-trip", () => {
	let tempRoot: string

	beforeEach(async () => {
		tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "icline-transfer-test-"))
		state.globalStorageFsPath = tempRoot
		state.zipOutputPath = path.join(tempRoot, "export.zip")
		state.importSourcePath = ""
		state.savedTaskHistory = null
		state.setGlobalStateCalls = []
		state.showMessageCalls = []
	})

	afterEach(async () => {
		await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => {})
	})

	it("exports a real zip archive via the archiver vending function", async () => {
		const tasks = [makeTaskItem("task-A", "Build feature A"), makeTaskItem("task-B", "Fix bug B")]
		for (const task of tasks) {
			await writeTaskFiles(tempRoot, task.id)
		}
		const controller = makeControllerStub(tasks)

		const result = await exportTaskHistoryArchive(controller, [])

		expect(result.count).toBe(2)
		expect(result.path).toBe(state.zipOutputPath)

		const stat = await fs.stat(state.zipOutputPath)
		expect(stat.size).toBeGreaterThan(0)
		// A valid zip's first bytes are the PK\x03\x04 magic.
		const handle = await fs.open(state.zipOutputPath, "r")
		const buffer = Buffer.alloc(4)
		await handle.read(buffer, 0, 4, 0)
		await handle.close()
		expect(buffer[0]).toBe(0x50) // 'P'
		expect(buffer[1]).toBe(0x4b) // 'K'
	})

	it("round-trips: export then import restores tasks into a fresh store", async () => {
		const tasks = [makeTaskItem("task-roundtrip-1", "Round trip task 1")]
		await writeTaskFiles(tempRoot, tasks[0].id)
		const exportController = makeControllerStub(tasks)

		const exportResult = await exportTaskHistoryArchive(exportController, [])
		expect(exportResult.count).toBe(1)

		// Fresh storage for import — different folder so source and destination
		// don't collide.
		const importRoot = await fs.mkdtemp(path.join(os.tmpdir(), "icline-import-"))
		state.globalStorageFsPath = importRoot
		state.importSourcePath = state.zipOutputPath

		try {
			const importController = makeControllerStub([]) // empty current history
			const importResult = await importTaskHistoryArchive(importController)

			expect(importResult.count).toBe(1)
			expect(state.setGlobalStateCalls).toHaveLength(1)
			expect(state.setGlobalStateCalls[0].key).toBe("taskHistory")
			const saved = state.setGlobalStateCalls[0].value as HistoryItem[]
			expect(saved).toHaveLength(1)
			expect(saved[0].task).toBe("Round trip task 1")

			const importedTaskDir = path.join(importRoot, "tasks", "task-roundtrip-1")
			const dirStat = await fs.stat(importedTaskDir)
			expect(dirStat.isDirectory()).toBe(true)
			const files = await fs.readdir(importedTaskDir)
			expect(files).toContain("ui_messages.json")
			expect(files).toContain("api_conversation_history.json")
		} finally {
			await fs.rm(importRoot, { recursive: true, force: true }).catch(() => {})
		}
	})

	it("returns zero-count when no tasks exist", async () => {
		const controller = makeControllerStub([])
		const result = await exportTaskHistoryArchive(controller, [])
		expect(result.count).toBe(0)
		expect(result.message).toMatch(/no tasks/i)
	})
})
