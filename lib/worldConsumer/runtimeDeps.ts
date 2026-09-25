// Default dependencies for the WorldK consumer API routes.
//
// Mode: PRODUCTION unless WORLD_CONSUMER_MODE=FIXTURE_PREVIEW. In
// PRODUCTION, Living Forest is NOT_PUBLISHED (its bindings are FIXTURE),
// so the API honestly answers PROJECTION_UNAVAILABLE rather than serving
// fixture facts as production truth.
//
// Continuity (WORLDK-M13): durable Postgres continuity (037/039), read
// through the verified visitor's OWN session so RLS read_own applies. The
// deployment holds no continuity DB credential and no writer; there is no
// in-memory or process-local fallback (a failed read answers
// PROJECTION_UNAVAILABLE). Lifecycle writes happen only through the 039
// lifecycle authority, outside every request path.

import { createClient } from "@/lib/supabase/server"
import type { WorldConsumerMode } from "./bindings.ts"
import { createLivingForestFixtureFactSource } from "./facts.ts"
import type { WorldConsumerDeps } from "./service.ts"
import { SessionRlsContinuityReader, type SessionContinuityClient } from "./sessionContinuity.ts"

let cached: WorldConsumerDeps | null = null

export function getWorldConsumerDeps(): WorldConsumerDeps {
  if (cached) return cached
  const mode: WorldConsumerMode = process.env.WORLD_CONSUMER_MODE === "FIXTURE_PREVIEW" ? "FIXTURE_PREVIEW" : "PRODUCTION"
  cached = {
    mode,
    facts: createLivingForestFixtureFactSource(new Date().toISOString()),
    // createClient() binds to the current request's cookies, so this shared
    // reader always reads as the visitor whose request is being served.
    ledger: new SessionRlsContinuityReader(async () => (await createClient()) as unknown as SessionContinuityClient),
    // No runtime visit store or participation store is wired for Living
    // Forest yet: report "no evidence" honestly rather than inventing any.
    priorVisitEvidence: async () => null,
    encounteredEntityIds: async () => [],
    now: () => new Date(),
  }
  return cached
}
