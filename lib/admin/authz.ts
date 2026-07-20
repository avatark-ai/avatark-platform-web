// Platform Admin authorization. Deliberately uses the normal (anon-key,
// RLS-governed) server client for the authz check itself -- a user can
// always read their own platform_roles row (migration 014's
// "platform_roles_select_own" policy), so no service-role client is
// needed just to answer "is the current user an admin?".
import { createClient } from '@/lib/supabase/server'

export interface AdminContext {
  userId: string
  email: string
  role: string
}

export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('platform_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle()

  if (!data) return null
  return { userId: user.id, email: user.email ?? '', role: data.role }
}
