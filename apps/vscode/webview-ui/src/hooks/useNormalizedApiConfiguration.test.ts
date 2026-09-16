import { ApiFormat, ResolveModelInfoResponse } from "@shared/proto/cline/models"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ModelsServiceClient } from "@/services/grpc-client"
import { useNormalizedApiConfiguration } from "./useNormalizedApiConfiguration"

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: vi.fn(),
}))

vi.mock("@/services/grpc-client", () => ({
	ModelsServiceClient: {
		resolveModelInfo: vi.fn(),
		resolveProviderModels: vi.fn(),
	},
}))

const mockUseExtensionState = vi.mocked(useExtensionState)
const mockResolveModelInfo = vi.mocked(ModelsServiceClient.resolveModelInfo)
const mockResolveProviderModels = vi.mocked(ModelsServiceClient.resolveProviderModels)

function setApiConfiguration(apiConfiguration: Record<string, unknown>, extra?: Partial<ReturnType<typeof useExtensionState>>) {
	mockUseExtensionState.mockReturnValue({ apiConfiguration, ...extra } as ReturnType<typeof useExtensionState>)
}

function modelInfoResponse(providerId: string, modelId: string, contextWindow = 1_000_000) {
	return ResolveModelInfoResponse.create({
		providerId,
		modelId,
		source: "sdk-known-models",
		modelInfo: {
			name: "DeepSeek V4 Pro",
			contextWindow,
			maxTokens: 384_000,
			supportsPromptCache: true,
			supportsReasoning: true,
			apiFormat: ApiFormat.OPENAI_CHAT,
		},
	})
}

function deepSeekResponse(modelId: string, contextWindow = 1_000_000) {
	return modelInfoResponse("deepseek", modelId, contextWindow)
}

