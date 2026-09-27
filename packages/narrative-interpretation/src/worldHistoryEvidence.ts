// PLT-R3G3-10 (R3-G3 first slice): verified Lane-1 world history -> WorldEvidence.
//
//   compiler canonical bytes + claimed {fixtureId, digest}
//     -> @avatark/narrative-ir-adapter adaptVerifiedWorldHistory()
//        (verifyCompiledArtifact() first; facts come ONLY from the verified
//        canonical artifact)
//     -> WorldHistoryEntryFact / OccurrenceFact
//     -> evidenceItemFromWorldHistoryEntryFact() / evidenceItemFromOccurrenceFact()
//        (this file: pure, read-only carriers -- copy fields, fabricate none)
//     -> NarrativeEvidenceItem
//
// Evidence classes connected: WORLD_HISTORY HistoryPool entries and
// Occurrence documents. These are world facts, not narrative meaning; this
// package still decides nothing about their significance here.
import type { OccurrenceFact, WorldHistoryEntryFact } from "@avatark/narrative-ir-adapter"
import { NARRATIVE_IR_ADAPTER_IDENTITY } from "./worldEvidence.ts"
import type { NarrativeEvidenceItem } from "./types.ts"

export const WORLD_HISTORY_ENTRY_EVIDENCE_KIND = "WORLD_HISTORY_ENTRY"
export const OCCURRENCE_EVIDENCE_KIND = "OCCURRENCE"

export interface WorldHistoryEntryEvidencePayload extends Omit<WorldHistoryEntryFact, "kind"> {
  readonly kind: typeof WORLD_HISTORY_ENTRY_EVIDENCE_KIND
  readonly adapterIdentity: typeof NARRATIVE_IR_ADAPTER_IDENTITY
}

export interface OccurrenceEvidencePayload extends Omit<OccurrenceFact, "kind"> {
  readonly kind: typeof OCCURRENCE_EVIDENCE_KIND
  readonly adapterIdentity: typeof NARRATIVE_IR_ADAPTER_IDENTITY
}

// A history entry is identified by its pool's canonical key plus its
// position in that ordered, append-only pool. It is deliberately NOT the
// entry's target reference: the same target may be recorded more than once,
// and the target may not be materialized in this artifact.
export function worldHistoryEntryEvidenceId(fact: Pick<WorldHistoryEntryFact, "poolKey" | "position">): string {
  return `${fact.poolKey}#${fact.position}`
}

export function evidenceItemFromWorldHistoryEntryFact(fact: WorldHistoryEntryFact): NarrativeEvidenceItem {
  const payload: WorldHistoryEntryEvidencePayload = {
    kind: WORLD_HISTORY_ENTRY_EVIDENCE_KIND,
    adapterIdentity: NARRATIVE_IR_ADAPTER_IDENTITY,
    source: fact.source,
    poolKey: fact.poolKey,
    poolAuthority: fact.poolAuthority,
    poolIrVersion: fact.poolIrVersion,
    position: fact.position,
    entryRef: fact.entryRef,
    ...(fact.recordedProvenance !== undefined ? { recordedProvenance: fact.recordedProvenance } : {}),
    reference: fact.reference,
  }
  return { evidenceId: worldHistoryEntryEvidenceId(fact), sourceKind: WORLD_HISTORY_ENTRY_EVIDENCE_KIND, payload }
}

export function evidenceItemFromOccurrenceFact(fact: OccurrenceFact): NarrativeEvidenceItem {
  const payload: OccurrenceEvidencePayload = {
    kind: OCCURRENCE_EVIDENCE_KIND,
    adapterIdentity: NARRATIVE_IR_ADAPTER_IDENTITY,
    source: fact.source,
    occurrenceKey: fact.occurrenceKey,
    irVersion: fact.irVersion,
    persistence: fact.persistence,
    ...(fact.sequenceIndex !== undefined ? { sequenceIndex: fact.sequenceIndex } : {}),
    ...(fact.origin !== undefined ? { origin: fact.origin } : {}),
    observations: fact.observations,
  }
  return { evidenceId: fact.occurrenceKey, sourceKind: OCCURRENCE_EVIDENCE_KIND, payload }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function hasAdapterAndSource(record: Record<string, unknown>): boolean {
  const adapterIdentity = record.adapterIdentity
  if (!isRecord(adapterIdentity) || adapterIdentity.name !== NARRATIVE_IR_ADAPTER_IDENTITY.name || !isNonEmptyString(adapterIdentity.version)) {
    return false
  }
  const source = record.source
  return isRecord(source) && isNonEmptyString(source.fixtureId) && isNonEmptyString(source.digest) && isNonEmptyString(source.canonicalizationVersion)
}

// Structural validation only, against `unknown` caller input.
export function isWorldHistoryEntryEvidencePayload(value: unknown): value is WorldHistoryEntryEvidencePayload {
  if (!isRecord(value) || value.kind !== WORLD_HISTORY_ENTRY_EVIDENCE_KIND || !hasAdapterAndSource(value)) {
    return false
  }
  if (!isNonEmptyString(value.poolKey) || !isNonEmptyString(value.poolAuthority) || !isNonEmptyString(value.poolIrVersion) || !isNonEmptyString(value.entryRef)) {
    return false
  }
  if (typeof value.position !== "number" || !Number.isInteger(value.position) || value.position < 0) {
    return false
  }
  if (value.recordedProvenance !== undefined && value.recordedProvenance !== "SYSTEM_OBSERVED" && value.recordedProvenance !== "CONSUMER_DECLARED") {
    return false
  }
  const reference = value.reference
  return isRecord(reference) && (reference.family === null || isNonEmptyString(reference.family)) && typeof reference.materialized === "boolean"
}

export function isOccurrenceEvidencePayload(value: unknown): value is OccurrenceEvidencePayload {
  if (!isRecord(value) || value.kind !== OCCURRENCE_EVIDENCE_KIND || !hasAdapterAndSource(value)) {
    return false
  }
  if (!isNonEmptyString(value.occurrenceKey) || !isNonEmptyString(value.irVersion)) {
    return false
  }
  const persistence = value.persistence
  if (!isRecord(persistence) || !isNonEmptyString(persistence.authority) || !isNonEmptyString(persistence.lifetime)) {
    return false
  }
  return Array.isArray(value.observations)
}
