import { randomUUID } from "node:crypto"
import type { PrivateReflectionRecord } from "@avatark/private-reflection-contracts"
import { privateReflectionRepository } from "./singleton.ts"

const defaultNow = () => new Date().toISOString()

// Sprint 19, Phase 0 §6/§12: the private-reflection firewall's Host-level
// half. Unlike ParticipationRecord/EncounterRecord, a reflection is not
// content-derived-idempotent by design -- a visitor may genuinely
// reflect twice at the same location with two different private
// thoughts, and both are legitimate, distinct records (`randomUUID`,
// not a hash of worldId/userId/locationId). What IS structural, the
// same way Canon immutability is structural in Sprint 18: this function
// calls nothing from any simulation-resolver package
// (living-systems-runtime, world-memory-runtime, world-adaptation-runtime,
// encounter-realization-runtime, canonical-event-runtime,
// spatial-ecology-runtime, social-ecology-runtime, participation-runtime)
// -- it only ever appends to `privateReflectionRepository`, which itself
// exposes no world-wide read method at all. See
// lib/runtimeKernel/dependencyBoundaries.test.ts's own regex scan
// asserting this file never imports any of those packages.
export async function recordPrivateReflection(worldId: string, userId: string, locationId: string, reflectionId: string, content: string, now: () => string = defaultNow): Promise<PrivateReflectionRecord> {
  const record: PrivateReflectionRecord = { id: randomUUID(), worldId, userId, locationId, reflectionId, content, createdAt: now() }
  await privateReflectionRepository.append(record)
  return record
}

// Sprint 19: a Host-composed read -- owner-scoped only, matching the
// repository's own structural asymmetry (no listByWorld exists to call
// even by mistake).
export async function getPrivateReflections(worldId: string, userId: string) {
  return privateReflectionRepository.listByOwner(worldId, userId)
}
