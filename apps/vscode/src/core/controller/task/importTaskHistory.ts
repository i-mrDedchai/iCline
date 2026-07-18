import { EmptyRequest } from "@shared/proto/cline/common"
import { TaskHistoryTransferResult } from "@shared/proto/cline/task"
import { importTaskHistoryArchive } from "@/icline/task-history/TaskHistoryTransfer"
import { Logger } from "@/shared/services/Logger"
import { Controller } from ".."

export async function importTaskHistory(_controller: Controller, _request: EmptyRequest): Promise<TaskHistoryTransferResult> {
	try {
		const result = await importTaskHistoryArchive(_controller)
		return TaskHistoryTransferResult.create({
			count: result.count,
			path: result.path,
			message: result.message,
		})
	} catch (error) {
		Logger.error("[iCline] importTaskHistory failed:", error)
		throw error
	}
}
