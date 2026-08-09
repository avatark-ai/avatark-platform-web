import { test } from "node:test"
import assert from "node:assert/strict"
import { getWorldSnapshotForVisitor, createWorldInstance } from "../livingWorldHost/hostService.ts"
import { authorizeAndRecordParticipation, getParticipationRecords } from "../participation/hostService.ts"
import { protectedNarrativeStateRepository } from "../livingSystems/singleton.ts"

const FIXED_NOW = () => "2026-08-09T00:00:00.000Z"

// Living Vrindavan Build 01, Phase P (Canonical Presence).
//
// Per docs/LIVING_VRINDAVAN_BUILD_01_PART1_NOTES.md's own flag: Sprint
// 18's only canonical-event fixture ("Krishna lifting Govardhan Hill")
// is Host-authored, NOT Approved StudioK Canon (`canonDocIds: []`). This
// build's own Canon-discipline instructions forbid presenting it as an
// authorized Canon proof. This file instead builds Phase P's proof
// around `yamuna-narrative-gate` -- a REAL encounter rule from the
// Approved STK-SPEC-006 systems artifact (`category: "narrative-protected"`),
// already the real Canon-firewall gate referenced throughout Sprints
// 14/18/19 as `protectedNarrativeGateOpen`. Zero new mechanism is
// introduced here -- every assertion below exercises code that already
// exists; this file's own contribution is proving the CHAIN end-to-end
// through the real visitor-facing participation path specifically,
// which no prior sprint's test did for this exact rule.
test("Living Vrindavan Build 01, Phase P: yamuna-narrative-gate is never exposed as an available participation option -- Canon-protected content is not merely blocked deep in the pipeline, it never surfaces to a visitor at all", async () => {
  const worldInstanceId = "living-vrindavan-build-01-canon-presence"
  await createWorldInstance(worldInstanceId, FIXED_NOW)

  const { snapshot } = await getWorldSnapshotForVisitor({ worldInstanceId, ownerId: "canon-presence-test", userId: "visitor-canon-1", locationId: "yamuna", now: FIXED_NOW })

  assert.equal(
    snapshot.availableEncounters.some((e) => e.ruleId === "yamuna-narrative-gate"),
    false,
    "Sprint 7's own resolveAvailableEncounters already excludes narrative-protected rules from ever becoming a live, visitor-visible EncounterOpportunity -- this is the FIRST line of Canon defense, structural, not a runtime check this build adds",
  )
})

test("Living Vrindavan Build 01, Phase P: a visitor attempting to select yamuna-narrative-gate anyway is denied through the real participation authorization path, and no ParticipationRecord is created", async () => {
  const worldInstanceId = "living-vrindavan-build-01-canon-presence-deny"
  await createWorldInstance(worldInstanceId, FIXED_NOW)

  const outcome = await authorizeAndRecordParticipation(worldInstanceId, "visitor-canon-2", "yamuna-narrative-gate", "yamuna")

  assert.equal(outcome.authorization.authorized, false)
  if (!outcome.authorization.authorized) {
    // ENCOUNTER_NOT_AVAILABLE, not NARRATIVE_GATE_CLOSED, is the honest
    // reason here -- a rule that never became live-available has no
    // category to gate on in the first place (this is
    // authorizeAndRecordParticipation's own real, documented precedence;
    // see lib/participation/hostService.ts's own comment). Both reasons
    // are real, closed union members of the SAME protective outcome:
    // authorized === false, either way.
    assert.equal(outcome.authorization.reason, "ENCOUNTER_NOT_AVAILABLE")
  }
  assert.equal(outcome.record, null, "no durable consequence of any kind was created for a denied selection")

  const records = await getParticipationRecords(worldInstanceId, "visitor-canon-2")
  assert.deepEqual(records, [], "the visitor's own participation history contains zero entries for this world -- a denial leaves no residue")
})

test("Living Vrindavan Build 01, Phase P: the real protected-narrative repository is get-only by construction -- no write method exists to call, even hypothetically", async () => {
  const worldInstanceId = "living-vrindavan-build-01-canon-presence-firewall"
  const projection = await protectedNarrativeStateRepository.get(worldInstanceId)

  // The real singleton implementation's own method surface, inspected
  // directly (not merely the TypeScript interface, which a determined
  // caller could bypass with `as any`): only `get` exists.
  const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(protectedNarrativeStateRepository))
  const writeShaped = methodNames.filter((name) => /^(save|put|set|write|mutate|update|resolve)$/i.test(name))
  assert.deepEqual(writeShaped, [], `protectedNarrativeStateRepository exposes a write-shaped method: ${writeShaped.join(", ")}`)

  // Honest default, reconfirmed for THIS build's own world instance: no
  // real canonical-narrative system is wired up in this environment, so
  // the gate genuinely reports unresolved -- not a workaround, the same
  // finding Sprint 14's own Scenario E already established generically.
  assert.equal(projection.resolved, false)
})
