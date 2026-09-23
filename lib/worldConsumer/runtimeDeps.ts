// Default dependencies for the WorldK consumer API routes.
//
// Mode: PRODUCTION unless WORLD_CONSUMER_MODE=FIXTURE_PREVIEW. In
// PRODUCTION, Living Forest is NOT_PUBLISHED (its bindings are FIXTURE),
// so the API honestly answers PROJECTION_UNAVAILABLE rather than serving
// fixture facts as production truth.
//
// Ledger: Postgres (migration 037 functions) when
// WORLD_CONSUMER_LEDGER_DATABASE_URL is set; otherwise a process-local
// in-memory ledger (non-durable — suitable only for preview).

import pg from "pg"
import type { WorldConsumerMode } from "./bindings.ts"
import { InMemoryContinuityLedger, PostgresContinuityLedger, type VisitorContinuityLedger } from "./continuityLedger.ts"
import { createLivingForestFixtureFactSource } from "./facts.ts"
import type { WorldConsumerDeps } from "./service.ts"

let cached: WorldConsumerDeps | null = null

function createLedger(): VisitorContinuityLedger {
  const url = process.env.WORLD_CONSUMER_LEDGER_DATABASE_URL
  if (!url) return new InMemoryContinuityLedger()
  return new PostgresContinuityLedger(new pg.Pool({ connectionString: url, max: 4 }))
}

export function getWorldConsumerDeps(): WorldConsumerDeps {
  if (cached) return cached
  const mode: WorldConsumerMode = process.env.WORLD_CONSUMER_MODE === "FIXTURE_PREVIEW" ? "FIXTURE_PREVIEW" : "PRODUCTION"
  cached = {
    mode,
    facts: createLivingForestFixtureFactSource(new Date().toISOString()),
    ledger: createLedger(),
    // No runtime visit store or participation store is wired for Living
    // Forest yet: report "no evidence" honestly rather than inventing any.
    priorVisitEvidence: async () => null,
    encounteredEntityIds: async () => [],
    now: () => new Date(),
  }
  return cached
}
