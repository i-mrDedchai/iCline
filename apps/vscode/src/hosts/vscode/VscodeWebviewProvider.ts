import { sendShowWebviewEvent } from "@core/controller/ui/subscribeToShowWebview"
import { WebviewProvider } from "@core/webview"
import * as vscode from "vscode"
import { handleGrpcRequest, handleGrpcRequestCancel } from "@/core/controller/grpc-handler"
import { HostProvider } from "@/hosts/host-provider"
import { ExtensionRegistryInfo } from "@/registry"
import { telemetryService } from "@/services/telemetry"
import type { ExtensionMessage } from "@/shared/ExtensionMessage"
import { Logger } from "@/shared/services/Logger"
import { WebviewMessage } from "@/shared/WebviewMessage"

/*
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/blob/main/default/weather-webview/src/providers/WeatherViewProvider.ts
https://github.com/KumarVariable/vscode-extension-sidebar-html/blob/master/src/customSidebarViewProvider.ts
*/

export class VscodeWebviewProvider extends WebviewProvider implements vscode.WebviewViewProvider {
	// Used in package.json as the view's id. This value cannot be changed due to how vscode caches
	// views based on their id, and updating the id would break existing instances of the extension.
	public static readonly SIDEBAR_ID = ExtensionRegistryInfo.views.Sidebar

	private webview?: vscode.WebviewView
	/**
	 * Registrations that live as long as the EXTENSION. Anything tied to one resolved view goes
	 * into `viewDisposables` instead — see `disposeViewScope()` for why the two are separate.
	 */
	private disposables: vscode.Disposable[] = []
	/** Registrations owned by the currently resolved view. See `disposeViewScope()`. */
	private viewDisposables: vscode.Disposable[] = []
	/**
	 * Whether this extension session has already resolved a view. A view is resolved once per
	 * part it lives in, and moving it resolves another one — see `resolveWebviewView()`, which
	 * must not treat a move as the start of a session.
	 */
	private hasResolvedView = false

	override getWebviewUrl(path: string) {
		if (!this.webview) {
			throw new Error("Webview not initialized")
		}
		const uri = this.webview.webview.asWebviewUri(vscode.Uri.file(path))
		return uri.toString()
	}

	override getCspSource() {
		if (!this.webview) {
			throw new Error("Webview not initialized")
		}
		return this.webview.webview.cspSource
	}

	override isVisible() {
		return this.webview?.visible || false
	}

	public getWebview(): vscode.WebviewView | undefined {
		return this.webview
	}

