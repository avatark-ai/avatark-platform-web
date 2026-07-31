// Notification preference categories (AvatarK Identity RC1, Part 12).
//
// Deliberately a separate axis from `NotificationCategory` (types.ts),
// which classifies real/future event *payloads* (practice_completed,
// invitation_received, ...). This type classifies the *user-facing
// settings switches* the mission specifies -- a coarser, settings-page
// vocabulary a signed-in user actually sees and toggles. Several
// NotificationCategory values can map to one NotificationPreferenceCategory
// (e.g. "practice" and "reminder" both surface under "practices_reflections").
//
// The one real, live thing today remains a single boolean,
// `notifications_enabled` (see types.ts's header comment) -- these
// categories are a frozen contract for a settings UI to render against,
// not a claim that per-category delivery exists.

export type NotificationPreferenceCategory =
  | "security_account"
  | "invitations"
  | "practices_reflections"
  | "events"
  | "publishing_collaboration"
  | "recognition"
  | "product_announcements"
  | "research_participation"
  | "care_physiological_alerts"

export const NOTIFICATION_PREFERENCE_CATEGORIES: NotificationPreferenceCategory[] = [
  "security_account",
  "invitations",
  "practices_reflections",
  "events",
  "publishing_collaboration",
  "recognition",
  "product_announcements",
  "research_participation",
  "care_physiological_alerts",
]

export interface NotificationPreferenceCategoryDescriptor {
  category: NotificationPreferenceCategory
  label: string
  /** Mission requirement: "Security and account -- mandatory." The only category a user cannot disable. */
  mandatory: boolean
  /** Only meaningful for a product with an explicit, opted-in physiological/health policy (SetpointK). Never shown to a product without one. */
  requiresExplicitProductPolicy: boolean
}

export const NOTIFICATION_PREFERENCE_CATEGORY_REGISTRY: NotificationPreferenceCategoryDescriptor[] = [
  { category: "security_account", label: "Security and account", mandatory: true, requiresExplicitProductPolicy: false },
  { category: "invitations", label: "Invitations", mandatory: false, requiresExplicitProductPolicy: false },
  { category: "practices_reflections", label: "Practices and reflections", mandatory: false, requiresExplicitProductPolicy: false },
  { category: "events", label: "Events", mandatory: false, requiresExplicitProductPolicy: false },
  { category: "publishing_collaboration", label: "Publishing and collaboration", mandatory: false, requiresExplicitProductPolicy: false },
  { category: "recognition", label: "Recognition", mandatory: false, requiresExplicitProductPolicy: false },
  { category: "product_announcements", label: "Product announcements", mandatory: false, requiresExplicitProductPolicy: false },
  { category: "research_participation", label: "Research participation", mandatory: false, requiresExplicitProductPolicy: false },
  { category: "care_physiological_alerts", label: "Care or physiological alerts", mandatory: false, requiresExplicitProductPolicy: true },
]

/** Security notifications must not be user-disableable, per the mission. Every other category defaults to user-controlled. */
export function isDisableableCategory(category: NotificationPreferenceCategory): boolean {
  const descriptor = NOTIFICATION_PREFERENCE_CATEGORY_REGISTRY.find((d) => d.category === category)
  return descriptor ? !descriptor.mandatory : true
}
