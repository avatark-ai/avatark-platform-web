import { ADAPTED_EVIDENCE_SOURCE_KIND, isAdaptedExpectedAbsenceEvidencePayload } from "./worldEvidence.ts"
import {
  OCCURRENCE_EVIDENCE_KIND,
  WORLD_HISTORY_ENTRY_EVIDENCE_KIND,
  isOccurrenceEvidencePayload,
  isWorldHistoryEntryEvidencePayload,
} from "./worldHistoryEvidence.ts"
import { PLACE_CAUSAL_HISTORY_EVIDENCE_KIND, isPlaceCausalHistoryReferenceEvidencePayload } from "./causalHistoryEvidence.ts"
import { PHYSICAL_CONSEQUENCE_EVIDENCE_KIND, isPhysicalConsequenceEvidencePayload } from "./physicalConsequenceEvidence.ts"
import type { VerifiedArtifactSource } from "@avatark/narrative-ir-adapter"
import type { EvidenceProvenanceEntry, EvidenceRequirementClassification, InterpretationProvenance, InterpreterIdentity, NarrativeEvidenceItem } from "./types.ts"

// Real Lane-1 evidence CLASSES this package still does not connect to any
// adapter capability (STK-WO-009 Phase B's own support matrix -- see the
// gate's completion report for the full per-class classification). Named
// explicitly, never silently omitted, so a downstream consumer can tell
// "not yet available" apart from "checked and found nothing."
// PLT-R3G3-10 connected WORLD_HISTORY HistoryPool entries and Occurrence
// (with its observations); PERSONAL_VISITOR_HISTORY pools stay unconnected.
// PLT-R3G3-11 connected PLACE_MEMORY_CAUSAL_HISTORY as reference evidence only.
// PLT-R3G3-12 connected CONSEQUENCE_PHYSICAL; RELATIONAL and LONGITUDINAL
// Consequences and CAUSAL_ATTRIBUTION stay unconnected.
export const NOT_YET_INTEGRATED_EVIDENCE_CLASSES: readonly string[] = [
  "CONSEQUENCE_RELATIONAL",
  "CONSEQUENCE_LONGITUDINAL",
  "TRACE",
  "PERSONAL_VISITOR_HISTORY",
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
  // PLT-R3G3-10: connected world-history facts are context an interpretation
  // may draw on; neither is required for a candidate, and no causal claim is
  // made from either.
  WORLD_HISTORY_ENTRY: "OPTIONAL_CONTEXT",
  OCCURRENCE: "OPTIONAL_CONTEXT",
  // PLT-R3G3-12: a verified PhysicalConsequence is a world fact an
  // interpretation may draw on; its causalAttribution is carried opaquely and
  // no causal claim is made from it.
  CONSEQUENCE_PHYSICAL: "OPTIONAL_CONTEXT",
  CONSEQUENCE_RELATIONAL: "DEFER_TO_LATER_PHASE",
  CONSEQUENCE_LONGITUDINAL: "DEFER_TO_LATER_PHASE",
  // PLT-R3G3-11: connected as ordered reference evidence (Occurrence or
  // Consequence references); still optional context, and never a causal claim.
  PLACE_MEMORY_CAUSAL_HISTORY: "OPTIONAL_CONTEXT",
  TRACE: "DEFER_TO_LATER_PHASE",
  PERSONAL_VISITOR_HISTORY: "DEFER_TO_LATER_PHASE",
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

// PLT-R3G5-02A: the compiler artifact identity of evidence adapted from a
// verified artifact -- sourceId, digest and canonicalizationVersion, all
// copied from that evidence's own verified source, never from a constant.
function verifiedSourceArtifact(source: VerifiedArtifactSource): NonNullable<EvidenceProvenanceEntry["sourceArtifact"]> {
  return { sourceId: source.fixtureId, digest: source.digest, canonicalizationVersion: source.canonicalizationVersion }
}

function buildEvidenceProvenanceEntry(item: NarrativeEvidenceItem): EvidenceProvenanceEntry {
  if (item.sourceKind === ADAPTED_EVIDENCE_SOURCE_KIND && isAdaptedExpectedAbsenceEvidencePayload(item.payload)) {
    return {
      evidenceId: item.evidenceId,
      sourceKind: item.sourceKind,
      integration: "ADAPTED_REAL",
      adapterIdentity: item.payload.adapterIdentity,
      // Exactly the four ArtifactReference fields: the legacy path never
      // carries a canonicalizationVersion, even if the caller's object has one.
      sourceArtifact: {
        sourceId: item.payload.artifactReference.sourceId,
        digest: item.payload.artifactReference.digest,
        ruleId: item.payload.artifactReference.ruleId,
        eventId: item.payload.artifactReference.eventId,
      },
      sourceIrVersion: item.payload.irVersion,
    }
  }
  if (item.sourceKind === WORLD_HISTORY_ENTRY_EVIDENCE_KIND && isWorldHistoryEntryEvidencePayload(item.payload)) {
    return {
      evidenceId: item.evidenceId,
      sourceKind: item.sourceKind,
      integration: "ADAPTED_REAL",
      adapterIdentity: item.payload.adapterIdentity,
      sourceArtifact: verifiedSourceArtifact(item.payload.source),
      sourceIrVersion: item.payload.poolIrVersion,
      sourceDocumentKey: item.payload.poolKey,
    }
  }
  if (item.sourceKind === OCCURRENCE_EVIDENCE_KIND && isOccurrenceEvidencePayload(item.payload)) {
    return {
      evidenceId: item.evidenceId,
      sourceKind: item.sourceKind,
      integration: "ADAPTED_REAL",
      adapterIdentity: item.payload.adapterIdentity,
      sourceArtifact: verifiedSourceArtifact(item.payload.source),
      sourceIrVersion: item.payload.irVersion,
      sourceDocumentKey: item.payload.occurrenceKey,
    }
  }
  if (item.sourceKind === PLACE_CAUSAL_HISTORY_EVIDENCE_KIND && isPlaceCausalHistoryReferenceEvidencePayload(item.payload)) {
    return {
      evidenceId: item.evidenceId,
      sourceKind: item.sourceKind,
      integration: "ADAPTED_REAL",
      adapterIdentity: item.payload.adapterIdentity,
      sourceArtifact: verifiedSourceArtifact(item.payload.source),
      sourceIrVersion: item.payload.placeMemoryIrVersion,
      sourceDocumentKey: item.payload.placeMemoryKey,
    }
  }
  if (item.sourceKind === PHYSICAL_CONSEQUENCE_EVIDENCE_KIND && isPhysicalConsequenceEvidencePayload(item.payload)) {
    return {
      evidenceId: item.evidenceId,
      sourceKind: item.sourceKind,
      integration: "ADAPTED_REAL",
      adapterIdentity: item.payload.adapterIdentity,
      sourceArtifact: verifiedSourceArtifact(item.payload.source),
      sourceIrVersion: item.payload.irVersion,
      sourceDocumentKey: item.payload.consequenceKey,
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
