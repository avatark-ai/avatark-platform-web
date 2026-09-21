import { ADAPTED_EVIDENCE_SOURCE_KIND, isAdaptedExpectedAbsenceEvidencePayload } from "./worldEvidence.ts"
import type { EvidenceProvenanceEntry, EvidenceRequirementClassification, InterpretationProvenance, InterpreterIdentity, NarrativeEvidenceItem } from "./types.ts"

// Real Lane-1 evidence CLASSES this package still does not connect to any
// adapter capability (STK-WO-009 Phase B's own support matrix -- see the
// gate's completion report for the full per-class classification). Named
// explicitly, never silently omitted, so a downstream consumer can tell
// "not yet available" apart from "checked and found nothing."
export const NOT_YET_INTEGRATED_EVIDENCE_CLASSES: readonly string[] = [
  "OCCURRENCE_OBSERVATION",
  "CONSEQUENCE_PHYSICAL",
  "CONSEQUENCE_RELATIONAL",
  "CONSEQUENCE_LONGITUDINAL",
  "PLACE_MEMORY_CAUSAL_HISTORY",
  "TRACE",
  "HISTORY_POOL",
  "NARRATIVE_RESIDUE",
  "ENTITY",
  "PLACE",
  "WORLD_PROCESS",
  "WORLD_RESPONSE",
  "CAUSAL_ATTRIBUTION",
  "WORLD_IDENTITY",
  "WORLD_TIME_INTERVAL",
]

// STK-WO-009 Phase C (G10C-3) minimum-sufficient-evidence matrix. Grounded in
// direct schema/adapter reconnaissance (this gate's completion report has
// the full reasoning per class), not in "connect everything that exists."
// PLACE_MEMORY_EXPECTED_PATTERN_STATE is the one class currently connected;
// every key in NOT_YET_INTEGRATED_EVIDENCE_CLASSES also has an entry here so
// the two lists are provably kept in sync (see the completeness test in
// provenance.test.ts).
export const EVIDENCE_REQUIREMENT_CLASSIFICATION: Readonly<Record<string, EvidenceRequirementClassification>> = {
  PLACE_MEMORY_EXPECTED_PATTERN_STATE: "REQUIRED_FOR_CANDIDATE_MEANING",
  OCCURRENCE_OBSERVATION: "DEFER_TO_LATER_PHASE",
  CONSEQUENCE_PHYSICAL: "DEFER_TO_LATER_PHASE",
  CONSEQUENCE_RELATIONAL: "DEFER_TO_LATER_PHASE",
  CONSEQUENCE_LONGITUDINAL: "DEFER_TO_LATER_PHASE",
  PLACE_MEMORY_CAUSAL_HISTORY: "OPTIONAL_CONTEXT",
  TRACE: "DEFER_TO_LATER_PHASE",
  HISTORY_POOL: "DEFER_TO_LATER_PHASE",
  NARRATIVE_RESIDUE: "NOT_RELEVANT_TO_INTERPRETATION",
  ENTITY: "DEFER_TO_LATER_PHASE",
  PLACE: "DEFER_TO_LATER_PHASE",
  WORLD_PROCESS: "DEFER_TO_LATER_PHASE",
  WORLD_RESPONSE: "NOT_RELEVANT_TO_INTERPRETATION",
  // Required only IF a causal claim is ever made about this evidence; no
  // causal claim is made today (the connected evidence class is
  // deliberately causally humble -- see the adapter's own
  // expectationEvaluation.test.ts "causal humility" test), so its absence
  // does not block Phase C's own, non-causal candidate.
  CAUSAL_ATTRIBUTION: "REQUIRED_FOR_CAUSAL_EXPLAINABILITY",
  WORLD_IDENTITY: "DEFER_TO_LATER_PHASE",
  WORLD_TIME_INTERVAL: "DEFER_TO_LATER_PHASE",
}

function buildEvidenceProvenanceEntry(item: NarrativeEvidenceItem): EvidenceProvenanceEntry {
  if (item.sourceKind === ADAPTED_EVIDENCE_SOURCE_KIND && isAdaptedExpectedAbsenceEvidencePayload(item.payload)) {
    return {
      evidenceId: item.evidenceId,
      sourceKind: item.sourceKind,
      integration: "ADAPTED_REAL",
      adapterIdentity: item.payload.adapterIdentity,
      sourceArtifact: item.payload.artifactReference,
      sourceIrVersion: item.payload.irVersion,
    }
  }
  return {
    evidenceId: item.evidenceId,
    sourceKind: item.sourceKind,
    integration: "NOT_YET_INTEGRATED",
  }
}

export function buildProvenance(
  interpreterIdentity: InterpreterIdentity,
  inputSchemaVersion: string,
  interpretationInputIdentity: string,
  evidence: readonly NarrativeEvidenceItem[],
): InterpretationProvenance {
  return {
    interpreterIdentity,
    inputSchemaVersion,
    interpretationInputIdentity,
    sourceEvidenceIds: evidence.map((item) => item.evidenceId),
    evidenceProvenance: evidence.map(buildEvidenceProvenanceEntry),
    notYetIntegrated: NOT_YET_INTEGRATED_EVIDENCE_CLASSES,
  }
}
