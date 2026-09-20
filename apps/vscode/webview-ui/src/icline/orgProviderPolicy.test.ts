import { describe, expect, it } from "vitest"
import { orgProviderBlock } from "./orgProviderPolicy"

/**
 * The rule mirrors the host's `isProviderValid`: an empty allowed list means no
 * policy, and anything outside a non-empty list cannot be selected because the
 * remote-config layer (org policy) outranks every local write.
 */
describe("orgProviderBlock", () => {
	it("allows everything when the organization publishes no list", () => {
		expect(orgProviderBlock(undefined, "xai")).toBeUndefined()
		expect(orgProviderBlock({}, "xai")).toBeUndefined()
		expect(orgProviderBlock({ remoteConfiguredProviders: [] }, "xai")).toBeUndefined()
	})

	it("allows a provider the organization lists", () => {
		expect(orgProviderBlock({ remoteConfiguredProviders: ["cline", "xai"] }, "xai")).toBeUndefined()
	})

	it("blocks a provider outside the list and reports what is allowed", () => {
		expect(orgProviderBlock({ remoteConfiguredProviders: ["cline"] }, "xai")).toEqual({
			allowed: ["cline"],
			requested: "xai",
		})
	})

	it("ignores blank entries rather than treating them as policy", () => {
		expect(orgProviderBlock({ remoteConfiguredProviders: ["", "  "] }, "xai")).toBeUndefined()
		// A blank next to a real provider must not match either.
		expect(orgProviderBlock({ remoteConfiguredProviders: ["  ", "cline"] }, "xai")?.allowed).toEqual(["cline"])
	})
})
