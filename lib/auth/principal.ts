import { createClient } from '@/lib/supabase/server'
import type { AccountPrincipal } from '@avatark/account'

// Real fix: now imports the package's own actual AccountPrincipal type
// (available since Checkpoint 4 installed the package), rather than the
// standalone, mirrored type this file used before the package existed
// in this repo. Same shape, but now the genuine, single source of truth.
export type { AccountPrincipal }

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
