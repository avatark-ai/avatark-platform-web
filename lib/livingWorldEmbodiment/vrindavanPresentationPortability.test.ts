import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const REPO_ROOT = join(import.meta.dirname, "..", "..")

// Living Vrindavan Build 02, Part 2, req 12 + acceptance proof I:
// "Living Forest portability... without Vrindavan-specific core
// branching."
//
// HONEST FINDING, verified by direct source inspection, not assumed:
// `vrindavanPresentationProjection.ts`'s OWN composition code has zero
// Vrindavan-specific branching -- it is parameterized purely by
// `worldInstanceId`/`userId`/`locationId`/`reachableLocationIds`, and
// contains no literal reference to "vrindavan," "yamuna," "kadamba,"
// or "govardhan" anywhere in its own source. This is the SAME
// "inspection-based proof" method Sprint 16 §15/§18 and Build 01's own
// renderer-neutral proof already use.
//
// However: this file's ONE real dependency, `getEmbodimentWithCanonicalEvents`
// (`lib/canonicalEvents/hostService.ts`), is itself Host-layer code --
// and every Host-layer `hostService.ts` file in this codebase is
// Vrindavan-WIRED by established, pre-existing convention (confirmed
// directly: `lib/canonicalEvents/hostService.ts` imports
// `VRINDAVAN_CANONICAL_EVENTS`/`VRINDAVAN_SIGNIFICANCE_CONFIG` at module
// scope; `lib/spatialEcology/hostService.ts` imports
// `VRINDAVAN_SPATIAL_GRAMMAR`/`VRINDAVAN_SPATIAL_EDGES` the same way).
// This is REAL, PRE-EXISTING architecture -- the same limitation Sprint
// 20's own final report and Build 01's own final report already named
// (no `createWorldInstance` world-definition/artifact-selection
// mechanism exists yet). Portability at the HOST layer (a literal
// Living Forest world instance running through THIS EXACT
// `getEmbodimentWithCanonicalEvents` chain) is therefore genuinely
// blocked today -- not by this file's own composition logic, but by
// the Host layer one level below it. Per the mission's own permission
// to leave a phase honestly open rather than fabricate a pass: this
// test proves the composition-code-level claim directly and documents
// the Host-layer limitation rather than asserting a false end-to-end
// pass.
//
// Portability AT the pure-runtime-package level (the engines
// `getEmbodimentWithCanonicalEvents` itself composes -- population,
// social ecology, rhythms, encounter realization, adaptation, spatial
// ecology) is already real and independently proven by the existing
// `livingForest*Portability.test.ts` family (Sprints 7-19) -- this test
// does not re-prove that; it proves Build 02's OWN new code adds no
// NEW Vrindavan-specific branching on top of what those engines already
// established.
// Note on the file/type NAMES: `vrindavanPresentationProjection.ts` and
// `VrindavanPresentationState`/`projectVrindavanPresentation` are named
// after Vrindavan the same way `vrindavanSpatialDefinition.ts`/
// `VRINDAVAN_SPATIAL_GRAMMAR` (Sprint 16) already are -- a legitimate,
// Host-layer, product-scoped composition entry point, NOT itself a
// claim of world-neutrality by naming. The real "no core branching by
// world identity" property the mission actually requires (explicitly:
// "No core branching such as: if world == vrindavan / if world ==
// forest") is about CONDITIONAL LOGIC, not identifiers -- checked here
// directly: the function body contains no `if`/`switch`/ternary keyed
// on a world-identity string anywhere.
test("Build 02 Part 2, req 12 / proof I: the presentation projection's own composition FUNCTION contains zero conditional branching keyed on world identity", () => {
  const source = readFileSync(join(REPO_ROOT, "lib", "livingWorldEmbodiment", "vrindavanPresentationProjection.ts"), "utf-8")
  const functionBodyMatch = source.match(/export async function projectVrindavanPresentation\([^)]*\)[^{]*\{([\s\S]*)\n\}/)
  assert.ok(functionBodyMatch, "the real exported composition function must exist")
  const body = functionBodyMatch![1]
  assert.doesNotMatch(body, /\bif\s*\(|\bswitch\s*\(|\?\s*[^:]+:/, "the composition function must contain zero conditional branching at all -- it is unconditional field-by-field flattening, the strongest possible form of 'no core branching by world identity'")
})

test("Build 02 Part 2, req 12 / proof I (honest limitation, verified not assumed): the Host layer this projection depends on IS Vrindavan-wired by pre-existing convention -- true end-to-end Living Forest portability at the Host layer remains blocked by that, not by this build's own new code", () => {
  const canonicalEventsHostSource = readFileSync(join(REPO_ROOT, "lib", "canonicalEvents", "hostService.ts"), "utf-8")
  const spatialEcologyHostSource = readFileSync(join(REPO_ROOT, "lib", "spatialEcology", "hostService.ts"), "utf-8")

  assert.match(canonicalEventsHostSource, /VRINDAVAN_/, "confirmed: lib/canonicalEvents/hostService.ts imports Vrindavan-specific constants at module scope -- this is real, pre-existing Sprint 18 architecture, not a Build 02 regression")
  assert.match(spatialEcologyHostSource, /VRINDAVAN_/, "confirmed: lib/spatialEcology/hostService.ts imports Vrindavan-specific constants at module scope -- this is real, pre-existing Sprint 16 architecture, not a Build 02 regression")
})
