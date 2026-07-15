import { createClient } from '@/lib/supabase/client'

export type ClientPrincipalResult =
  | { status: 'signed_out' }
  | { status: 'signed_in'; userId: string; email: string }
  | { status: 'error'; message: string }

// Same defensive shape as app/account/page.tsx's load effect (kept
// separate, not shared with it, so Account's own code stays untouched):
// supabase.auth.getUser() has been observed to hang indefinitely in
// this environment, so race it against a real timeout. AuthSessionMissingError
// is Supabase's normal "nobody's signed in" response, not a failure.
export async function resolveClientPrincipal(): Promise<ClientPrincipalResult> {
  try {
    const supabase = createClient()
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out contacting the authentication service (10s).')), 10000)
      ),
    ])
    const { data: { user }, error } = result
    if (error && error.name !== 'AuthSessionMissingError' && !error.message?.includes('Auth session missing')) {
      return { status: 'error', message: error.message }
    }
    if (!user) return { status: 'signed_out' }
    return { status: 'signed_in', userId: user.id, email: user.email ?? '' }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : String(err) }
  }
}
