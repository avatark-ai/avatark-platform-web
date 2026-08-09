// Sprint 13, Phase 25 (mirroring Sprint 12's own Phase 25): the web
// reference renderer's own translation of living-rhythms' semantic
// facts into display strings -- mirroring every prior sprint's own
// webXRenderer.ts role (Sprint 6/7/8/11/12). This module never reads
// persistence itself, only the already-resolved DayPhase/PlaceOccupancy/
// GroupRoutineIntent/SocialInteractionOpportunity shapes the Host
// layer's own lib/livingRhythms/hostService.ts already exposes. No
// prose is generated -- every label is a fixed, reviewable mapping from
// a closed vocabulary value to a short phrase, never an assembled
// sentence, and never a named canonical character.
const DAY_PHASE_LABELS: Record<string, string> = {
  DAWN: "Dawn",
  MORNING: "Morning",
  MIDDAY: "Midday",
  AFTERNOON: "Afternoon",
  DUSK: "Dusk",
  EVENING: "Evening",
  NIGHT: "Night",
}

export function labelizeDayPhase(phase: string): string {
  return DAY_PHASE_LABELS[phase] ?? phase
}

const OCCUPANCY_LEVEL_LABELS: Record<string, string> = {
  QUIET: "Quiet",
  ACTIVE: "Active",
  GATHERING: "Gathering",
  DISPERSING: "Dispersing",
  RESTING: "Resting",
}

export function labelizeOccupancyLevel(level: string): string {
  return OCCUPANCY_LEVEL_LABELS[level] ?? level
}

const GROUP_ROUTINE_INTENT_LABELS: Record<string, string> = {
  REST_TOGETHER: "Resting together",
  MOVE_TO_RESOURCE: "Moving toward a resource",
  DISPERSE: "Dispersed",
  GATHER: "Gathered",
  FOLLOW_ROUTE: "Following a route",
  OCCUPY_PLACE: "Occupying this place",
}

export function labelizeGroupRoutineIntent(intent: string): string {
  return GROUP_ROUTINE_INTENT_LABELS[intent] ?? intent
}

const SOCIAL_INTERACTION_CATEGORY_LABELS: Record<string, string> = {
  approach: "Approaching",
  remain_near: "Remaining near",
  follow: "Following",
  gather: "Gathering",
  avoid: "Avoiding",
  rest_together: "Resting together",
}

export function labelizeSocialInteractionCategory(category: string): string {
  return SOCIAL_INTERACTION_CATEGORY_LABELS[category] ?? category
}

// "PLACE RHYTHM" -- one line per location's current day phase +
// occupancy level, never a paragraph.
export function summarizePlaceOccupancy(occupancy: { dayPhase: string; occupancyLevel: string }): string {
  return `${labelizeDayPhase(occupancy.dayPhase)} -- ${labelizeOccupancyLevel(occupancy.occupancyLevel)}`
}

// "GROUP ROUTINE" -- one line per group's current routine intent,
// most-recently-resolved first.
export function summarizeGroupRoutineIntents(intents: { groupId: string; intent: string; tick: number }[]): string[] {
  return [...intents].sort((a, b) => b.tick - a.tick).map((i) => `${i.groupId}: ${labelizeGroupRoutineIntent(i.intent)}`)
}
