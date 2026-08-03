'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { AccountOrganizationContext, CurrentContextState } from '../contracts/adapters.ts'

const NOT_ACTIVE = 'Not active'

// Shared "where am I" signal every AvatarK product can render identically
// (Platform RC, Phase 1) -- always mounted at the top of the account
// experience, never a tab. Product/Organization are the only two axes with
// real data anywhere today; Living World/Journey/Episode/Practice honestly
// read "Not active" until a product wires currentContext -- never
// fabricated to look more complete than the platform actually is.
export function CurrentContextCard({ currentProduct, productName }: { currentProduct: string; productName: string }) {
  const adapters = useAccountAdapters()
  const [orgContext, setOrgContext] = useState<AccountOrganizationContext | null>(null)
  const [context, setContext] = useState<CurrentContextState | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      adapters.organizations?.get().then((res) => { if (!cancelled && res.data) setOrgContext(res.data) })
      adapters.currentContext?.get().then((res) => { if (!cancelled && res.data) setContext(res.data) })
    })
    return () => { cancelled = true }
  }, [adapters])

  const currentOrgName = orgContext?.currentOrganizationId
    ? (orgContext.memberships.find((m) => m.organizationId === orgContext.currentOrganizationId)?.organizationName ?? 'Personal')
    : 'Personal'

  const fields: { label: string; value: string }[] = [
    { label: 'Current Product', value: productName || currentProduct },
    { label: 'Current Organization', value: currentOrgName },
    { label: 'Current Living World', value: context?.livingWorld ?? NOT_ACTIVE },
    { label: 'Current Journey', value: context?.journey ?? NOT_ACTIVE },
    { label: 'Current Episode', value: context?.episode ?? NOT_ACTIVE },
    { label: 'Current Practice', value: context?.practice ?? NOT_ACTIVE },
  ]

  return (
    <div className="aka-card p-4 aka-mb-6">
      <p className="text-[10px] uppercase tracking-widest text-[var(--text-dim,#8b8b98)] mb-2">Current Context</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fields.map((f) => (
          <div key={f.label}>
            <p className="text-[10px] text-[var(--text-dim,#8b8b98)]">{f.label}</p>
            <p className={`text-sm mt-0.5 ${f.value === NOT_ACTIVE ? 'text-[var(--text-dim,#8b8b98)] italic' : 'text-[var(--text-primary,#f5f2ea)]'}`}>
              {f.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
