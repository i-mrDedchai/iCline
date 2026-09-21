/**
 * Every model the Cline feed OFFERS must be DESCRIBED by the catalog the picker reads.
 *
 * The class of bug this guards (dev.6-fix.26, `z-ai/glm-5.3-flash`): a model the Free
 * feed lists, and that sessions actually run on, resolved to no metadata anywhere —
 * because the catalog kept only the canonical sibling of its id (`zai/glm-5.3-flash`,
 * the billed OpenRouter route) and dropped the free one. The user could still select
 * it, and then saw a row with no capability icons, an Effort list made of the generic
 * OpenAI vocabulary (six levels this model does not take), and a Thinking switch that
 * disabled itself for good the first time it was turned off.
 *
 * So the assertion is not "the id exists" but "the id is described": the row's icons
 * and the Options panel's levels both come from this one entry, and an offered model
 * with no entry is exactly the state that shipped a lie.
 *
 * A model that is genuinely not in the bundled catalog has to be listed in
 * `DESCRIBED_ELSEWHERE` with the source that describes it instead, so the next reader
 * knows where its metadata comes from rather than guessing.
 */
import { describe, expect, it } from "vitest"
import { BUILTIN_SPECS } from "../providers/builtins"
import { GENERATED_CLINE_RECOMMENDED_MODELS } from "./cline-recommended.generated"

/**
 * Offered ids the BUNDLED catalog cannot describe, and who does describe them (checked
 * by hand): each is a Cline-internal route the runtime resolves from its own feed at
 * selection time, and the picker draws no icons for them — the honest state, not the
 * lying one, because nothing claims capabilities it cannot see.
 */
const DESCRIBED_ELSEWHERE: Readonly<Record<string, string>> = {}

/**
 * The map the picker reads for `cline` — the spec's own factory (`buildClineModels`),
 * NOT the registry lookup: that one resolves live-truth sources and a spec context, and
 * answers "nothing" here for every id, which would make this guard pass or fail on the
 * wrong question.
 */
const clineModels = (): Record<string, { capabilities?: unknown[]; reasoningOptions?: unknown[]; supportsReasoning?: boolean; thinkingConfig?: unknown }> => {
	const spec = BUILTIN_SPECS.find((candidate) => candidate.id === "cline")
	if (!spec?.modelsFactory) {
		throw new Error("the cline builtin spec has no modelsFactory")
	}
	return spec.modelsFactory()
}

const OFFERED_IDS = [
	...GENERATED_CLINE_RECOMMENDED_MODELS.recommended.map((model) => model.id),
	...GENERATED_CLINE_RECOMMENDED_MODELS.free.map((model) => model.id),
]

describe("Cline's offered models are described by its catalog", () => {
	it("offers something (the guard is not vacuous)", () => {
		expect(OFFERED_IDS.length).toBeGreaterThan(5)
	})

	for (const modelId of OFFERED_IDS) {
		it(`${modelId} resolves to capability metadata`, () => {
			const info = clineModels()[modelId]
			if (Object.hasOwn(DESCRIBED_ELSEWHERE, modelId)) {
				expect(DESCRIBED_ELSEWHERE[modelId]).toBeTruthy()
				return
			}
			expect(info, `${modelId} is offered by the Cline feed but the cline catalog has no entry for it`).toBeDefined()
			// What the picker reads a row and the Options panel out of: at least one
			// published capability, or the reasoning controls. A name-only entry would
			// still leave the row saying "No capability data".
			const described =
				(info?.capabilities?.length ?? 0) > 0 ||
				(info?.reasoningOptions?.length ?? 0) > 0 ||
				info?.supportsReasoning === true ||
				info?.thinkingConfig !== undefined
			expect(described, `${modelId} has an entry but no capability metadata`).toBe(true)
		})
	}
})
