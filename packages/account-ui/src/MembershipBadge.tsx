import { MEMBERSHIP_PLAN_LABEL, type MembershipPlan } from "@avatark/membership"

export interface MembershipBadgeProps {
  plan: MembershipPlan
  className?: string
}

export function MembershipBadge({ plan, className }: MembershipBadgeProps) {
  return (
    <span className={className} data-avatark-component="membership-badge" data-plan={plan}>
      {MEMBERSHIP_PLAN_LABEL[plan]}
    </span>
  )
}
