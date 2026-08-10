import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createWorldInstance } from "../livingWorldHost/hostService.ts"
import { wakeWorldWithCanonicalEvents } from "../canonicalEvents/hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"
import { projectVrindavanPresentation } from "../livingWorldEmbodiment/vrindavanPresentationProjection.ts"
import { initialVrindavanPopulationEntities, initialVrindavanGroups } from "../livingPopulation/vrindavanPopulationDefinition.ts"

async function releaseIfHeld(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current && current.ownerId === ownerId) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

const REPO_ROOT = join(import.meta.dirname, "..", "..")
const SEED_NOW = () => "2026-08-09T00:00:00.000Z"

// Deterministic replay (req: "deterministic replay"), reusing Build
// 02's own established proof pattern (proof A), now exercised against a
// world instance that includes this build's own new content (MIDDAY
// rhythm entries, the Yamuna emergent rule) -- identical inputs to
// projectVrindavanPresentation against unchanged durable state must
// still produce byte-identical output.
test("Build 03: identical reads of projectVrindavanPresentation against an unchanged, Build-03-content world instance are byte-identical", async () => {
  const worldInstanceId = "living-vrindavan-build-03-determinism"
  const owner = "build03-determinism-owner"
  await createWorldInstance(worldInstanceId, SEED_NOW)
  await wakeWorldWithCanonicalEvents(worldInstanceId, owner, SEED_NOW)
  await releaseIfHeld(worldInstanceId, owner)

  const first = await projectVrindavanPresentation(worldInstanceId, "determinism-visitor", "yamuna", ["vrindavan-entry", "kadamba-grove", "govardhan-path"], null, SEED_NOW)
  const second = await projectVrindavanPresentation(worldInstanceId, "determinism-visitor", "yamuna", ["vrindavan-entry", "kadamba-grove", "govardhan-path"], null, SEED_NOW)

  assert.deepEqual(first, second, "two reads against identical, unchanged durable state must be byte-identical, including this build's own new rhythm/memory content")
})

// Canonical-event compatibility: living-content systems (population,
// rhythms, memory, adaptation) must only ever CONSUME a bounded
// canonical-event consequence, never decide one themselves (Phase0
// §36) -- reconfirmed by direct source inspection that none of this
// build's own new files reference the canonical-events subsystem at
// all.
test("Build 03: canonical-event compatibility -- none of this build's own new content files reference the canonicalEvents subsystem, never deciding a canonical event themselves", () => {
  const newFiles = [
    "lib/livingWorldContent/vrindavanMicrohabitats.ts",
    "lib/livingWorldContent/vrindavanVegetationArchetypes.ts",
  ]
  for (const relativePath of newFiles) {
    const source = readFileSync(join(REPO_ROOT, relativePath), "utf-8")
    assert.doesNotMatch(source, /canonicalEvents|CanonicalEvent/, `${relativePath} must never reference the canonical-events subsystem -- living content only ever consumes a bounded consequence, never decides one`)
  }
})

// Canon boundary: no protected/canonical character (Krishna, Radha,
// Nanda, Yashoda) ever appears in the ordinary population roster or
// this build's own new content -- Phase0 §12's own standing rule,
// reconfirmed for every file this build adds or touches.
test("Build 03: Canon boundary -- no protected canonical character name appears anywhere in the population roster or this build's own new content files", () => {
  const PROTECTED_NAMES = /krishna|radha|nanda|yashoda/i
  const filesToCheck = [
    "lib/livingPopulation/vrindavanPopulationDefinition.ts",
    "lib/livingRhythms/vrindavanRhythmsDefinition.ts",
    "lib/worldMemory/vrindavanMemoryDefinition.ts",
    "lib/livingWorldContent/vrindavanMicrohabitats.ts",
    "lib/livingWorldContent/vrindavanVegetationArchetypes.ts",
  ]
  for (const relativePath of filesToCheck) {
    const source = readFileSync(join(REPO_ROOT, relativePath), "utf-8")
    assert.doesNotMatch(source, PROTECTED_NAMES, `${relativePath} must never name a protected canonical character`)
  }

  const rosterEntityIds = initialVrindavanPopulationEntities("canon-boundary-check").map((e) => e.id)
  const rosterGroupIds = initialVrindavanGroups("canon-boundary-check").map((g) => g.id)
  for (const id of [...rosterEntityIds, ...rosterGroupIds]) {
    assert.doesNotMatch(id, PROTECTED_NAMES, `roster id ${id} must never name a protected canonical character`)
  }
})

// Visitor-participation compatibility: this build introduces no new
// InteractionIntent, no manipulation capability (feed/touch/herd/
// disturb/collect), and no ambient-life content implying one --
// Phase0 §21/§37's own standing rule, reconfirmed by direct source
// inspection of every capability this build's own content declares.
test("Build 03: visitor-participation compatibility -- this build's own new content declares no manipulation capability the population contracts do not already model", () => {
  const source = readFileSync(join(REPO_ROOT, "lib/livingWorldContent/vrindavanVegetationArchetypes.ts"), "utf-8")
  assert.doesNotMatch(source, /feed|touch|herd\(|disturb|collect|capture|pet\b/i, "vegetation archetype content must never imply a visitor manipulation capability")

  // "feed" is deliberately excluded from this file's own check --
  // "feeding-patch" is a real, neutral ECOLOGICAL label (where a
  // resource affordance concentrates for population entities), not a
  // visitor-facing manipulation verb; the vegetation archetype file's
  // own check above already covers the visitor-capability vocabulary.
  const microhabitatSource = readFileSync(join(REPO_ROOT, "lib/livingWorldContent/vrindavanMicrohabitats.ts"), "utf-8")
  assert.doesNotMatch(microhabitatSource, /touch|disturb|collect|capture|pet\b/i, "microhabitat content must never imply a visitor manipulation capability")
})
