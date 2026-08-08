import type { WorldId } from "@avatark/runtime-contracts"

// Sprint 9, Phase 1/2: identifiers for the durable persistence layer.
//
// WorldInstanceId is deliberately the SAME string space as the WorldId
// every existing Living Systems / World Embodiment / Living World
// Runtime function already takes -- not a new branded type layered on
// top. Today exactly one instance ("living-vrindavan") exists per
// definition; Sprint 9 makes the runtime able to address many without
// requiring a single signature change anywhere in
// @avatark/living-systems-runtime or @avatark/world-embodiment-runtime.
export type WorldInstanceId = WorldId

// WorldDefinitionId identifies the StudioK-authored grammar/configuration
// (Phase 2's "WORLD DEFINITION") -- distinct from any particular running
// instance derived from it. Plain string alias, matching the unbranded
// convention @avatark/runtime-contracts/src/ids.ts already documents and
// deliberately keeps (branding was considered there and rejected because
// it would touch every existing signature; the same reasoning applies
// here unchanged).
export type WorldDefinitionId = string

// The StudioK-authored grammar's own version number -- bumps when the
// definition's seasons/archetypes/encounter rules change, never when an
// instance's simulation merely advances.
export type WorldVersion = number

// Optimistic-concurrency version for one WorldInstance's durable shared
// state + entity state, written together (Phase 6). Bumps by exactly 1
// on every accepted conditional save. Unrelated to WorldVersion.
export type WorldStateVersion = number

export type SimulationTick = number

export type CheckpointId = string

// Stable identity for one execution owner competing for a WorldLease
// (Phase 7). Not a UserId -- an owner is a runtime/worker process, not a
// visitor.
export type WorldOwnerId = string

// Idempotency key for one durable world-system event append (Phase 9).
export type WorldSystemEventId = string
