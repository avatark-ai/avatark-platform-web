import { test } from "node:test"
import assert from "node:assert/strict"
import { findSeasonDefinition, resolveSeasonTransition } from "./seasonTransition.ts"
import type { SeasonDefinition } from "@avatark/living-systems-contracts"

const envelope = { temperatureBand: "moderate" as const, precipitationBand: "moderate" as const, humidityBand: "moderate" as const, hydrologyBaselineBand: "moderate" as const, vegetationActivityBand: "high" as const, animalActivityBand: "moderate" as const }

const VASANTA: SeasonDefinition = { id: "vasanta", name: "Vasanta", order: 1, canonId: "STK-CAN-006", environmentalEnvelope: envelope, minDurationTicks: 4, allowedNextSeasonIds: ["grishma"] }
const GRISHMA: SeasonDefinition = { id: "grishma", name: "Grīṣma", order: 2, canonId: "STK-CAN-006", environmentalEnvelope: envelope, minDurationTicks: 4, allowedNextSeasonIds: [] }
const SEASONS = [VASANTA, GRISHMA]

test("findSeasonDefinition resolves a known id and throws on an unknown one", () => {
  assert.equal(findSeasonDefinition(SEASONS, "vasanta").name, "Vasanta")
  assert.throws(() => findSeasonDefinition(SEASONS, "nonexistent"))
})

test("no transition occurs before minDurationTicks has elapsed", () => {
  const state = { currentSeasonId: "vasanta", enteredAtTick: 0 }
  const result = resolveSeasonTransition(state, SEASONS, { worldId: "w", tick: 3, paused: false })
  assert.equal(result.currentSeasonId, "vasanta")
})

test("transitions to the first allowed next season exactly once minDurationTicks has elapsed", () => {
  const state = { currentSeasonId: "vasanta", enteredAtTick: 0 }
  const result = resolveSeasonTransition(state, SEASONS, { worldId: "w", tick: 4, paused: false })
  assert.equal(result.currentSeasonId, "grishma")
  assert.equal(result.enteredAtTick, 4)
})

test("a season with no allowedNextSeasonIds never transitions, regardless of elapsed time", () => {
  const state = { currentSeasonId: "grishma", enteredAtTick: 0 }
  const result = resolveSeasonTransition(state, SEASONS, { worldId: "w", tick: 1000, paused: false })
  assert.equal(result.currentSeasonId, "grishma")
})

test("legality is derived from allowedNextSeasonIds, never a hardcoded world-specific rule -- proven by a season graph with no legal transition at all", () => {
  const isolated: SeasonDefinition = { ...VASANTA, id: "isolated", allowedNextSeasonIds: [] }
  const state = { currentSeasonId: "isolated", enteredAtTick: 0 }
  const result = resolveSeasonTransition(state, [isolated], { worldId: "w", tick: 100, paused: false })
  assert.equal(result.currentSeasonId, "isolated")
})
