// Reproduces the canonical producer's own RuntimeRequirement identifiers as
// an external, authoritative vocabulary -- this package never redefines
// their semantics, only names them so a host can declare support. Only
// DELIBERATE_NON_ACTION is executable by this package; the rest are
// representable in the capability map but not implemented here.
export type RuntimeRequirement =
  | "AUTONOMOUS_PROGRESSION"
  | "DELAYED_CONSEQUENCE"
  | "EXPECTED_STATE_COMPARISON"
  | "CONTINUE_AFTER_CONSUMER_EXIT"
  | "RETURN_RECOGNITION"
  | "DELIBERATE_NON_ACTION"
  | "PLACE_HISTORY_QUERY"
  | "OBSERVATION_FIDELITY_CONSISTENCY"
  | "UNSCORED_EVALUATION"
  | "DIEGETIC_EVIDENCE_ONLY"

// A key absent from `supports` means unsupported -- the empty object is
// always a valid, non-contradictory floor (see MINIMAL_RUNTIME_CAPABILITIES),
// following the same "everything false is always valid" precedent as
// @avatark/world-embodiment-contracts' MINIMAL_EMBODIMENT_CAPABILITIES.
export interface RuntimeCapabilities {
  schemaVersion: string
  supports: Partial<Record<RuntimeRequirement, boolean>>
}

export const MINIMAL_RUNTIME_CAPABILITIES: RuntimeCapabilities = {
  schemaVersion: "1.0.0",
  supports: {},
}

export type ActivationCheck =
  | { activation: "ALLOWED" }
  | { activation: "REJECTED"; requirement: RuntimeRequirement; reason: string }

// Required semantic rule: an unsupported requirement rejects activation --
// it is never silently degraded.
export function checkActivation(
  requiredCapabilities: readonly RuntimeRequirement[],
  hostCapabilities: RuntimeCapabilities,
): ActivationCheck {
  for (const requirement of requiredCapabilities) {
    if (hostCapabilities.supports[requirement] !== true) {
      return {
        activation: "REJECTED",
        requirement,
        reason: `host does not declare support for ${requirement}`,
      }
    }
  }
  return { activation: "ALLOWED" }
}