	/**
	 * Initializes and sets up the webview when it's first created.
	 *
	 * @param webviewView - The sidebar webview view instance to be resolved
	 * @returns A promise that resolves when the webview has been fully initialized
	 */
	public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
		// Listeners registered below belong to THIS view instance. Moving the view to another part
		// disposes the instance and resolves a fresh one, so they are tracked per view and released
		// with it; the provider-wide `disposables` list only ends when the extension deactivates,
		// which would leak one set of listeners per move.
		this.disposeViewScope()
		this.webview = webviewView

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [vscode.Uri.file(HostProvider.get().extensionFsPath)],
		}

		await this.setWebviewHtml(webviewView.webview)

		// Sets up an event listener to listen for messages passed from the webview view context
		// and executes code based on the message that is received
		this.setWebviewMessageListener(webviewView.webview)
		telemetryService.capturePanelOpened("sidebar_resolved")

		// Logs show up in bottom panel > Debug Console
		//Logger.log("registering listener")

		// Listen for when the sidebar becomes visible
		// https://github.com/microsoft/vscode-discussions/discussions/840

		// onDidChangeVisibility is only available on the sidebar webview
		// Otherwise WebviewView and WebviewPanel have all the same properties except for this visibility listener
		// WebviewPanel is not currently used in the extension
		webviewView.onDidChangeVisibility(
			async () => {
				if (this.webview?.visible) {
					telemetryService.capturePanelOpened("sidebar_visible")
					// View becoming visible should not steal editor focus.
					await sendShowWebviewEvent(true)
				}
			},
			null,
			this.viewDisposables,
		)

		// Listen for when the view is disposed.
		//
		// A view can be disposed while its session lives on: MOVING it to another part (the
		// Secondary Side Bar, the panel) disposes this instance and resolves a fresh one in the new
		// part. Disposing the CONTROLLER here left that fresh view wired to a dead controller — the
		// moved chat came up blank and the host logged `SdkTaskHistory has been disposed` — so only
		// the view-scoped reference is dropped. The controller is torn down when the extension
		// deactivates (`WebviewProvider.disposeAllInstances()`), which is also when the session
		// actually ends.
		webviewView.onDidDispose(
			() => {
				if (this.webview === webviewView) {
					this.webview = undefined
					this.disposeViewScope()
				}
			},
			null,
			this.viewDisposables,
		)

		// If the extension is starting a new session, clear previous task state.
		//
		// Only the FIRST resolve of a session counts as starting one: the view is re-resolved when
		// it moves to another part (the Secondary Side Bar, the panel), and clearing the task there
		// would wipe the conversation the user is looking at the moment they move it. The moved
		// view stays bound to the live controller and re-reads the session's state on mount
		// (`subscribeToState` sends the current state to a new subscriber), so the chat comes up
		// where it left off.
		if (!this.hasResolvedView) {
			this.hasResolvedView = true
			await this.controller.clearTask()
		}

		Logger.log("[VscodeWebviewProvider] Webview view resolved")

		// Title setting logic removed to allow VSCode to use the container title primarily.
	}

	/**
	 * Sets up an event listener to listen for messages passed from the webview context and
	 * executes code based on the message that is received.
	 *
	 * IMPORTANT: When passing methods as callbacks in JavaScript/TypeScript, the method's
	 * 'this' context can be lost. This happens because the method is passed as a
	 * standalone function reference, detached from its original object.
	 *
	 * The Problem:
	 * Doing: webview.onDidReceiveMessage(this.controller.handleWebviewMessage)
	 * Would cause 'this' inside handleWebviewMessage to be undefined or wrong,
	 * leading to "TypeError: this.setUserInfo is not a function"
	 *
	 * The Solution:
	 * We wrap the method call in an arrow function, which:
	 * 1. Preserves the lexical scope's 'this' binding
	 * 2. Ensures handleWebviewMessage is called as a method on the controller instance
	 * 3. Maintains access to all controller methods and properties
	 *
	 * Alternative solutions could use .bind() or making handleWebviewMessage an arrow
	 * function property, but this approach is clean and explicit.
	 *
	 * @param webview The webview instance to attach the message listener to
	 */
	private setWebviewMessageListener(webview: vscode.Webview) {
		webview.onDidReceiveMessage(
			(message) => {
				this.handleWebviewMessage(message)
			},
			null,
			this.viewDisposables,
		)
	}

	/**
	 * Releases the listener registrations owned by one view instance.
	 *
	 * Called when that view is disposed (a move), before a re-resolve adds its own, and when the
	 * extension deactivates. The array's identity is kept — VS Code holds it as the disposable
	 * bag of the listeners it registered — so it is drained, not replaced.
	 */
	private disposeViewScope() {
		while (this.viewDisposables.length) {
			this.viewDisposables.pop()?.dispose()
		}
	}

	/**
	 * Assign webview HTML after a short delay to avoid VS Code Windows ServiceWorker races on cold start.
	 */
	private async setWebviewHtml(webview: vscode.Webview, options: { delayMs?: number } = {}): Promise<void> {
		const delayMs = options.delayMs ?? 50
		if (delayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, delayMs))
		}
		webview.html =
			this.context.extensionMode === vscode.ExtensionMode.Development
				? await this.getHMRHtmlContent()
				: this.getHtmlContent()
	}

	/**
	 * Sets up an event listener to listen for messages passed from the webview context and
	 * executes code based on the message that is received.
	 *
	 * @param webview A reference to the extension webview
	 */
	async handleWebviewMessage(message: WebviewMessage) {
		const postMessageToWebview = (response: ExtensionMessage) => this.postMessageToWebview(response)

		switch (message.type) {
			case "grpc_request": {
				if (message.grpc_request) {
					await handleGrpcRequest(this.controller, postMessageToWebview, message.grpc_request)
				}
				break
			}
			case "grpc_request_cancel": {
				if (message.grpc_request_cancel) {
					await handleGrpcRequestCancel(postMessageToWebview, message.grpc_request_cancel)
				}
				break
			}
			default: {
				Logger.error("Received unhandled WebviewMessage type:", JSON.stringify(message))
			}
		}
	}

	/**
	 * Sends a message from the extension to the webview.
	 *
	 * @param message - The message to send to the webview
	 * @returns A thenable that resolves to a boolean indicating success, or undefined if the webview is not available
	 */
	private async postMessageToWebview(message: ExtensionMessage): Promise<boolean | undefined> {
		return this.webview?.webview.postMessage(message)
	}

	override async dispose() {
		// WebviewView doesn't have a dispose method, it's managed by VSCode
		// We just need to clean up our disposables — the current view's first, in case a view is
		// still resolved (the extension can be deactivated without the view ever reporting it)
		this.disposeViewScope()
		while (this.disposables.length) {
			const x = this.disposables.pop()
			if (x) {
				x.dispose()
			}
		}
		super.dispose()
	}
}
