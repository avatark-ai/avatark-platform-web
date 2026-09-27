// R3-G3 first slice (PLT-R3G3-10): verified compiler world history ->
// world-history facts for the platform's WorldEvidence boundary.
//
// Trust rule: facts are extracted ONLY from the canonical artifact that
// verifyCompiledArtifact() returns after the compiler-emitted canonical bytes
// have been verified against the claimed digest. The caller never supplies a
// document to adapt; it supplies {artifact, canonicalBytes}, and anything
// else on the input object is ignored.
//
// Scope: WORLD_HISTORY HistoryPool entries and Occurrence documents only.
// PERSONAL_VISITOR_HISTORY pools, Consequence, and general causalHistory are
// out of scope and are never emitted. This is fact adaptation, not narrative
// interpretation: every value is copied from the verified artifact, nothing
// is inferred, and no reference is resolved by guessing.
//
// Canonical form: the compiler omits empty arrays (R02 default-equivalence),
// so an absent `entries` or `observations` is read as an empty array.
import { verifyCompiledArtifact } from "./compiledArtifactVerification.ts"
import type { CompiledArtifactRefusalReason } from "./compiledArtifactVerification.ts"
import { CANONICAL_DOCUMENT_FAMILIES } from "./canonicalNarrativeIR.ts"
import type { CanonicalEventOrigin, CanonicalObservation } from "./canonicalNarrativeIR.ts"

// The verified compiler artifact every fact was taken from.
export interface VerifiedArtifactSource {
  readonly fixtureId: string
  readonly digest: string
  readonly canonicalizationVersion: string
}

// Where an entry points. `family` is the canonical document family named by
// the reference's key prefix, or null for an external (non-IR) history fact
// such as declared/*. `materialized` says only whether the target document is
// present in this same verified artifact; an absent target is a legitimate
// open reference, never an error.
export interface HistoryEntryReference {
  readonly family: string | null
  readonly materialized: boolean
}

export interface WorldHistoryEntryFact {
  readonly kind: "WORLD_HISTORY_ENTRY"
  readonly source: VerifiedArtifactSource
  readonly poolKey: string
  readonly poolAuthority: string
  readonly poolIrVersion: string
  // Zero-based position in the pool's ordered, append-only entries.
  readonly position: number
  readonly entryRef: string
  readonly recordedProvenance?: "SYSTEM_OBSERVED" | "CONSUMER_DECLARED"
  readonly reference: HistoryEntryReference
}

export interface OccurrenceFact {
  readonly kind: "OCCURRENCE"
  readonly source: VerifiedArtifactSource
  readonly occurrenceKey: string
  readonly irVersion: string
  readonly persistence: { readonly authority: string; readonly lifetime: string }
  readonly sequenceIndex?: number
  readonly origin?: CanonicalEventOrigin
  readonly observations: readonly CanonicalObservation[]
}

export type WorldHistoryAdaptationRefusalReason = CompiledArtifactRefusalReason | "MALFORMED_HISTORY_DOCUMENT"

