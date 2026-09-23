import type { NextRequest } from 'next/server'
import { getWorldConsumerDeps } from '@/lib/worldConsumer/runtimeDeps'
import { resolveVisitorFromSession } from '@/lib/worldConsumer/sessionVisitor'
import { handleVisitorProjectionRequest } from '@/lib/worldConsumer/service'

// WORLDK-M09: VisitorWorldProjection v1 (incl. SinceYouWereHere).
// Private: verified AvatarK session required; subjectId derived
// server-side; `private, no-store`.
export async function GET(request: NextRequest, ctx: { params: Promise<{ worldId: string }> }) {
  const { worldId } = await ctx.params
  return handleVisitorProjectionRequest(request, worldId, resolveVisitorFromSession, getWorldConsumerDeps())
}
