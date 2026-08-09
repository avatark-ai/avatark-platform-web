import type { CausalReference } from "@avatark/world-memory-contracts"
import type { AdaptationDecision, AdaptationEffect, AdaptationRule } from "@avatark/world-adaptation-contracts"
import { deriveAdaptationEffectId } from "./adaptationIdentity.ts"

// Sprint 15, mission's own "Do not create a universal mutable property
// bag. Prefer typed semantic effects" instruction, made concrete: this
// function is a single, closed switch over `rule.effect.domain` --
// TypeScript's own discriminated-union narrowing guarantees every
// branch produces the domain-correct AdaptationEffect shape, never a
// generic `{ ...rest }` spread. Returns null for a non-triggered
// decision (tier 0) -- EXACTLY mirroring
// @avatark/encounter-realization-runtime's own `deriveConsequences`
// returning `[]` for a non-REALIZED status: no effect is ever fabricated
// for a decision that did not cross its own threshold.
export function deriveAdaptationEffect(rule: AdaptationRule, decision: AdaptationDecision, worldId: string): AdaptationEffect | null {
  if (!decision.triggered) return null

  const id = deriveAdaptationEffectId(worldId, rule.id, decision.subjectId, decision.tier)
  const causalReferences: CausalReference[] = [
    { kind: "adaptationPressure", ref: decision.pressureValue.toFixed(2) },
    { kind: "adaptationTier", ref: String(decision.tier) },
  ]
  const base = { id, worldId, ruleId: rule.id, tier: decision.tier, appliedTick: decision.tick, reversible: rule.reversible, causalReferences }

  switch (rule.effect.domain) {
    case "ENTITY":
      return { ...base, domain: "ENTITY", entityId: decision.subjectId, kind: rule.effect.kind }
    case "RELATIONSHIP":
      return { ...base, domain: "RELATIONSHIP", relationshipId: decision.subjectId, kind: rule.effect.kind }
    case "PLACE":
      return { ...base, domain: "PLACE", locationId: decision.subjectId, kind: rule.effect.kind }
    case "GROUP":
      return { ...base, domain: "GROUP", groupId: decision.subjectId, kind: rule.effect.kind }
    case "WORLD_POSSIBILITY":
      return { ...base, domain: "WORLD_POSSIBILITY", subjectId: decision.subjectId, kind: rule.effect.kind }
  }
}
