import type { AdaptationDecision, AdaptationPressure, AdaptationRule } from "@avatark/world-adaptation-contracts"

// Sprint 15: the ONE place accumulated pressure becomes (or does not
// become) a triggered decision. Pure, deterministic -- `tier` is a
// plain integer division, never a random/LLM judgment. `pressure` must
// already be the (domain, subjectId, kind) match for `rule` -- this
// function trusts its caller for that pairing, the same "caller
// assembles, function judges" split every sibling resolver in this
// codebase already holds.
export function evaluateAdaptationRule(rule: AdaptationRule, pressure: AdaptationPressure): AdaptationDecision {
  const tier = Math.floor(pressure.value / rule.threshold)
  return { ruleId: rule.id, domain: rule.domain, subjectId: pressure.subjectId, tick: pressure.lastUpdatedTick, pressureValue: pressure.value, tier, triggered: tier > 0 }
}
