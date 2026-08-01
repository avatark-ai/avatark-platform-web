'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { ProductAccessSummary } from '../contracts/adapters.ts'

const USER_ACCESS_LABEL: Record<ProductAccessSummary['userAccessState'], string> = {
  no_grant: 'No access recorded',
  not_requested: 'Not requested',
  requested: 'Requested',
  invited: 'Invited',
  active: 'Active',
  suspended: 'Suspended',
  expired: 'Expired',
  revoked: 'Revoked',
}

// Consumer-readable expansion of ProductsTab's per-product state (Part 5).
// Deliberately renders "product is live" (deploymentStatus/integrationStatus/
// accessRequirement) and "this user has access" (userAccessState) as
// visibly separate facts -- the mission's core requirement for this tab --
// rather than one combined status line.
export function AccessTab({ currentProduct }: { currentProduct: string }) {
  const adapters = useAccountAdapters()
  const [entries, setEntries] = useState<ProductAccessSummary[] | undefined>(undefined)

  useEffect(() => {
    if (!adapters.access) return
    adapters.access.list(currentProduct).then(setEntries)
  }, [adapters, currentProduct])

  if (!adapters.access) {
    return (
      <div className="aka-card p-4">
        <p className="text-sm text-[var(--text-dim,#8b8b98)]">Access details aren&apos;t available for this product.</p>
      </div>
    )
  }

  if (!entries) return <div className="h-32 bg-[var(--surface,#12121a)] rounded-[10px] animate-pulse" />

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {entries.map((e) => (
        <div key={e.productId} className="aka-card p-4 space-y-2">
          <p className="text-sm font-semibold text-[var(--text-primary,#f5f2ea)]">{e.productName}</p>

          <div className="text-xs text-[var(--text-dim,#8b8b98)] space-y-0.5">
            <p>Access: <span className="text-[var(--text-primary,#f5f2ea)]">{USER_ACCESS_LABEL[e.userAccessState]}</span></p>
            {e.source && <p>Source: <span className="capitalize">{e.source}</span></p>}
            {e.organizationName && <p>Organization: {e.organizationName}</p>}
            {e.roles.length > 0 && <p>Role: {e.roles.join(', ')}</p>}
            {e.validFrom && <p>Since: {new Date(e.validFrom).toLocaleDateString()}</p>}
            {e.validUntil && <p>Valid until: {new Date(e.validUntil).toLocaleDateString()}</p>}
            {e.suspensionReason && <p className="text-amber-400">Suspended: {e.suspensionReason}</p>}
            {e.expiryReason && <p className="text-amber-400">Expired: {e.expiryReason}</p>}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-dim,#8b8b98)] mb-1">Capabilities</p>
            {e.capabilities.length > 0 ? (
              <ul className="text-xs text-[var(--text-primary,#f5f2ea)] list-disc list-inside space-y-0.5">
                {e.capabilities.map((c) => <li key={c}>{c}</li>)}
              </ul>
            ) : (
              <p className="text-xs text-[var(--text-dim,#8b8b98)]">No specific capabilities recorded yet.</p>
            )}
          </div>

          {e.nextAction.kind !== 'current' && (
            e.nextAction.href ? (
              <a href={e.nextAction.href} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-[var(--gold,#d4af5f)]">{e.nextAction.label} ↗</a>
            ) : (
              <span className="inline-block text-xs text-[var(--text-dim,#8b8b98)]">{e.nextAction.label}</span>
            )
          )}
        </div>
      ))}
    </div>
  )
}
