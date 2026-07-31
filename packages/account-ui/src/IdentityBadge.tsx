// Headless, presentational only -- no styling opinions beyond structure,
// no data fetching. Host supplies real data and any visual design via
// className. Not consumed by any application yet (Phase 2 is component
// design, not migration).
export interface IdentityBadgeProps {
  displayName: string
  roles?: string[]
  className?: string
}

export function IdentityBadge({ displayName, roles = [], className }: IdentityBadgeProps) {
  return (
    <span className={className} data-avatark-component="identity-badge">
      <span data-avatark-part="display-name">{displayName}</span>
      {roles.length > 0 && (
        <span data-avatark-part="roles">
          {roles.map((role) => (
            <span key={role} data-avatark-part="role">
              {role}
            </span>
          ))}
        </span>
      )}
    </span>
  )
}
