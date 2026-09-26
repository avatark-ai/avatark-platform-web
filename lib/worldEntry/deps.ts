// Default dependencies for the WORLDK-M14-A entry routes.
//
// The entry authority exists only where WORLD_ENTRY_AUTHORITY_DATABASE_URL
// is configured (the Preview deployment). Without it every entry surface
// answers honestly UNAVAILABLE and nothing is allocated.
import { MACHINE_INGRESS_HOST } from "../worldConsumer/machineIngress.ts"
import { getWorldConsumerDeps } from "../worldConsumer/runtimeDeps.ts"
import { ENTRY_AUTHORITY_DATABASE_URL_ENV, PgEntryAuthorityDb } from "./authorityDb.ts"
import type { GatewayDeps } from "./gateway.ts"
import type { WorldEntryDeps } from "./resolver.ts"
import type { RuntimeIngressDeps } from "./runtimeIngress.ts"
import type { StreamCapabilityDeps } from "./streamCapability.ts"

/** The handoff gateway lives on the Platform-controlled Preview origin (D5). */
export const HANDOFF_ORIGIN = `https://${MACHINE_INGRESS_HOST}`

let db: PgEntryAuthorityDb | null | undefined

export function getEntryAuthorityDb(): PgEntryAuthorityDb | null {
  if (db !== undefined) return db
  const url = process.env[ENTRY_AUTHORITY_DATABASE_URL_ENV]
  try {
    db = url ? new PgEntryAuthorityDb(url) : null
  } catch {
    // Refused target (not the Preview project): fail closed.
    db = null
  }
  return db
}

export function getWorldEntryDeps(): WorldEntryDeps {
  const c = getWorldConsumerDeps()
  return { mode: c.mode, bindings: c.bindings, ledger: c.ledger, db: getEntryAuthorityDb(), handoffOrigin: HANDOFF_ORIGIN }
}

export function getGatewayDeps(): GatewayDeps {
  return { db: getEntryAuthorityDb(), bindings: getWorldConsumerDeps().bindings }
}

export function getRuntimeIngressDeps(): RuntimeIngressDeps {
  const c = getWorldConsumerDeps()
  return { db: getEntryAuthorityDb(), mode: c.mode, bindings: c.bindings, facts: c.facts }
}

export function getStreamCapabilityDeps(): StreamCapabilityDeps {
  return { db: getEntryAuthorityDb() }
}
