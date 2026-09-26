import type { NextRequest } from 'next/server'
import { isMachineIngressHost } from '@/lib/worldConsumer/machineIngress'
import { getStreamCapabilityDeps } from '@/lib/worldEntry/deps'
import { handleStreamPage } from '@/lib/worldEntry/streamCapability'

// WORLDK-M14-B3: Preview stub page for stream connection authorization. No media.
export async function GET(request: NextRequest) {
  if (!isMachineIngressHost(request.headers.get('host'))) return new Response(null, { status: 404 })
  return handleStreamPage(request, getStreamCapabilityDeps())
}
