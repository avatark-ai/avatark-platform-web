import { test } from "node:test"
import assert from "node:assert/strict"
import type { EnvironmentalState } from "@avatark/living-systems-contracts"
import type { DailyRhythmDefinition, DayPhaseSchedule } from "@avatark/living-rhythms-contracts"
import type { LocationResourceAffordance } from "@avatark/living-population-contracts"
import { resolveDayPhase } from "./dayPhaseResolution.ts"
import { resolveRoutineBonus, resolveRoutineWindow } from "./routineResolution.ts"
import { resolveResourceOpportunities } from "./resourceOpportunityResolution.ts"

// The SAME fictional, non-canonical "living-forest" fixture every other
// generic runtime package in this repository already carries its own
// version of (spatial-ecology-runtime, living-population-runtime,
// social-ecology-runtime, world-adaptation-runtime, encounter-realization-
// runtime, participation-runtime, world-memory-runtime, world-persistence-
// runtime, world-experience-runtime, canonical-event-runtime) -- this
// package was the one generic runtime package in that family with no
// such proof yet (confirmed by inspection: no `livingForest*.test.ts`
// existed anywhere under this package before this file). No line in
// dayPhaseResolution.ts/routineResolution.ts/resourceOpportunityResolution.ts
// mentions "forest," "vrindavan," "deer," or any franchise/reference-
// entity name.

const FOREST_DAY_PHASE_SCHEDULE: DayPhaseSchedule = {
  id: "forest-day-phase-schedule",
  ticksPerCycle: 8,
  entries: [
    { phase: "DAWN", startFractionOfDay: 0 },
    { phase: "MORNING", startFractionOfDay: 0.125 },
    { phase: "MIDDAY", startFractionOfDay: 0.375 },
    { phase: "AFTERNOON", startFractionOfDay: 0.5 },
    { phase: "DUSK", startFractionOfDay: 0.625 },
    { phase: "EVENING", startFractionOfDay: 0.75 },
    { phase: "NIGHT", startFractionOfDay: 0.875 },
  ],
}

const DEER_DAILY_RHYTHM: DailyRhythmDefinition = {
  id: "deer-daily-rhythm",
  entries: [{ dayPhase: "MORNING", eligibleActivities: ["DRINK", "GRAZE", "MOVE_TO_RESOURCE"], preferredResourceTypes: ["water", "vegetation"], socialAffinity: 0.1, restBias: -0.2, movementBias: 0.3 }],
}

const CANOPY_WET_ENVIRONMENT: EnvironmentalState = { weather: { temperatureBand: "moderate", precipitationBand: "high", humidityBand: "high" }, hydrology: { hydrologyBand: "high", soilMoistureBand: "high" }, ecology: { vegetationActivityBand: "high", animalActivityBand: "high" } }
const DROUGHT_ENVIRONMENT: EnvironmentalState = { weather: { temperatureBand: "high", precipitationBand: "low", humidityBand: "low" }, hydrology: { hydrologyBand: "low", soilMoistureBand: "low" }, ecology: { vegetationActivityBand: "low", animalActivityBand: "low" } }

const FOREST_AFFORDANCES: LocationResourceAffordance[] = [
  { locationId: "forest-clearing", resourceTags: ["vegetation", "shelter"] },
  { locationId: "forest-stream", resourceTags: ["water"] },
  { locationId: "forest-pond", resourceTags: ["water"] },
]

test("day-phase resolution places a fictional world's own tick 1 inside MORNING, unmodified engine", () => {
  const phase = resolveDayPhase(FOREST_DAY_PHASE_SCHEDULE, 1)
  assert.equal(phase, "MORNING")
})

test("day-phase resolution is a pure function of tick alone -- catch-up (tick 9) and live-stepping (tick 9 after 1 full cycle) agree", () => {
  assert.equal(resolveDayPhase(FOREST_DAY_PHASE_SCHEDULE, 9), resolveDayPhase(FOREST_DAY_PHASE_SCHEDULE, 1))
})

test("routine window lookup and bonus resolution work identically for a wholly fictional deer archetype -- no world-identity branching in either mechanism", () => {
  const morningWindow = resolveRoutineWindow(DEER_DAILY_RHYTHM, "MORNING")
  assert.ok(morningWindow)
  assert.equal(resolveRoutineBonus("MOVE_TO_RESOURCE", morningWindow), 0.3)
  assert.equal(resolveRoutineBonus("GRAZE", morningWindow), 0.1, "eligible but not REST/SOCIALIZE/movement -- the flat default bonus")
  assert.equal(resolveRoutineBonus("REST", morningWindow), 0, "REST is not in this window's own eligibleActivities -- zero bonus, restBias is only consulted for an eligible REST candidate")
  assert.equal(resolveRoutineBonus("SOCIALIZE", resolveRoutineWindow(DEER_DAILY_RHYTHM, "NIGHT")), 0, "no routine window authored for NIGHT -- zero bonus, never a fabricated default")
})

test("resource opportunities gate on the SAME environmental bands this fixture's own two water-tagged locations share, unmodified engine", () => {
  const wet = resolveResourceOpportunities(FOREST_AFFORDANCES, CANOPY_WET_ENVIRONMENT, 1)
  const dry = resolveResourceOpportunities(FOREST_AFFORDANCES, DROUGHT_ENVIRONMENT, 1)

  const wetWater = wet.filter((o) => o.category === "water")
  const dryWater = dry.filter((o) => o.category === "water")
  assert.equal(wetWater.length, 2, "both forest-stream and forest-pond opportunities are produced")
  assert.ok(wetWater.every((o) => o.available), "water available in canopy-wet")
  assert.ok(dryWater.every((o) => !o.available), "the SAME two locations report unavailable once environment degrades -- a location's own static tag never changes, only the causal condition gating it")
})
