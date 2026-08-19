// Traces a runtime fact back to the certified canonical Narrative IR artifact
// that requested it, without ever carrying the artifact itself. The digest
// is produced once, by the canonical compiler (studiok-specifications); this
// package only ever carries and compares references, never recomputes one.
export interface ArtifactReference {
  sourceId: string
  digest: string
  ruleId: string
  eventId: string
}
