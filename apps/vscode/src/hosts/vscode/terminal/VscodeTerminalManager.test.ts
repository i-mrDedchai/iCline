import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "mocha"
import * as sinon from "sinon"
import * as vscode from "vscode"
import { CWD_COMMAND_TIMEOUT_MS, VscodeTerminalManager } from "./VscodeTerminalManager"
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

	it("hands genuinely parallel calls in the same cwd distinct terminals", async () => {
		const targetCwd = "/tmp/cline-target"
		const first = createIdleTerminal(1, targetCwd)
		const second = createIdleTerminal(2, targetCwd)
		sandbox.stub(TerminalRegistry, "getAllTerminals").returns([first, second])

		// Both calls are in flight at once (one model response producing two tool
		// calls), not merely sequential: each must still get its own terminal.
		const [handedToFirstCommand, handedToSecondCommand] = await Promise.all([
			manager.getOrCreateTerminal(targetCwd),
			manager.getOrCreateTerminal(targetCwd),
		])

		assert.notEqual(handedToFirstCommand.id, handedToSecondCommand.id)
		assert.equal(first.busy, true)
		assert.equal(second.busy, true)
	})

	it("hands parallel calls going through the reuse path distinct terminals", async () => {
		// Both terminals sit in another cwd, so both calls take the reuse path,
		// which awaits a cd before returning — the interleaving window in which
		// a second call could grab the same terminal.
		const first = createIdleTerminal(1, "/tmp/original")
		const second = createIdleTerminal(2, "/tmp/original")
		sandbox.stub(TerminalRegistry, "getAllTerminals").returns([first, second])

		const parallelCalls = Promise.all([
			manager.getOrCreateTerminal("/tmp/target-a"),
			manager.getOrCreateTerminal("/tmp/target-b"),
		])
		// Both cd commands hit the fake-timer 5s timeout (the never-ending
		// streams never report completion).
		await sandbox.clock.tickAsync(CWD_COMMAND_TIMEOUT_MS)
		const [handedToFirstCommand, handedToSecondCommand] = await parallelCalls

		assert.notEqual(handedToFirstCommand.id, handedToSecondCommand.id)
		assert.equal(first.busy, true)
		assert.equal(second.busy, true)
	})

	it("keeps a detached (Proceed While Running) terminal reserved until its command completes", async () => {
		const targetCwd = "/tmp/cline-target"
		const first = createIdleTerminal(1, targetCwd)
		const second = createIdleTerminal(2, targetCwd)
		sandbox.stub(TerminalRegistry, "getAllTerminals").returns([first, second])

		const handedOut = await manager.getOrCreateTerminal(targetCwd)
		const process = manager.runCommand(handedOut, "long-running-devserver")
		// The user presses "Proceed While Running" mid-command: the awaited
		// promise resolves, but the command keeps running in its terminal.
		process.detach()

		// So the terminal must stay reserved — a new command arriving now must
		// not have its text written into the still-running shell.
		assert.equal(first.busy, true)
		const nextCommandTerminal = await manager.getOrCreateTerminal(targetCwd)
		assert.notEqual(nextCommandTerminal.id, handedOut.id)
	})
})
