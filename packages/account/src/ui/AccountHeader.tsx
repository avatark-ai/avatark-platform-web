import type { AvatarKAccountProps } from '../contracts/shell.ts'

export function AccountHeader({
  displayName, email, memberSince, currentProduct,
}: { displayName: string; email: string; memberSince: string | null } & Pick<AvatarKAccountProps, 'currentProduct'>) {
  return (
    <div className="aka-mb-6">
      <p className="aka-eyebrow" style={{ color: 'var(--aka-accent,#d4af5f)' }}>AvatarK Identity</p>
      <h1 className="aka-heading" style={{ color: 'var(--aka-text-primary,#f5f2ea)' }}>{displayName}</h1>
      <p className="aka-subtext" style={{ color: 'var(--aka-text-dim,#8b8b98)' }}>{email}</p>
      <div className="aka-meta-row" style={{ color: 'var(--aka-text-dim,#8b8b98)' }}>
        {memberSince && <span>Member since {memberSince}</span>}
        <span>Current Product: <span style={{ color: 'var(--aka-text-primary,#f5f2ea)', textTransform: 'capitalize' }}>{currentProduct}</span></span>
      </div>
    </div>
  )
}
