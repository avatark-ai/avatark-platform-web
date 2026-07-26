import type { CanonPair } from '@/lib/content/canonReaders'

// Shared "label — body" card grid used across the Dynamics and Alignment
// reader pages (regimes, imbalance signatures, Arena measures, misalignment
// signals) so the same pattern isn't rebuilt four separate times.
export function CanonPairGrid({ items }: { items: CanonPair[] }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border p-4"
          style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {item.label}
          </p>
          <p className="mt-1.5 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
            {item.body}
          </p>
        </div>
      ))}
    </div>
  )
}
