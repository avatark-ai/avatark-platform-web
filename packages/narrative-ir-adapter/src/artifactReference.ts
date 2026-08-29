// Traces a runtime fact back to the certified canonical Narrative IR artifact
// that requested it, without ever carrying the artifact itself. The digest
// is produced once, by the canonical compiler
// (avatark-ai/studiok-living-world-compiler, IR 0.3.0 / canonicalization
// 0.1.0, per PLT-ADR-007); this package only ever carries and compares
// references, never recomputes one. See translation/artifactReferenceFromCanonical.ts
// for how sourceId/digest/ruleId/eventId are now derived from that
// authority's own identity primitives.
export interface ArtifactReference {
  sourceId: string
  digest: string
  ruleId: string
  eventId: string
}
