import { NextRequest, NextResponse } from 'next/server'
import { devRouteGuard, resolveDevUserId } from '@/lib/devOnlyGuard'
import { experienceRegistry } from '@/lib/experienceRegistry/singleton'
import { DEV_USER_ID } from '@/lib/experienceRuntime/devSingleton'

// Dev-only, unauthenticated mirror of /api/account/timeline -- see
// app/api/dev/account/journey/route.ts for the full rationale.
export async function GET(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const userId = resolveDevUserId(req, DEV_USER_ID)
  const limitParam = req.nextUrl.searchParams.get('limit')
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 20
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20

  const events = await experienceRegistry.listRecentEvents(userId, limit)
  return NextResponse.json({ events })
}
