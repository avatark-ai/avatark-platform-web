// Direct platform-role and product-access grant/revoke mutations (handoff
// doc's "Next priorities" #1 -- these two writes never existed outside the
// organization-invitation path). Mirrors lib/capabilities/adminGrants.ts's
// shape exactly: every function takes an already-authorized service-role
// client and actorId (this module does not itself check authorization,
// same convention every other admin mutation module in this repo follows),
// validates before touching the database, and records an audit event on
// both the success and failure path.
import type { SupabaseClient } from '@supabase/supabase-js'
import { isValidProductId } from '@avatark/product-registry'
import { recordAuditEvent } from './audit.ts'

export type AdminAccessResult<T> = { status: 'ready'; data: T } | { status: 'error'; message: string }

export interface PlatformRoleGrant {
  userId: string
  role: string
}

export interface ProductAccessGrant {
  userId: string
  productId: string
  status: string
}

// platform_roles has PRIMARY KEY (user_id, role) and no soft-delete column
// (migration 011) -- grant is a real INSERT (a duplicate is idempotent
// success, same precedent as lib/admin/bootstrap.ts's own first-admin
// grant), revoke is a real DELETE.
export async function grantPlatformRole(
  admin: SupabaseClient, actorId: string, userId: string, role: string
): Promise<AdminAccessResult<PlatformRoleGrant>> {
  const trimmedUserId = typeof userId === 'string' ? userId.trim() : ''
  const trimmedRole = typeof role === 'string' ? role.trim() : ''
  if (!trimmedUserId) return { status: 'error', message: 'userId is required' }
  if (!trimmedRole) return { status: 'error', message: 'role is required' }

  const { error } = await admin.from('platform_roles').insert({ user_id: trimmedUserId, role: trimmedRole, granted_by: actorId })
  // 23505 = unique_violation on the (user_id, role) primary key -- this
  // exact grant already exists, not a failure.
  if (error && error.code !== '23505') {
    await recordAuditEvent(admin, {
      actorId, action: 'platform_role.grant', targetType: 'user', targetId: trimmedUserId,
      metadata: { role: trimmedRole, error: error.message }, result: 'failure',
    })
    return { status: 'error', message: error.message }
  }

  await recordAuditEvent(admin, {
    actorId, action: 'platform_role.grant', targetType: 'user', targetId: trimmedUserId,
    metadata: { role: trimmedRole }, result: 'success',
  })
  return { status: 'ready', data: { userId: trimmedUserId, role: trimmedRole } }
}

export async function revokePlatformRole(
  admin: SupabaseClient, actorId: string, userId: string, role: string
): Promise<AdminAccessResult<PlatformRoleGrant>> {
  const trimmedUserId = typeof userId === 'string' ? userId.trim() : ''
  const trimmedRole = typeof role === 'string' ? role.trim() : ''
  if (!trimmedUserId) return { status: 'error', message: 'userId is required' }
  if (!trimmedRole) return { status: 'error', message: 'role is required' }

  // Lockout prevention: an admin can grant/revoke anyone else's admin role,
  // but never their own -- there is no "are there other admins" check
  // elsewhere in this codebase this could safely lean on, so the simplest
  // correct rule is an unconditional refusal; another admin can always do
  // it instead.
  if (actorId === trimmedUserId && trimmedRole === 'admin') {
    return { status: 'error', message: 'You cannot revoke your own admin role — ask another admin to do it.' }
  }

  const { data, error } = await admin
    .from('platform_roles')
    .delete()
    .eq('user_id', trimmedUserId)
    .eq('role', trimmedRole)
    .select()
    .maybeSingle()

  if (error) {
    await recordAuditEvent(admin, {
      actorId, action: 'platform_role.revoke', targetType: 'user', targetId: trimmedUserId,
      metadata: { role: trimmedRole, error: error.message }, result: 'failure',
    })
    return { status: 'error', message: error.message }
  }
  if (!data) {
    return { status: 'error', message: `${trimmedUserId} does not have the "${trimmedRole}" platform role` }
  }

  await recordAuditEvent(admin, {
    actorId, action: 'platform_role.revoke', targetType: 'user', targetId: trimmedUserId,
    metadata: { role: trimmedRole }, result: 'success',
  })
  return { status: 'ready', data: { userId: trimmedUserId, role: trimmedRole } }
}

