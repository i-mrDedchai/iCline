import { ApiFormat } from "@shared/proto/cline/models"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { parseProviderId } from "./provider-id"

const stateMocks = vi.hoisted(() => ({
	getApiConfiguration: vi.fn((): unknown => ({})),
}))

vi.mock("@/core/storage/StateManager", () => ({
	StateManager: {
		get: () => ({
			getApiConfiguration: stateMocks.getApiConfiguration,
		}),
	},
}))

vi.mock("../provider-migration", () => ({
	getProviderSettingsManager: () => ({
		getProviderSettings: vi.fn((): unknown => undefined),
	}),
}))

describe("applyHostModelInfoOverrides — sakana api protocol (inert dropdown regression)", () => {
	let applyHostModelInfoOverrides: typeof import("./host-overrides")["applyHostModelInfoOverrides"]
	const sakana = parseProviderId("sakana")
	const vertex = parseProviderId("vertex")

	beforeAll(async () => {
		;({ applyHostModelInfoOverrides } = await import("./host-overrides"))
	})

	beforeEach(() => {
		stateMocks.getApiConfiguration.mockReturnValue({})
	})

	it("maps chat_completions to OPENAI_CHAT so the dropdown changes the wire format", () => {
		stateMocks.getApiConfiguration.mockReturnValue({ sakanaApiProtocol: "chat_completions" })
		const result = applyHostModelInfoOverrides(sakana, "fugu", {
			supportsPromptCache: false,
			apiFormat: ApiFormat.OPENAI_RESPONSES,
		})
		expect(result.apiFormat).toBe(ApiFormat.OPENAI_CHAT)
	})

	it("maps responses to OPENAI_RESPONSES", () => {
		stateMocks.getApiConfiguration.mockReturnValue({ sakanaApiProtocol: "responses" })
		const result = applyHostModelInfoOverrides(sakana, "fugu", { supportsPromptCache: false })
		expect(result.apiFormat).toBe(ApiFormat.OPENAI_RESPONSES)
	})

	it("keeps the SDK default when the protocol is unset", () => {
		const base = { supportsPromptCache: false, apiFormat: ApiFormat.OPENAI_RESPONSES }
		const result = applyHostModelInfoOverrides(sakana, "fugu", base)
		expect(result).toBe(base)
	})

	it("leaves other providers untouched", () => {
		stateMocks.getApiConfiguration.mockReturnValue({ sakanaApiProtocol: "chat_completions" })
		const base = { supportsPromptCache: false, apiFormat: ApiFormat.OPENAI_RESPONSES }
		const result = applyHostModelInfoOverrides(vertex, "fugu", base)
		expect(result.apiFormat).toBe(ApiFormat.OPENAI_RESPONSES)
	})
})
