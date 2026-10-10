#!/usr/bin/env node
// Reports whether NaraRouter's GET /v1/models has started returning grouping
// metadata (`group` / `group_display`), which the grouped-tabs work waits on.
// The key is read from the environment and never written to disk:
//   NARAROUTER_API_KEY=sk-nry-... node scripts/check-nararouter-groups.mjs

const GROUP_FIELDS = ["group", "group_display"]
const MODELS_URL = "https://router.bynara.id/v1/models"

const apiKey = process.env.NARAROUTER_API_KEY
if (!apiKey) {
	console.error("Set NARAROUTER_API_KEY to a NaraRouter key (sk-nry-...).")
	process.exit(2)
}

const res = await fetch(MODELS_URL, { headers: { Authorization: `Bearer ${apiKey}` } })
if (!res.ok) {
	console.error(`GET /v1/models failed: HTTP ${res.status}`)
	process.exit(1)
}

const body = await res.json()
const models = Array.isArray(body.data) ? body.data : []
const grouped = models.filter((model) => GROUP_FIELDS.some((field) => model[field] !== undefined))

console.log(`models=${models.length} withGroupField=${grouped.length}`)
if (grouped.length > 0) {
	console.log(`group field present (e.g. ${grouped[0].id}): grouped tabs can start`)
} else {
	console.log("no group field yet")
}
