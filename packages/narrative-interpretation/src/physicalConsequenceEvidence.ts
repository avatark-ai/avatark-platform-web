// PLT-R3G3-12 (R3-G3 third slice): verified PhysicalConsequence ->
// WorldEvidence.
//
//   compiler canonical bytes + claimed {fixtureId, digest}
//     -> @avatark/narrative-ir-adapter adaptVerifiedPhysicalConsequences()
//        (verifyCompiledArtifact() first; facts come ONLY from the verified
//        canonical artifact; only register PHYSICAL is adapted)
//     -> PhysicalConsequenceFact
//     -> evidenceItemFromPhysicalConsequenceFact() (this file: a pure,
//        read-only carrier -- copies fields, fabricates none)
//     -> NarrativeEvidenceItem
//
// Each item transports an authoritative world fact; it manufactures none.
// causalAttribution is the verified document's own opaque value: carrying it
// does not connect CAUSAL_ATTRIBUTION evidence and makes no causal claim.
// worldStateDelta is carried, never applied.
import type { PhysicalConsequenceFact } from "@avatark/narrative-ir-adapter"
import { NARRATIVE_IR_ADAPTER_IDENTITY } from "./worldEvidence.ts"
import type { NarrativeEvidenceItem } from "./types.ts"

export const PHYSICAL_CONSEQUENCE_EVIDENCE_KIND = "CONSEQUENCE_PHYSICAL"

export interface PhysicalConsequenceEvidencePayload extends Omit<PhysicalConsequenceFact, "kind"> {
  readonly kind: typeof PHYSICAL_CONSEQUENCE_EVIDENCE_KIND
  readonly adapterIdentity: typeof NARRATIVE_IR_ADAPTER_IDENTITY
}

export function evidenceItemFromPhysicalConsequenceFact(fact: PhysicalConsequenceFact): NarrativeEvidenceItem {
  const payload: PhysicalConsequenceEvidencePayload = {
    kind: PHYSICAL_CONSEQUENCE_EVIDENCE_KIND,
    adapterIdentity: NARRATIVE_IR_ADAPTER_IDENTITY,
    source: fact.source,
    consequenceKey: fact.consequenceKey,
    irVersion: fact.irVersion,
    register: fact.register,
    triggerId: fact.triggerId,
    causalAttribution: fact.causalAttribution,
    evidenceTiming: fact.evidenceTiming,
    persistence: fact.persistence,
    worldStateDelta: fact.worldStateDelta,
  }
  return { evidenceId: fact.consequenceKey, sourceKind: PHYSICAL_CONSEQUENCE_EVIDENCE_KIND, payload }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

// Structural validation only, against `unknown` caller input.
export function isPhysicalConsequenceEvidencePayload(value: unknown): value is PhysicalConsequenceEvidencePayload {
  if (!isRecord(value) || value.kind !== PHYSICAL_CONSEQUENCE_EVIDENCE_KIND || value.register !== "PHYSICAL") {
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
  if (!isNonEmptyString(value.consequenceKey) || !value.consequenceKey.startsWith("consequence/") || !isNonEmptyString(value.irVersion)) {
    return false
  }
  if (!isNonEmptyString(value.triggerId) || !isNonEmptyString(value.evidenceTiming)) {
    return false
  }
  if (!isRecord(value.causalAttribution) || !isNonEmptyString(value.causalAttribution.kind) || !isRecord(value.worldStateDelta)) {
    return false
  }
  const persistence = value.persistence
  return isRecord(persistence) && isNonEmptyString(persistence.authority) && isNonEmptyString(persistence.lifetime)
}
