import { describe, expect, it } from "vitest"
import { isClineManagedProvider } from "@/shared/utils/cline"
import { sameProviderIdentity, shouldHotSwapActiveSessionModel } from "./SdkController"
import { resolveWorkspaceRootPath } from "./workspace-root"

describe("isClineManagedProvider", () => {
	it("treats both Cline account providers as Cline providers", () => {
		expect(isClineManagedProvider("cline")).toBe(true)
		expect(isClineManagedProvider("cline-pass")).toBe(true)
		expect(isClineManagedProvider("anthropic")).toBe(false)
		expect(isClineManagedProvider(undefined)).toBe(false)
	})
})

describe("sameProviderIdentity", () => {
	it("matches lowercased catalog ids to legacy ApiProvider spelling", () => {
		expect(sameProviderIdentity("nousresearch", "nousResearch")).toBe(true)
		expect(sameProviderIdentity("xai", "xai")).toBe(true)
	})

	it("matches extension openai to SDK openai-compatible session ids", () => {
		expect(sameProviderIdentity("openai", "openai-compatible")).toBe(true)
		expect(sameProviderIdentity("openai-compatible", "openai")).toBe(true)
	})

	it("does not match distinct providers", () => {
		expect(sameProviderIdentity("xai", "zai")).toBe(false)
		expect(sameProviderIdentity("xai", undefined)).toBe(false)
	})
})

describe("shouldHotSwapActiveSessionModel", () => {
	it("hot-swaps when the live session is already on the selected provider", () => {
		expect(
			shouldHotSwapActiveSessionModel({
				eventMode: "act",
				eventProviderId: "xai",
				currentMode: "act",
				sessionProviderId: "xai",
			}),
		).toBe(true)
	})

	it("does not hot-swap a cross-provider click onto the old session", () => {
		expect(
			shouldHotSwapActiveSessionModel({
				eventMode: "act",
				eventProviderId: "zai",
				currentMode: "act",
				sessionProviderId: "xai",
			}),
		).toBe(false)
	})

	it("does not hot-swap when the session is still on the SDK openai-compatible id", () => {
		expect(
			shouldHotSwapActiveSessionModel({
				eventMode: "act",
				eventProviderId: "anthropic",
				currentMode: "act",
				sessionProviderId: "openai-compatible",
			}),
		).toBe(false)
	})

	it("skips the inactive plan/act mode", () => {
		expect(
			shouldHotSwapActiveSessionModel({
				eventMode: "plan",
				eventProviderId: "xai",
				currentMode: "act",
				sessionProviderId: "xai",
			}),
		).toBe(false)
	})

	it("skips when there is no session to update", () => {
		expect(
			shouldHotSwapActiveSessionModel({
				eventMode: "act",
				eventProviderId: "xai",
				currentMode: "act",
				sessionProviderId: undefined,
			}),
		).toBe(false)
	})
})

describe("resolveWorkspaceRootPath", () => {
	it("uses the first non-empty workspace path when available", () => {
		expect(resolveWorkspaceRootPath(["", "/workspace"], "/Users/tester/Desktop")).toBe("/workspace")
	})

	it("falls back to Desktop when no workspace folder is open", () => {
		expect(resolveWorkspaceRootPath([], "/Users/tester/Desktop")).toBe("/Users/tester/Desktop")
	})
})
