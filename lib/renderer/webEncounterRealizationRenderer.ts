// Sprint 14: the web reference renderer's own translation of
// encounter-realization's semantic facts into display strings --
// mirroring every prior sprint's own webXRenderer.ts role. This module
// never reads persistence itself, only the already-resolved
// EncounterRecord shape lib/encounterRealization/hostService.ts already
// exposes. No prose is generated -- every label is a fixed, reviewable
// mapping from a closed vocabulary value to a short phrase, and causal
// provenance is rendered as a flat "kind: ref" list, never an assembled
// sentence.
const REALIZATION_STATUS_LABELS: Record<string, string> = {
  REALIZING: "Resolving",
  REALIZED: "Realized",
  CONSEQUENCES_APPLIED: "Realized",
  REMEMBERED: "Remembered",
  EXPIRED: "Did not occur",
  BLOCKED: "Blocked",
  SUPERSEDED: "Superseded",
}

export function labelizeRealizationStatus(status: string): string {
  return REALIZATION_STATUS_LABELS[status] ?? status
}

const ENCOUNTER_CATEGORY_LABELS: Record<string, string> = {
  ambient: "Ambient",
  environmental: "Environmental",
  reflective: "Reflective",
  "narrative-protected": "Narrative",
  "practice-linked": "Practice",
}

export function labelizeEncounterCategory(category: string): string {
  return ENCOUNTER_CATEGORY_LABELS[category] ?? category
}

// One flat "kind: ref" line per causal reference, in the order the
// resolver produced them -- never re-narrated as a sentence.
export function summarizeCausalReferences(causalReferences: { kind: string; ref: string }[]): string[] {
  return causalReferences.map((c) => `${c.kind}: ${c.ref}`)
}

// "REALIZED ENCOUNTERS" -- one line per record, most-recently-realized
// first: status, category, location, and participant count only --
// never a participant's own display name/prose.
export function summarizeEncounterRecords(records: { ruleId: string; category: string; locationId: string; status: string; startTick: number; participantEntityIds: string[] }[]): string[] {
  return [...records]
    .sort((a, b) => b.startTick - a.startTick)
    .map((r) => `${r.ruleId} (${r.locationId}): ${labelizeRealizationStatus(r.status)} -- ${labelizeEncounterCategory(r.category)}, ${r.participantEntityIds.length} participant${r.participantEntityIds.length === 1 ? "" : "s"}`)
}
