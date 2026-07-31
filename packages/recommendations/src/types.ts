// Contract only -- no recommendation engine exists anywhere in this
// ecosystem yet (confirmed in docs/PLATFORM_CONTRACTS.md's Recommendations
// section: supportsRecommendations is an unread capability flag, and the
// only real "recommendation" code today is @avatark/journey's dev-tooling
// Recommendation type in this repo's Integration Dashboard, an unrelated
// concept). This package names the target ecosystem-wide contract:
// PrometheusK as producer, GameK/ArenaK/StreamK/AvatarK as consumers.
export type RecommendationCategory = "practice" | "story" | "community" | "game" | "media"

// Superset of @avatark/journey's LivingEchoToArenaRecommendationReason
// ("practice_completed" | "cohort_invite" | "manual") -- that type stays
// scoped to the one frozen Living-Echo->Arena handoff contract; this is
// the broader, ecosystem-wide reason vocabulary, extended rather than
// duplicated so the two don't drift into competing meanings for the same
// words.
export type RecommendationReason =
  | "practice_completed"
  | "cohort_invite"
  | "manual"
  | "content_match"
  | "pattern_match"

export type Priority = "low" | "medium" | "high"

/** 0 (no confidence) to 1 (certain). A plain number, not a qualitative band -- no real engine exists yet to know what precision is honest to claim. */
export type Confidence = number

export interface Recommendation {
  id: string
  category: RecommendationCategory
  reason: RecommendationReason
  priority: Priority
  confidence: Confidence
  createdAt: string
  subjectUserId: string
  /** The product id (matches @avatark/product-registry's AvatarKProduct.id) that produced this recommendation. */
  sourceProductId: string
  /** Where this recommendation should be acted on, if different from sourceProductId. */
  targetProductId?: string
}

export interface PracticeSuggestion extends Recommendation {
  category: "practice"
  practiceId: string
}

export interface StorySuggestion extends Recommendation {
  category: "story"
  storySlug: string
}

export interface CommunitySuggestion extends Recommendation {
  category: "community"
  communityId: string
}

export interface GameSuggestion extends Recommendation {
  category: "game"
  experienceId: string
}

export interface MediaSuggestion extends Recommendation {
  category: "media"
  mediaId: string
}

export type RecommendationSuggestion =
  | PracticeSuggestion
  | StorySuggestion
  | CommunitySuggestion
  | GameSuggestion
  | MediaSuggestion

// Placeholder -- no concrete implementation exists anywhere.
export interface RecommendationAdapter {
  list(userId: string): Promise<Recommendation[]>
}
