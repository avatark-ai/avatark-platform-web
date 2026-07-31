// Contract only -- no persistence, no API. The canonical activity-stream
// vocabulary per docs/PLATFORM_CONTRACTS.md's Phase 2 mission: exactly the
// ten event kinds named there, no more, so this doesn't silently grow into
// a second, competing taxonomy alongside e.g. @avatark/journey's
// JourneyStepId (a different axis: JourneyStepId models the Entry Engine's
// linear invitation->arena graph; TimelineEventType names discrete,
// independently-orderable activity-stream moments a UI would list).
export type TimelineEventType =
  | "invitation_accepted"
  | "practice_started"
  | "practice_completed"
  | "reflection_added"
  | "story_watched"
  | "challenge_joined"
  | "contribution_published"
  | "echo_shared"
  | "recommendation_accepted"
  | "achievement_earned"

export interface TimelineEntry {
  id: string
  type: TimelineEventType
  subjectUserId: string
  /** The product id (matches @avatark/product-registry's AvatarKProduct.id) that recorded this entry. */
  sourceProductId: string
  occurredAt: string
  /** Free-form, event-specific payload -- deliberately untyped, since no real event has been produced yet to know its true shape. */
  data?: Record<string, unknown>
}

// Placeholder -- no concrete implementation exists anywhere. A future
// adapter would read/write a real product's own event log; nothing here
// performs persistence.
export interface TimelineAdapter {
  list(userId: string): Promise<TimelineEntry[]>
  append(entry: TimelineEntry): Promise<void>
}
