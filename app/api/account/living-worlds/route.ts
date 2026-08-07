import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ContextRuntime } from '@avatark/context-runtime'
import { JourneyRuntime } from '@avatark/experience-runtime'
import { createLivingWorldsAccountAdapter } from '@/lib/livingWorldRuntime/accountAdapter'
import { livingWorldRuntime, SAMPLE_WORLD_DEFINITIONS } from '@/lib/livingWorldRuntime/singleton'
import { experienceRegistry } from '@/lib/experienceRegistry/singleton'
import { enterLivingWorld, leaveLivingWorld, type RuntimeKernel } from '@/lib/runtimeKernel/orchestrator'
import { SupabaseContextRepository } from '@/lib/context/supabaseContextRepository'
import { SupabaseJourneyRepository } from '@/lib/experienceRuntime/supabaseJourneyRepository'
import { AVATARK_WELCOME_JOURNEY } from '@/lib/experienceRuntime/journeyDefinition'

const PRODUCT_ID = 'avatark'
const ACTIONS = new Set(['enter', 'leave'])

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) } as const
  return { supabase, userId: user.id } as const
}

// Living World Runtime and Experience Registry are module-scoped, in-memory
// singletons (see lib/livingWorldRuntime/singleton.ts) -- Context Runtime
// and Experience Runtime are still the real, per-request, Supabase-backed
// instances the other routes already use. This is a real, documented
// simplification (no Postgres repository exists yet for Living World or
// the Registry), not a hidden shortcut -- see
// docs/RUNTIME_HOST_INTEGRATION.md's "remaining gaps before GameK
// integration."
function kernelFor(supabase: Awaited<ReturnType<typeof createClient>>): RuntimeKernel {
  return {
    livingWorld: livingWorldRuntime,
    context: new ContextRuntime(new SupabaseContextRepository(supabase)),
    experience: new JourneyRuntime(AVATARK_WELCOME_JOURNEY, new SupabaseJourneyRepository(supabase)),
    registry: experienceRegistry,
  }
}

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  const adapter = createLivingWorldsAccountAdapter(livingWorldRuntime, SAMPLE_WORLD_DEFINITIONS, auth.userId)
  const result = await adapter.list()
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ worlds: result.data })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => ({}))
  const action = typeof body.action === 'string' ? body.action : null
  const worldId = typeof body.worldId === 'string' ? body.worldId : null
  if (!action || !ACTIONS.has(action)) {
    return NextResponse.json({ error: `Invalid action "${action}"` }, { status: 400 })
  }
  if (!worldId || !SAMPLE_WORLD_DEFINITIONS.some((w) => w.id === worldId)) {
    return NextResponse.json({ error: `Unknown Living World "${worldId}"` }, { status: 400 })
  }

  const kernel = kernelFor(auth.supabase)
  try {
    if (action === 'enter') {
      await enterLivingWorld(kernel, { userId: auth.userId, productId: PRODUCT_ID, worldId })
    } else {
      await leaveLivingWorld(kernel, { userId: auth.userId, productId: PRODUCT_ID, worldId })
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }

  const adapter = createLivingWorldsAccountAdapter(livingWorldRuntime, SAMPLE_WORLD_DEFINITIONS, auth.userId)
  const result = await adapter.list()
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ worlds: result.data })
}
