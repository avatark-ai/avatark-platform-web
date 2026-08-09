import type { AdaptationDecision, AdaptationEffect, AdaptationPressure, AdaptationRule, AdaptationSignal, WorldAdaptationResult } from "@avatark/world-adaptation-contracts"
import { accumulateAdaptationPressure } from "./adaptationPressure.ts"
import { evaluateAdaptationRule } from "./adaptationDecision.ts"
import { deriveAdaptationEffect } from "./adaptationEffectDerivation.ts"

export interface RunWorldAdaptationParams {
  worldId: string
  tick: number
  signals: AdaptationSignal[]
  rules: AdaptationRule[]
  // Every currently-persisted AdaptationPressure this call might touch
  // -- the Host layer reads exactly the (domain, subjectId, kind)
  // tuples implied by `signals`/`rules` before calling this (see
  // lib/worldAdaptation/hostService.ts), never the world's entire
  // pressure history. Passing an unrelated pressure here is harmless
  // (it is simply never matched).
  existingPressures: AdaptationPressure[]
}

function pressureKey(domain: string, subjectId: string, kind: string): string {
  return `${domain}|${subjectId}|${kind}`
}

// Sprint 15: the ONE pure orchestrator composing signal -> pressure ->
// decision -> effect for a whole wake, deterministic and side-effect-free
// -- no repository read/write happens here, matching the exact posture
// @avatark/encounter-realization-runtime's own `resolveEncounterRealization`/
// `deriveConsequences` already hold (pure resolution; the Host layer
// does all IO). Replay-safe by construction: for any (domain, subjectId,
// kind) whose existing pressure already carries `lastUpdatedTick >= tick`
// (a replayed wake recomputing an already-processed instant), this
// function leaves that pressure/decision/effect out of its result
// entirely -- the Host layer's own idempotent-append repositories
// provide a second, independent guard on top (see
// docs/SPRINT15_FINAL_REPORT.md's replay/idempotency section).
export function runWorldAdaptation(params: RunWorldAdaptationParams): WorldAdaptationResult {
  const existingByKey = new Map(params.existingPressures.map((p) => [pressureKey(p.domain, p.subjectId, p.kind), p]))

  const signalsByRuleAndSubject = new Map<string, AdaptationSignal[]>()
  for (const rule of params.rules) {
    for (const signal of params.signals) {
      if (signal.domain !== rule.domain || signal.kind !== rule.signalKind) continue
      const key = `${rule.id}|${signal.subjectId}`
      if (!signalsByRuleAndSubject.has(key)) signalsByRuleAndSubject.set(key, [])
      signalsByRuleAndSubject.get(key)!.push(signal)
    }
  }

  const pressures: AdaptationPressure[] = []
  const decisions: AdaptationDecision[] = []
  const effects: AdaptationEffect[] = []

  for (const rule of params.rules) {
    const subjectIds = new Set(params.signals.filter((s) => s.domain === rule.domain && s.kind === rule.signalKind).map((s) => s.subjectId))
    for (const subjectId of subjectIds) {
      const existing = existingByKey.get(pressureKey(rule.domain, subjectId, rule.signalKind)) ?? null
      if (existing && params.tick <= existing.lastUpdatedTick) continue // replay guard -- see doc comment above

      const matchingSignals = signalsByRuleAndSubject.get(`${rule.id}|${subjectId}`) ?? []
      const signalWeightSum = matchingSignals.reduce((sum, s) => sum + s.weight, 0)
      const pressure = accumulateAdaptationPressure({ worldId: params.worldId, domain: rule.domain, subjectId, kind: rule.signalKind, existing, signalWeightSum, decayPerTick: rule.decayPerTick, tick: params.tick })
      pressures.push(pressure)

      const decision = evaluateAdaptationRule(rule, pressure)
      decisions.push(decision)

      const effect = deriveAdaptationEffect(rule, decision, params.worldId)
      if (effect) effects.push(effect)
    }
  }

  return { worldId: params.worldId, tick: params.tick, signals: params.signals, pressures, decisions, effects }
}
