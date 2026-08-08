import type { WorldId } from "@avatark/runtime-contracts"

// Sprint 7, Phase 10: the protected-narrative boundary, modeled in
// contracts, not only in documentation. This package deliberately never
// defines a WRITE shape for protected narrative content -- there is no
// `ProtectedNarrativeDelta`, no mutator function, nothing a Living
// Systems runtime could call to change it. The type only carries a
// read-only PROJECTION (an opaque pointer + whatever a narrative system
// already decided is presentable), because no real canonical-narrative
// system exists yet for Living Vrindavan (Sprint 5-6 already established
// this: only a shallow reflection affordance, no episodes/scenes). This
// projection type exists so a WorldSnapshot has a well-typed place to
// carry one once a real narrative system exists, without Living Systems
// ever gaining the ability to write to it.
export interface ProtectedNarrativeProjection {
  worldId: WorldId
  /** Opaque; Living Systems never inspects or branches on this value's
   * meaning, only carries it through unchanged from whatever supplied
   * it (or leaves it null when nothing did). */
  episodeRef: string | null
  sceneRef: string | null
  /** True only when a caller other than Living Systems supplied this
   * projection -- lets a snapshot honestly represent "no protected
   * narrative system is wired up yet" instead of fabricating one. */
  resolved: boolean
}

export function emptyProtectedNarrativeProjection(worldId: WorldId): ProtectedNarrativeProjection {
  return { worldId, episodeRef: null, sceneRef: null, resolved: false }
}

// Get-only by construction: no `save`/`put`/`mutate` method exists on
// this interface at all. A Living Systems runtime that only ever depends
// on this interface (never a wider one) cannot write protected narrative
// state even if it tried -- the protection is enforced by the shape of
// the contract, not only by a policy comment.
export interface ProtectedNarrativeStateRepository {
  get(worldId: WorldId): Promise<ProtectedNarrativeProjection>
}
