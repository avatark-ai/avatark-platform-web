// Public contract for Phase A of the Narrative Interpretation authority
// (PLT-ADR-009, STK-WO-009 Phase A). This package derives non-authoritative
// candidates from caller-supplied narrative evidence. It does not read real
// World History yet -- that wiring is Phase B -- does not compile Episodes,
// and cannot certify its own output. Kept deliberately minimal: no theme,
// arc, scene, beat, Episode, character-arc, encounter, or Writer/Story-Twin
// vocabulary is introduced here.

export type InterpreterName = "narrative-interpretation"

export interface InterpreterIdentity {
  readonly name: InterpreterName
  readonly version: string
}

export interface NarrativeEvidenceItem {
  readonly evidenceId: string
  readonly sourceKind: string
  readonly payload: unknown
}

export interface NarrativeInterpretationInput {
  readonly schemaVersion: string
  readonly evidence: readonly NarrativeEvidenceItem[]
}

export interface InterpretationProvenance {
  readonly interpreterIdentity: InterpreterIdentity
  readonly inputSchemaVersion: string
  readonly sourceEvidenceIds: readonly string[]
  // Provenance dimensions this Phase A package cannot yet truthfully
  // populate (e.g. real World History lineage). Listed explicitly so a
  // downstream consumer can detect "not yet available" rather than
  // mistaking an absent field for "checked and found nothing."
  readonly notYetIntegrated: readonly string[]
}

export interface NarrativeInterpretationCandidate {
  readonly candidateId: string
  readonly status: "candidate"
  readonly certified: false
  readonly derivedFromEvidenceIds: readonly string[]
  readonly provenance: InterpretationProvenance
}
