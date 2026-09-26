import type { NextRequest } from 'next/server'
import { isMachineIngressHost } from '@/lib/worldConsumer/machineIngress'
import { getGatewayDeps } from '@/lib/worldEntry/deps'
import { handleSessionView } from '@/lib/worldEntry/gateway'

// WORLDK-M14-A: the visitor's world-session status page (no runtime identifiers).
export async function GET(request: NextRequest) {
  if (!isMachineIngressHost(request.headers.get('host'))) return new Response(null, { status: 404 })
  return handleSessionView(request, getGatewayDeps())
}
