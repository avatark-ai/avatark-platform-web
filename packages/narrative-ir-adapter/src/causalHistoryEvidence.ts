// R3-G3 second slice (PLT-R3G3-11): verified PlaceMemory.causalHistory ->
// place causal-history REFERENCE facts for the platform's WorldEvidence boundary.
//
// Trust rule: facts are extracted ONLY from the canonical artifact that
// verifyCompiledArtifact() returns after the compiler-emitted canonical bytes
// have been verified against the claimed digest. Nothing else on the input
// object is read.
//
// What a fact means: "this PlaceMemory's ordered, append-only causal-history
// structure references this Occurrence (or this Consequence) at this
// position". It is reference evidence only. It is NOT a causal explanation,
// it does not interpret causalAttribution, and the referenced document is
// never read: a referenced Consequence is not adapted into any evidence here,
// and a referenced Occurrence is already its own, separate Occurrence fact.
//
// Authority (compiler main): causalHistory is required, ordered (canonical
// ORDERED array), append-only and place-scoped; members reference Occurrence
// or Consequence documents in canonical key form (validator R21-E); members
// may be open references to documents not materialized in this artifact; the
// schema does not forbid repeated members. Order and repeats are preserved
// exactly -- nothing is sorted, grouped or deduplicated. An absent
// causalHistory in canonical bytes is read as empty (R02 default-equivalence).
import { verifyCompiledArtifact } from "./compiledArtifactVerification.ts"
import type { VerifiedArtifactSource, WorldHistoryAdaptationRefusalReason } from "./worldHistoryEvidence.ts"

export type CausalHistoryReferenceFamily = "OCCURRENCE_REFERENCE" | "CONSEQUENCE_REFERENCE"

export interface PlaceCausalHistoryReferenceFact {
  readonly kind: "PLACE_CAUSAL_HISTORY_REFERENCE"
  readonly source: VerifiedArtifactSource
  readonly placeMemoryKey: string
  readonly placeId: string
  readonly placeMemoryIrVersion: string
  // Zero-based position in the PlaceMemory's ordered causalHistory.
  readonly position: number
  readonly targetRef: string
  readonly referenceFamily: CausalHistoryReferenceFamily
  // Whether the referenced document is present in this same verified
  // artifact. Recorded only as a fact about this artifact; it does not change
  // what the reference means.
  readonly targetMaterialized: boolean
}

export type CausalHistoryAdaptationResult =
  | {
      readonly decision: "ADAPTED"
      readonly source: VerifiedArtifactSource
      readonly causalHistoryReferences: readonly PlaceCausalHistoryReferenceFact[]
    }
  | { readonly decision: "REFUSED"; readonly reason: WorldHistoryAdaptationRefusalReason; readonly detail: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function malformed(detail: string): CausalHistoryAdaptationResult {
  return { decision: "REFUSED", reason: "MALFORMED_HISTORY_DOCUMENT", detail }
}

// Classified from the reference's canonical key form alone, never from the
// target document's contents. Anything outside the two authorized families
// (or with an empty local id) is refused, not reinterpreted.
function referenceFamilyOf(ref: string): CausalHistoryReferenceFamily | undefined {
  if (ref.startsWith("occurrence/") && ref.length > "occurrence/".length) return "OCCURRENCE_REFERENCE"
  if (ref.startsWith("consequence/") && ref.length > "consequence/".length) return "CONSEQUENCE_REFERENCE"
  return undefined
}

// Accepts exactly a verifyCompiledArtifact() input: {artifact, canonicalBytes}.
export function adaptVerifiedCausalHistory(input: unknown): CausalHistoryAdaptationResult {
  const verification = verifyCompiledArtifact(input)
  if (verification.decision !== "VERIFIED") {
    return { decision: "REFUSED", reason: verification.reason, detail: verification.detail }
  }

  const source: VerifiedArtifactSource = {
    fixtureId: verification.artifact.fixtureId,
    digest: verification.artifact.digest,
    canonicalizationVersion: verification.canonicalizationVersion,
  }
  const documents = verification.canonicalArtifact.documents
  if (!isRecord(documents)) {
    return malformed("verified artifact has no documents map")
  }

  const causalHistoryReferences: PlaceCausalHistoryReferenceFact[] = []

  // Document-map keys are canonical identity; sorted for a deterministic
  // order across PlaceMemory documents. Order WITHIN a causalHistory is
  // preserved exactly as the compiler emitted it.
  for (const key of Object.keys(documents).sort()) {
    if (!key.startsWith("place-memory/")) continue
    const doc = documents[key]
    // PlaceMemory has no `id`; its document-map key is its identity (compiler R05A).
    if (!isRecord(doc) || "id" in doc || !isNonEmptyString(doc.irVersion) || !isNonEmptyString(doc.placeId) || !doc.placeId.startsWith("place/")) {
      return malformed(`${key} is not a well-formed PlaceMemory document`)
    }
    const causalHistory = doc.causalHistory === undefined ? [] : doc.causalHistory
    if (!Array.isArray(causalHistory)) {
      return malformed(`${key}.causalHistory is not an array`)
    }
    for (let position = 0; position < causalHistory.length; position++) {
      const targetRef = causalHistory[position]
      if (!isNonEmptyString(targetRef)) {
        return malformed(`${key}.causalHistory[${position}] is not a reference`)
      }
      const referenceFamily = referenceFamilyOf(targetRef)
      if (referenceFamily === undefined) {
        return malformed(`${key}.causalHistory[${position}] ${JSON.stringify(targetRef)} is neither an Occurrence nor a Consequence reference`)
      }
      causalHistoryReferences.push({
        kind: "PLACE_CAUSAL_HISTORY_REFERENCE",
        source,
        placeMemoryKey: key,
        placeId: doc.placeId,
        placeMemoryIrVersion: doc.irVersion,
        position,
        targetRef,
        referenceFamily,
        targetMaterialized: targetRef in documents,
      })
    }
  }

  return { decision: "ADAPTED", source, causalHistoryReferences }
}
