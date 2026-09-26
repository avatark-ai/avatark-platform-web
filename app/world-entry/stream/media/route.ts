import type { NextRequest } from 'next/server'
import { isMachineIngressHost } from '@/lib/worldConsumer/machineIngress'
import { getMediaPageDeps } from '@/lib/worldEntry/deps'
import { handleMediaPage } from '@/lib/worldEntry/mediaPlayerPage'

// WORLDK-M14-B5: Preview media player page (test video; no world rendering).
export async function GET(request: NextRequest) {
  if (!isMachineIngressHost(request.headers.get('host'))) return new Response(null, { status: 404 })
  return handleMediaPage(request, getMediaPageDeps())
}
