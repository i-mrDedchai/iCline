import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { StateManager } from "@/core/storage/StateManager"
import { createStorageContext } from "@/shared/storage/storage-context"

vi.mock("@/services/logging/distinctId", () => ({
	initializeDistinctId: vi.fn(async () => undefined),
}))

/**
 * The remote-config layer outranks everything else
 * (`remote > session > task > global`) and is org policy, so only the control-plane
 * fetch may write it. It used to also receive every `setApiConfiguration` write, and
 * provider fields survive that filter — so any settings write silently pinned whatever
 * provider was current at the time. A later model selection for another provider then
 * committed the model while the provider snapped back to the pin (Settings: pick a Grok
 * model and land on the Cline form again; smoke 2026-09-20).
 */
describe("api configuration writes and the remote layer", () => {
	let clineDir: string
	let originalClineDir: string | undefined

	beforeAll(async () => {
		clineDir = await fs.mkdtemp(path.join(os.tmpdir(), "cline-remote-pin-"))
		originalClineDir = process.env.CLINE_DIR
		process.env.CLINE_DIR = clineDir
		await StateManager.initialize(createStorageContext({ clineDir, workspacePath: clineDir }))
	})

	afterAll(async () => {
		await StateManager.get().flushPendingState()
		if (originalClineDir === undefined) {
			delete process.env.CLINE_DIR
		} else {
			process.env.CLINE_DIR = originalClineDir
		}
		await StateManager.get().reInitialize()
		await fs.rm(clineDir, { recursive: true, force: true })
	})

	it("keeps an ordinary provider write off the remote layer", () => {
		const stateManager = StateManager.get()
		stateManager.setApiConfiguration({ planModeApiProvider: "xai", actModeApiProvider: "xai" })

		expect(stateManager.getApiConfiguration().planModeApiProvider).toBe("xai")
		expect(stateManager.getApiConfiguration().actModeApiProvider).toBe("xai")
		// A provider field here would be the phantom pin: this cache is read-only policy.
		expect(stateManager.getRemoteConfigSettings().planModeApiProvider).toBeUndefined()
		expect(stateManager.getRemoteConfigSettings().actModeApiProvider).toBeUndefined()
	})

	it("still lets a control-plane pin outrank local writes", () => {
		const stateManager = StateManager.get()
		stateManager.setRemoteConfigField("planModeApiProvider", "cline")
		stateManager.setRemoteConfigField("actModeApiProvider", "cline")

		expect(stateManager.getApiConfiguration().planModeApiProvider).toBe("cline")
		// A later local write to the global layer cannot override policy.
		stateManager.setApiConfiguration({ planModeApiProvider: "xai" })
		expect(stateManager.getApiConfiguration().planModeApiProvider).toBe("cline")

		// Clearing the org policy gives the local value back.
		stateManager.clearRemoteConfig()
		expect(stateManager.getApiConfiguration().planModeApiProvider).toBe("xai")
	})
})
