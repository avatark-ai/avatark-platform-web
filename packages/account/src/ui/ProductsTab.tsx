'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { ProductWithAccess } from '../contracts/adapters.ts'

const DEPLOYMENT_LABEL: Record<NonNullable<ProductWithAccess['deploymentStatus']>, string> = {
  live: 'Live', preview: 'Preview', internal: 'Internal', planned: 'Planned', unknown: 'Unknown',
}
const INTEGRATION_LABEL: Record<NonNullable<ProductWithAccess['integrationStatus']>, string> = {
  canonical: 'Canonical identity', pilot: 'Pilot', pending: 'Pending adoption', legacy: 'Legacy integration', unknown: 'Unknown',
}
const ACCESS_LABEL: Record<NonNullable<ProductWithAccess['accessRequirement']>, string> = {
  available: 'Open access', entitlement_dependent: 'Requires entitlement', entitlement_and_consent_required: 'Requires entitlement & consent',
}

// Truthful product catalog (RC1.1, Part 4): three independent facts per
// product, never collapsed into one "live"/"coming soon" flag, and never
// a generic "Coming Soon" fallback for a product that's genuinely
// deployed. See docs/IDENTITY_RC11_ACCOUNT_AUDIT.md for why the old
// binary existed and what replaced it.
export function ProductsTab({ currentProduct }: { currentProduct: string }) {
  const adapters = useAccountAdapters()
  const [products, setProducts] = useState<ProductWithAccess[] | undefined>(undefined)

  useEffect(() => { adapters.productAccess.list(currentProduct).then(setProducts) }, [adapters, currentProduct])

  if (!products) return <div className="h-32 bg-[var(--surface,#12121a)] rounded-[10px] animate-pulse" />

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {products.map((p) => (
        <div key={p.id} className="aka-card p-4">
          <p className="text-sm font-semibold text-[var(--text-primary,#f5f2ea)]">
            {p.name}{p.id === currentProduct ? ' — Current' : ''}
          </p>
          <p className="text-xs text-[var(--text-dim,#8b8b98)] mt-0.5">{p.purpose}</p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.deploymentStatus && (
              <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-[var(--surface,#12121a)] text-[var(--text-dim,#8b8b98)]">
                {DEPLOYMENT_LABEL[p.deploymentStatus]}
              </span>
            )}
            {p.integrationStatus && (
              <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-[var(--surface,#12121a)] text-[var(--text-dim,#8b8b98)]">
                {INTEGRATION_LABEL[p.integrationStatus]}
              </span>
            )}
            {p.accessRequirement && (
              <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-[var(--surface,#12121a)] text-[var(--text-dim,#8b8b98)]">
                {ACCESS_LABEL[p.accessRequirement]}
              </span>
            )}
          </div>

          {p.roles && p.roles.length > 0 && (
            <p className="text-xs text-[var(--text-dim,#8b8b98)] mt-1.5">Role: {p.roles.join(', ')}</p>
          )}

          {p.ctaHref ? (
            <a href={p.ctaHref} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-sm text-[var(--gold,#d4af5f)]">{p.ctaLabel} ↗</a>
          ) : (
            <span className="inline-block mt-2 text-sm text-[var(--gold,#d4af5f)]">{p.ctaLabel}</span>
          )}
        </div>
      ))}
    </div>
  )
}
