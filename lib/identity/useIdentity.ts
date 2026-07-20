'use client'
// Client-side convenience hook over /api/identity/me. Always a real,
// server-verified read (the route calls supabase.auth.getUser(), which
// round-trips to the auth server) -- this hook never trusts a locally
// cached claim.
import { useEffect, useState } from 'react'
import type { IdentityClaims } from './types'

export type IdentityState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'signed_in'; claims: IdentityClaims }
  | { status: 'error'; message: string }

export function useIdentity(): IdentityState {
  const [state, setState] = useState<IdentityState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/identity/me')
        if (cancelled) return
        if (res.status === 401) {
          setState({ status: 'signed_out' })
          return
        }
        if (!res.ok) {
          setState({ status: 'error', message: `Request failed (${res.status})` })
          return
        }
        const claims = (await res.json()) as IdentityClaims
        setState({ status: 'signed_in', claims })
      } catch (err) {
        if (!cancelled) setState({ status: 'error', message: err instanceof Error ? err.message : String(err) })
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return state
}
