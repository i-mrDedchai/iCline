import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "mocha"
import * as sinon from "sinon"
import * as vscode from "vscode"
import { VscodeTerminalManager } from "./VscodeTerminalManager"
import { TerminalInfo, TerminalRegistry } from "./VscodeTerminalRegistry"

function createNeverEndingStream(): AsyncIterable<string> {
	return {
		async *[Symbol.asyncIterator]() {
			await new Promise(() => {})
		},
	}
}

function createIdleTerminal(id: number, cwd: string): TerminalInfo {
	return {
		id,
		busy: false,
		lastCommand: "",
		lastActive: Date.now(),
		terminal: {
			shellIntegration: {
				cwd: vscode.Uri.file(cwd),
				executeCommand: () => ({ read: () => createNeverEndingStream() }),
			},
			show: () => {},
		} as unknown as vscode.Terminal,
	}
}

describe("VscodeTerminalManager", () => {
	let sandbox: sinon.SinonSandbox
	let manager: VscodeTerminalManager

	beforeEach(() => {
		sandbox = sinon.createSandbox({ useFakeTimers: true })
		manager = new VscodeTerminalManager()
	})

	afterEach(() => {
		manager.disposeAll()
		sandbox.restore()
	})

	it("returns after timing out a reused terminal cwd command", async () => {
		const targetCwd = "/tmp/cline-target"
		const executeCommandStub = sandbox.stub().returns({
			read: () => createNeverEndingStream(),
		})
		const terminalInfo: TerminalInfo = {
			id: 1,
			busy: false,
			lastCommand: "",
			lastActive: Date.now(),
			terminal: {
				shellIntegration: {
					cwd: vscode.Uri.file("/tmp/cline-original"),
					executeCommand: executeCommandStub,
				},
				show: sandbox.stub(),
			} as unknown as vscode.Terminal,
		}
		const getAllTerminalsStub = sandbox.stub(TerminalRegistry, "getAllTerminals").returns([terminalInfo])

		let didResolve = false
		const terminalPromise = manager.getOrCreateTerminal(targetCwd).then((terminal) => {
			didResolve = true
			return terminal
		})

		await sandbox.clock.tickAsync(4999)
		assert.equal(didResolve, false)

		await sandbox.clock.tickAsync(1)
		const terminal = await terminalPromise

		assert.equal(terminal, terminalInfo)
		// The handed-out terminal stays reserved: the caller runs its command next, and
		// clearing the flag here left a window in which a second command was handed the
		// same terminal and had its text written into the still-busy shell.
		assert.equal(terminalInfo.busy, true)
		assert.equal(terminalInfo.pendingCwdChange, undefined)
		assert.equal(terminalInfo.cwdResolved, undefined)
		assert.equal(getAllTerminalsStub.called, true)
		assert.equal(executeCommandStub.calledOnceWith(`cd "${targetCwd}"`), true)
	})

	it("reserves a matching terminal so concurrent commands do not share one shell", async () => {
		const targetCwd = "/tmp/cline-target"
		const first = createIdleTerminal(1, targetCwd)
		const second = createIdleTerminal(2, targetCwd)
		sandbox.stub(TerminalRegistry, "getAllTerminals").returns([first, second])

		const handedToFirstCommand = await manager.getOrCreateTerminal(targetCwd)
		const handedToSecondCommand = await manager.getOrCreateTerminal(targetCwd)

		// Both calls used to return terminal 1 (nothing marked it busy before the
		// caller ran its command), so two commands were written into one shell in the
		// same millisecond — the truncation/interleaving seen in 1-Cline.log.
		assert.notEqual(handedToFirstCommand.id, handedToSecondCommand.id)
		assert.equal(first.busy, true)
	})
})
