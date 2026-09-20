/**
 * Simple Logger utility for the extension's backend code.
 */
export class Logger {
	/**
	 * Payloads are dropped unless verbose: the agent streams thousands of events
	 * per session and each one would bloat the Cline output channel.
	 */
	private static get isVerbose(): boolean {
		return process.env.IS_DEV === "true" || process.env.CLINE_LOG_PAYLOADS === "true"
	}

	/**
	 * Messages whose payload is always serialized, even in a packaged build.
	 * They exist precisely to explain a decision that is otherwise invisible in
	 * the field (compaction budgeting, which request the runtime thinks it is
	 * about to send), and they are one short line per model request. Without
	 * this the diagnostic prints its title and nothing else — which is how the
	 * dev.6 fix.21 compaction storm stayed unexplained.
	 */
	private static readonly ALWAYS_PAYLOAD_PREFIXES = [
		"Context compaction diagnostics",
		"Context compaction completed",
		"Agentic compaction summarizer diagnostics",
		"Skipped compaction",
		"Skipped agentic compaction",
		"Agentic compaction failed",
		"Agent model request diagnostics",
	]

	/** Cap per payload so an unexpected object cannot flood the channel. */
	private static readonly PAYLOAD_CHAR_LIMIT = 2_000

	private static subscribers: Set<(msg: string) => void> = new Set()

	private static wantsPayload(message: string): boolean {
		return Logger.isVerbose || Logger.ALWAYS_PAYLOAD_PREFIXES.some((prefix) => message.startsWith(prefix))
	}

	private static serializePayloads(args: any[]): string {
		return args
			.map((arg) => {
				let serialized: string
				try {
					serialized = JSON.stringify(arg) ?? String(arg)
				} catch {
					serialized = String(arg)
				}
				return serialized.length > Logger.PAYLOAD_CHAR_LIMIT
					? `${serialized.slice(0, Logger.PAYLOAD_CHAR_LIMIT)}...[truncated]`
					: serialized
			})
			.join(" ")
	}

	private static output(msg: string): void {
		for (const subscriber of Logger.subscribers) {
			try {
				subscriber(msg)
			} catch {
				// ignore errors from subscribers
			}
		}
	}

	/**
	 * Register a callback to receive log output messages.
	 */
	static subscribe(outputFn: (msg: string) => void) {
		Logger.subscribers.add(outputFn)
	}

	static error(message: string, ...args: any[]) {
		Logger.#output("ERROR", message, undefined, args)
	}

	static warn(message: string, ...args: any[]) {
		Logger.#output("WARN", message, undefined, args)
	}

	static log(message: string, ...args: any[]) {
		Logger.#output("LOG", message, undefined, args)
	}

	static debug(message: string, ...args: any[]) {
		Logger.#output("DEBUG", message, undefined, args)
	}

	static info(message: string, ...args: any[]) {
		Logger.#output("INFO", message, undefined, args)
	}

	static trace(message: string, ...args: any[]) {
		Logger.#output("TRACE", message, undefined, args)
	}

	static #output(level: string, message: string, error: Error | undefined, args: any[]) {
		try {
			let fullMessage = message
			if (args.length > 0 && Logger.wantsPayload(message)) {
				fullMessage += ` ${Logger.serializePayloads(args)}`
			}
			const errorSuffix = error?.message ? ` ${error.message}` : ""
			const ts = new Date().toISOString()
			Logger.output(`${ts} ${level} ${fullMessage}${errorSuffix}`.trimEnd())
		} catch {
			// do nothing if Logger fails
		}
	}
}
