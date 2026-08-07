import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ContextRuntime, ContextValidationError, type ContextScope } from '@avatark/context-runtime'
import { SupabaseContextRepository } from '@/lib/context/supabaseContextRepository'

// Security boundary for the whole file: every handler resolves `userId`
// from the request's own authenticated session (never a client-supplied
// id), and every runtime call is scoped to that one userId. There is no
// admin/"inspect another user's context" path here at all -- per the
// mission's explicit instruction, that would need a separate, privileged
// route, and no such route exists in this repo today.
async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) } as const
  return { supabase, userId: user.id } as const
}

function runtimeFor(supabase: Awaited<ReturnType<typeof createClient>>) {
  return new ContextRuntime(new SupabaseContextRepository(supabase))
}

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  const snapshot = await runtimeFor(auth.supabase).getContext(auth.userId)
  return NextResponse.json(snapshot)
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
  }

  const scope: ContextScope = body.scope === 'persisted' || body.scope === 'product_default' ? body.scope : 'session'

  try {
    const outcome = await runtimeFor(auth.supabase).patchContext(auth.userId, {
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
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => ({}))
  if (typeof body.productId !== 'string' || body.productId.trim() === '') {
    return NextResponse.json({ error: 'Clearing context requires a productId' }, { status: 400 })
  }

  const outcome = await runtimeFor(auth.supabase).clearContext(auth.userId, { productId: body.productId, reason: body.reason })
  return NextResponse.json(outcome)
}
