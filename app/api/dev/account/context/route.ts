import { NextRequest, NextResponse } from 'next/server'
import { ContextValidationError, type ContextScope } from '@avatark/context-runtime'
import { devRouteGuard } from '@/lib/devOnlyGuard'
import { devContextRuntime } from '@/lib/context/devSingleton'
import { DEV_USER_ID } from '@/lib/experienceRuntime/devSingleton'

// Dev-only, unauthenticated mirror of /api/account/context -- see
// app/api/dev/account/journey/route.ts for the full rationale. Never
// reachable in production; never imported by the real route.
export async function GET() {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const snapshot = await devContextRuntime.getContext(DEV_USER_ID)
  return NextResponse.json(snapshot)
}

export async function PATCH(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
  }

  const scope: ContextScope = body.scope === 'persisted' || body.scope === 'product_default' ? body.scope : 'session'

  try {
    const outcome = await devContextRuntime.patchContext(DEV_USER_ID, {
      productId: body.productId,
      scope,
      fields: body.fields ?? {},
      occurredAt: body.occurredAt,
      reason: body.reason,
    })
    return NextResponse.json(outcome)
  } catch (err) {
    if (err instanceof ContextValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }
}

export async function DELETE(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const body = await req.json().catch(() => ({}))
  if (typeof body.productId !== 'string' || body.productId.trim() === '') {
    return NextResponse.json({ error: 'Clearing context requires a productId' }, { status: 400 })
  }

  const outcome = await devContextRuntime.clearContext(DEV_USER_ID, { productId: body.productId, reason: body.reason })
  return NextResponse.json(outcome)
}
