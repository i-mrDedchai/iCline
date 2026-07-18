import { getUpdateService } from "@/icline/updates/UpdateService"
import { isIclineBuild } from "@/registry"
import type { EmptyRequest } from "@/shared/proto/cline/common"
import { Empty } from "@/shared/proto/cline/common"
import type { Controller } from ".."

export async function refreshIclineUpdates(controller: Controller, _request: EmptyRequest): Promise<Empty> {
	if (!isIclineBuild()) {
		return {}
	}
	const updateService = getUpdateService()
	if (updateService) {
		await updateService.checkForUpdates({ force: true })
		await controller.postStateToWebview()
	}
	return {}
}
