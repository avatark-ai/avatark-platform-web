// Sprint 11, Phase 4: STRUCTURED causal provenance, never prose. A
// CausalReference names a causal factor and its value
// (`{kind:"season", ref:"grishma"}`, `{kind:"band", ref:"hydrologyBand:low"}`,
// `{kind:"need", ref:"thirst"}`) -- the system can later explain history
// by walking these references, but this package never stores an
// explanation string as truth.
export interface CausalReference {
  kind: string
  ref: string
}

// Where a memory record's own facts came from -- the durable event(s)
// or population-tick delta it was derived from, plus which derivation
// rule produced it. Never a StudioK artifact reference (that's
// WorldSnapshotProvenance/WorldEmbodimentProvenance, Sprint 7/8 -- a
// completely different concept: those name which CANON was read from;
// this names which SIMULATION INPUT a memory record was computed from).
export interface MemoryProvenance {
  derivedFromEventIds: string[]
  derivationRule: string
  causalReferences: CausalReference[]
}
