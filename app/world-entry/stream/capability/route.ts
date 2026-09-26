import type { NextRequest } from 'next/server'
import { isMachineIngressHost } from '@/lib/worldConsumer/machineIngress'
import { getStreamCapabilityDeps } from '@/lib/worldEntry/deps'
import { handleStreamCapabilityIssue } from '@/lib/worldEntry/streamCapability'

// WORLDK-M14-B3: issue a 60 s single-use stream capability for an IN_WORLD RuntimeSession.
export async function POST(request: NextRequest) {
  if (!isMachineIngressHost(request.headers.get('host'))) return new Response(null, { status: 404 })
  return handleStreamCapabilityIssue(request, getStreamCapabilityDeps())
}
