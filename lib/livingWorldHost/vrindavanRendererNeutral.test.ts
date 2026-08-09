import { test } from "node:test"
import assert from "node:assert/strict"
import { getEmbodimentSnapshotForVisitor } from "./hostService.ts"
import { translateToUnrealCommands } from "@avatark/world-embodiment-runtime"

const FIXED_NOW = () => "2026-08-09T00:00:00.000Z"
const FORBIDDEN_TOKENS = ["UObject", "AActor", "Blueprint", "UnrealEngine", "React", "useState", "useEffect", "next/", "DOM", "HTMLElement"]

// Living Vrindavan Build 01, Phase T (Renderer-Neutral Embodiment).
// Produces a REAL embodiment snapshot for this build's own world
// instance and scans its serialized form directly for renderer-specific
// tokens -- never merely asserting neutrality in prose. Also proves the
// SAME real snapshot is translatable through the existing, real
// Unreal-compatible command schema (Sprint 8/10,
// @avatark/world-embodiment-runtime's `translateToUnrealCommands`) --
// one semantic world, two possible embodiments.
test("Living Vrindavan Build 01, Phase T: a real embodiment snapshot contains enough semantic data to visualize the world, with zero renderer-specific token anywhere in it", async () => {
  const worldInstanceId = "living-vrindavan-build-01-renderer-neutral"
  const { snapshot } = await getEmbodimentSnapshotForVisitor({
    worldInstanceId,
    ownerId: "renderer-neutral-test",
    userId: "visitor-renderer-1",
    locationId: "yamuna",
    reachableLocationIds: ["vrindavan-entry", "kadamba-grove", "govardhan-path"],
    now: FIXED_NOW,
  })

  // Enough semantic data to visualize: spatial region identity,
  // environment (water/vegetation/atmosphere), present entities, and
  // reachable transitions are all real, non-empty fields on the current
  // region.
  assert.equal(snapshot.current.locationId, "yamuna")
  assert.ok(snapshot.current.environment.water, "water state is present -- Yamuna's own real hydrology")
  assert.ok(snapshot.current.environment.vegetation, "vegetation state is present")
  assert.ok(snapshot.current.environment.atmosphere, "atmosphere state is present")
  assert.ok(Array.isArray(snapshot.current.entities))
  assert.ok(Array.isArray(snapshot.reachable) && snapshot.reachable.length > 0, "reachable regions/routes are present")

  const serialized = JSON.stringify(snapshot)
  for (const token of FORBIDDEN_TOKENS) {
    assert.equal(serialized.includes(token), false, `embodiment snapshot must not contain the renderer-specific token "${token}"`)
  }
})

test("Living Vrindavan Build 01, Phase T: the SAME real snapshot translates cleanly through the existing Unreal-compatible command schema, proving one semantic world, two possible embodiments", async () => {
  const worldInstanceId = "living-vrindavan-build-01-renderer-neutral-unreal"
  const { snapshot } = await getEmbodimentSnapshotForVisitor({
    worldInstanceId,
    ownerId: "renderer-neutral-unreal-test",
    userId: "visitor-renderer-2",
    locationId: "yamuna",
    reachableLocationIds: ["vrindavan-entry"],
    now: FIXED_NOW,
  })

  const commands = translateToUnrealCommands(snapshot)
  assert.ok(commands.length > 0, "a real Vrindavan snapshot produces real, non-empty Unreal-compatible commands")
  assert.ok(commands.some((c) => c.op === "CreateRegion" && c.regionId === "yamuna"))

  const serializedCommands = JSON.stringify(commands)
  for (const token of ["UObject", "AActor", "Blueprint", "UnrealEngine"]) {
    assert.equal(serializedCommands.includes(token), false, `translated commands must not contain the Unreal class-name token "${token}" -- these are generic op names, never engine class names`)
  }
})
