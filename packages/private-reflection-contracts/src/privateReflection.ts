import type { LocationId, UserId, WorldId } from "@avatark/runtime-contracts"

export type PrivateReflectionRecordId = string

// Sprint 19, Phase 0 §6/§12 (reconciled): the ONE piece of visitor
// content this sprint introduces that Sprint 5-18 never modeled --
// `reflectionId` (existing, Sprint 5) traces to an authoring Canon
// document; `content` is what the VISITOR privately wrote or spoke in
// response to it. This type never appears in any WorldEvent,
// EntityMemoryEntry, AdaptationSignal, or CausalReference anywhere in
// this codebase -- see lib/runtimeKernel/dependencyBoundaries.test.ts's
// own regex scan asserting no simulation-resolver package ever imports
// this module at all, the same structural (not conventional) firewall
// Sprint 18 already established for Canon immutability.
export interface PrivateReflectionRecord {
  id: PrivateReflectionRecordId
  worldId: WorldId
  userId: UserId
  locationId: LocationId
  reflectionId: string
  content: string
  createdAt: string
}

// Deliberately no `listByWorld`/`listAll` method -- the asymmetry IS the
// firewall's structural half. A caller can only ever read a visitor's
// own reflections, by that visitor's own id; there is no legitimate call
// site anywhere in this codebase (Host or otherwise) that could read
// another visitor's private content even by mistake, because the method
// to do so does not exist.
export interface PrivateReflectionRecordRepository {
  append(record: PrivateReflectionRecord): Promise<void>
  listByOwner(worldId: WorldId, userId: UserId): Promise<PrivateReflectionRecord[]>
}
