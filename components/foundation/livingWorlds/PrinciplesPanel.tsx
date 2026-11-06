'use client'

// AVK-UNIFICATION-03C-1 (LIVING-WORLDS-PAGE-V1 §3): the six-principle progressive explanation.
// One component, one DOM source -- exactly one of three renderings exists at a time:
//   static    : server render, no-JS, print, and the first hydration pass. An ordered list of h3 + p,
//               everything visible and indexable.
//   tabs      : >=1024px. WAI-ARIA APG Tabs, vertical, automatic activation, roving tabindex,
//               ArrowUp/ArrowDown (wrapping), Home/End; Tab moves into the panel.
//   accordion : <1024px. APG Disclosure: <h3><button aria-expanded aria-controls>. Place starts open,
//               several may be open; collapsed bodies are hidden="until-found" so Find-in-page still
//               reveals them (beforematch opens the item).
// Deep link: /living-worlds#principle-<key> selects/opens that principle.
// The breakpoint is read with useSyncExternalStore (server snapshot = static), so hydration matches the
// server HTML and no state is set inside effects. Motion: the panel swap reuses motion-emerge-instant,
// which the global prefers-reduced-motion rule already collapses. No Canon geometry, no figures.
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'

export type PrincipleItem = { key: string; name: string; body: string }
type Mode = 'static' | 'tabs' | 'accordion'

const DESKTOP = '(min-width: 1024px)'
function subscribeMedia(cb: () => void) {
  const mq = window.matchMedia(DESKTOP)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
function subscribeHash(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
const FOCUS = { outlineColor: 'var(--focus-ring)' } as const

export function PrinciplesPanel({ items, label }: { items: readonly PrincipleItem[]; label: string }) {
  const desktop = useSyncExternalStore(subscribeMedia, () => window.matchMedia(DESKTOP).matches, () => null)
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => '')
  const mode: Mode = desktop === null ? 'static' : desktop ? 'tabs' : 'accordion'

  const [selectedKey, setSelectedKey] = useState(items[0].key)
  const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(() => new Set([items[0].key]))

  // Deep link: adopt a #principle-<key> hash once per change (render-time adjustment, as in the header).
  const [lastHash, setLastHash] = useState('')
  if (hash !== lastHash) {
    setLastHash(hash)
    const key = /^#principle-([a-z]+)$/.exec(hash)?.[1]
    if (key && items.some((p) => p.key === key)) {
      setSelectedKey(key)
      setOpenKeys((prev) => new Set(prev).add(key))
    }
  }

  const rootRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Accordion: upgrade React's boolean hidden to hidden="until-found" and open an item when the
  // browser's find-in-page reveals it.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (mode !== 'accordion' || !root) return
    for (const el of root.querySelectorAll<HTMLElement>('[data-principle-body][hidden]')) el.setAttribute('hidden', 'until-found')
    function onBeforeMatch(event: Event) {
      const key = (event.target as HTMLElement).closest<HTMLElement>('[data-principle-body]')?.dataset.principleBody
      if (key) setOpenKeys((prev) => new Set(prev).add(key))
    }
    root.addEventListener('beforematch', onBeforeMatch)
    return () => root.removeEventListener('beforematch', onBeforeMatch)
  }, [mode, openKeys])

  if (mode === 'static') {
    return (
      <div ref={rootRef} data-principles-mode="static">
        <ol className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {items.map((p) => (
            <li key={p.key} id={`principle-${p.key}`} className="scroll-mt-4 border-l-2 pl-5" style={{ borderColor: 'var(--paper-line)' }}>
              <h3 className="text-xl font-semibold tracking-tight">{p.name}</h3>
              <p className="mt-2 text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
                {p.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  if (mode === 'tabs') {
    const index = Math.max(0, items.findIndex((p) => p.key === selectedKey))
    const active = items[index]
    const select = (i: number) => {
      const next = items[(i + items.length) % items.length]
      setSelectedKey(next.key)
      tabRefs.current[next.key]?.focus()
    }
    return (
      <div ref={rootRef} data-principles-mode="tabs" className="grid grid-cols-[16rem_1fr] gap-10">
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label={label}
          className="flex flex-col"
          onKeyDown={(event) => {
            const map: Record<string, number> = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 }
            if (event.key in map) {
              event.preventDefault()
              select(map[event.key])
            }
          }}
        >
          {items.map((p) => {
            const isSelected = p.key === active.key
            return (
              <button
                key={p.key}
                ref={(el) => {
                  tabRefs.current[p.key] = el
                }}
                type="button"
                role="tab"
                id={`principle-tab-${p.key}`}
                aria-selected={isSelected}
                aria-controls="principle-tabpanel"
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setSelectedKey(p.key)}
                className="min-h-11 border-l-2 px-4 py-2 text-left text-base font-semibold transition-colors duration-200 hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
                style={{ color: isSelected ? 'var(--ink)' : 'var(--ink-dim)', borderColor: isSelected ? 'var(--gold-ink)' : 'var(--paper-line)', ...FOCUS }}
              >
                {p.name}
              </button>
            )
          })}
        </div>
        <div
          role="tabpanel"
          id="principle-tabpanel"
          aria-labelledby={`principle-tab-${active.key}`}
          tabIndex={0}
          className="rounded-2xl border p-8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)', ...FOCUS }}
        >
          <div key={active.key} className="motion-emerge-instant">
            <h3 id={`principle-${active.key}`} className="scroll-mt-4 text-3xl font-semibold tracking-tight">
              {active.name}
            </h3>
            <p className="mt-4 text-xl leading-9" style={{ color: 'var(--ink-dim)' }}>
              {active.body}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} data-principles-mode="accordion">
      <ul className="flex flex-col border-t" style={{ borderColor: 'var(--paper-line)' }}>
        {items.map((p) => {
          const expanded = openKeys.has(p.key)
          return (
            <li key={p.key} id={`principle-${p.key}`} className="scroll-mt-4 border-b" style={{ borderColor: 'var(--paper-line)' }}>
              <h3>
                <button
                  type="button"
                  id={`principle-button-${p.key}`}
                  aria-expanded={expanded}
                  aria-controls={`principle-body-${p.key}`}
                  onClick={() =>
                    setOpenKeys((prev) => {
                      const next = new Set(prev)
                      if (next.has(p.key)) next.delete(p.key)
                      else next.add(p.key)
                      return next
                    })
                  }
                  className="flex min-h-11 w-full items-center justify-between gap-4 py-3 text-left text-lg font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: 'var(--ink)', ...FOCUS }}
                >
                  {p.name}
                  <span aria-hidden="true" className={`inline-block transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
                    ▾
                  </span>
                </button>
              </h3>
              <div
                id={`principle-body-${p.key}`}
                role="region"
                aria-labelledby={`principle-button-${p.key}`}
                data-principle-body={p.key}
                hidden={!expanded}
                className={expanded ? 'motion-emerge-instant' : undefined}
              >
                {/* Padding lives on the <p>: a hidden="until-found" box keeps its own padding. */}
                <p className="pb-4 text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
                  {p.body}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
