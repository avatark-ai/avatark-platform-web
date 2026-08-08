import type { SeasonDefinition, SeasonState, WorldClock } from "@avatark/living-systems-contracts"

export function findSeasonDefinition(seasonDefinitions: SeasonDefinition[], seasonId: string): SeasonDefinition {
  const season = seasonDefinitions.find((s) => s.id === seasonId)
  if (!season) throw new Error(`unknown season id "${seasonId}"`)
  return season
}

// Sprint 7, Phase 4: transition legality is derived entirely from
// SeasonDefinition.allowedNextSeasonIds/minDurationTicks -- this function
// never hardcodes "if vasanta then grishma." Deterministic: once
// minDurationTicks has elapsed, it always advances to the first allowed
// next season. A world authoring more than one allowed next season (a
// future world, not Living Vrindavan's current 2-season reference slice)
// would need a real choice rule here -- not invented now, since nothing
// in this sprint's authored content exercises it.
export function resolveSeasonTransition(seasonState: SeasonState, seasonDefinitions: SeasonDefinition[], clock: WorldClock): SeasonState {
  const current = findSeasonDefinition(seasonDefinitions, seasonState.currentSeasonId)
  const elapsed = clock.tick - seasonState.enteredAtTick

  if (elapsed < current.minDurationTicks) return seasonState
  if (current.allowedNextSeasonIds.length === 0) return seasonState

  const nextSeasonId = current.allowedNextSeasonIds[0]
  return { currentSeasonId: nextSeasonId, enteredAtTick: clock.tick }
}
