import type { NextRequest } from 'next/server'
import { isMachineIngressHost } from '@/lib/worldConsumer/machineIngress'
import { getGatewayDeps } from '@/lib/worldEntry/deps'
import { handleLeave } from '@/lib/worldEntry/gateway'

// WORLDK-M14-A: the visitor asks to leave. A request relayed to the
// runtime — the departure itself is runtime evidence (or PRESENCE_TIMEOUT).
export async function POST(request: NextRequest) {
  if (!isMachineIngressHost(request.headers.get('host'))) return new Response(null, { status: 404 })
  return handleLeave(request, getGatewayDeps())
}
