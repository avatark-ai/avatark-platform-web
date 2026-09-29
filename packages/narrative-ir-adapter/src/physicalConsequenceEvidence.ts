// R3-G3 third slice (PLT-R3G3-12): verified PhysicalConsequence documents ->
// PhysicalConsequence facts for the platform's WorldEvidence boundary.
//
// Trust rule: facts are extracted ONLY from the canonical artifact that
// verifyCompiledArtifact() returns after the compiler-emitted canonical bytes
// have been verified against the claimed digest. Nothing else on the input
// object is read.
//
// Authority (compiler main, consequence.schema.json): Consequence is a oneOf
// of three structurally incompatible registers. A PhysicalConsequence carries
// exactly irVersion, id, register ("PHYSICAL"), triggerId, causalAttribution,
// evidenceTiming, persistence and worldStateDelta, all required, with
// additionalProperties false -- so it has no personalHistoryEntryId,
// relationshipChainId, nextChainState or consumerId. Every field is inside
// the digested canonical payload.
//
// Register firewall: only a document whose register is exactly "PHYSICAL" is
// adapted. RELATIONAL and LONGITUDINAL Consequences are deferred behind
// separate personal/relationship-history authority and are skipped, never
// adapted. Any other register value is refused, never reinterpreted.
//
// What a fact means: "the verified artifact contains this PhysicalConsequence
// with these canonical field values". causalAttribution and worldStateDelta
// are carried as opaque canonical values, exactly as the compiler emitted
// them: attribution is never read as a causal conclusion, and the delta is
// never applied, replayed or resolved against any world state.
import { verifyCompiledArtifact } from "./compiledArtifactVerification.ts"
import type { VerifiedArtifactSource, WorldHistoryAdaptationRefusalReason } from "./worldHistoryEvidence.ts"

// A canonical JSON object value carried without interpretation.
export type OpaqueCanonicalObject = Readonly<Record<string, unknown>>

export interface PhysicalConsequenceFact {
  readonly kind: "PHYSICAL_CONSEQUENCE"
  readonly source: VerifiedArtifactSource
  readonly consequenceKey: string
  readonly irVersion: string
  readonly register: "PHYSICAL"
  readonly triggerId: string
  readonly causalAttribution: OpaqueCanonicalObject
  readonly evidenceTiming: string
  readonly persistence: { readonly authority: string; readonly lifetime: string }
  readonly worldStateDelta: OpaqueCanonicalObject
}

export type PhysicalConsequenceAdaptationResult =
  | {
      readonly decision: "ADAPTED"
      readonly source: VerifiedArtifactSource
      readonly physicalConsequences: readonly PhysicalConsequenceFact[]
    }
  | { readonly decision: "REFUSED"; readonly reason: WorldHistoryAdaptationRefusalReason; readonly detail: string }

// Registers the compiler defines but this slice does not adapt.
const DEFERRED_REGISTERS: readonly string[] = ["RELATIONAL", "LONGITUDINAL"]

// consequence.schema.json#/$defs/physicalConsequence, additionalProperties false.
const PHYSICAL_CONSEQUENCE_FIELDS: readonly string[] = [
  "causalAttribution",
  "evidenceTiming",
  "id",
  "irVersion",
  "persistence",
  "register",
  "triggerId",
  "worldStateDelta",
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function malformed(detail: string): PhysicalConsequenceAdaptationResult {
  return { decision: "REFUSED", reason: "MALFORMED_HISTORY_DOCUMENT", detail }
}

// Accepts exactly a verifyCompiledArtifact() input: {artifact, canonicalBytes}.
export function adaptVerifiedPhysicalConsequences(input: unknown): PhysicalConsequenceAdaptationResult {
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

  const physicalConsequences: PhysicalConsequenceFact[] = []

  // Document-map keys are canonical identity; sorted for a deterministic order.
  for (const key of Object.keys(documents).sort()) {
    if (!key.startsWith("consequence/")) continue
    const doc = documents[key]
    // A Consequence's explicit id must equal its document-map key (compiler R20).
    if (!isRecord(doc) || doc.id !== key || !isNonEmptyString(doc.irVersion)) {
      return malformed(`${key} is not a well-formed Consequence document`)
    }
    if (typeof doc.register === "string" && DEFERRED_REGISTERS.includes(doc.register)) continue
    if (doc.register !== "PHYSICAL") {
      return malformed(`${key} has unrecognized register ${JSON.stringify(doc.register)}`)
    }
    const unexpected = Object.keys(doc).filter((field) => !PHYSICAL_CONSEQUENCE_FIELDS.includes(field))
    if (unexpected.length > 0) {
      return malformed(`${key} is PHYSICAL but carries fields outside the PhysicalConsequence shape: ${unexpected.sort().join(", ")}`)
    }
    const { triggerId, causalAttribution, evidenceTiming, persistence, worldStateDelta } = doc
    if (!isNonEmptyString(triggerId)) {
      return malformed(`${key}.triggerId is not a reference`)
    }
    if (!isRecord(causalAttribution) || !isNonEmptyString(causalAttribution.kind)) {
      return malformed(`${key}.causalAttribution is not a canonical causalAttribution object`)
    }
    if (!isNonEmptyString(evidenceTiming)) {
      return malformed(`${key}.evidenceTiming is missing`)
    }
    if (!isRecord(persistence) || !isNonEmptyString(persistence.authority) || !isNonEmptyString(persistence.lifetime)) {
      return malformed(`${key}.persistence must carry authority and lifetime`)
    }
    if (!isRecord(worldStateDelta)) {
      return malformed(`${key}.worldStateDelta is not an object`)
    }
    physicalConsequences.push({
      kind: "PHYSICAL_CONSEQUENCE",
      source,
      consequenceKey: key,
      irVersion: doc.irVersion,
      register: "PHYSICAL",
      triggerId,
      causalAttribution,
      evidenceTiming,
      persistence: { authority: persistence.authority, lifetime: persistence.lifetime },
      worldStateDelta,
    })
  }

  return { decision: "ADAPTED", source, physicalConsequences }
}
