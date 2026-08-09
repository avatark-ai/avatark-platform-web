// Sprint 18, Phase 0 §23: a THIRD, explicitly distinct provenance
// concept, alongside `MemoryProvenance` (world-memory-contracts, names
// which SIMULATION INPUT produced a memory record) and
// `WorldSnapshotProvenance` (living-systems-contracts, names which
// StudioK ARTIFACT a snapshot was rendered from) -- never collapsed
// into either. This one names which authored Canon document and spec a
// specific canonical event traces to.
export interface CanonicalEventProvenance {
  canonDocIds: string[]
  specId: string
  specVersion: number
  definitionContentHash: string
}
