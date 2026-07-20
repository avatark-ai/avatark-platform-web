// Best-effort user-id -> email lookup for admin views that need to render
// a human-readable identity next to a raw user_id (roles, product access,
// audit trail). The Admin API has no server-side "fetch these exact IDs"
// filter in this supabase-js version, so this scans users by creation
// order up to a bounded page size -- an honest limitation, documented
// rather than silently truncated.
import type { SupabaseClient } from '@supabase/supabase-js'

const SCAN_LIMIT = 1000

export async function getUserEmailMap(admin: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: SCAN_LIMIT })
  const map = new Map<string, string>()
  if (error || !data) return map
  for (const user of data.users) {
    if (user.email) map.set(user.id, user.email)
  }
  return map
}
