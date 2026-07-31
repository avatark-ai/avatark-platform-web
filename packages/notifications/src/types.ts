// Contract only -- no engine, no delivery mechanism, no database exists
// yet anywhere in this ecosystem for notifications. The only real, live
// thing adjacent to this today is a single boolean preference,
// `notificationsEnabled` (supabase/migrations/003_account_preferences.sql's
// `notifications_enabled` column, read/written by
// app/api/account/preferences/route.ts in avatark-platform-web) -- a
// toggle with nothing wired to it. This file names the target shape per
// docs/PLATFORM_CONTRACTS.md's Notification Center section so it exists
// as a real, checkable artifact instead of only prose.

// One event name per real product action this ecosystem's docs already
// describe as notification-worthy (PLATFORM_CONTRACTS.md's "Events
// originate from PrometheusK, ArenaK, StudioK, StreamK, GameK").
export type NotificationEventType =
  | "practice_completed"
  | "invitation_received"
  | "content_published"

// Phase 2 -- a broader classification axis than NotificationEventType
// (which names specific product actions). Category is what a user-facing
// notification settings/inbox UI would group and filter by; several
// NotificationEventTypes can share one category (e.g. practice_completed
// and a future practice-reminder event both fall under "practice").
// Additive, not a replacement -- NotificationEvent below keeps type as
// its primary discriminant.
export type NotificationCategory =
  | "invitation"
  | "reminder"
  | "recommendation"
  | "community"
  | "recognition"
  | "practice"
  | "story"
  | "challenge"
  | "organization"
  | "system"

export interface NotificationEvent {
  type: NotificationEventType
  category: NotificationCategory
  /** The product id (matches @avatark/product-registry's AvatarKProduct.id) that published this event. */
  sourceProductId: string
  subjectUserId: string
  occurredAt: string
  /** Free-form, event-specific payload -- deliberately untyped here, since no real event has been produced yet to know its true shape. */
  data?: Record<string, unknown>
}

export type NotificationChannel = "in_app" | "email"

// Mirrors the one real preference that exists today
// (notifications_enabled) -- the single gate all delivery should respect,
// per the target contract.
export interface NotificationPreference {
  userId: string
  enabled: boolean
}

// Placeholder -- no concrete adapter exists. A future implementation would
// receive NotificationEvents from products and decide delivery per
// NotificationPreference; nothing here performs delivery.
export interface NotificationAdapter {
  publish(event: NotificationEvent): Promise<void>
  getPreference(userId: string): Promise<NotificationPreference>
}
