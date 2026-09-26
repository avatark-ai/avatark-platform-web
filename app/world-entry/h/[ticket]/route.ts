import type { NextRequest } from 'next/server'
import { isMachineIngressHost } from '@/lib/worldConsumer/machineIngress'
import { getGatewayDeps } from '@/lib/worldEntry/deps'
import { handleHandoff } from '@/lib/worldEntry/gateway'

// WORLDK-M14-A: Platform handoff gateway — single-use EntryTicket redemption.
export async function GET(request: NextRequest, ctx: { params: Promise<{ ticket: string }> }) {
  if (!isMachineIngressHost(request.headers.get('host'))) return new Response(null, { status: 404 })
  const { ticket } = await ctx.params
  return handleHandoff(ticket, getGatewayDeps())
}