export type WorldHistoryAdaptationResult =
  | {
      readonly decision: "ADAPTED"
      readonly source: VerifiedArtifactSource
      readonly worldHistoryEntries: readonly WorldHistoryEntryFact[]
      readonly occurrences: readonly OccurrenceFact[]
    }
  | { readonly decision: "REFUSED"; readonly reason: WorldHistoryAdaptationRefusalReason; readonly detail: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function malformed(detail: string): WorldHistoryAdaptationResult {
  return { decision: "REFUSED", reason: "MALFORMED_HISTORY_DOCUMENT", detail }
}

// common.schema.json $defs/eventOrigin.
const EVENT_ORIGINS: readonly string[] = ["CONSUMER_CAUSED", "WORLD_PROCESS_CAUSED", "OTHER_ENTITY_CAUSED", "UNEXPLAINED"]

function referenceFamily(ref: string): string | null {
  const slash = ref.indexOf("/")
  if (slash <= 0 || slash === ref.length - 1) return null
  const family = ref.slice(0, slash)
  return CANONICAL_DOCUMENT_FAMILIES.includes(family) ? family : null
}

// Accepts exactly a verifyCompiledArtifact() input: {artifact, canonicalBytes}.
export function adaptVerifiedWorldHistory(input: unknown): WorldHistoryAdaptationResult {
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

  const worldHistoryEntries: WorldHistoryEntryFact[] = []
  const occurrences: OccurrenceFact[] = []

  // Document-map keys are canonical identity; sorted for a deterministic order.
  for (const key of Object.keys(documents).sort()) {
    const doc = documents[key]
    const family = key.slice(0, key.indexOf("/"))

    if (family === "history-pool") {
      if (!isRecord(doc) || doc.id !== key || !isNonEmptyString(doc.irVersion) || !isNonEmptyString(doc.authority)) {
        return malformed(`${key} is not a well-formed HistoryPool document`)
      }
      if (doc.poolKind === "PERSONAL_VISITOR_HISTORY") continue
      if (doc.poolKind !== "WORLD_HISTORY") {
        return malformed(`${key} has unrecognized poolKind ${JSON.stringify(doc.poolKind)}`)
      }
      const entries = doc.entries === undefined ? [] : doc.entries
      if (!Array.isArray(entries)) {
        return malformed(`${key}.entries is not an array`)
      }
      for (let position = 0; position < entries.length; position++) {
        const entry = entries[position]
        const entryRef = typeof entry === "string" ? entry : isRecord(entry) ? entry.entryId : undefined
        if (!isNonEmptyString(entryRef)) {
          return malformed(`${key}.entries[${position}] has no entry id`)
        }
        const recorded = isRecord(entry) ? entry.provenance : undefined
        if (recorded !== undefined && recorded !== "SYSTEM_OBSERVED" && recorded !== "CONSUMER_DECLARED") {
          return malformed(`${key}.entries[${position}] has unrecognized provenance`)
        }
        worldHistoryEntries.push({
          kind: "WORLD_HISTORY_ENTRY",
          source,
          poolKey: key,
          poolAuthority: doc.authority,
          poolIrVersion: doc.irVersion,
          position,
          entryRef,
          ...(recorded !== undefined ? { recordedProvenance: recorded } : {}),
          reference: { family: referenceFamily(entryRef), materialized: entryRef in documents },
        })
      }
    }

    if (family === "occurrence") {
      if (!isRecord(doc) || doc.id !== key || !isNonEmptyString(doc.irVersion) || !isRecord(doc.persistence)) {
        return malformed(`${key} is not a well-formed Occurrence document`)
      }
      const persistence = doc.persistence
      if (!isNonEmptyString(persistence.authority) || !isNonEmptyString(persistence.lifetime)) {
        return malformed(`${key}.persistence must carry authority and lifetime`)
      }
      if (doc.origin !== undefined && !EVENT_ORIGINS.includes(doc.origin as string)) {
        return malformed(`${key}.origin is not a canonical eventOrigin value`)
      }
      const observations = doc.observations === undefined ? [] : doc.observations
      if (!Array.isArray(observations) || !observations.every((o) => isRecord(o) && isNonEmptyString(o.observerId) && isNonEmptyString(o.epistemicTier))) {
        return malformed(`${key}.observations is not a well-formed observation list`)
      }
      occurrences.push({
        kind: "OCCURRENCE",
        source,
        occurrenceKey: key,
        irVersion: doc.irVersion,
        persistence: { authority: persistence.authority, lifetime: persistence.lifetime },
        ...(typeof doc.sequenceIndex === "number" ? { sequenceIndex: doc.sequenceIndex } : {}),
        ...(doc.origin !== undefined ? { origin: doc.origin as CanonicalEventOrigin } : {}),
        observations: observations as CanonicalObservation[],
      })
    }
  }

  return { decision: "ADAPTED", source, worldHistoryEntries, occurrences }
}
