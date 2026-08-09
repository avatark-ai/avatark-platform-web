import type { AdaptationDomain } from "./domain.ts"
import type { AdaptationRuleId } from "./ids.ts"

// Sprint 15: the pure, inspectable judgment "does this rule's own
// pressure, for this subject, currently warrant an effect" -- a
// deterministic function of an AdaptationRule and one AdaptationPressure
// record, never of history not already folded into that pressure
// value. `tier` is `floor(pressureValue / rule.threshold)`; `triggered`
// is `tier > 0`. Kept as its own type (rather than inlined into effect
// derivation) so a caller/test can assert on "would this trigger" independent
// of "what effect would that produce."
export interface AdaptationDecision {
  ruleId: AdaptationRuleId
  domain: AdaptationDomain
  subjectId: string
  tick: number
  pressureValue: number
  tier: number
  triggered: boolean
}
