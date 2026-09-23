// Field names that must never appear in any consumer contract payload
// (M07 §4/§8/§12, M09 §20). Runtime/kernel/infrastructure concepts are
// mapped or omitted by producers, never passed through. Used by producer
// conformance tests and audits.

export const FORBIDDEN_CONSUMER_FIELD_NAMES: readonly string[] = [
  // foreign identity namespaces / identity hints
  "userId", "visitorId", "avatarKId", "anon",
  // raw kernel/runtime objects and ids
  "visitorContext", "simulationTick", "worldInstanceId", "locationId", "presentEntities",
  "protectedNarrative", "participantEntityIds", "causalReferences", "retentionTier",
  // execution ownership
  "lease", "leaseVersion", "ownerId", "worldLease",
  // infrastructure / runtime allocation
  "runtimeInstanceId", "gpu", "gpuId", "machine", "machineId", "region", "server", "serverId",
  "renderer", "rendererId", "unrealProcess", "unrealProcessId", "podId", "ipAddress",
  // credentials
  "serviceRoleKey", "apiKey", "secret", "token", "accessToken", "refreshToken",
]

/** Every object key in `value`, recursively. */
export function collectKeys(value: unknown, into: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => collectKeys(v, into))
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      into.add(k)
      collectKeys(v, into)
    }
  }
  return into
}

export function forbiddenFieldsIn(value: unknown): string[] {
  const keys = collectKeys(value)
  return FORBIDDEN_CONSUMER_FIELD_NAMES.filter((k) => keys.has(k))
}