// product_access has PRIMARY KEY (user_id, product_id) and a real `status`
// enum already ('active'/'suspended'/'expired'/'revoked' -- confirmed
// against lib/products/accessModel.ts's toUserAccessState) -- grant is an
// upsert to status 'active' (re-activates a previously revoked grant
// rather than creating a second row), revoke is an UPDATE to 'revoked',
// never a DELETE (preserves the grant history, same auditability rationale
// as capability_grants' revoked_at column).
export async function grantProductAccess(
  admin: SupabaseClient, actorId: string, userId: string, productId: string
): Promise<AdminAccessResult<ProductAccessGrant>> {
  const trimmedUserId = typeof userId === 'string' ? userId.trim() : ''
  const trimmedProductId = typeof productId === 'string' ? productId.trim() : ''
  if (!trimmedUserId) return { status: 'error', message: 'userId is required' }
  if (!trimmedProductId) return { status: 'error', message: 'productId is required' }
  if (!isValidProductId(trimmedProductId)) {
    return { status: 'error', message: `"${trimmedProductId}" is not a canonical product id` }
  }

  const { error } = await admin
    .from('product_access')
    .upsert(
      { user_id: trimmedUserId, product_id: trimmedProductId, status: 'active', granted_by: actorId, granted_at: new Date().toISOString() },
      { onConflict: 'user_id,product_id' }
    )

  if (error) {
    await recordAuditEvent(admin, {
      actorId, action: 'product_access.grant', targetType: 'user', targetId: trimmedUserId,
      metadata: { productId: trimmedProductId, error: error.message }, result: 'failure',
    })
    return { status: 'error', message: error.message }
  }

  await recordAuditEvent(admin, {
    actorId, action: 'product_access.grant', targetType: 'user', targetId: trimmedUserId,
    metadata: { productId: trimmedProductId }, result: 'success',
  })
  return { status: 'ready', data: { userId: trimmedUserId, productId: trimmedProductId, status: 'active' } }
}

export async function revokeProductAccess(
  admin: SupabaseClient, actorId: string, userId: string, productId: string
): Promise<AdminAccessResult<ProductAccessGrant>> {
  const trimmedUserId = typeof userId === 'string' ? userId.trim() : ''
  const trimmedProductId = typeof productId === 'string' ? productId.trim() : ''
  if (!trimmedUserId) return { status: 'error', message: 'userId is required' }
  if (!trimmedProductId) return { status: 'error', message: 'productId is required' }

  const { data, error } = await admin
    .from('product_access')
    .update({ status: 'revoked' })
    .eq('user_id', trimmedUserId)
    .eq('product_id', trimmedProductId)
    .select()
    .maybeSingle()

  if (error) {
    await recordAuditEvent(admin, {
      actorId, action: 'product_access.revoke', targetType: 'user', targetId: trimmedUserId,
      metadata: { productId: trimmedProductId, error: error.message }, result: 'failure',
    })
    return { status: 'error', message: error.message }
  }
  if (!data) {
    return { status: 'error', message: `no product access grant found for ${trimmedUserId} / ${trimmedProductId}` }
  }

  await recordAuditEvent(admin, {
    actorId, action: 'product_access.revoke', targetType: 'user', targetId: trimmedUserId,
    metadata: { productId: trimmedProductId }, result: 'success',
  })
  return { status: 'ready', data: { userId: trimmedUserId, productId: trimmedProductId, status: 'revoked' } }
}
