// PLT-R3G3-11 (R3-G3 second slice): verified PlaceMemory.causalHistory ->
// WorldEvidence reference evidence.
//
//   compiler canonical bytes + claimed {fixtureId, digest}
//     -> @avatark/narrative-ir-adapter adaptVerifiedCausalHistory()
//        (verifyCompiledArtifact() first; facts come ONLY from the verified
//        canonical artifact)
//     -> PlaceCausalHistoryReferenceFact
//     -> evidenceItemFromPlaceCausalHistoryReferenceFact() (this file: a pure,
//        read-only carrier -- copies fields, fabricates none)
//     -> NarrativeEvidenceItem
//
// Each item says only that a place's causal-history structure references an
// Occurrence or a Consequence at a given position. It carries no causal
// explanation, no causalAttribution, and no content of the referenced
// document; an OCCURRENCE_REFERENCE is a different fact from the referenced
// Occurrence's own OCCURRENCE evidence, and a CONSEQUENCE_REFERENCE is not
// Consequence evidence.
import type { PlaceCausalHistoryReferenceFact } from "@avatark/narrative-ir-adapter"
import { NARRATIVE_IR_ADAPTER_IDENTITY } from "./worldEvidence.ts"
import type { NarrativeEvidenceItem } from "./types.ts"

export const PLACE_CAUSAL_HISTORY_EVIDENCE_KIND = "PLACE_MEMORY_CAUSAL_HISTORY"

export interface PlaceCausalHistoryReferenceEvidencePayload extends Omit<PlaceCausalHistoryReferenceFact, "kind"> {
  readonly kind: typeof PLACE_CAUSAL_HISTORY_EVIDENCE_KIND
  readonly adapterIdentity: typeof NARRATIVE_IR_ADAPTER_IDENTITY
}

// Identified by the PlaceMemory's canonical key plus the member's position,
// never by the target reference: the same target may appear more than once.
export function placeCausalHistoryEvidenceId(fact: Pick<PlaceCausalHistoryReferenceFact, "placeMemoryKey" | "position">): string {
  return `${fact.placeMemoryKey}#${fact.position}`
}

export function evidenceItemFromPlaceCausalHistoryReferenceFact(fact: PlaceCausalHistoryReferenceFact): NarrativeEvidenceItem {
  const payload: PlaceCausalHistoryReferenceEvidencePayload = {
    kind: PLACE_CAUSAL_HISTORY_EVIDENCE_KIND,
    adapterIdentity: NARRATIVE_IR_ADAPTER_IDENTITY,
    source: fact.source,
    placeMemoryKey: fact.placeMemoryKey,
    placeId: fact.placeId,
    placeMemoryIrVersion: fact.placeMemoryIrVersion,
    position: fact.position,
    targetRef: fact.targetRef,
    referenceFamily: fact.referenceFamily,
    targetMaterialized: fact.targetMaterialized,
  }
  return { evidenceId: placeCausalHistoryEvidenceId(fact), sourceKind: PLACE_CAUSAL_HISTORY_EVIDENCE_KIND, payload }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

// Structural validation only, against `unknown` caller input.
export function isPlaceCausalHistoryReferenceEvidencePayload(value: unknown): value is PlaceCausalHistoryReferenceEvidencePayload {
  if (!isRecord(value) || value.kind !== PLACE_CAUSAL_HISTORY_EVIDENCE_KIND) {
    return false
  }
  const adapterIdentity = value.adapterIdentity
  if (!isRecord(adapterIdentity) || adapterIdentity.name !== NARRATIVE_IR_ADAPTER_IDENTITY.name || !isNonEmptyString(adapterIdentity.version)) {
    return false
  }
  const source = value.source
  if (!isRecord(source) || !isNonEmptyString(source.fixtureId) || !isNonEmptyString(source.digest) || !isNonEmptyString(source.canonicalizationVersion)) {
    return false
  }
  if (!isNonEmptyString(value.placeMemoryKey) || !isNonEmptyString(value.placeId) || !isNonEmptyString(value.placeMemoryIrVersion) || !isNonEmptyString(value.targetRef)) {
    return false
  }
  if (typeof value.position !== "number" || !Number.isInteger(value.position) || value.position < 0) {
    return false
  }
  const expectedPrefix = value.referenceFamily === "OCCURRENCE_REFERENCE" ? "occurrence/" : value.referenceFamily === "CONSEQUENCE_REFERENCE" ? "consequence/" : undefined
  if (expectedPrefix === undefined || !value.targetRef.startsWith(expectedPrefix)) {
    return false
  }
  return typeof value.targetMaterialized === "boolean"
}
