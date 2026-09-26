import type { NextRequest } from 'next/server'
import { isMachineIngressHost } from '@/lib/worldConsumer/machineIngress'
import { resolveVisitorFromSession } from '@/lib/worldConsumer/sessionVisitor'
import { getWorldEntryDeps } from '@/lib/worldEntry/deps'
import { handleWorldEntryRequest } from '@/lib/worldEntry/resolver'

// WORLDK-M14-A: WorldEntryIntent -> WorldEntryResult (Contract 03).
// Verified AvatarK session required; subjectId derived server-side.
// Resolving never opens a visit: only a verified runtime ARRIVAL does.
export async function POST(request: NextRequest, ctx: { params: Promise<{ worldId: string }> }) {
  if (!isMachineIngressHost(request.headers.get('host'))) return new Response(null, { status: 404 })
  const { worldId } = await ctx.params
  return handleWorldEntryRequest(request, worldId, resolveVisitorFromSession, getWorldEntryDeps())
}
