import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveArrivalDecision } from "./arrivalDecision.ts"

const KNOWN = ["entry", "place-a", "place-b"]

test("scenario 1: first-ever visit materializes at the entry location", () => {
  const decision = resolveArrivalDecision({
    entryLocationId: "entry",
    priorLocationId: null,
    knownLocationIds: KNOWN,
    canonDirectedLocationIds: [],
    worldChangedSinceLastVisit: true, // must be ignored/forced false for a first-ever visit
  })
  assert.deepEqual(decision, {
    locationId: "entry",
    reason: "FIRST_EVER_VISIT",
    isFirstEverVisit: true,
    priorLocationId: null,
    worldChangedSinceLastVisit: false,
  })
})

test("scenarios 2/3: a returning visitor with a valid prior place returns there", () => {
  const decision = resolveArrivalDecision({
    entryLocationId: "entry",
    priorLocationId: "place-a",
    knownLocationIds: KNOWN,
    canonDirectedLocationIds: [],
    worldChangedSinceLastVisit: false,
  })
  assert.deepEqual(decision, {
    locationId: "place-a",
    reason: "RETURNING_TO_PRIOR_PLACE",
    isFirstEverVisit: false,
    priorLocationId: "place-a",
    worldChangedSinceLastVisit: false,
  })
})

test("scenario 6: a stale/no-longer-known prior location falls back to entry, distinctly reasoned from a first-ever visit", () => {
  const decision = resolveArrivalDecision({
    entryLocationId: "entry",
    priorLocationId: "decommissioned-place",
    knownLocationIds: KNOWN,
    canonDirectedLocationIds: [],
    worldChangedSinceLastVisit: true,
  })
  assert.deepEqual(decision, {
    locationId: "entry",
    reason: "STALE_PRIOR_LOCATION_FALLBACK",
    isFirstEverVisit: false,
    priorLocationId: "decommissioned-place",
    worldChangedSinceLastVisit: true,
  })
})

test("scenario 4: a canon-directed location, when known, takes precedence over the visitor's own prior place", () => {
  const decision = resolveArrivalDecision({
    entryLocationId: "entry",
    priorLocationId: "place-a",
    knownLocationIds: KNOWN,
    canonDirectedLocationIds: ["place-b"],
    worldChangedSinceLastVisit: false,
  })
  assert.equal(decision.locationId, "place-b")
  assert.equal(decision.reason, "CANON_DIRECTED_ENTRY")
})

test("an unknown canon-directed location is never trusted -- falls through to normal returning-visitor resolution instead of materializing somewhere nonexistent", () => {
  const decision = resolveArrivalDecision({
    entryLocationId: "entry",
    priorLocationId: "place-a",
    knownLocationIds: KNOWN,
    canonDirectedLocationIds: ["nonexistent-place"],
    worldChangedSinceLastVisit: false,
  })
  assert.equal(decision.locationId, "place-a")
  assert.equal(decision.reason, "RETURNING_TO_PRIOR_PLACE")
})

test("scenario 5: the ultimate defensive fallback still resolves to entryLocationId even when it is not itself in the known set", () => {
  const decision = resolveArrivalDecision({
    entryLocationId: "entry-not-in-known-set",
    priorLocationId: "decommissioned-place",
    knownLocationIds: KNOWN,
    canonDirectedLocationIds: [],
    worldChangedSinceLastVisit: false,
  })
  assert.deepEqual(decision, {
    locationId: "entry-not-in-known-set",
    reason: "SAFE_FALLBACK_ENTRY",
    isFirstEverVisit: false,
    priorLocationId: "decommissioned-place",
    worldChangedSinceLastVisit: false,
  })
})

test("scenario 7: worldChangedSinceLastVisit is carried through unchanged for a genuinely returning visitor", () => {
  const changed = resolveArrivalDecision({ entryLocationId: "entry", priorLocationId: "place-a", knownLocationIds: KNOWN, canonDirectedLocationIds: [], worldChangedSinceLastVisit: true })
  const unchanged = resolveArrivalDecision({ entryLocationId: "entry", priorLocationId: "place-a", knownLocationIds: KNOWN, canonDirectedLocationIds: [], worldChangedSinceLastVisit: false })
  assert.equal(changed.worldChangedSinceLastVisit, true)
  assert.equal(unchanged.worldChangedSinceLastVisit, false)
})

test("determinism: identical input produces byte-identical output", () => {
  const input = { entryLocationId: "entry", priorLocationId: "place-a", knownLocationIds: KNOWN, canonDirectedLocationIds: [], worldChangedSinceLastVisit: true }
  assert.deepEqual(resolveArrivalDecision(input), resolveArrivalDecision(input))
})
