'use client'

import { useEffect, useRef, useState } from 'react'

function readSessionFlag(key?: string): boolean {
  if (!key || typeof window === 'undefined') return false
  try {
    return Boolean(window.sessionStorage.getItem(key))
  } catch {
    // sessionStorage unavailable (private mode, etc.) -- treat as unset.
    return false
  }
}

// Thin, single-purpose wrapper: marks itself .is-revealed the first time
// it scrolls into view, then disconnects -- a one-shot trigger for the
// motion-emerge/motion-emerge-stagger/motion-draw CSS in globals.css.
// Deliberately not scroll-linked/hijacking beyond this one boolean flip;
// once revealed, the element behaves like a plain div forever after.
export function RevealOnView({
  children,
  className = '',
  style,
  sessionKey,
}: {
  children: React.ReactNode
  className?: string
  // Forwarded as-is -- e.g. a caller setting --motion-delay to stage this
  // instance's reveal after some other sequence settles (see Canon.tsx's
  // explanation panel, delayed until the Four Axes geometry finishes).
  style?: React.CSSProperties
  // When set, this instance remembers (via sessionStorage) that it has
  // already played once this browser session. On a later mount within
  // the same session -- e.g. navigating away from /canon and back --
  // it renders already-settled via .motion-instant instead of replaying
  // the full entrance. Omit for the common case (a diagram should still
  // play when scrolled to the first time on any given page load).
  sessionKey?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Always start from the same "not yet revealed" state the server
  // rendered -- sessionStorage is only readable client-side, so checking
  // it during the initial render would make the client's first paint
  // disagree with the server's HTML (a hydration mismatch). The effect
  // below resolves the session-flag case one frame after mount instead,
  // same deferral PageEnter.tsx already uses for its own mount reveal.
  const [revealed, setRevealed] = useState(false)
  const [instant, setInstant] = useState(false)

  useEffect(() => {
    if (readSessionFlag(sessionKey)) {
      const id = requestAnimationFrame(() => {
        setRevealed(true)
        setInstant(true)
      })
      return () => cancelAnimationFrame(id)
    }

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          if (sessionKey) {
            try {
              window.sessionStorage.setItem(sessionKey, '1')
            } catch {
              // Ignore -- worst case it replays next visit, not a correctness issue.
            }
          }
          observer.disconnect()
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -10% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [sessionKey])

  return (
    <div
      ref={ref}
      className={`${className}${revealed ? ' is-revealed' : ''}${instant ? ' motion-instant' : ''}`}
      style={style}
    >
      {children}
    </div>
  )
}
