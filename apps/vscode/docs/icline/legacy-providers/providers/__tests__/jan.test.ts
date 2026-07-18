import "should"
import sinon from "sinon"
import { JanHandler, getJanApiBaseUrl } from "../jan"

describe("JanHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	const createAsyncIterable = (data: any[] = []) => ({
		[Symbol.asyncIterator]: async function* () {
			yield* data
		},
	})

	const tools = [{ type: "function", function: { name: "read_file", description: "", parameters: { type: "object" } } }] as any

	it("should construct with default options", () => {
		const handler = new JanHandler({})
		handler.should.be.instanceOf(JanHandler)
	})

	it("should throw when creating client with no base URL (fallback to default)", () => {
		const handler = new JanHandler({})
		// ensureClient should work — it uses JAN_DEFAULT_BASE_URL as fallback
		const client = (handler as any).ensureClient()
		client.should.be.ok()
	})

	it("should normalize Jan base URLs correctly", () => {
		getJanApiBaseUrl().should.equal("http://127.0.0.1:1337/v1")
		getJanApiBaseUrl("http://localhost:3000").should.equal("http://localhost:3000/v1")
		getJanApiBaseUrl("http://localhost:3000/v1").should.equal("http://localhost:3000/v1")
		getJanApiBaseUrl("http://localhost:3000/").should.equal("http://localhost:3000/v1")
	})

	it("should return default model info when no model ID provided", () => {
		const handler = new JanHandler({})
		const model = handler.getModel()
		model.id.should.equal("jan-default")
		model.info.should.be.ok()
	})

	it("should return user-provided model ID", () => {
		const handler = new JanHandler({ janModelId: "my-model" })
		const model = handler.getModel()
		model.id.should.equal("my-model")
	})

	it("should emit text chunks from createMessage stream", async () => {
		const handler = new JanHandler({
			janBaseUrl: "http://127.0.0.1:1337",
		})
		const fakeClient = {
			chat: {
				completions: {
					create: sinon.stub().resolves(
						createAsyncIterable([
							{
								choices: [{ delta: { content: "hello" } }],
							},
							{
								choices: [{ delta: { content: " world" } }],
								usage: {
									prompt_tokens: 10,
									completion_tokens: 2,
								},
							},
						]),
					),
				},
			},
		}
		sinon.stub(handler as any, "ensureClient").returns(fakeClient as any)

		const chunks: any[] = []
		for await (const chunk of handler.createMessage("system", [{ role: "user", content: "hi" }])) {
			chunks.push(chunk)
		}

		chunks.should.deepEqual([
			{ type: "text", text: "hello" },
			{ type: "text", text: " world" },
			{
				type: "usage",
				inputTokens: 10,
				outputTokens: 2,
				cacheReadTokens: 0,
			},
		])
	})

	it("should emit reasoning_content when present", async () => {
		const handler = new JanHandler({
			janBaseUrl: "http://127.0.0.1:1337",
		})
		const fakeClient = {
			chat: {
				completions: {
					create: sinon.stub().resolves(
						createAsyncIterable([
							{
								choices: [{ delta: { reasoning_content: "Let me think..." } }],
							},
							{
								choices: [{ delta: { content: "answer" } }],
								usage: { prompt_tokens: 5, completion_tokens: 1 },
							},
						]),
					),
				},
			},
		}
		sinon.stub(handler as any, "ensureClient").returns(fakeClient as any)

		const chunks: any[] = []
		for await (const chunk of handler.createMessage("system", [{ role: "user", content: "q" }])) {
			chunks.push(chunk)
		}

		chunks.length.should.equal(3)
		chunks[0].should.deepEqual({ type: "reasoning", reasoning: "Let me think..." })
	})

	it("should wrap connection errors with Jan-specific message", async () => {
		const handler = new JanHandler({
			janBaseUrl: "http://127.0.0.1:1337",
		})
		const fakeClient = {
			chat: {
				completions: {
					create: sinon.stub().rejects(new Error("ECONNREFUSED")),
				},
			},
		}
		sinon.stub(handler as any, "ensureClient").returns(fakeClient as any)

		let error: Error | undefined
		try {
			for await (const _ of handler.createMessage("system", [{ role: "user", content: "hi" }])) {
				// drain
			}
		} catch (err) {
			error = err as Error
		}

		error!.message.should.match(/Failed to reach Jan Local API Server/)
		error!.message.should.match(/ECONNREFUSED/)
	})
})