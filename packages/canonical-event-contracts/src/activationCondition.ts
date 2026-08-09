import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 18, Phase 0 §7: bounded, deterministic, StudioK-authored
// conditions only -- never a simulation-authored one, and never a
// condition referencing emergent-history facts as a *sufficiency*
// condition for a REQUIRED event (Phase 0 §9). Every kind names a fact
// the runtime can observe deterministically from already-authoritative
// state; the Host layer resolves each kind against real state (tick,
// season, prior-activation sequence, reached locations, an
// instance-phase label, and the existing protected-narrative gate) --
// this package never recomputes any of those facts itself.
export type CanonicalEventActivationCondition =
  | { kind: "WORLD_TIME_AT_LEAST"; tick: number }
  | { kind: "SEASON_EQUALS"; seasonId: string }
  | { kind: "SEQUENCE_POSITION"; afterCanonicalEventId: string }
  | { kind: "LOCATION_REACHED"; locationId: LocationId }
  | { kind: "WORLD_INSTANCE_PHASE"; phase: string }
  | { kind: "NARRATIVE_GATE_OPEN"; gateId: string }
