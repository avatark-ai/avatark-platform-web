// Plan-tier vocabulary AvatarK owns -- distinct from @avatark/account's
// MembershipSummary/ProductRelationship, which are that (externally
// sourced, vendored) package's own UI-adapter shapes for its Membership
// tab. Nothing here duplicates those; this is the underlying concept a
// tab renders, not a competing tab contract. No billing implementation --
// `paid`/`enterprise`/`education` are targets. `free` is the only plan
// that exists anywhere in this ecosystem today (see
// lib/account/adapters.ts's membership.getSummary(), and
// SUBSCRIPTION_MODEL_NOTE in @avatark/product-registry).
export type MembershipPlan = "free" | "paid" | "enterprise" | "education"

export const MEMBERSHIP_PLAN_LABEL: Record<MembershipPlan, string> = {
  free: "Free",
  paid: "Paid",
  enterprise: "Enterprise",
  education: "Education",
}
