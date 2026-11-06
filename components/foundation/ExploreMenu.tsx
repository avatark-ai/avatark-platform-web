'use client'

// AVK-UNIFICATION-03B (HEADER-AND-MOBILE-NAV-V3 §2): the institutional "Explore" menu. APG
// Disclosure (Show/Hide) for navigation -- a button plus a list of page links, NOT role="menu".
// Keyboard: Enter/Space toggle; ArrowDown on the button opens and focuses the first link; Tab
// moves through the links and tabbing out closes; Escape closes and returns focus to the button.
// Pointer: a pointerdown outside closes without moving focus; choosing a link closes.
// The Escape/outside-click pattern follows EchoHeader.tsx's document listeners, copied rather than
// imported so the institutional and Echo shells stay independent.
import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'

export type ExploreItem = { label: string; href: string }

const FOCUS_STYLE = { outlineColor: 'var(--focus-ring)' } as const

export function ExploreMenu({ label, items, pathname }: { label: string; items: readonly ExploreItem[]; pathname: string }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = `explore-panel-${useId().replace(/:/g, '')}`

  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  function focusFirstLink() {
    requestAnimationFrame(() => wrapperRef.current?.querySelector<HTMLAnchorElement>(`#${panelId} a`)?.focus())
  }

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onBlur={(event) => {
        // Tab past the last link (or anywhere outside) closes the panel.
        if (open && !event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
            focusFirstLink()
          }
        }}
        className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition hover:opacity-90 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ background: 'var(--gold)', color: 'var(--midnight)', ...FOCUS_STYLE }}
      >
        {label}
        <span aria-hidden="true" className={`inline-block transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        data-testid="explore-panel"
        className="avk-dark-surface motion-emerge-instant absolute right-0 top-full z-50 mt-2 w-60 rounded-md border py-2 shadow-lg"
        style={{ borderColor: 'var(--surface-line)', background: 'var(--midnight)' }}
      >
        <ul>
          {items.map((item) => {
            const active = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className="block rounded-sm px-4 py-2 text-sm font-medium transition-colors duration-200 hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
                  style={{ color: active ? 'var(--gold)' : 'var(--paper)', ...FOCUS_STYLE }}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
