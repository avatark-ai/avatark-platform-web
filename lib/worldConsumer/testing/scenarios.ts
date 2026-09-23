// Test scenarios built from REAL Living Forest runtime facts (the kernel
// vertical slice driven through its host functions), never from copied
// consumer JSON.
import { LIVING_FOREST_FIXTURE_BINDING } from "../bindings.ts"
import { InMemoryContinuityLedger } from "../continuityLedger.ts"
import { LIVING_FOREST_FIXTURE_TIMELINE, runLivingForestFixtureTimeline, type WorldFacts, type WorldFactSource } from "../facts.ts"
import type { WorldConsumerDeps } from "../service.ts"
import type { PriorVisitEvidence } from "../visitorProjection.ts"

export const OBSERVED_AT = LIVING_FOREST_FIXTURE_TIMELINE.observedAt
export const IN_WINDOW = new Date(Date.parse(OBSERVED_AT) + 30_000)
export const AFTER_WINDOW = new Date(Date.parse(OBSERVED_AT) + 5 * 60_000)
export const SUBJECT = "0b7f3c2a-5d1e-4a6b-9c8d-7e6f5a4b3c2d"
export const OTHER_SUBJECT = "9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f"
export const BINDING = LIVING_FOREST_FIXTURE_BINDING

let run: Awaited<ReturnType<typeof runLivingForestFixtureTimeline>> | null = null
export async function fixtureRun() {
  run ??= await runLivingForestFixtureTimeline(OBSERVED_AT)
  return run
}

export function factSourceOf(facts: WorldFacts | null): WorldFactSource {
  return { load: async (id) => (facts && id === facts.runtimeWorldId ? facts : null) }
}

export async function depsFor(opts: {
  facts?: WorldFacts | null
  now?: Date
  mode?: WorldConsumerDeps["mode"]
  ledger?: InMemoryContinuityLedger
  evidence?: PriorVisitEvidence | null
  encounteredEntityIds?: string[]
} = {}): Promise<WorldConsumerDeps & { ledger: InMemoryContinuityLedger }> {
  const facts = opts.facts === undefined ? (await fixtureRun()).facts : opts.facts
  return {
    mode: opts.mode ?? "FIXTURE_PREVIEW",
    facts: factSourceOf(facts),
    ledger: opts.ledger ?? new InMemoryContinuityLedger(),
    priorVisitEvidence: async () => opts.evidence ?? null,
    encounteredEntityIds: async () => opts.encounteredEntityIds ?? [],
    now: () => opts.now ?? IN_WINDOW,
  }
}

/** Visitor present at tick 0 (clearing), leaves at tick 1 — before the herd moves back and the season turns. */
export async function recordArrivalThenLeave(ledger: InMemoryContinuityLedger, leaveTick = LIVING_FOREST_FIXTURE_TIMELINE.departureTick) {
  await ledger.recordConfirmedEntry({ worldId: "living-forest", subjectId: SUBJECT, at: "2026-09-23T16:00:00.000Z", worldTick: 0, placeId: "forest-clearing" })
  return ledger.recordLeave({ worldId: "living-forest", subjectId: SUBJECT, at: "2026-09-23T16:05:00.000Z", worldTick: leaveTick, placeId: "forest-clearing" })
}
