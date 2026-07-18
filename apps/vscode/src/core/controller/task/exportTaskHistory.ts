import { StringArrayRequest } from "@shared/proto/cline/common"
import { TaskHistoryTransferResult } from "@shared/proto/cline/task"
import { exportTaskHistoryArchive } from "@/icline/task-history/TaskHistoryTransfer"
import { Logger } from "@/shared/services/Logger"
import { Controller } from ".."

export async function exportTaskHistory(controller: Controller, request: StringArrayRequest): Promise<TaskHistoryTransferResult> {
	try {
		const result = await exportTaskHistoryArchive(controller, request.value ?? [])
		return TaskHistoryTransferResult.create({
			count: result.count,
			path: result.path,
			message: result.message,
		})
	} catch (error) {
		Logger.error("[iCline] exportTaskHistory failed:", error)
		throw error
	}
}
