'use client'
// Minimal, package-local, accessible tab strip -- zero dependency on any
// host app's own shared Tabs component.
export function Tabs<T extends string>({
  tabs, active, onChange,
}: { tabs: { key: T; label: string }[]; active: T; onChange: (k: T) => void }) {
  return (
    <div role="tablist" className="aka-tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className="aka-tab"
          style={{
            color: active === t.key ? 'var(--aka-accent,#d4af5f)' : 'var(--aka-text-dim,#8b8b98)',
            borderBottomColor: active === t.key ? 'var(--aka-accent,#d4af5f)' : 'transparent',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
