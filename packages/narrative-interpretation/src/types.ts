// Public contract for Narrative Interpretation (PLT-ADR-009, STK-WO-009).
// This package derives non-authoritative candidates from narrative evidence.
// It does not become World authority, does not compile Episodes, and cannot
// certify its own output. Kept deliberately minimal: no theme, arc, scene,
// beat, Episode, character-arc, encounter, or Writer/Story-Twin vocabulary
// is introduced here.
//
// Phase A (STK-WO-009) established this contract against caller-supplied,
// intentionally opaque evidence only. Phase B connects the first real Lane-1
// evidence class through the existing, unmodified @avatark/narrative-ir-adapter
// -- see worldEvidence.ts. The shapes below therefore now distinguish three
// layers (Phase B section 7): SOURCE AUTHORITY (Lane-1's own schemas, owned
// by studiok-living-symphony-compiler, never redefined here), ADAPTED READ
// VIEW (@avatark/narrative-ir-adapter's translated output, carried, never
// recomputed, into a NarrativeEvidenceItem by worldEvidence.ts), and
// NARRATIVE DERIVED CANDIDATE (this package's own, always-non-certified
// output, unchanged in kind since Phase A).

export type InterpreterName = "narrative-interpretation"

export interface InterpreterIdentity {
  readonly name: InterpreterName
  readonly version: string
}

// evidenceId/sourceKind/payload remain exactly Phase A's generic shape.
// sourceKind is either an arbitrary caller label (Phase A's original,
// intentionally opaque evidence) or one of the small, closed set of real
// evidence-class names this package recognizes -- see validation.ts's
// RECOGNIZED_ADAPTED_EVIDENCE_KINDS and NAMED_NOT_YET_INTEGRATED_EVIDENCE_KINDS.
export interface NarrativeEvidenceItem {
  readonly evidenceId: string
  readonly sourceKind: string
  readonly payload: unknown
}

export interface NarrativeInterpretationInput {
  readonly schemaVersion: string
  readonly evidence: readonly NarrativeEvidenceItem[]
}

export type EvidenceIntegrationStatus = "ADAPTED_REAL" | "NOT_YET_INTEGRATED"

// Per-evidence-item lineage. Only ADAPTED_REAL entries carry adapterIdentity/
// sourceArtifact -- for NOT_YET_INTEGRATED entries these remain absent
// (explicit omission, never a fabricated placeholder value).
export interface EvidenceProvenanceEntry {
  readonly evidenceId: string
  readonly sourceKind: string
  readonly integration: EvidenceIntegrationStatus
  readonly adapterIdentity?: {
    readonly name: string
    readonly version: string
  }
  readonly sourceArtifact?: {
    readonly sourceId: string
    readonly digest: string
    readonly ruleId: string
    readonly eventId: string
  }
}

export interface InterpretationProvenance {
  readonly interpreterIdentity: InterpreterIdentity
  readonly inputSchemaVersion: string
  readonly sourceEvidenceIds: readonly string[]
  // Per-item real lineage -- see EvidenceProvenanceEntry above.
  readonly evidenceProvenance: readonly EvidenceProvenanceEntry[]
  // Real Lane-1 evidence CLASSES this package has not connected to any
  // adapter capability yet (Phase B's own support matrix). Named explicitly
  // so a downstream consumer can detect "not yet available" rather than
  // mistaking an absent field for "checked and found nothing." Phase A's own
  // single "worldHistoryLineage" marker is superseded by this explicit,
  // per-class list now that one real class (PLACE_MEMORY_EXPECTED_PATTERN_STATE)
  // has been connected.
  readonly notYetIntegrated: readonly string[]
}

export interface NarrativeInterpretationCandidate {
  readonly candidateId: string
  readonly status: "candidate"
  readonly certified: false
  readonly derivedFromEvidenceIds: readonly string[]
  readonly provenance: InterpretationProvenance
}
