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
  // STK-WO-009 Phase C (G10C-3): the source record's own irVersion, present
  // only for ADAPTED_REAL entries whose source actually carries one.
  readonly sourceIrVersion?: string
}

export interface InterpretationProvenance {
  readonly interpreterIdentity: InterpreterIdentity
  readonly inputSchemaVersion: string
  // STK-WO-009 Phase C (G10C-3): a deterministic identity of the exact
  // authoritative/adapted evidence set (schemaVersion + every evidence
  // item's full content) -- independent of interpreterIdentity. Separated
  // from candidateId (below) so a future consumer can ask "would a
  // different interpreter version reach the same input?" without the two
  // questions being conflated in one hash.
  readonly interpretationInputIdentity: string
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

// STK-WO-009 Phase C (G10C-3): the minimum-sufficient-evidence classification
// for a real Lane-1 evidence class, per this gate's own required taxonomy.
// See provenance.ts's EVIDENCE_REQUIREMENT_CLASSIFICATION for the actual
// per-class judgments, and the gate's completion report for the reasoning
// behind each one.
export type EvidenceRequirementClassification =
  | "REQUIRED_FOR_CANDIDATE_IDENTITY"
  | "REQUIRED_FOR_CANDIDATE_MEANING"
  | "REQUIRED_FOR_CAUSAL_EXPLAINABILITY"
  | "OPTIONAL_CONTEXT"
  | "DEFER_TO_LATER_PHASE"
  | "NOT_RELEVANT_TO_INTERPRETATION"

export interface NarrativeInterpretationCandidate {
  readonly candidateId: string
  readonly status: "candidate"
  readonly certified: false
  readonly derivedFromEvidenceIds: readonly string[]
  readonly provenance: InterpretationProvenance
}

// --- STK-WO-009 Phase D (G10C-4): the certification boundary. ---
//
// Certified by a separate, non-self-invoking function (certify.ts) that
// takes an already-derived candidate plus the raw input/identity it claims
// to derive from, and independently recomputes both identities. Nothing
// in interpret.ts/worldEvidence.ts imports certify.ts, and nothing in
// certify.ts is reachable from interpretNarrativeEvidence() -- see this
// gate's static authority-boundary test.
//
// Certification means only: this exact candidate, from this exact
// interpreter, from this exact governed evidence input, with this exact
// provenance, satisfied the ratified structural/provenance/identity
// certification policy below. It does NOT mean World truth changed, an
// Episode was created, an Experience was published, or narrative quality
// was judged -- no such judgment is made anywhere in this package.
export interface NamedVersionedIdentity {
  readonly name: string
  readonly version: string
}

export interface CertifiedInterpretation {
  // Deterministic: sha256(candidateId + certificationAuthorityIdentity +
  // certificationPolicyIdentity). Never a wall-clock timestamp or random
  // id -- see certify.ts's deriveCertifiedInterpretationId.
  readonly certifiedInterpretationId: string
  readonly candidateId: string
  readonly interpretationInputIdentity: string
  readonly interpreterIdentity: InterpreterIdentity
  readonly evidenceProvenance: readonly EvidenceProvenanceEntry[]
  readonly certificationAuthorityIdentity: NamedVersionedIdentity
  readonly certificationPolicyIdentity: NamedVersionedIdentity
}

export type CertificationRefusalReason =
  | "INVALID_CANDIDATE"
  | "ALREADY_CERTIFIED"
  | "INVALID_INPUT_IDENTITY"
  | "INVALID_CANDIDATE_IDENTITY"
  | "MISSING_REQUIRED_EVIDENCE"
  | "INVALID_SOURCE_DIGEST"
  | "UNSUPPORTED_SOURCE_VERSION"
  | "INVALID_PROVENANCE"

export type CertificationResult =
  | { readonly decision: "CERTIFIED"; readonly certifiedInterpretation: CertifiedInterpretation }
  | { readonly decision: "REFUSED"; readonly reason: CertificationRefusalReason; readonly detail: string }
