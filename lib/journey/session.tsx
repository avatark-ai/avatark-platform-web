'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { resolveClientPrincipal, type ClientPrincipalResult } from '@/lib/auth/resolveClientPrincipal'
import {
  readJourneyContext,
  recordIntentionContext,
  recordInvitationAcceptance,
  touchLastSeen,
  EMPTY_JOURNEY_CONTEXT,
  type JourneyContext,
} from '@/lib/journey/state'
import { readGuestContext, markGuestContextClaimed } from '@/lib/journey/guestContext'

interface JourneySession {
  principal: ClientPrincipalResult | { status: 'loading' }
  context: JourneyContext
  displayName: string | null
  absorbIntentionParams: (params: { intention: string | null; witness: string | null }) => Promise<void>
}

const JourneySessionCtx = createContext<JourneySession | null>(null)

export function JourneySessionProvider({ children }: { children: ReactNode }) {
  const [principal, setPrincipal] = useState<ClientPrincipalResult | { status: 'loading' }>({
    status: 'loading',
  })
  const [context, setContext] = useState<JourneyContext>(EMPTY_JOURNEY_CONTEXT)
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    resolveClientPrincipal().then(async (result) => {
      if (cancelled) return
      setPrincipal(result)
      if (result.status !== 'signed_in') return

      let initialContext = readJourneyContext(result.metadata)
      setContext(initialContext)

      // Clean handoff for a guest who signed in: feed whatever they
      // provisionally remembered (lib/journey/guestContext.ts) into the
      // same real, signed-in recording path an already-signed-in visitor
      // uses, then mark it claimed so it never replays. Best-effort, same
      // convention as touchLastSeen below -- never blocks rendering.
      const guestContext = readGuestContext()
      if (guestContext && !guestContext.claimed) {
        try {
          const supabase = createClient()
          if (guestContext.invitationToken) {
            initialContext = await recordInvitationAcceptance(supabase, initialContext, guestContext.invitationToken)
          }
          if (guestContext.witness) {
            initialContext = await recordIntentionContext(supabase, initialContext, {
              intention: null,
              witness: guestContext.witness,
            })
          }
          if (!cancelled) setContext(initialContext)
          markGuestContextClaimed()
        } catch {
          // ignored -- see comment above; the guest context stays
          // unclaimed and is retried on the next signed-in mount.
        }
      }

      // Best-effort: recording that today's visit happened is a nicety
      // for "Welcome back," never load-bearing, so a failure here must
      // never block or error the page.
      try {
        const supabase = createClient()
        const updated = await touchLastSeen(supabase, initialContext)
        if (!cancelled) setContext(updated)
      } catch {
        // ignored -- see comment above
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (principal.status !== 'signed_in') return
    let cancelled = false
    fetch('/api/account/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((profile) => {
        if (cancelled) return
        setDisplayName(profile?.displayName ?? principal.email.split('@')[0] ?? null)
      })
      .catch(() => {
        if (!cancelled) setDisplayName(principal.email.split('@')[0] ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [principal])

  const absorbIntentionParams = useCallback(
    async (params: { intention: string | null; witness: string | null }) => {
      if (!params.intention && !params.witness) return
      if (principal.status !== 'signed_in') return
      const supabase = createClient()
      const updated = await recordIntentionContext(supabase, context, params)
      setContext(updated)
    },
    [principal, context]
  )

  const value = useMemo<JourneySession>(
    () => ({ principal, context, displayName, absorbIntentionParams }),
    [principal, context, displayName, absorbIntentionParams]
  )

  return <JourneySessionCtx.Provider value={value}>{children}</JourneySessionCtx.Provider>
}

export function useJourneySession(): JourneySession {
  const ctx = useContext(JourneySessionCtx)
  if (!ctx) throw new Error('useJourneySession must be used within JourneySessionProvider')
  return ctx
}
