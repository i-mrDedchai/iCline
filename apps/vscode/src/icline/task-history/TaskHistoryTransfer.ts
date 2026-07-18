import { execa } from "@packages/execa"
// archiver's runtime exports a vending function (`archiver(format, options)`),
// but @types/archiver@8 only ships class declarations (Archiver/ZipArchive).
// Import as `* as` to grab the callable vending function at runtime, then
// cast to the typed Archiver instance after construction.
import * as archiverNS from "archiver"
import type { Archiver } from "archiver"
import type { HistoryItem } from "@shared/HistoryItem"
import { fileExistsAtPath, isDirectory } from "@utils/fs"
import { createWriteStream } from "node:fs"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { finished } from "node:stream/promises"
import { ulid } from "ulid"
import type { Controller } from "@/core/controller"
import { HostProvider } from "@/hosts/host-provider"
import { ShowMessageType } from "@/shared/proto/host/window"
import { Logger } from "@/shared/services/Logger"

const EXPORT_VERSION = 1
const MANIFEST_FILE = "manifest.json"

interface TaskHistoryManifest {
	version: number
	exportedAt: string
	tasks: HistoryItem[]
}

export interface TaskHistoryTransferResponse {
	count: number
	path?: string
	message?: string
}

function defaultExportFilename(): string {
	const stamp = new Date().toISOString().slice(0, 10)
	return `icline-task-history-${stamp}.zip`
}

async function zipDirectoryEntries(
	outputPath: string,
	entries: Array<{ sourcePath: string; archivePath: string }>,
	manifest: TaskHistoryManifest,
): Promise<void> {
	await fs.mkdir(path.dirname(outputPath), { recursive: true })

	const output = createWriteStream(outputPath)
	// archiver's runtime is a vending function; call it with ("zip", options) to
	// get a typed Archiver stream. Cast via `as` because @types/archiver@8
	// declares the module as namespace-only (no default/callable export).
	const archive = (archiverNS as unknown as (format: string, options?: Record<string, unknown>) => Archiver)(
		"zip",
		{ zlib: { level: 9 } },
	)

	archive.pipe(output)
	archive.append(JSON.stringify(manifest, null, 2), { name: MANIFEST_FILE })

	for (const entry of entries) {
		if (await isDirectory(entry.sourcePath)) {
			archive.directory(entry.sourcePath, entry.archivePath)
		}
	}

	archive.finalize()
	await finished(output)
}

async function extractZipArchive(zipPath: string, destinationDir: string): Promise<void> {
	await fs.mkdir(destinationDir, { recursive: true })

	if (process.platform === "win32") {
		const command = `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destinationDir.replace(/'/g, "''")}' -Force`
		await execa("powershell", ["-NoProfile", "-NonInteractive", "-Command", command])
		return
	}

	await execa("unzip", ["-o", zipPath, "-d", destinationDir])
}

async function copyDirectoryRecursive(sourceDir: string, destinationDir: string): Promise<void> {
	await fs.mkdir(destinationDir, { recursive: true })
	const entries = await fs.readdir(sourceDir, { withFileTypes: true })

	for (const entry of entries) {
		const sourcePath = path.join(sourceDir, entry.name)
		const destinationPath = path.join(destinationDir, entry.name)
		if (entry.isDirectory()) {
			await copyDirectoryRecursive(sourcePath, destinationPath)
		} else {
			await fs.copyFile(sourcePath, destinationPath)
		}
	}
}

