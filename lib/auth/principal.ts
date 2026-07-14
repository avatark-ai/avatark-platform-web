import { createClient } from '@/lib/supabase/server'

// Real principal shape @avatark/account's contract expects (mirrored
// here rather than imported, since the package isn't installed yet at
// this checkpoint -- Checkpoint 4's job, per the explicit stop
// condition for this checkpoint).
export type AccountPrincipal =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'signed_in'; id: string; displayName: string; email: string }

export async function resolvePrincipal(): Promise<AccountPrincipal> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { status: 'signed_out' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  return {
    status: 'signed_in',
    id: user.id,
    displayName: profile?.display_name ?? user.email?.split('@')[0] ?? 'Member',
    email: user.email ?? '',
  }
}
