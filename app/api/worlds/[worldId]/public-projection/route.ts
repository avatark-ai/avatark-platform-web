import type { NextRequest } from 'next/server'
import { getWorldConsumerDeps } from '@/lib/worldConsumer/runtimeDeps'
import { handlePublicProjectionRequest } from '@/lib/worldConsumer/service'

// WORLDK-M09: PublicWorldProjection v1 (@avatark/world-consumer-contracts).
// Public: no authentication, no cookies read. Cache bounded by the
// producer-declared freshness.staleAfter.
export async function GET(request: NextRequest, ctx: { params: Promise<{ worldId: string }> }) {
  const { worldId } = await ctx.params
  return handlePublicProjectionRequest(request, worldId, getWorldConsumerDeps())
}
