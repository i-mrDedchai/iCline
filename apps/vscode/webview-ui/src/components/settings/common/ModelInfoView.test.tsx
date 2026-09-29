import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ModelInfoView } from "./ModelInfoView"

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({
		apiConfiguration: {},
	}),
}))

vi.mock("@/hooks/useProviderModels", () => ({
	useProviderModels: () => ({
		models: {},
		isLoading: false,
		error: null,
		refresh: vi.fn(),
	}),
}))

describe("ModelInfoView", () => {
	it("renders compact context and gateway source badge when contextWindowSource is gateway", () => {
		render(
			<ModelInfoView
				modelInfo={{
					contextWindow: 128000,
					contextWindowSource: "gateway",
				}}
				selectedModelId="test-model"
			/>,
		)

		expect(screen.getByText(/Context:/)).toBeTruthy()
		expect(screen.getByText(/128k/i)).toBeTruthy()
		expect(screen.getByTestId("context-window-source")).toBeTruthy()
		expect(screen.getByTestId("context-window-source").textContent).toBe("gateway")
	})

	it("renders cross-catalog majority badge when contextWindowSource is catalog", () => {
		render(
			<ModelInfoView
				modelInfo={{
					contextWindow: 1050000,
					contextWindowSource: "catalog",
				}}
				selectedModelId="test-model"
			/>,
		)

		expect(screen.getByText(/Context:/)).toBeTruthy()
		expect(screen.getByTestId("context-window-source")).toBeTruthy()
		expect(screen.getByTestId("context-window-source").textContent).toBe("catalog")
	})

	it("renders user override badge when contextWindowSource is override", () => {
		render(
			<ModelInfoView
				modelInfo={{
					contextWindow: 32000,
					contextWindowSource: "override",
				}}
				selectedModelId="test-model"
			/>,
		)

		expect(screen.getByText(/Context:/)).toBeTruthy()
		expect(screen.getByTestId("context-window-source")).toBeTruthy()
		expect(screen.getByTestId("context-window-source").textContent).toBe("override")
	})
})
