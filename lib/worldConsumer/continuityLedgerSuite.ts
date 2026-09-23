// Shared absence-ledger semantics suite (M07 §7 / M09 §11), run against
// every VisitorContinuityLedger implementation.
import { test } from "node:test"
import assert from "node:assert/strict"
import { ContinuityLedgerError, type VisitorContinuityLedger } from "./continuityLedger.ts"

const W = "living-forest"

export function runContinuityLedgerSuite(label: string, makeLedger: () => Promise<{ ledger: VisitorContinuityLedger; subject: () => Promise<string> }>) {
  test(`${label}: no prior visit -> no row`, async () => {
    const { ledger, subject } = await makeLedger()
    assert.equal(await ledger.get(W, await subject()), null)
  })

  test(`${label}: P. confirmed entry creates/moves the ledger (visitCount, lastEnteredAt, entry tick, ENTRY_CONFIRMED)`, async () => {
    const { ledger, subject } = await makeLedger()
    const s = await subject()
    const r = await ledger.recordConfirmedEntry({ worldId: W, subjectId: s, at: "2026-09-23T10:00:00.000Z", worldTick: 4, placeId: "forest-clearing" })
    assert.equal(r.visitCount, 1)
    assert.equal(r.firstEnteredAt, "2026-09-23T10:00:00.000Z")
    assert.equal(r.lastEnteredAt, "2026-09-23T10:00:00.000Z")
    assert.equal(r.lastEnteredTick, 4)
    assert.equal(r.visitOpen, true)
    assert.equal(r.lastLeftAt, null)
    assert.equal(r.lastSeenTick, 4)
    assert.equal(r.lastSeenBasis, "ENTRY_CONFIRMED")
    assert.deepEqual(r.encounteredPlaceIds, ["forest-clearing"])
    const second = await ledger.recordConfirmedEntry({ worldId: W, subjectId: s, at: "2026-09-23T12:00:00.000Z", worldTick: 9, placeId: "forest-pond" })
    assert.equal(second.visitCount, 2)
    assert.equal(second.firstEnteredAt, "2026-09-23T10:00:00.000Z")
    assert.equal(second.lastEnteredTick, 9)
    assert.deepEqual(second.encounteredPlaceIds, ["forest-clearing", "forest-pond"])
  })

  test(`${label}: Q. leave moves lastSeen to the last confirmed-present point (LEAVE_RECORDED); repeated leave is a no-op`, async () => {
    const { ledger, subject } = await makeLedger()
    const s = await subject()
    await ledger.recordConfirmedEntry({ worldId: W, subjectId: s, at: "2026-09-23T10:00:00.000Z", worldTick: 4, placeId: "forest-clearing" })
    const left = await ledger.recordLeave({ worldId: W, subjectId: s, at: "2026-09-23T10:30:00.000Z", worldTick: 7, placeId: "forest-stream" })
    assert.equal(left.lastLeftAt, "2026-09-23T10:30:00.000Z")
    assert.equal(left.visitOpen, false)
    assert.equal(left.lastSeenTick, 7)
    assert.equal(left.lastSeenBasis, "LEAVE_RECORDED")
    assert.equal(left.lastPlaceId, "forest-stream")
    assert.equal(left.visitCount, 1, "leaving is not a visit")
    const again = await ledger.recordLeave({ worldId: W, subjectId: s, at: "2026-09-23T11:00:00.000Z", worldTick: 8, placeId: null })
    assert.deepEqual(again, left)
  })

  test(`${label}: R. abnormal disconnect (no leave, no heartbeat) keeps the conservative ENTRY_CONFIRMED basis — never PRESENCE_TIMEOUT`, async () => {
    const { ledger, subject } = await makeLedger()
    const s = await subject()
    await ledger.recordConfirmedEntry({ worldId: W, subjectId: s, at: "2026-09-23T10:00:00.000Z", worldTick: 4, placeId: "forest-clearing" })
    // ...the visitor's connection drops; nothing else is ever recorded.
    const r = await ledger.get(W, s)
    assert.equal(r!.lastSeenBasis, "ENTRY_CONFIRMED")
    assert.equal(r!.lastSeenTick, 4)
    assert.equal(r!.lastLeftAt, null)
    // A later confirmed re-entry closes out the dangling visit conservatively.
    const back = await ledger.recordConfirmedEntry({ worldId: W, subjectId: s, at: "2026-09-24T10:00:00.000Z", worldTick: 20, placeId: null })
    assert.equal(back.visitCount, 2)
    assert.equal(back.lastSeenBasis, "ENTRY_CONFIRMED")
    assert.equal(back.lastPlaceId, "forest-clearing", "unknown arrival place keeps the last known one")
  })

  test(`${label}: world time never rewinds continuity; leave without entry is rejected`, async () => {
    const { ledger, subject } = await makeLedger()
    const s = await subject()
    await assert.rejects(ledger.recordLeave({ worldId: W, subjectId: s, at: "2026-09-23T10:00:00.000Z", worldTick: 1, placeId: null }), (e: unknown) => e instanceof ContinuityLedgerError && e.code === "NO_CONFIRMED_ENTRY")
    await ledger.recordConfirmedEntry({ worldId: W, subjectId: s, at: "2026-09-23T10:00:00.000Z", worldTick: 10, placeId: null })
    await assert.rejects(ledger.recordLeave({ worldId: W, subjectId: s, at: "2026-09-23T10:01:00.000Z", worldTick: 9, placeId: null }), (e: unknown) => e instanceof ContinuityLedgerError && e.code === "TICK_REGRESSION")
    await assert.rejects(ledger.recordConfirmedEntry({ worldId: W, subjectId: s, at: "2026-09-23T10:02:00.000Z", worldTick: 3, placeId: null }), (e: unknown) => e instanceof ContinuityLedgerError && e.code === "TICK_REGRESSION")
    assert.equal((await ledger.get(W, s))!.lastSeenTick, 10)
  })

  test(`${label}: continuity is keyed by (worldId, subjectId)`, async () => {
    const { ledger, subject } = await makeLedger()
    const a = await subject()
    const b = await subject()
    await ledger.recordConfirmedEntry({ worldId: W, subjectId: a, at: "2026-09-23T10:00:00.000Z", worldTick: 1, placeId: null })
    assert.equal(await ledger.get(W, b), null)
    assert.equal(await ledger.get("living-vrindavan", a), null)
  })
}
