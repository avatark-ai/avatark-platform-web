'use client'

import { useEffect, useRef, useState } from 'react'

// Thin, single-purpose wrapper: marks itself .is-revealed the first time
// it scrolls into view, then disconnects -- a one-shot trigger for the
// motion-emerge/motion-emerge-stagger/motion-draw CSS in globals.css.
// Deliberately not scroll-linked/hijacking beyond this one boolean flip;
// once revealed, the element behaves like a plain div forever after.
export function RevealOnView({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -10% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={`${className}${revealed ? ' is-revealed' : ''}`}>
      {children}
    </div>
  )
}
