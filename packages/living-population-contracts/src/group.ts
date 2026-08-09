import type { EntityId } from "@avatark/living-systems-contracts"
import type { LocationId, WorldId } from "@avatark/runtime-contracts"
import type { GroupId } from "./ids.ts"
import type { GroupKind } from "./behaviorProfile.ts"

// Sprint 10, Phase 8: minimal reusable herd/flock state -- group
// identity, member roster, current + desired location, and a
// [0, 1] cohesion scalar (fraction of members currently AT the group's
// own locationId). No renderer-level boids, no individual flight
// trajectory -- the core says "this flock is moving from region A
// toward region B," nothing more precise than that.
export interface GroupState {
  worldId: WorldId
  id: GroupId
  kind: GroupKind
  memberEntityIds: EntityId[]
  locationId: LocationId
  targetLocationId: LocationId | null
  cohesion: number
  lastUpdatedTick: number
}

export interface GroupStateRepository {
  list(worldId: WorldId): Promise<GroupState[]>
  get(worldId: WorldId, groupId: GroupId): Promise<GroupState | null>
  save(state: GroupState): Promise<void>
}
