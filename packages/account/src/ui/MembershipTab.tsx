'use client'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { StatEntry } from '../contracts/adapters.ts'

// Explains the user's relationship to the *host product itself* --
// plan/benefits/roles -- never product catalog or per-product access data
// (that moved to ProductsTab/AccessTab, RC1.1 Part 6). `currentProduct`/
// `memberSince` are accepted for stats/summary composition only.
export function MembershipTab({
  stats, currentProduct, memberSince,
}: {
  stats: StatEntry[]
  currentProduct: string; memberSince: string | null
}) {
  const adapters = useAccountAdapters()
  void currentProduct
  void memberSince

  const summary = adapters.membership.getSummary(stats)
  const roles = adapters.membership.getRoles(stats)
  const benefits = adapters.membership.getBenefits()

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-dim,#8b8b98)] mb-2">Current Plan</p>
        <div className="aka-card p-4">
          <p className="text-lg font-semibold text-[var(--text-primary,#f5f2ea)]">{summary.planName}</p>
          <p className="text-xs text-[var(--text-dim,#8b8b98)] mt-1">
            Your current AvatarK membership is {summary.planName}. Paid membership and billing options are not yet available.
          </p>
        </div>
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
        {benefits.length > 0 ? (
          <div className="space-y-2">
            {benefits.map((b) => (
              <div key={b.label} className="aka-card p-4 flex items-center justify-between opacity-60">
                <span className="text-sm text-[var(--text-primary,#f5f2ea)]">{b.label}</span>
                <span className="text-xs text-[var(--text-dim,#8b8b98)] text-right max-w-[220px]">{b.description}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="aka-card p-4">
            <p className="text-sm text-[var(--text-dim,#8b8b98)]">No platform-level membership benefits are defined yet.</p>
          </div>
        )}
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

      <p className="text-xs text-[var(--text-dim,#8b8b98)]">
        Looking for which AvatarK products you belong to or can access? See the Products and Access sections.
      </p>
    </div>
  )
}
