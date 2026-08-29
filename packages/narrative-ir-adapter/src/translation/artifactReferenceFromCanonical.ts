import type { ArtifactReference } from "../artifactReference.ts"
import type { CanonicalRuntimeRequirementsDocument, CompiledArtifactIdentity } from "../canonicalNarrativeIR.ts"

// Constructs an ArtifactReference from the canonical compiler's own identity
// primitives, replacing the STK-SPEC-007 Rule/Event pair this field pair
// previously assumed (the canonical schema has no Rule or Event type --
// confirmed absent from all 14 schemas/ir/v0/*.schema.json files).
//
// `ruleId` maps onto the id of the canonical `runtime-requirements/*`
// document that declares the RuntimeRequirement this reference concerns --
// per studiok-living-symphony-compiler's own
// LW_COMPILER_R03_REFERENCE_MAPPING.md, which named this exact identity gap
// and deferred it to this migration gate ("a future gate will need to define
// what ruleId/eventId-equivalent identity a runtime-requirements/* document
// ... provides instead").
//
// `eventId` maps onto the id of whichever canonical Action/Occurrence
// document is the actual event this reference is about (the caller supplies
// it, exactly as the pre-migration test fixtures did for the STK-SPEC-007
// event.id they carried).
//
// `sourceId` is the compiled fixture-shaped document's own `fixtureId`
// (never a per-rule identity); `digest` is the real SHA-256 digest computed
// by the canonical compiler over that document's canonicalized bytes,
// replacing the placeholder digests the pre-migration test fixtures carried.
export function artifactReferenceFromCanonical(
  artifact: CompiledArtifactIdentity,
  runtimeRequirementsDocument: CanonicalRuntimeRequirementsDocument,
  eventId: string,
): ArtifactReference {
  return {
    sourceId: artifact.fixtureId,
    digest: artifact.digest,
    ruleId: runtimeRequirementsDocument.id,
    eventId,
  }
}
