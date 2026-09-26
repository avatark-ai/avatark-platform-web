import type { NextRequest } from 'next/server'
import { isMachineIngressHost } from '@/lib/worldConsumer/machineIngress'
import { getStreamCapabilityDeps } from '@/lib/worldEntry/deps'
import { handleStreamAuthorize } from '@/lib/worldEntry/streamCapability'

// WORLDK-M14-B3: Preview STUB signalling — redeem the capability once and
// return an opaque AUTHORIZED result. No renderer, media or signalling host.
export async function POST(request: NextRequest) {
  if (!isMachineIngressHost(request.headers.get('host'))) return new Response(null, { status: 404 })
  return handleStreamAuthorize(request, getStreamCapabilityDeps())
}
