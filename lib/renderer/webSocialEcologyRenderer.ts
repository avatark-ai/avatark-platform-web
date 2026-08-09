// Sprint 12, Phase 25: the web reference renderer's own translation of
// social-ecology's semantic facts into display strings -- mirroring
// every prior sprint's own webXRenderer.ts role (Sprint 6/7/8/11). This
// module never reads persistence itself, only the already-resolved
// LocationSocialSummary/SocialPerception shapes the Host layer's
// getEmbodimentWithSocialEcology/getSocialPerception already expose.
// No prose is generated -- every label is a fixed, reviewable mapping
// from a relationship type/band to a short phrase, never an assembled
// sentence, and never a named canonical character.
const RELATIONSHIP_TYPE_LABELS: Record<string, string> = {
  PARENT_OFFSPRING: "Parent/offspring",
  GROUP_MEMBER: "Group member",
  FAMILIAR: "Familiar",
  PREFERRED_ASSOCIATE: "Preferred associate",
}

export function labelizeRelationshipType(type: string): string {
  return RELATIONSHIP_TYPE_LABELS[type] ?? type
}

const RELATIONSHIP_BAND_LABELS: Record<string, string> = {
  WEAK: "Newly forming",
  ESTABLISHED: "Established",
  STRONG: "Strong",
}

export function labelizeRelationshipBand(band: string): string {
  return RELATIONSHIP_BAND_LABELS[band] ?? band
}

// "RELATIONSHIPS HERE" -- one line per relationship visible at this
// location, never a paragraph.
export function summarizeRelationshipsPresent(relationships: { relationshipType: string; band: string }[]): string[] {
  return relationships.map((r) => `${labelizeRelationshipType(r.relationshipType)} (${labelizeRelationshipBand(r.band)})`)
}

const SEPARATION_SUBJECT_TYPE_LABELS: Record<string, string> = {
  RELATIONSHIP: "Separated from a related entity",
  GROUP_MEMBERSHIP: "Separated from its group",
}

export function labelizeSeparationSubjectType(subjectType: string): string {
  return SEPARATION_SUBJECT_TYPE_LABELS[subjectType] ?? subjectType
}

// "CURRENTLY SEPARATED" -- one line per active separation visible at
// this location, most-recently-begun first.
export function summarizeActiveSeparations(separations: { subjectType: string; separatedSinceTick: number }[]): string[] {
  return [...separations].sort((a, b) => b.separatedSinceTick - a.separatedSinceTick).map((s) => `${labelizeSeparationSubjectType(s.subjectType)} (since tick ${s.separatedSinceTick})`)
}
