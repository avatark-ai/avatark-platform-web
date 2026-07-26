'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// EMERGE + SETTLE for whatever InstitutionalLayout wraps: fades/settles
// the page's own content in on first paint, and -- since every
// institutional route (including each Founder chapter) independently
// renders InstitutionalLayout rather than sharing one persistent Next.js
// layout -- the same mechanism doubles as the Founder chapter transition
// the brief asks for, with no separate implementation needed.
function RevealedOnMount({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    // One frame of delay so the initial (hidden) state actually paints
    // before the class flips -- flipping synchronously in the same
    // render can get batched away, and the animation never plays.
    const id = requestAnimationFrame(() => setRevealed(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return <div className={`motion-emerge flex flex-1 flex-col${revealed ? ' is-revealed' : ''}`}>{children}</div>
}

export function PageEnter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return <RevealedOnMount key={pathname}>{children}</RevealedOnMount>
}
