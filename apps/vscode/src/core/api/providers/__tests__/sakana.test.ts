import "should"
import { SAKANA_API_BASE_URL, sakanaDefaultModelId } from "@shared/api"
import sinon from "sinon"
import { SakanaHandler } from "../sakana"

describe("SakanaHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	const createAsyncIterable = (data: any[] = []) => ({
		[Symbol.asyncIterator]: async function* () {
			yield* data
		},
	})

	it("should construct with default options", () => {
		const handler = new SakanaHandler({ sakanaApiKey: "test-key" })
		handler.should.be.instanceOf(SakanaHandler)
	})

	it("should default protocol to 'responses'", () => {
		const handler = new SakanaHandler({ sakanaApiKey: "test-key" })
		const protocol = (handler as any).getProtocol()
		protocol.should.equal("responses")
	})

	it("should allow overriding protocol to 'chat_completions'", () => {
		const handler = new SakanaHandler({
			sakanaApiKey: "test-key",
			sakanaApiProtocol: "chat_completions",
		})
		const protocol = (handler as any).getProtocol()
		protocol.should.equal("chat_completions")
	})

	it("should throw when no API key is provided", () => {
		const handler = new SakanaHandler({})
		;(() => (handler as any).ensureClient()).should.throw(/Sakana API key is required/)
	})

	it("should create client with correct base URL", () => {
		const handler = new SakanaHandler({ sakanaApiKey: "test-key" })
		const client = (handler as any).ensureClient()
		client.should.be.ok()
		client.baseURL.should.equal(SAKANA_API_BASE_URL)
	})

	it("should return default model when no model ID provided", () => {
		const handler = new SakanaHandler({ sakanaApiKey: "test-key" })
		const model = handler.getModel()
		model.id.should.equal(sakanaDefaultModelId)
		model.info.should.be.ok()
	})

	it("should return user-provided model ID", () => {
		const handler = new SakanaHandler({
			sakanaApiKey: "test-key",
			sakanaModelId: "fugu-ultra",
		})
		const model = handler.getModel()
		model.id.should.equal("fugu-ultra")
	})

	it("should throw when using Responses API without tools", async () => {
		const handler = new SakanaHandler({ sakanaApiKey: "test-key" })
		sinon.stub(handler, "getModel").returns({
			id: "fugu",
			info: { maxTokens: 4096 } as any,
		})

		let error: Error | undefined
		try {
			for await (const _ of handler.createMessage("system", [{ role: "user", content: "hi" }])) {
				// drain
			}
		} catch (err) {
			error = err as Error
		}
		error!.message.should.match(/Native tool calling must be enabled/)
	})

	it("should use chat protocol", async () => {
		const handler = new SakanaHandler({
			sakanaApiKey: "test-key",
			sakanaApiProtocol: "chat_completions",
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
								choices: [{}],
								usage: { prompt_tokens: 5, completion_tokens: 1 },
							},
						]),
					),
				},
			},
		}
		sinon.stub(handler as any, "ensureClient").returns(fakeClient as any)
		sinon.stub(handler, "getModel").returns({
			id: "fugu",
			info: { maxTokens: 4096, inputPrice: 0, outputPrice: 0 } as any,
		})

		const chunks: any[] = []
		for await (const chunk of handler.createMessage("system", [{ role: "user", content: "hi" }])) {
			chunks.push(chunk)
		}

		chunks.length.should.equal(2)
		chunks[0].should.deepEqual({ type: "text", text: "hello" })
		chunks[1].type.should.equal("usage")
	})

	it("should emit Responses API tool calls from done events", async () => {
		const handler = new SakanaHandler({
			sakanaApiKey: "test-key",
			sakanaApiProtocol: "responses",
		})

		const fakeClient = {
			responses: {
				create: sinon.stub().resolves(
					createAsyncIterable([
						{
							type: "response.output_item.added",
							item: { type: "function_call", id: "item_1", call_id: "call_1", name: "read_file" },
						},
						{
							type: "response.function_call_arguments.done",
							item_id: "item_1",
							name: "read_file",
							arguments: '{"path":"README.md"}',
						},
					]),
				),
			},
		}
		sinon.stub(handler as any, "ensureClient").returns(fakeClient as any)
		sinon.stub(handler, "getModel").returns({
			id: "fugu",
			info: { maxTokens: 4096 } as any,
		})

		const chunks: any[] = []
		const tools = [{ type: "function", function: { name: "read_file", parameters: { type: "object" } } }] as any
		for await (const chunk of handler.createMessage("system", [{ role: "user", content: "hi" }], tools)) {
			chunks.push(chunk)
		}

		chunks.should.deepEqual([
			{
				type: "tool_calls",
				id: "item_1",
				tool_call: {
					call_id: "call_1",
					function: {
						id: "item_1",
						name: "read_file",
						arguments: '{"path":"README.md"}',
					},
				},
			},
		])
	})
})
