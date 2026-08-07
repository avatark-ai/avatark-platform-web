// Shared identifier aliases for the Runtime Kernel. Every id here is a plain
// string alias -- matching the convention every existing runtime package
// already uses (e.g. `type WorldId = string` in living-world-runtime) -- not
// a branded/nominal type. Branding was considered and deferred: it would
// require touching every existing runtime's function signatures to adopt,
// which this sprint's "no breaking API changes" constraint rules out.
//
// This list is grounded in what's actually referenced across the five
// runtime branches and @avatark/context-runtime's 13 context axes (see
// docs/RUNTIME_GLOSSARY.md and docs/RUNTIME_CONTRACTS.md) -- it is not a
// speculative superset invented for this package.

export type UserId = string
export type ProductId = string // matches @avatark/product-registry's AvatarKProduct.id
export type OrganizationId = string
export type ExperienceId = string
export type NarrativeId = string
export type EpisodeId = string
export type SceneId = string
export type BeatId = string
export type WorldId = string
export type LocationId = string
export type PracticeId = string
export type ReflectionId = string
export type ChallengeId = string
export type MilestoneId = string
export type CohortId = string
export type InvitationId = string
export type AvatarId = string

export type Timestamp = string // ISO-8601, redefined ad-hoc in 3+ existing packages today
