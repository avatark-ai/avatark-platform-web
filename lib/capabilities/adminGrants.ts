// Minimal, server-only capability grant/revoke mutation surface (mission
// Part 11: "do not build a large admin console" — this is the adapter
// layer, consumed by app/api/admin/capabilities/**, not a UI). Every
// function here requires the caller to already hold a service-role client
// (lib/supabase/admin.ts) and an authorized actorId (lib/admin/authz.ts's
// getAdminContext()) — this module does not itself check authorization,
// matching every other admin mutation in this repo (see
// app/api/admin/organizations/route.ts).
import type { SupabaseClient } from '@supabase/supabase-js'
import { isValidProductId } from '@avatark/product-registry'
import { recordAuditEvent } from '../admin/audit.ts'
import { GRANT_COLUMNS, toCapabilityGrantRow, type CapabilityGrantDbRow } from './queries.ts'
import type { CapabilityGrantRow, CapabilityScopeType } from './types.ts'

export type AdminGrantResult<T> = { status: 'ready'; data: T } | { status: 'error'; message: string }

export interface CreateCapabilityGrantInput {
  userId: string
  capability: string
  scopeType: CapabilityScopeType
  scopeId?: string | null
  expiresAt?: string | null
}

// Matches any RFC-4122-shaped UUID (not just v4) -- gen_random_uuid()
// produces v4, but this is a format check, not a version assertion.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function listGrantsForUser(admin: SupabaseClient, userId: string): Promise<AdminGrantResult<CapabilityGrantRow[]>> {
  const trimmedUserId = typeof userId === 'string' ? userId.trim() : ''
  if (!trimmedUserId) return { status: 'error', message: 'userId is required' }

  const { data, error } = await admin
    .from('capability_grants')
    .select(GRANT_COLUMNS)
    .eq('user_id', trimmedUserId)
    .order('granted_at', { ascending: false })
  if (error) return { status: 'error', message: error.message }
  return { status: 'ready', data: ((data ?? []) as CapabilityGrantDbRow[]).map(toCapabilityGrantRow) }
}

// Validates scope shape/existence before ever reaching the database --
// the same "platform => no scopeId, product/organization => real scopeId"
// rule migration 020's CHECK constraint enforces at the SQL layer, plus
// two facts SQL can't check: canonical product-id membership (the
// registry is code, not a DB table) and organization existence (a real
// SELECT, since capability_grants.scope_id is deliberately not an FK --
// see the migration's own comment).
async function resolveValidScopeId(
  admin: SupabaseClient,
  scopeType: CapabilityScopeType,
  rawScopeId: string | null | undefined
): Promise<{ ok: true; scopeId: string | null } | { ok: false; message: string }> {
  if (scopeType === 'platform') {
    if (rawScopeId != null && rawScopeId !== '') {
      return { ok: false, message: 'platform scope must not have a scopeId' }
    }
    return { ok: true, scopeId: null }
  }

  const scopeId = typeof rawScopeId === 'string' ? rawScopeId.trim() : ''
  if (!scopeId) return { ok: false, message: `${scopeType} scope requires a scopeId` }

  if (scopeType === 'product') {
    if (!isValidProductId(scopeId)) return { ok: false, message: `"${scopeId}" is not a canonical product id` }
    return { ok: true, scopeId }
  }

  // organization
  if (!UUID_PATTERN.test(scopeId)) return { ok: false, message: 'organization scopeId must be a uuid' }
  const { data, error } = await admin.from('organizations').select('id').eq('id', scopeId).maybeSingle()
  if (error) return { ok: false, message: error.message }
  if (!data) return { ok: false, message: `organization ${scopeId} does not exist` }
  return { ok: true, scopeId }
}

export async function createCapabilityGrant(
  admin: SupabaseClient,
  actorId: string,
  input: CreateCapabilityGrantInput
): Promise<AdminGrantResult<CapabilityGrantRow>> {
  const userId = typeof input.userId === 'string' ? input.userId.trim() : ''
  const capability = typeof input.capability === 'string' ? input.capability.trim() : ''
  if (!userId) return { status: 'error', message: 'userId is required' }
  if (!capability) return { status: 'error', message: 'capability is required' }
  if (input.scopeType !== 'platform' && input.scopeType !== 'product' && input.scopeType !== 'organization') {
    return { status: 'error', message: 'scopeType must be one of platform, product, organization' }
  }

  const scopeResult = await resolveValidScopeId(admin, input.scopeType, input.scopeId)
  if (!scopeResult.ok) return { status: 'error', message: scopeResult.message }

  let expiresAt: string | null = null
  if (input.expiresAt != null) {
    const parsed = new Date(input.expiresAt)
    if (Number.isNaN(parsed.getTime())) return { status: 'error', message: 'expiresAt is not a valid date' }
    expiresAt = parsed.toISOString()
  }

  const { data, error } = await admin
    .from('capability_grants')
    .insert({
      user_id: userId,
      capability,
      scope_type: input.scopeType,
      scope_id: scopeResult.scopeId,
      granted_by: actorId,
      expires_at: expiresAt,
    })
    .select(GRANT_COLUMNS)
    .single()

  if (error) {
    await recordAuditEvent(admin, {
      actorId,
      action: 'capability.grant',
      targetType: 'user',
      targetId: userId,
      metadata: { capability, scopeType: input.scopeType, scopeId: scopeResult.scopeId, error: error.message },
      result: 'failure',
    })
    return { status: 'error', message: error.message }
  }

  const row = toCapabilityGrantRow(data as CapabilityGrantDbRow)
  await recordAuditEvent(admin, {
    actorId,
    action: 'capability.grant',
    targetType: 'user',
    targetId: userId,
    metadata: { capability, scopeType: input.scopeType, scopeId: scopeResult.scopeId, grantId: row.id },
    result: 'success',
  })
  return { status: 'ready', data: row }
}

// Sets revoked_at rather than deleting the row (mission Part 4: preserve
// auditability). The `.is('revoked_at', null)` filter makes this
// idempotent-safe: revoking an already-revoked grant matches zero rows
// (reported as an error, not a silent no-op success) instead of
// overwriting the original revocation timestamp.
export async function revokeCapabilityGrant(
  admin: SupabaseClient,
  actorId: string,
  grantId: string
): Promise<AdminGrantResult<CapabilityGrantRow>> {
  const trimmedGrantId = typeof grantId === 'string' ? grantId.trim() : ''
  if (!trimmedGrantId) return { status: 'error', message: 'grantId is required' }

  const { data, error } = await admin
    .from('capability_grants')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', trimmedGrantId)
    .is('revoked_at', null)
    .select(GRANT_COLUMNS)
    .maybeSingle()

  if (error) {
    await recordAuditEvent(admin, {
      actorId,
      action: 'capability.revoke',
      targetType: 'capability_grant',
      targetId: trimmedGrantId,
      metadata: { error: error.message },
      result: 'failure',
    })
    return { status: 'error', message: error.message }
  }
  if (!data) {
    return { status: 'error', message: `no active capability grant found with id ${trimmedGrantId}` }
  }

  const row = toCapabilityGrantRow(data as CapabilityGrantDbRow)
  await recordAuditEvent(admin, {
    actorId,
    action: 'capability.revoke',
    targetType: 'capability_grant',
    targetId: trimmedGrantId,
    metadata: { userId: row.userId, capability: row.capability, scopeType: row.scopeType, scopeId: row.scopeId },
    result: 'success',
  })
  return { status: 'ready', data: row }
}
