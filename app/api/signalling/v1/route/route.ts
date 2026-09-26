import type { NextRequest } from 'next/server'
import { isMachineIngressHost } from '@/lib/worldConsumer/machineIngress'
import { getSignallingRouteDeps } from '@/lib/worldEntry/deps'
import { handleSignallingRoute } from '@/lib/worldEntry/signallingRoute'

// WORLDK-M14-B5: signalling-facing route authority (read-only). Keyed by the
// signalling service credential; resolves a B3 authorization digest to an
// opaque route key. Not lifecycle authority.
export async function POST(request: NextRequest) {
  if (!isMachineIngressHost(request.headers.get('host'))) return new Response(null, { status: 404 })
  return handleSignallingRoute(request, getSignallingRouteDeps())
}
