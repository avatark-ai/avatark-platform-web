import type { LocationId } from "@avatark/runtime-contracts"
import type { EntityArchetypeId, EntityId } from "./ids.ts"

// StudioK-authored archetype (mirrors living-systems.schema.json's
// entityArchetypes[] field-for-field). Deliberately neutral/environmental
// only -- a canonical character is Canon's protected narrative, never an
// environmentally-simulated entity; this package has no field that could
// represent one meaningfully (no dialogue, no relationship, no narrative
// role).
export interface EntityArchetype {
  id: EntityArchetypeId
  name: string
  locationId: LocationId
  /** World-authored lifecycle vocabulary (e.g. dormant/budding/flowering)
   * -- never a fixed cross-world enum. Different archetypes need
   * different vocabularies. */
  lifecyclePhases: string[]
  initialLifecyclePhase: string
}

// Persistent runtime state for one instantiated entity -- survives
// individual visitor sessions, advanced only by the Living Systems
// runtime's own simulation step, never by a renderer or a visitor action
// directly.
export interface LivingEntityState {
  id: EntityId
  archetypeId: EntityArchetypeId
  locationId: LocationId
  lifecyclePhase: string
  attributes: Record<string, string | number | boolean>
  lastUpdatedTick: number
}
