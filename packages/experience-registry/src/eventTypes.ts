// The initial, curated vocabulary of experience event types, per the
// Experience Registry mission spec. This list is deliberately NOT
// exhaustive -- ExperienceType (types.ts) accepts any well-formed string
// (see validation.ts's isWellFormedExperienceType), so future producers
// (Narrative Runtime, Living World Runtime, Context Runtime, PrometheusK,
// ArenaK, GameK, StreamK, StudioK, ...) can mint their own
// "namespace.verb_phrase" types without a change here. KNOWN_EXPERIENCE_TYPES
// exists for autocomplete/documentation and for products that want to assert
// against a known set -- it is not an enforcement boundary.
export const KNOWN_EXPERIENCE_TYPES = [
  "identity.signed_in",
  "invitation.accepted",
  "organization.joined",
  "narrative.started",
  "episode.started",
  "episode.completed",
  "world.entered",
  "world.location_visited",
  "practice.started",
  "practice.completed",
  "reflection.created",
  "challenge.started",
  "challenge.completed",
  "game.session_started",
  "game.session_completed",
  "echo.created",
  "story.published",
] as const

export type KnownExperienceType = (typeof KNOWN_EXPERIENCE_TYPES)[number]
