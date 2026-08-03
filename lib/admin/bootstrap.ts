// First-Platform-Admin bootstrap. Grants platform_roles role='admin' to a
// single, operator-designated account exactly once, then refuses forever.
// This module does not itself check who is calling -- unlike every other
// admin mutation in this repo (lib/capabilities/adminGrants.ts et al.), it
// deliberately cannot require getAdminContext(), since its whole purpose is
// granting the *first* admin, who by definition has none yet. The two
// checks below stand in for that authz: an operator-set env var (not a
// client input) naming exactly one account, and a "no admin exists yet"
// guard that self-disables this path forever once satisfied.
import type { SupabaseClient } from '@supabase/supabase-js'
import { recordAuditEvent } from './audit.ts'

export type BootstrapResult =
  | { status: 'granted' }
  | { status: 'not_configured' }
  | { status: 'wrong_account' }
  | { status: 'already_bootstrapped' }
  | { status: 'error'; message: string }

export interface BootstrapParams {
  userId: string
  userEmail: string | null
  bootstrapEmail: string | null | undefined
}

export async function bootstrapPlatformAdmin(admin: SupabaseClient, params: BootstrapParams): Promise<BootstrapResult> {
  const configuredEmail = params.bootstrapEmail?.trim().toLowerCase()
  if (!configuredEmail) return { status: 'not_configured' }

  const callerEmail = params.userEmail?.trim().toLowerCase() ?? ''
  if (callerEmail !== configuredEmail) return { status: 'wrong_account' }

  const { count, error: countError } = await admin
    .from('platform_roles')
    .select('user_id', { count: 'exact', head: true })
    .eq('role', 'admin')
  if (countError) return { status: 'error', message: countError.message }
  if ((count ?? 0) > 0) return { status: 'already_bootstrapped' }

  const { error: insertError } = await admin
    .from('platform_roles')
    .insert({ user_id: params.userId, role: 'admin', granted_by: params.userId })
  // 23505 = unique_violation on the (user_id, role) primary key -- this
  // exact grant already exists (e.g. a duplicate click), not a failure.
  if (insertError && insertError.code !== '23505') {
    return { status: 'error', message: insertError.message }
  }

  await recordAuditEvent(admin, {
    actorId: params.userId,
    action: 'platform_admin.bootstrap_grant',
    targetType: 'platform_roles',
    targetId: params.userId,
    metadata: { via: 'PLATFORM_ADMIN_BOOTSTRAP_EMAIL' },
    result: 'success',
  })
  return { status: 'granted' }
}
