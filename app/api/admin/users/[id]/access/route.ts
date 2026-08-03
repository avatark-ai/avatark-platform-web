import { NextRequest, NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/admin/authz'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { grantProductAccess, revokeProductAccess } from '@/lib/admin/platformAccess'

// POST {productId} grants, DELETE ?productId=... revokes -- direct
// product-access mutation, previously only possible as a side effect of
// the organization-invitation path (see lib/admin/platformAccess.ts's own
// header comment). Same authz/service-role-check boilerplate as every
// other admin mutation route in this repo.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: userId } = await params
  const body = await request.json().catch(() => ({}))
  const productId = typeof body.productId === 'string' ? body.productId.trim() : ''
  if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'Granting product access requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const result = await grantProductAccess(admin, ctx.userId, userId, productId)
  if (result.status === 'error') return NextResponse.json({ error: result.message }, { status: 400 })
  return NextResponse.json({ grant: result.data }, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: userId } = await params
  const productId = request.nextUrl.searchParams.get('productId')?.trim()
  if (!productId) return NextResponse.json({ error: 'productId query parameter is required' }, { status: 400 })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'Revoking product access requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const result = await revokeProductAccess(admin, ctx.userId, userId, productId)
  if (result.status === 'error') return NextResponse.json({ error: result.message }, { status: 400 })
  return NextResponse.json({ grant: result.data })
}
