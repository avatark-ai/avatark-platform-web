import { test } from "node:test"
import assert from "node:assert/strict"
import { createWorldInstance } from "../livingWorldHost/hostService.ts"
import { wakeWorldWithCanonicalEvents } from "../canonicalEvents/hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"
import { projectVrindavanPresentation } from "./vrindavanPresentationProjection.ts"

const SEED_NOW = () => "2026-08-09T00:00:00.000Z"
const ADVANCED_NOW = () => "2026-08-09T00:00:00.001Z"
const GOVARDHAN_LIFTING_ID = "canonical-event-govardhan-lifting"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

// Living Vrindavan Build 02, Part 2, req 9 + acceptance proofs B/G:
// "Canon-safe canonical presence," proven at the NEW presentation
// projection layer specifically -- continuing Build 01 Phase P's own
// precedent (docs/LIVING_VRINDAVAN_BUILD_01_PART1_NOTES.md,
// lib/canonicalEvents/vrindavanCanonPresence.test.ts) rather than
// inventing a second Canon-safety mechanism. `projectVrindavanPresentation`
// itself never queries `canonicalProjectionStateRepository` directly --
// it only re-exports `getEmbodimentWithCanonicalEvents`'s own
// `canonicalProjections` field unmodified (Part 1's own discipline).
// `getEmbodimentWithCanonicalEvents` is a pure READ (`listByWorld`) --
// it never triggers activation itself, only `wakeWorldWithCanonicalEvents`
// does (Sprint 18's own real separation of read and wake paths). Both
// tests below exercise that real separation directly, never assumed.
test("Build 02 Part 2, req 9 / proof B: a freshly-created instance that has never been woken through the canonical-events path presents an honest, empty canonicalProjections array -- no fabricated DORMANT placeholder", async () => {
  const worldInstanceId = "living-vrindavan-build-02-canon-presence-empty"
  await createWorldInstance(worldInstanceId, SEED_NOW)

  const presentation = await projectVrindavanPresentation(worldInstanceId, "canon-presence-visitor-1", "yamuna", ["vrindavan-entry", "kadamba-grove", "govardhan-path"], null, SEED_NOW)

  assert.deepEqual(presentation.canonicalProjections, [], "createWorldInstance alone never calls wakeWorldWithCanonicalEvents -- canonicalProjectionStateRepository has nothing saved yet for this instance, so the honest answer is an empty array, not a placeholder entry")
  assert.equal(presentation.protectedNarrative.resolved, false, "Canon firewall's own default (unresolved) holds through the presentation layer even before any canonical-event work has run")
})

test("Build 02 Part 2, req 9 / proof G: once the real govardhan-lifting event genuinely activates and completes, the presentation layer surfaces it honestly -- Host-authored provenance (canonDocIds: []) is never presented as an Approved Canon claim, and the protected-narrative firewall is unaffected", async () => {
  const worldInstanceId = "living-vrindavan-build-02-canon-presence-activated"
  const ownerId = "canon-presence-activation-owner"

  // Real activation, via the SAME mechanism lib/canonicalEvents/hostService.test.ts
  // already proves: tick 0 leaves govardhan-lifting DORMANT (its own
  // authored WORLD_TIME_AT_LEAST:1 condition unmet); a second wake at a
  // later `now` crosses tick 1 and activates + completes it for real.
  await wakeWorldWithCanonicalEvents(worldInstanceId, ownerId, SEED_NOW)
  await releaseLease(worldInstanceId, ownerId)
  await wakeWorldWithCanonicalEvents(worldInstanceId, ownerId, ADVANCED_NOW)
  await releaseLease(worldInstanceId, ownerId)

  const presentation = await projectVrindavanPresentation(worldInstanceId, "canon-presence-visitor-2", "govardhan-path", ["vrindavan-entry", "yamuna", "kadamba-grove"], null, ADVANCED_NOW)

  const projection = presentation.canonicalProjections.find((p) => p.canonicalEventId === GOVARDHAN_LIFTING_ID)
  assert.ok(projection, "the real, genuinely-activated projection reaches the presentation layer -- not re-derived, not omitted")
  assert.equal(projection!.status, "COMPLETED", "the presentation layer reports the SAME real status the Host layer already committed, never a re-interpretation of it")
  assert.ok(projection!.activationId, "a real activationId is present -- this is a genuine activation, not a fabricated placeholder")

  // The Canon-safety claim itself: this fixture is Host-authored, not
  // Approved StudioK Canon (docs/LIVING_VRINDAVAN_BUILD_01_PART1_NOTES.md's
  // own finding). The presentation layer must carry that honesty
  // through unmodified -- an empty `canonDocIds` array is the real,
  // structural signal that no Canon document backs this projection; a
  // renderer or narrative surface consuming this field can distinguish
  // an Approved-Canon event from a Host-authored one without any
  // separate, easy-to-forget flag.
  assert.deepEqual(projection!.provenance.canonDocIds, [], "req 9's own Canon-safety requirement: the Host-authored govardhan-lifting projection never claims an Approved Canon document through the presentation layer")

  // The activated canonical event is a PLACE-scoped adaptation
  // consequence (Sprint 18), never a narrative-gate resolution -- the
  // real, separate protected-narrative mechanism (Build 01 Phase P's
  // yamuna-narrative-gate) is untouched by it, reconfirmed here
  // specifically through the presentation layer's own field.
  assert.equal(presentation.protectedNarrative.resolved, false, "a completed, Host-authored canonical event does not, and structurally cannot, resolve the separate protected-narrative firewall")
})
