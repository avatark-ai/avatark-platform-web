'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { ProductRelationship, StatEntry } from '../contracts/adapters.ts'

const STATUS_LABEL: Record<ProductRelationship['status'], string> = {
  member: 'Member', not_enrolled: 'Not enrolled', coming_soon: 'Coming Soon',
}

// `stats` is a host-supplied, generic labeled-value list (no hardcoded
// product-specific metric names -- see PROVENANCE.md).
export function MembershipTab({
  stats, currentProduct, memberSince,
}: {
  stats: StatEntry[]
  currentProduct: string; memberSince: string | null
}) {
  const adapters = useAccountAdapters()
  const [relationships, setRelationships] = useState<ProductRelationship[] | undefined>(undefined)

  useEffect(() => {
    adapters.membership.getRelationships(currentProduct, memberSince).then(setRelationships)
  }, [adapters, currentProduct, memberSince])

  const summary = adapters.membership.getSummary(stats)
  const roles = adapters.membership.getRoles(stats)
  const benefits = adapters.membership.getBenefits()

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-dim,#8b8b98)] mb-2">Current Plan</p>
        <div className="aka-card p-4">
          <p className="text-lg font-semibold text-[var(--text-primary,#f5f2ea)]">{summary.planName}</p>
          <p className="text-xs text-[var(--text-dim,#8b8b98)] mt-1">Billing not yet enabled. No storage limits currently enforced.</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-dim,#8b8b98)] mb-2">AvatarK Products I Belong To</p>
        {!relationships ? (
          <div className="h-24 bg-[var(--surface,#12121a)] rounded-[10px] animate-pulse" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relationships.map((r) => (
              <div key={r.productId} className={`aka-card p-4 ${r.status !== 'member' ? 'opacity-70' : ''}`}>
                <p className="text-sm font-semibold text-[var(--text-primary,#f5f2ea)]">{r.name}</p>
                <p className="text-xs text-[var(--text-dim,#8b8b98)] mt-0.5">{STATUS_LABEL[r.status]}{r.role ? ` · ${r.role}` : ''}</p>
                {r.since && <p className="text-xs text-[var(--text-dim,#8b8b98)]">Since {new Date(r.since).toLocaleDateString()}</p>}
                {r.ctaHref ? (
                  <a href={r.ctaHref} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-sm text-[var(--gold,#d4af5f)]">{r.ctaLabel} ↗</a>
                ) : (
                  <span className="inline-block mt-1 text-sm text-[var(--gold,#d4af5f)]">{r.ctaLabel}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {roles.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-dim,#8b8b98)] mb-2">My Roles</p>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <span key={r} className="text-sm text-[var(--text-primary,#f5f2ea)] border border-[var(--surface-line,#1c1c26)] rounded-md px-3 py-1.5">{r}</span>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-dim,#8b8b98)] mb-2">Benefits</p>
        <div className="space-y-2">
          {benefits.map((b) => (
            <div key={b.label} className="aka-card p-4 flex items-center justify-between opacity-60">
              <span className="text-sm text-[var(--text-primary,#f5f2ea)]">{b.label}</span>
              <span className="text-xs text-[var(--text-dim,#8b8b98)] text-right max-w-[220px]">{b.description}</span>
            </div>
          ))}
        </div>
      </div>

      {stats.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-dim,#8b8b98)] mb-2">Usage</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.key} className="aka-card p-4">
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-dim,#8b8b98)]">{s.label}</p>
                <p className="text-lg font-semibold text-[var(--text-primary,#f5f2ea)] mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
