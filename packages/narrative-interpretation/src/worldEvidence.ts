// STK-WO-009 Phase B: the first real, governed read path from authoritative
// Lane-1 World evidence into Narrative Interpretation.
//
//   Lane-1 (studiok-living-symphony-compiler, schemas/ir/v0/*.schema.json)
//     -> @avatark/narrative-ir-adapter (existing, unmodified translation
//        boundary -- evaluateExpectation() / expectationReferenceFromCanonical()
//        / artifactReferenceFromCanonical() are used exactly as they are;
//        nothing here re-derives or re-validates what the adapter already
//        computed)
//     -> evidenceItemFromExpectedAbsenceFact() (this file: a pure, read-only
//        carrier -- copies fields, fabricates none)
//     -> NarrativeEvidenceItem (Phase A's own, unchanged shape)
//
// Evidence class connected: PlaceMemory.expectedPatternState (real Lane-1
// field, schemas/ir/v0/place-memory.schema.json + expected-pattern-state.schema.json),
// via the adapter's real ExpectedAbsenceFact. This is the only evidence
// class STK-WO-009 Phase B connects -- see NOT_YET_INTEGRATED_EVIDENCE_CLASSES
// in provenance.ts for every class this package still does not read.
//
// Structurally read-only: nothing below imports, calls, or re-exports a
// World-mutation, WorldEvent-commit, visitor-action-authorization, or
// persistence-commit API -- @avatark/narrative-ir-adapter exposes none, and
// this module adds none of its own.
import type { ArtifactReference, ExpectationOrigin, ExpectedAbsenceFact } from "@avatark/narrative-ir-adapter"
import type { NarrativeEvidenceItem } from "./types.ts"

export const ADAPTED_EVIDENCE_SOURCE_KIND = "PLACE_MEMORY_EXPECTED_PATTERN_STATE"

// The governed adapter's own identity. Recorded as a constant, matching
// packages/narrative-ir-adapter/package.json's version at the time this
// Phase B read path was built -- Phase B's scope is a single, narrow read
// path, not a general adapter-version-resolution mechanism. A later phase
// should read this dynamically from the dependency's own package.json if
// version drift between the two ever becomes a real concern.
export const NARRATIVE_IR_ADAPTER_IDENTITY = {
  name: "@avatark/narrative-ir-adapter",
  version: "0.1.0",
} as const

export interface AdaptedExpectedAbsenceEvidencePayload {
  readonly kind: typeof ADAPTED_EVIDENCE_SOURCE_KIND
  readonly adapterIdentity: typeof NARRATIVE_IR_ADAPTER_IDENTITY
  readonly expectationId: string
  readonly subjectId: string
  readonly property: string
  readonly origin: ExpectationOrigin
  readonly evidenceStateIds: readonly string[]
  readonly logicalTick: number
  readonly disconfirmationCount: number
  readonly artifactReference: ArtifactReference
}

// Pure, read-only construction: every field is copied verbatim from a fact
// the governed adapter's own certified evaluateExpectation() already
// produced (never re-derived, never re-validated here). No wall-clock time,
// no fabricated identifiers.
export function evidenceItemFromExpectedAbsenceFact(fact: ExpectedAbsenceFact): NarrativeEvidenceItem {
  const payload: AdaptedExpectedAbsenceEvidencePayload = {
    kind: ADAPTED_EVIDENCE_SOURCE_KIND,
    adapterIdentity: NARRATIVE_IR_ADAPTER_IDENTITY,
    expectationId: fact.expectationId,
    subjectId: fact.subjectId,
    property: fact.property,
    origin: fact.origin,
    evidenceStateIds: fact.evidenceStateIds,
    logicalTick: fact.logicalTick,
    disconfirmationCount: fact.disconfirmationCount,
    artifactReference: fact.artifactReference,
  }
  return {
    evidenceId: fact.expectationId,
    sourceKind: ADAPTED_EVIDENCE_SOURCE_KIND,
    payload,
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function isArtifactReferenceShape(value: unknown): value is ArtifactReference {
  if (value === null || typeof value !== "object") {
    return false
  }
  const record = value as Record<string, unknown>
  return isNonEmptyString(record.sourceId) && isNonEmptyString(record.digest) && isNonEmptyString(record.ruleId) && isNonEmptyString(record.eventId)
}

// Structural validation only -- never re-runs the adapter's own evaluator,
// never re-derives origin/disconfirmationCount, and never accepts a payload
// merely because it is well-typed at compile time (this runs against
// `unknown` caller input, so no compile-time type can be trusted).
export function isAdaptedExpectedAbsenceEvidencePayload(value: unknown): value is AdaptedExpectedAbsenceEvidencePayload {
  if (value === null || typeof value !== "object") {
    return false
  }
  const record = value as Record<string, unknown>
  if (record.kind !== ADAPTED_EVIDENCE_SOURCE_KIND) {
    return false
  }
  const adapterIdentity = record.adapterIdentity as Record<string, unknown> | undefined
  if (!adapterIdentity || adapterIdentity.name !== NARRATIVE_IR_ADAPTER_IDENTITY.name || !isNonEmptyString(adapterIdentity.version)) {
    return false
  }
  if (!isNonEmptyString(record.expectationId) || !isNonEmptyString(record.subjectId) || !isNonEmptyString(record.property)) {
    return false
  }
  if (record.origin !== "WORLD_PATTERN" && record.origin !== "OBSERVER_KNOWLEDGE") {
    return false
  }
  if (!Array.isArray(record.evidenceStateIds) || !record.evidenceStateIds.every(isNonEmptyString)) {
    return false
  }
  if (typeof record.logicalTick !== "number" || typeof record.disconfirmationCount !== "number") {
    return false
  }
  return isArtifactReferenceShape(record.artifactReference)
}
