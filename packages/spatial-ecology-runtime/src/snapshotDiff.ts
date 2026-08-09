import type { SpatialDelta, SpatialDeltaEntry, SpatialSnapshot } from "@avatark/spatial-ecology-contracts"

type SpatialDeltaValue = NonNullable<SpatialDeltaEntry["before"]>

function diffKeyed<T extends SpatialDeltaValue>(kind: SpatialDeltaEntry["kind"], before: readonly T[], after: readonly T[], keyOf: (item: T) => string): SpatialDeltaEntry[] {
  const beforeByKey = new Map(before.map((item) => [keyOf(item), item]))
  const afterByKey = new Map(after.map((item) => [keyOf(item), item]))
  const entries: SpatialDeltaEntry[] = []

  for (const [key, afterItem] of afterByKey) {
    const beforeItem = beforeByKey.get(key) ?? null
    if (beforeItem !== null && JSON.stringify(beforeItem) === JSON.stringify(afterItem)) continue
    entries.push({ kind, id: key, before: beforeItem, after: afterItem })
  }
  for (const [key, beforeItem] of beforeByKey) {
    if (!afterByKey.has(key)) entries.push({ kind, id: key, before: beforeItem, after: null })
  }

  return entries
}

// Sprint 16 Phase 0 architecture, section 21: the renderer boundary
// receives a two-snapshot DIFF, never a tick-by-tick replay -- the same
// discipline @avatark/world-embodiment-runtime's own `diffWorldEmbodiment`
// (Sprint 8) already established for the wider embodiment snapshot.
// Deliberately never mutates or reinterprets authoritative history --
// this is presentation compression only.
export function diffSpatialSnapshot(prev: SpatialSnapshot, next: SpatialSnapshot): SpatialDelta {
  const entries: SpatialDeltaEntry[] = [
    ...diffKeyed("patch", prev.patchStates, next.patchStates, (p) => p.patchId),
    ...diffKeyed("territoryPressure", prev.territoryPressures, next.territoryPressures, (p) => p.patchId),
    ...diffKeyed("route", prev.routeStates, next.routeStates, (r) => r.routeId),
  ]

  return { worldId: next.worldId, fromTick: prev.tick, toTick: next.tick, entries }
}
