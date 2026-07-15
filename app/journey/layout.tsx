'use client'

import { Suspense, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { JourneySessionProvider, useJourneySession } from '@/lib/journey/session'

const TABS = [
  { href: '/journey/today', label: 'Today' },
  { href: '/journey/history', label: 'History' },
  { href: '/journey/settings', label: 'Settings' },
]

function LoadingShell() {
  return (
    <main
      className="flex flex-1 items-center justify-center px-6 py-20"
      style={{ background: 'var(--midnight)', color: 'var(--text-dim)' }}
    >
      <p className="text-sm">Loading…</p>
    </main>
  )
}

function JourneyChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { principal } = useJourneySession()

  // Bare /journey always normalizes to /journey/today, carrying any
  // intention/witness query params along -- runs regardless of auth
  // state, since this is just a canonical-path fix, not an auth
  // decision.
  useEffect(() => {
    if (pathname !== '/journey') return
    const intention = searchParams.get('intention')
    const witness = searchParams.get('witness')
    const params = new URLSearchParams()
    if (intention) params.set('intention', intention)
    if (witness) params.set('witness', witness)
    const query = params.toString()
    router.replace(query ? `/journey/today?${query}` : '/journey/today')
  }, [pathname, searchParams, router])

  useEffect(() => {
    if (principal.status !== 'signed_out') return
    // Bare /journey is mid-normalization to /journey/today (above) --
    // wait for that hop so the sign-in "return" path is the real
    // destination, not the transient one.
    if (pathname === '/journey') return
    const search = typeof window !== 'undefined' ? window.location.search : ''
    router.replace(`/auth/sign-in?return=${encodeURIComponent(pathname + search)}`)
  }, [principal.status, pathname, router])

  if (pathname === '/journey') {
    return <LoadingShell />
  }

  if (principal.status === 'loading' || principal.status === 'signed_out') {
    return <LoadingShell />
  }

  if (principal.status === 'error') {
    return (
      <main
        className="flex flex-1 items-center justify-center px-6 py-20"
        style={{ background: 'var(--midnight)', color: 'var(--paper)' }}
      >
        <div className="space-y-2 text-center">
          <p className="text-sm" role="alert">
            Couldn&apos;t load your journey: {principal.message}
          </p>
          <button onClick={() => window.location.reload()} className="text-sm underline">
            Try again
          </button>
        </div>
      </main>
    )
  }

  return (
    <main
      className="flex flex-1 flex-col px-6 py-16"
      style={{ background: 'var(--midnight)', color: 'var(--paper)' }}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-10">
        <nav aria-label="Your journey" className="flex items-center gap-6 text-sm">
          {TABS.map((tab) => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="pb-1 transition-colors"
                style={{
                  color: active ? 'var(--gold)' : 'var(--text-dim)',
                  borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
        {children}
      </div>
    </main>
  )
}

export default function JourneyLayout({ children }: { children: ReactNode }) {
  return (
    <JourneySessionProvider>
      <Suspense fallback={<LoadingShell />}>
        <JourneyChrome>{children}</JourneyChrome>
      </Suspense>
    </JourneySessionProvider>
  )
}
