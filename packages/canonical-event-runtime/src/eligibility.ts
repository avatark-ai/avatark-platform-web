import type { LocationId } from "@avatark/runtime-contracts"
import type { CanonicalEventActivationCondition, CanonicalEventDefinition, CanonicalEventEligibility } from "@avatark/canonical-event-contracts"

// Sprint 18, Phase 0 §6/§7: every fact an activation condition can
// reference, assembled by the Host layer from already-authoritative
// state -- this package never recomputes any of these facts itself, it
// only judges them. Deliberately contains NO import of Living Systems'
// own narrative-gate carrier type: `NARRATIVE_GATE_OPEN` is resolved
// against a plain `Record<string, boolean>` the Host translates real
// gate state into, the same zero-reference posture
// social-ecology-runtime/living-rhythms-runtime already hold for that
// same upstream carrier.
export interface CanonicalEventEligibilityContext {
  tick: number
  seasonId: string
  worldInstancePhase: string | null
  completedCanonicalEventIds: ReadonlySet<string>
  reachedLocationIds: ReadonlySet<LocationId>
  narrativeGatesResolved: Readonly<Record<string, boolean>>
}

function evaluateActivationCondition(condition: CanonicalEventActivationCondition, context: CanonicalEventEligibilityContext): boolean {
  switch (condition.kind) {
    case "WORLD_TIME_AT_LEAST":
      return context.tick >= condition.tick
    case "SEASON_EQUALS":
      return context.seasonId === condition.seasonId
    case "SEQUENCE_POSITION":
      return context.completedCanonicalEventIds.has(condition.afterCanonicalEventId)
    case "LOCATION_REACHED":
      return context.reachedLocationIds.has(condition.locationId)
    case "WORLD_INSTANCE_PHASE":
      return context.worldInstancePhase === condition.phase
    case "NARRATIVE_GATE_OPEN":
      return context.narrativeGatesResolved[condition.gateId] === true
  }
}

// Sprint 18, Phase 0 §6: eligibility is a gate on ENTRY, never a
// judgment on truth. ALL authored conditions must hold (logical AND) --
// no boolean expression tree is invented (see
// @avatark/canonical-event-contracts' own `definition.ts` doc comment).
// Pure, deterministic -- identical inputs always produce the identical
// output.
export function evaluateCanonicalEventEligibility(definition: CanonicalEventDefinition, worldInstanceId: string, context: CanonicalEventEligibilityContext): CanonicalEventEligibility {
  const reasons = definition.activationConditions.map((condition) => ({ kind: condition.kind, ref: String(evaluateActivationCondition(condition, context)) }))
  const eligible = definition.activationConditions.every((condition) => evaluateActivationCondition(condition, context))
  return { canonicalEventId: definition.identity.canonicalEventId, worldInstanceId, eligible, reasons }
}