export async function exportTaskHistoryArchive(
	controller: Controller,
	taskIds: string[],
): Promise<TaskHistoryTransferResponse> {
	const history = controller.stateManager.getGlobalStateKey("taskHistory")
	const selectedIds = taskIds.length > 0 ? taskIds : history.map((item) => item.id)
	const tasks = history.filter((item) => selectedIds.includes(item.id))

	if (tasks.length === 0) {
		return { count: 0, message: "No tasks to export." }
	}

	const saveDialog = await HostProvider.window.showSaveDialog({
		options: {
			defaultPath: defaultExportFilename(),
			filters: {
				"iCline task archive": { extensions: ["zip"] },
			},
		},
	})

	const outputPath = saveDialog.selectedPath
	if (!outputPath) {
		return { count: 0, message: "Export cancelled." }
	}

	const zipPath = outputPath.toLowerCase().endsWith(".zip") ? outputPath : `${outputPath}.zip`
	const entries: Array<{ sourcePath: string; archivePath: string }> = []

	for (const task of tasks) {
		const sourcePath = path.join(HostProvider.get().globalStorageFsPath, "tasks", task.id)
		if (await fileExistsAtPath(sourcePath)) {
			entries.push({ sourcePath, archivePath: path.posix.join("tasks", task.id) })
		}
	}

	const manifest: TaskHistoryManifest = {
		version: EXPORT_VERSION,
		exportedAt: new Date().toISOString(),
		tasks,
	}

	await zipDirectoryEntries(zipPath, entries, manifest)

	return {
		count: tasks.length,
		path: zipPath,
		message: `Exported ${tasks.length} task${tasks.length === 1 ? "" : "s"} to ${zipPath}`,
	}
}

export async function importTaskHistoryArchive(controller: Controller): Promise<TaskHistoryTransferResponse> {
	const openDialog = await HostProvider.window.showOpenDialogue({
		canSelectMany: false,
		openLabel: "Import",
		filters: { files: ["zip"] },
	})

	const zipPath = openDialog.paths?.[0]
	if (!zipPath) {
		return { count: 0, message: "Import cancelled." }
	}

	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "icline-task-import-"))
	try {
		await extractZipArchive(zipPath, tempDir)

		const manifestPath = path.join(tempDir, MANIFEST_FILE)
		if (!(await fileExistsAtPath(manifestPath))) {
			throw new Error("Archive is missing manifest.json")
		}

		const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as TaskHistoryManifest
		if (!Array.isArray(manifest.tasks) || manifest.tasks.length === 0) {
			throw new Error("Archive does not contain any tasks")
		}

		const currentHistory = controller.stateManager.getGlobalStateKey("taskHistory")
		const existingIds = new Set(currentHistory.map((item) => item.id))
		const importedTasks: HistoryItem[] = []
		let skipped = 0

		for (const task of manifest.tasks) {
			const sourceTaskDir = path.join(tempDir, "tasks", task.id)
			if (!(await fileExistsAtPath(sourceTaskDir))) {
				skipped += 1
				continue
			}

			let targetId = task.id
			if (existingIds.has(targetId)) {
				targetId = ulid()
			}

			const destinationTaskDir = path.join(HostProvider.get().globalStorageFsPath, "tasks", targetId)
			await copyDirectoryRecursive(sourceTaskDir, destinationTaskDir)

			const importedTask: HistoryItem = { ...task, id: targetId }
			importedTasks.push(importedTask)
			existingIds.add(targetId)
		}

		if (importedTasks.length === 0) {
			return { count: 0, message: "No task folders were found in the archive." }
		}

		controller.stateManager.setGlobalState("taskHistory", [...importedTasks, ...currentHistory])
		await controller.postStateToWebview()

		const skippedNote = skipped > 0 ? ` (${skipped} skipped — missing task data)` : ""
		await HostProvider.window.showMessage({
			type: ShowMessageType.INFORMATION,
			message: `Imported ${importedTasks.length} task${importedTasks.length === 1 ? "" : "s"}${skippedNote}.`,
		})

		return {
			count: importedTasks.length,
			path: zipPath,
			message: `Imported ${importedTasks.length} task${importedTasks.length === 1 ? "" : "s"}${skippedNote}.`,
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		Logger.error("[iCline] Task history import failed:", error)
		await HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: `Failed to import task history: ${message}`,
		})
		return { count: 0, message }
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
	}
}