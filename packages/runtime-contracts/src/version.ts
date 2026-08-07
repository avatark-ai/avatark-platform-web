// Two distinct, independent versioning axes found in the wild -- kept
// separate on purpose, per docs/RUNTIME_CONTRACTS.md §11.

// Axis 1: "what shape is this persisted record" -- matches
// experience-registry's CURRENT_EXPERIENCE_SCHEMA_VERSION /
// ExperienceEvent.schemaVersion.
export interface Versioned {
  schemaVersion: number
}

// Axis 2: "what version of this authored content is this" -- matches
// narrative-runtime's NarrativeDefinition.version.
export interface VersionedDefinition {
  version: number
}
