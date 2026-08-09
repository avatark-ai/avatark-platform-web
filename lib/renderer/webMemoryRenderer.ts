// Sprint 11, Phase 21/22: the web reference renderer's own translation
// of World Memory's semantic facts into display strings -- mirroring
// every prior sprint's own webXRenderer.ts role (Sprint 6/7/8). This
// module never reads persistence itself, only the already-resolved
// ReturnRecognitionFact/WorldEvent shapes the Host layer's
// getEmbodimentWithHistory/getReturnRecognition already expose. No
// prose is generated -- every label is a fixed, reviewable mapping from
// a semantic fact/category to a short phrase, never an assembled
// sentence.
const RETURN_RECOGNITION_LABELS: Record<string, string> = {
  season_changed: "Season changed",
  environment_changed: "Water/vegetation condition changed",
  population_relocated: "Population relocated",
  encounter_changed: "Encounter availability changed",
  known_entity_state_changed: "Known entity state changed",
}

export function labelizeReturnRecognitionFact(type: string): string {
  return RETURN_RECOGNITION_LABELS[type] ?? type
}

const WORLD_EVENT_CATEGORY_LABELS: Record<string, string> = {
  SEASON_TRANSITION: "Season transitioned",
  ENVIRONMENTAL_THRESHOLD: "Environmental threshold crossed",
  RESOURCE_CONDITION_CHANGED: "Resource condition changed",
  LOCATION_CONDITION_CHANGED: "Location condition changed",
  POPULATION_MOVEMENT: "Population moved",
  GROUP_FORMED: "Group formed",
  GROUP_DISPERSED: "Group dispersed",
  ENTITY_ACTIVITY_TRANSITION: "Entity activity changed",
  ENCOUNTER_BECAME_AVAILABLE: "Encounter became available",
  ENCOUNTER_RESOLVED: "Encounter resolved",
}

export function labelizeWorldEventCategory(category: string): string {
  return WORLD_EVENT_CATEGORY_LABELS[category] ?? category
}

// "SINCE YOUR LAST VISIT" -- one line per distinct fact type, never a
// paragraph, never "While you were away...".
export function summarizeReturnRecognition(facts: { type: string }[]): string[] {
  return facts.map((fact) => labelizeReturnRecognitionFact(fact.type))
}

// "WORLD HISTORY" -- recent meaningful systemic events, most-recent
// first, as short labeled lines.
export function summarizeRecentWorldEvents(events: { category: string; tick: number }[]): string[] {
  return [...events].sort((a, b) => b.tick - a.tick).map((event) => `${labelizeWorldEventCategory(event.category)} (tick ${event.tick})`)
}