describe("useNormalizedApiConfiguration", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		setApiConfiguration({})
	})

	it("resolves DeepSeek model info through the pure RPC", async () => {
		setApiConfiguration({ actModeApiProvider: "deepseek", actModeApiModelId: "deepseek-v4-pro" })
		mockResolveModelInfo.mockResolvedValue(deepSeekResponse("deepseek-v4-pro"))

		const { result } = renderHook(() => useNormalizedApiConfiguration("act"))

		expect(result.current.selectedModelInfo.contextWindow).toBeUndefined()
		await waitFor(() => expect(result.current.selectedModelInfo.contextWindow).toBe(1_000_000))
		expect(result.current.selectedModelId).toBe("deepseek-v4-pro")
		expect(mockResolveModelInfo).toHaveBeenCalledWith({ providerId: "deepseek", modelId: "deepseek-v4-pro" })
		expect(mockResolveProviderModels).not.toHaveBeenCalled()
	})

	it("does not flash 128K before the DeepSeek RPC resolves", () => {
		setApiConfiguration({ actModeApiProvider: "deepseek", actModeApiModelId: "deepseek-v4-pro" })
		mockResolveModelInfo.mockReturnValue(new Promise(() => undefined))

		const { result } = renderHook(() => useNormalizedApiConfiguration("act"))

		expect(result.current.selectedModelInfo.contextWindow).toBeUndefined()
		expect(mockResolveProviderModels).not.toHaveBeenCalled()
	})

	it("uses the SDK default model info when model id is empty", async () => {
		setApiConfiguration({ actModeApiProvider: "deepseek", actModeApiModelId: "" })
		mockResolveModelInfo.mockResolvedValue(deepSeekResponse("deepseek-v4-flash"))

		const { result } = renderHook(() => useNormalizedApiConfiguration("act"))

		await waitFor(() => expect(result.current.selectedModelId).toBe("deepseek-v4-flash"))
		expect(result.current.selectedModelInfo.contextWindow).toBe(1_000_000)
		expect(mockResolveModelInfo).toHaveBeenCalledWith({ providerId: "deepseek", modelId: undefined })
		expect(mockResolveProviderModels).not.toHaveBeenCalled()
	})

	it("uses Cline-specific model fields instead of stale generic or OpenRouter fields", async () => {
		setApiConfiguration({
			actModeApiProvider: "cline",
			actModeApiModelId: "openai/gpt-5.4",
			actModeOpenRouterModelId: "anthropic/claude-sonnet-4.5",
			actModeClineModelId: "anthropic/claude-sonnet-4.6",
		})
		mockResolveModelInfo.mockResolvedValue(modelInfoResponse("cline", "anthropic/claude-sonnet-4.6"))

		const { result } = renderHook(() => useNormalizedApiConfiguration("act"))

		await waitFor(() => expect(result.current.selectedModelId).toBe("anthropic/claude-sonnet-4.6"))
		expect(mockResolveModelInfo).toHaveBeenCalledWith({ providerId: "cline", modelId: "anthropic/claude-sonnet-4.6" })
	})

	it("asks the backend for the Cline default when no Cline-specific model is selected", async () => {
		setApiConfiguration({
			actModeApiProvider: "cline",
			actModeApiModelId: "openai/gpt-5.4",
			actModeOpenRouterModelId: "anthropic/claude-sonnet-4.5",
		})
		mockResolveModelInfo.mockResolvedValue(modelInfoResponse("cline", "anthropic/claude-sonnet-4.6"))

		const { result } = renderHook(() => useNormalizedApiConfiguration("act"))

		await waitFor(() => expect(result.current.selectedModelId).toBe("anthropic/claude-sonnet-4.6"))
		expect(mockResolveModelInfo).toHaveBeenCalledWith({ providerId: "cline", modelId: undefined })
	})

	it("resolves static SDK-backed providers through the model-info RPC", async () => {
		setApiConfiguration({ actModeApiProvider: "anthropic", actModeApiModelId: "claude-sonnet-4-5-20250929" })
		mockResolveModelInfo.mockResolvedValue(modelInfoResponse("anthropic", "claude-sonnet-4-5-20250929", 200_000))

		const { result } = renderHook(() => useNormalizedApiConfiguration("act"))

		await waitFor(() => expect(result.current.selectedModelInfo.contextWindow).toBe(200_000))
		expect(result.current.selectedProvider).toBe("anthropic")
		expect(result.current.selectedModelId).toBe("claude-sonnet-4-5-20250929")
		expect(mockResolveModelInfo).toHaveBeenCalledWith({
			providerId: "anthropic",
			modelId: "claude-sonnet-4-5-20250929",
		})
		expect(mockResolveProviderModels).not.toHaveBeenCalled()
	})

	it("uses local provider-specific model fields instead of a stale generic id", async () => {
		setApiConfiguration({
			actModeApiProvider: "ollama",
			actModeApiModelId: "stale-generic-model",
			actModeOllamaModelId: "llama3.1:8b",
		})
		mockResolveModelInfo.mockResolvedValue(modelInfoResponse("ollama", "llama3.1:8b", 32_768))

		const { result } = renderHook(() => useNormalizedApiConfiguration("act"))

		await waitFor(() => expect(result.current.selectedModelId).toBe("llama3.1:8b"))
		expect(mockResolveModelInfo).toHaveBeenCalledWith({ providerId: "ollama", modelId: "llama3.1:8b" })
	})

	it("uses VS Code LM selector as the active model id", async () => {
		setApiConfiguration({
			actModeApiProvider: "vscode-lm",
			actModeApiModelId: "stale-generic-model",
			actModeVsCodeLmModelSelector: { vendor: "copilot", family: "claude-sonnet" },
		})
		mockResolveModelInfo.mockResolvedValue(modelInfoResponse("vscode-lm", "copilot/claude-sonnet", 128_000))

		const { result } = renderHook(() => useNormalizedApiConfiguration("act"))

		await waitFor(() => expect(result.current.selectedModelId).toBe("copilot/claude-sonnet"))
		expect(mockResolveModelInfo).toHaveBeenCalledWith({ providerId: "vscode-lm", modelId: "copilot/claude-sonnet" })
	})

	it("ignores stale DeepSeek responses after provider/model changes", async () => {
		let resolveFirst: (value: ResolveModelInfoResponse) => void = () => undefined
		mockResolveModelInfo
			.mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
			.mockResolvedValueOnce(deepSeekResponse("deepseek-v4-flash", 1_000_000))
		setApiConfiguration({ actModeApiProvider: "deepseek", actModeApiModelId: "deepseek-v4-pro" })

		const { result, rerender } = renderHook(() => useNormalizedApiConfiguration("act"))

		setApiConfiguration({ actModeApiProvider: "deepseek", actModeApiModelId: "deepseek-v4-flash" })
		rerender()
		await act(async () => {
			resolveFirst(deepSeekResponse("deepseek-v4-pro", 500_000))
		})

		await waitFor(() => expect(result.current.selectedModelId).toBe("deepseek-v4-flash"))
		expect(result.current.selectedModelInfo.contextWindow).toBe(1_000_000)
	})
	it.each([
		["jan", "actModeJanModelId", "jan-local-7b"],
		["sakana", "actModeSakanaModelId", "fugu-ultra"],
		["zenmux", "actModeZenmuxModelId", "openrouter/auto"],
	] as const)("after switching to %s, selectedModelId is the dedicated field not leftover actModeApiModelId", async (provider, dedicatedKey, dedicatedId) => {
		setApiConfiguration({
			actModeApiProvider: provider,
			actModeApiModelId: "grok-composer-2.5-fast",
			[dedicatedKey]: dedicatedId,
		})
		mockResolveModelInfo.mockResolvedValue(modelInfoResponse(provider, dedicatedId, 32_768))

		const { result } = renderHook(() => useNormalizedApiConfiguration("act"))

		await waitFor(() => expect(result.current.selectedModelId).toBe(dedicatedId))
		expect(result.current.selectedProvider).toBe(provider)
		expect(result.current.selectedModelId).not.toBe("grok-composer-2.5-fast")
		expect(mockResolveModelInfo).toHaveBeenCalledWith({ providerId: provider, modelId: dedicatedId })
	})

	it.each([
		"jan",
		"sakana",
		"zenmux",
	] as const)("does not keep leftover grok-composer-2.5-fast when %s dedicated model id is empty", async (provider) => {
		setApiConfiguration({
			actModeApiProvider: provider,
			actModeApiModelId: "grok-composer-2.5-fast",
		})
		mockResolveModelInfo.mockResolvedValue(
			ResolveModelInfoResponse.create({
				providerId: provider,
				modelId: "",
				source: "unknown",
			}),
		)

		const { result } = renderHook(() => useNormalizedApiConfiguration("act"))

		expect(result.current.selectedProvider).toBe(provider)
		expect(result.current.selectedModelId).not.toBe("grok-composer-2.5-fast")
		await waitFor(() => expect(mockResolveModelInfo).toHaveBeenCalled())
		expect(mockResolveModelInfo).toHaveBeenCalledWith({ providerId: provider, modelId: undefined })
		expect(result.current.selectedModelId).not.toBe("grok-composer-2.5-fast")
	})

	it("keeps the requested xAI model id when resolve returns unknown (no sdk-default snap)", async () => {
		setApiConfiguration({ actModeApiProvider: "xai", actModeApiModelId: "grok-4.6" })
		mockResolveModelInfo.mockResolvedValue(
			ResolveModelInfoResponse.create({
				providerId: "xai",
				modelId: "grok-4.6",
				source: "unknown",
			}),
		)

		const { result } = renderHook(() => useNormalizedApiConfiguration("act"))

		await waitFor(() => expect(result.current.selectedModelId).toBe("grok-4.6"))
		expect(result.current.selectedModelInfo.contextWindow).toBeUndefined()
		expect(mockResolveModelInfo).toHaveBeenCalledWith({ providerId: "xai", modelId: "grok-4.6" })
	})

	it("uses live Settings catalog contextWindow over a stale resolve snapshot", async () => {
		setApiConfiguration({ actModeApiProvider: "cline", actModeClineModelId: "poolside/laguna-s-2.1:free" }, {
			providerModelsByProvider: {
				cline: {
					models: {
						"poolside/laguna-s-2.1:free": {
							name: "Laguna S 2.1",
							supportsPromptCache: false,
							contextWindow: 262_144,
						},
					},
				},
			},
		} as Partial<ReturnType<typeof useExtensionState>>)
		mockResolveModelInfo.mockResolvedValue(modelInfoResponse("cline", "poolside/laguna-s-2.1:free", 131_072))

		const { result } = renderHook(() => useNormalizedApiConfiguration("act"))

		await waitFor(() => expect(result.current.selectedModelId).toBe("poolside/laguna-s-2.1:free"))
		expect(result.current.selectedModelInfo.contextWindow).toBe(262_144)
	})

	it("does not keep Grok 4.6's 500k after switching to another Cline model", async () => {
		setApiConfiguration({ actModeApiProvider: "cline", actModeClineModelId: "cline-free/deepseek-v4.1-flash" }, {
			providerModelsByProvider: {
				cline: {
					models: {
						"cline-free/deepseek-v4.1-flash": {
							name: "DeepSeek V4.1 Flash",
							supportsPromptCache: false,
							contextWindow: 1_000_000,
						},
					},
				},
			},
		} as Partial<ReturnType<typeof useExtensionState>>)
		mockResolveModelInfo.mockResolvedValue(modelInfoResponse("xai", "grok-4.6", 500_000))

		const { result } = renderHook(() => useNormalizedApiConfiguration("act"))

		expect(result.current.selectedModelId).toBe("cline-free/deepseek-v4.1-flash")
		expect(result.current.selectedModelInfo.contextWindow).toBe(1_000_000)
	})

	it("hides contextWindow when the RPC is still for the previous model", async () => {
		setApiConfiguration({ actModeApiProvider: "cline", actModeClineModelId: "cline-free/deepseek-v4.1-flash" })
		mockResolveModelInfo.mockResolvedValue(modelInfoResponse("xai", "grok-4.6", 500_000))

		const { result } = renderHook(() => useNormalizedApiConfiguration("act"))

		await waitFor(() => expect(mockResolveModelInfo).toHaveBeenCalled())
		expect(result.current.selectedModelId).toBe("cline-free/deepseek-v4.1-flash")
		expect(result.current.selectedModelInfo.contextWindow).toBeUndefined()
	})
})
