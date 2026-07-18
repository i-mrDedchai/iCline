import { getUpdateService } from "@/icline/updates/UpdateService"
import { isIclineBuild } from "@/registry"
import type { StringRequest } from "@/shared/proto/cline/common"
import { Empty } from "@/shared/proto/cline/common"
import { Logger } from "@/shared/services/Logger"
import type { Controller } from ".."

export async function dismissIclineUpdate(controller: Controller, request: StringRequest): Promise<Empty> {
	if (!isIclineBuild()) {
		return {}
	}
	const channel = request.value
	if (channel !== "icline" && channel !== "upstream") {
		return {}
	}
	try {
		const updateService = getUpdateService()
		if (updateService) {
			await updateService.dismissUpdate(channel)
			await controller.postStateToWebview()
		}
	} catch (error) {
		Logger.error("Failed to dismiss iCline update:", error)
	}
	return {}
}
