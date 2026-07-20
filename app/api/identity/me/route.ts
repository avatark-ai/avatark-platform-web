import { NextResponse } from 'next/server'
import { supabaseIdentityProvider } from '@/lib/identity/supabaseIdentityProvider'

// Server-verified read of the current session's identity claims. Backs
// lib/identity/useIdentity.ts for client components in this repo; a
// same-origin convenience, not a cross-product endpoint (see
// /api/identity/verify for the token-based cross-product path).
export async function GET() {
  const claims = await supabaseIdentityProvider.getUser()
  if (!claims) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  return NextResponse.json(claims)
}
