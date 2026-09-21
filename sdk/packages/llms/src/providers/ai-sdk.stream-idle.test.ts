import type {
	AgentModelEvent,
	AgentToolDefinition,
	GatewayProviderContext,
	GatewayStreamRequest,
} from "@cline/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenAICompatibleProvider } from "./ai-sdk";
import { STREAM_IDLE_TIMEOUT_MS } from "./stream-idle-watchdog";

/**
 * The failure smoke 2026-09-21 reported on Cline's free tier (GLM 5.3 Flash): the reply
 * crawled out a few tokens at a time and then simply STOPPED. Nothing errored, because
 * nothing was wrong with the request — the gateway had gone quiet with the connection
 * open. Nothing downstream can see that state: the SDK's retry covers request initiation,
 * the empty-response retry needs a turn that ENDED, and the agent loop's turn-level retry
 * needs a `finish` event to say `error`. So the turn sat on screen until the provider's
 * own gateway gave up, which the user experienced as "Upstream idle timeout exceeded"
 * minutes later, with no retry.
 *
 * These tests drive the real adapter and the real `ai` package against a fetch that
 * stalls on purpose, and require the silence to come back as an ordinary retryable
 * provider error.
 */

const chunk = (delta: unknown, finish: string | null = null) =>
	`data: ${JSON.stringify({
		id: "cmpl-1",
		object: "chat.completion.chunk",
		created: 1,
		model: "test-model",
		choices: [{ index: 0, delta, finish_reason: finish }],
	})}\n\n`;

async function collect(
	iterable: AsyncIterable<AgentModelEvent>,
): Promise<AgentModelEvent[]> {
	const events: AgentModelEvent[] = [];
	for await (const event of iterable) {
		events.push(event);
	}
	return events;
}

function streamRequest(
	tools: AgentToolDefinition[] = [],
): GatewayStreamRequest {
	return {
		providerId: "openai-compatible",
		modelId: "test-model",
		messages: [
			{
				id: "msg_user",
				role: "user",
				content: [{ type: "text", text: "do the thing" }],
				createdAt: new Date(),
			},
		],
		tools,
	} as unknown as GatewayStreamRequest;
}

function providerContext(
	providerId: string,
	config: Record<string, unknown>,
): GatewayProviderContext {
	const model = { id: "test-model", providerId, name: "test-model" };
	return {
		provider: {
			id: providerId,
			name: providerId,
			defaultModelId: "test-model",
			models: [model],
		},
		model,
		config,
	} as unknown as GatewayProviderContext;
}

/**
 * A gateway that sends one part and then says nothing — ever. Deliberately reactive to the
 * abort signal, because that is the only thing that can end it: if the adapter never
 * aborts, this stream never rejects and the test fails by timing out rather than passing
 * silently.
 */
function stallingFetch() {
	/** One entry per call: whether the vendor was handed a signal, and whether it aborted. */
	const calls: { hadSignal: boolean; aborted: boolean; listenerFired: boolean }[] = [];
	const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
		const signal = (init?.signal ?? null) as AbortSignal | null;
		const seen = { hadSignal: signal !== null, aborted: signal?.aborted ?? false, listenerFired: false };
		calls.push(seen);
		const encoder = new TextEncoder();
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(
					encoder.encode(chunk({ role: "assistant", content: "wor" })),
				);
				signal?.addEventListener(
					"abort",
					() => {
						seen.aborted = true;
						seen.listenerFired = true;
						controller.error(new Error("aborted by abort signal"));
					},
					{ once: true },
				);
			},
		});
		return new Response(body, {
			status: 200,
			headers: { "content-type": "text/event-stream" },
		});
	});
	return { fetchMock, calls };
}

async function runStalling() {
	const { fetchMock, calls } = stallingFetch();
	const config = {
		providerId: "openai-compatible",
		apiKey: "test-key",
		baseUrl: "http://fake.local/v1",
		fetch: fetchMock as unknown as typeof fetch,
	};
	const provider = await createOpenAICompatibleProvider(config);
	const events = collect(
		await provider.stream(
			streamRequest(),
			providerContext("openai-compatible", config),
		),
	);
	return { fetchMock, calls, events };
}

const finishEvent = (events: AgentModelEvent[]) =>
	events.find((event) => event.type === "finish") as
		| { type: "finish"; reason?: string; error?: string; errorRetryable?: boolean }
		| undefined;

describe("a provider stream that stops producing", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("ends as a RETRYABLE idle timeout instead of hanging the turn", async () => {
		vi.useFakeTimers();
		const { calls, events } = await runStalling();

		// Nothing for the whole budget: still running, because a reasoning model is
		// allowed to be silent while it thinks.
		await vi.advanceTimersByTimeAsync(STREAM_IDLE_TIMEOUT_MS - 1_000);
		expect(calls.some((call) => call.aborted)).toBe(false);

		await vi.advanceTimersByTimeAsync(2_000);
		const finish = finishEvent(await events);

		// The vendor call really was handed a signal (the watchdog's, not the caller's bare
		// one) and that signal — or its successor on a re-issued request — really aborted.
		expect(calls.length).toBeGreaterThan(0);
		expect(calls.every((call) => call.hadSignal), "every vendor call must carry a signal").toBe(true);
		expect(
			calls.some((call) => call.aborted),
			"the vendor call must be aborted when the stream goes idle",
		).toBe(true);
		expect(finish?.reason).toBe("error");
		expect(finish?.error).toMatch(/idle timeout/i);
		// The whole point of the watchdog: the turn is worth another attempt, so the
		// existing turn-level retry takes it. An abort would otherwise read as terminal.			expect(finish?.errorRetryable).toBe(true);
	}, 15_000);

	it("leaves a stream that keeps producing alone, however slowly it dribbles", async () => {
		const encoder = new TextEncoder();
		let pulls = 0;
		const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
			const signal = init?.signal;
			const body = new ReadableStream<Uint8Array>({
				async pull(controller) {
					pulls += 1;
					if (pulls > 4) {
						controller.enqueue(encoder.encode(chunk({}, "stop")));
						controller.enqueue(encoder.encode("data: [DONE]\n\n"));
						controller.close();
						return;
					}
					// Every read yields a part after a real (short) wait — slow, but alive.
					await new Promise((resolve) => setTimeout(resolve, 700));
					if (signal?.aborted) {
						controller.error(new Error("aborted by abort signal"));
						return;
					}
					controller.enqueue(
						encoder.encode(chunk({ role: "assistant", content: "tok" })),
					);
				},
			});
			return new Response(body, {
				status: 200,
				headers: { "content-type": "text/event-stream" },
			});
		});
		const config = {
			providerId: "openai-compatible",
			apiKey: "test-key",
			baseUrl: "http://fake.local/v1",
			fetch: fetchMock as unknown as typeof fetch,
		};
		const provider = await createOpenAICompatibleProvider(config);

		const events = await collect(
			await provider.stream(
				streamRequest(),
				providerContext("openai-compatible", config),
			),
		);

		const finish = finishEvent(events);
		expect(finish?.reason).not.toBe("error");
		expect(events.some((event) => event.type === "text-delta")).toBe(true);
	});
});
