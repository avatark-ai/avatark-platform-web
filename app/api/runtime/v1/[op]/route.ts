import type { NextRequest } from 'next/server'
import { isMachineIngressHost } from '@/lib/worldConsumer/machineIngress'
import { getRuntimeIngressDeps } from '@/lib/worldEntry/deps'
import { handleRuntimeIngress } from '@/lib/worldEntry/runtimeIngress'

// WORLDK-M14-A: Platform Runtime Ingress. The only surface a runtime talks to.
export async function POST(request: NextRequest, ctx: { params: Promise<{ op: string }> }) {
  if (!isMachineIngressHost(request.headers.get('host'))) return new Response(null, { status: 404 })
  const { op } = await ctx.params
  return handleRuntimeIngress(request, op, getRuntimeIngressDeps())
}
