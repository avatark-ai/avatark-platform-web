'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { ProductWithAccess } from '../contracts/adapters.ts'

export function ProductsTab({ currentProduct }: { currentProduct: string }) {
  const adapters = useAccountAdapters()
  const [products, setProducts] = useState<ProductWithAccess[] | undefined>(undefined)

  useEffect(() => { adapters.productAccess.list(currentProduct).then(setProducts) }, [adapters, currentProduct])

  if (!products) return <div className="h-32 bg-[var(--surface,#12121a)] rounded-[10px] animate-pulse" />

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {products.map((p) => (
        <div key={p.id} className={`aka-card p-4 ${p.entitlement === 'coming_soon' ? 'opacity-60' : ''}`}>
          <p className="text-sm font-semibold text-[var(--text-primary,#f5f2ea)]">{p.name}{p.entitlement === 'active' ? ' — Current' : ''}</p>
          <p className="text-xs text-[var(--text-dim,#8b8b98)] mt-0.5">{p.purpose}</p>
          <p className="text-xs text-[var(--text-dim,#8b8b98)] mt-1 capitalize">
            Status: {p.entitlement.replace('_', ' ')} · Role: {p.entitlement === 'coming_soon' ? '—' : 'Member'}
          </p>
          {p.entitlement === 'active' ? (
            <span className="inline-block mt-2 text-sm text-[var(--gold,#d4af5f)]">{p.ctaLabel}</span>
          ) : p.entitlement === 'available' && p.url ? (
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-sm text-[var(--gold,#d4af5f)]">{p.ctaLabel} ↗</a>
          ) : (
            <span className="inline-block mt-2 text-xs text-[var(--text-dim,#8b8b98)]">{p.ctaLabel}</span>
          )}
        </div>
      ))}
    </div>
  )
}
