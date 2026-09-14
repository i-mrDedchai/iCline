import { describe, expect, it } from "vitest"
import {
	compareModelEntries,
	filterModelsByQuery,
	isFreeModel,
	type ModelEntry,
	modelsMatchQuery,
	partitionFreeStandard,
} from "./quickModelPickerList"

describe("isFreeModel", () => {
	it("detects :free in id", () => {
		expect(isFreeModel("openrouter/auto:free")).toBe(true)
	})
	it("detects -free in id", () => {
		expect(isFreeModel("meta-llama-free")).toBe(true)
		expect(isFreeModel("foo-Free-bar")).toBe(true)
	})
	it("detects (free) in name", () => {
		expect(isFreeModel("gpt-4", "GPT-4 (free)")).toBe(true)
	})
	it("is case-insensitive", () => {
		expect(isFreeModel("MODEL:FREE")).toBe(true)
		expect(isFreeModel("x", "(FREE)")).toBe(true)
	})
	it("returns false for paid models", () => {
		expect(isFreeModel("gpt-4o")).toBe(false)
		expect(isFreeModel("claude-3", "Claude 3 Opus")).toBe(false)
		expect(isFreeModel("freedom-fighter")).toBe(false) // no :free / -free / (free)
	})
})

describe("compareModelEntries", () => {
	it("puts active model first", () => {
		const a = { id: "zebra", name: "Zebra" }
		const b = { id: "alpha", name: "Alpha" }
		expect(compareModelEntries(a, b, "zebra")).toBeLessThan(0)
		expect(compareModelEntries(b, a, "zebra")).toBeGreaterThan(0)
	})
	it("sorts A–Z by display name with base sensitivity", () => {
		expect(compareModelEntries({ id: "b", name: "Beta" }, { id: "a", name: "alpha" })).toBeGreaterThan(0)
		expect(compareModelEntries({ id: "a" }, { id: "b" })).toBeLessThan(0)
	})
	it("falls back to id when name missing", () => {
		expect(compareModelEntries({ id: "mistral" }, { id: "llama" })).toBeGreaterThan(0)
	})
})

describe("filterModelsByQuery", () => {
	const models = {
		"org/gpt-4": { name: "GPT-4" },
		"org/llama-free": { name: "Llama Free" },
		"other/claude": { name: "Claude" },
	}

	it("returns all when query empty", () => {
		expect(filterModelsByQuery(models, "")).toHaveLength(3)
		expect(filterModelsByQuery(models, "   ")).toHaveLength(3)
	})
	it("filters by id case-insensitively", () => {
		const r = filterModelsByQuery(models, "LLAMA")
		expect(r.map(([id]) => id)).toEqual(["org/llama-free"])
	})
	it("filters by name case-insensitively", () => {
		const r = filterModelsByQuery(models, "claude")
		expect(r.map(([id]) => id)).toEqual(["other/claude"])
	})
	it("returns empty when nothing matches", () => {
		expect(filterModelsByQuery(models, "xyzzy")).toHaveLength(0)
	})
})

describe("partitionFreeStandard", () => {
	it("puts free first section and keeps active-first sort within", () => {
		const entries: ModelEntry[] = [
			["paid/b", { name: "Beta Paid" }],
			["free/a:free", { name: "Alpha Free" }],
			["paid/active", { name: "Active Paid" }],
			["free/z-free", { name: "Zebra Free" }],
		]
		const { free, standard } = partitionFreeStandard(entries, "paid/active")
		expect(free.map(([id]) => id)).toEqual(["free/a:free", "free/z-free"])
		expect(standard.map(([id]) => id)[0]).toBe("paid/active")
		expect(standard.map(([id]) => id)).toEqual(["paid/active", "paid/b"])
	})
	it("leaves a section empty when no models of that kind", () => {
		const entries: ModelEntry[] = [["a", { name: "A" }]]
		const { free, standard } = partitionFreeStandard(entries)
		expect(free).toHaveLength(0)
		expect(standard).toHaveLength(1)
	})
})

describe("modelsMatchQuery", () => {
	it("is true when any model matches", () => {
		expect(modelsMatchQuery({ "x/y": { name: "Hello" } }, "hel")).toBe(true)
	})
	it("is false when none match", () => {
		expect(modelsMatchQuery({ "x/y": { name: "Hello" } }, "zzz")).toBe(false)
	})
})
