// Contract only -- no Supabase, no API, no product-specific implementation.
// Living Echo is produced only by PrometheusK and never duplicated (see
// docs/PLATFORM_CONTRACTS.md's Living Echo section) -- this package names
// the shape every other product reads or embeds, not a second store.
// Deliberately reuses @avatark/timeline's TimelineEntry rather than
// redefining a competing one, and references @avatark/recommendations by
// id (RecommendationReference) rather than duplicating its full shape.
import type { TimelineEntry } from "@avatark/timeline"
import type { RecommendationCategory } from "@avatark/recommendations"

export interface PracticeEvidence {
  id: string
  practiceId: string
  recordedAt: string
  /** Free-form, practice-specific payload -- no real evidence schema exists yet. */
  data?: Record<string, unknown>
}

export interface ReflectionSummary {
  id: string
  practiceId: string
  recordedAt: string
  /** Short, honest excerpt -- never fabricated. Null when no reflection was recorded. */
  excerpt: string | null
}

// Plain-language statement, never a numeric score or diagnosis -- same
// "no mysterious score" discipline already established for this
// ecosystem's own honest-preview surfaces (docs/ECHO_ROUTE_MAP.md).
export interface PatternInsight {
  id: string
  observedAt: string
  statement: string
  supportingEvidenceIds: string[]
}

export interface Trajectory {
  practiceId: string
  startedAt: string
  /** Ordered oldest-first. */
  entries: TimelineEntry[]
}

export interface RecommendationReference {
  recommendationId: string
  category: RecommendationCategory
}

export interface GrowthSignal {
  id: string
  observedAt: string
  statement: string
}

export interface Contribution {
  id: string
  contributorUserId: string
  publishedAt: string
  /** e.g. a shared reflection or a community-submitted practice variant -- no real contribution schema exists yet. */
  kind: string
}

export interface SharedEchoMetadata {
  issuedBy: string
  createdAt: string
  visibility: "private" | "shared" | "public"
}

export interface LivingEchoSummary {
  subjectUserId: string
  practiceCount: number
  lastPracticedAt: string | null
  recentTimeline: TimelineEntry[]
  patterns: PatternInsight[]
  growthSignals: GrowthSignal[]
  recommendations: RecommendationReference[]
}

export interface LivingEcho {
  subjectUserId: string
  summary: LivingEchoSummary
  evidence: PracticeEvidence[]
  reflections: ReflectionSummary[]
  trajectories: Trajectory[]
  contributions: Contribution[]
  metadata: SharedEchoMetadata
}

// Placeholder -- no concrete implementation exists anywhere.
export interface LivingEchoAdapter {
  getSummary(userId: string): Promise<LivingEchoSummary | null>
}
