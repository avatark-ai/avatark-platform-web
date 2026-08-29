import type { CanonicalEventOrigin } from "../canonicalNarrativeIR.ts"
import type { EvidenceActor } from "../deriveNonActionQualification.ts"

// Translates the canonical per-Occurrence causal register (eventOrigin,
// common.schema.json) into this package's own EvidenceActor vocabulary.
// Deliberately reads ONLY eventOrigin, never causalAttribution -- the two
// are a genuinely different grain (per-event vs per-Consequence) that must
// never be collapsed (see NC-IR-RECONCILE-01's CausalAttribution finding,
// preserved distinctly here by construction: this function's input type
// admits no causalAttribution value at all).
//
// The mapping is behaviorally safe under deriveNonActionQualification(),
// which only ever distinguishes CONSUMER from every other value -- AUTONOMOUS/
// ENVIRONMENTAL/UNSPECIFIED are treated identically by that evaluator, so the
// WORLD_PROCESS_CAUSED/OTHER_ENTITY_CAUSED split below is a documented,
// non-load-bearing convention, not a semantic claim: WORLD_PROCESS_CAUSED
// (an ambient world mechanism) reads closest to "ENVIRONMENTAL"; OTHER_ENTITY_CAUSED
// (another entity's own independent activity) reads closest to "AUTONOMOUS".
export function evidenceActorFromCanonicalEventOrigin(origin: CanonicalEventOrigin): EvidenceActor {
  switch (origin) {
    case "CONSUMER_CAUSED":
      return "CONSUMER"
    case "OTHER_ENTITY_CAUSED":
      return "AUTONOMOUS"
    case "WORLD_PROCESS_CAUSED":
      return "ENVIRONMENTAL"
    case "UNEXPLAINED":
      return "UNSPECIFIED"
  }
}
