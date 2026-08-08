import type { EmbodiedRegion, EmbodimentDeltaEntry, WorldEmbodimentDelta, WorldEmbodimentSnapshot } from "@avatark/world-embodiment-contracts"

// Sprint 8, Phase 13: a renderer-neutral reconciliation delta between two
// embodiment snapshots. Stable ids (locationId / entityId /
// locationId+ruleId) are the join key throughout -- an entity that
// merely changed lifecyclePhase produces one UPDATE entry keyed by its
// own unchanging entityId, never a REMOVE+ADD pair, so a renderer can
// patch it in place rather than destroying and recreating it.
function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function diffKeyed<T>(before: readonly T[], after: readonly T[], keyOf: (item: T) => string, pathPrefix: string): EmbodimentDeltaEntry[] {
  const beforeMap = new Map(before.map((item) => [keyOf(item), item]))
  const afterMap = new Map(after.map((item) => [keyOf(item), item]))
  const entries: EmbodimentDeltaEntry[] = []

  for (const [key, afterItem] of afterMap) {
    const beforeItem = beforeMap.get(key)
    if (!beforeItem) {
      entries.push({ path: `${pathPrefix}:${key}`, op: "ADD", after: afterItem })
    } else if (!deepEqual(beforeItem, afterItem)) {
      entries.push({ path: `${pathPrefix}:${key}`, op: "UPDATE", before: beforeItem, after: afterItem })
    } else {
      entries.push({ path: `${pathPrefix}:${key}`, op: "UNCHANGED" })
    }
  }
  for (const [key, beforeItem] of beforeMap) {
    if (!afterMap.has(key)) entries.push({ path: `${pathPrefix}:${key}`, op: "REMOVE", before: beforeItem })
  }
  return entries
}

function regionsById(snapshot: WorldEmbodimentSnapshot): Map<string, EmbodiedRegion> {
  const map = new Map<string, EmbodiedRegion>()
  map.set(snapshot.current.locationId, snapshot.current)
  for (const region of snapshot.reachable) map.set(region.locationId, region)
  return map
}

export function diffWorldEmbodiment(prev: WorldEmbodimentSnapshot, next: WorldEmbodimentSnapshot): WorldEmbodimentDelta {
  const entries: EmbodimentDeltaEntry[] = []
  const prevRegions = regionsById(prev)
  const nextRegions = regionsById(next)
  const allLocationIds = new Set([...prevRegions.keys(), ...nextRegions.keys()])

  for (const locationId of allLocationIds) {
    const prevRegion = prevRegions.get(locationId)
    const nextRegion = nextRegions.get(locationId)

    if (!prevRegion && nextRegion) {
      entries.push({ path: `region:${locationId}`, op: "ADD", after: nextRegion })
      continue
    }
    if (prevRegion && !nextRegion) {
      entries.push({ path: `region:${locationId}`, op: "REMOVE", before: prevRegion })
      continue
    }
    if (!prevRegion || !nextRegion) continue

    const environmentUnchanged = deepEqual(prevRegion.environment, nextRegion.environment)
    entries.push(
      environmentUnchanged
        ? { path: `region:${locationId}.environment`, op: "UNCHANGED" }
        : { path: `region:${locationId}.environment`, op: "UPDATE", before: prevRegion.environment, after: nextRegion.environment },
    )

    entries.push(...diffKeyed(prevRegion.entities, nextRegion.entities, (e) => e.entityId, "entity"))
    entries.push(...diffKeyed(prevRegion.encounters, nextRegion.encounters, (e) => `${e.locationId}:${e.ruleId}`, "encounter"))
  }

  return { worldId: next.worldId, fromTick: prev.simulationTick, toTick: next.simulationTick, entries }
}
