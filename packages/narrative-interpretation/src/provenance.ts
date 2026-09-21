import { ADAPTED_EVIDENCE_SOURCE_KIND, isAdaptedExpectedAbsenceEvidencePayload } from "./worldEvidence.ts"
import type { EvidenceProvenanceEntry, InterpretationProvenance, InterpreterIdentity, NarrativeEvidenceItem } from "./types.ts"

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

function buildEvidenceProvenanceEntry(item: NarrativeEvidenceItem): EvidenceProvenanceEntry {
  if (item.sourceKind === ADAPTED_EVIDENCE_SOURCE_KIND && isAdaptedExpectedAbsenceEvidencePayload(item.payload)) {
    return {
      evidenceId: item.evidenceId,
      sourceKind: item.sourceKind,
      integration: "ADAPTED_REAL",
      adapterIdentity: item.payload.adapterIdentity,
      sourceArtifact: item.payload.artifactReference,
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
  evidence: readonly NarrativeEvidenceItem[],
): InterpretationProvenance {
  return {
    interpreterIdentity,
    inputSchemaVersion,
    sourceEvidenceIds: evidence.map((item) => item.evidenceId),
    evidenceProvenance: evidence.map(buildEvidenceProvenanceEntry),
    notYetIntegrated: NOT_YET_INTEGRATED_EVIDENCE_CLASSES,
  }
}
