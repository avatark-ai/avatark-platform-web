import type { NextRequest } from 'next/server'
import { isMachineIngressHost } from '@/lib/worldConsumer/machineIngress'
import { getEntryAuthorityDb } from '@/lib/worldEntry/deps'
import { handlePresenceSweep, SWEEPER_KEY_ENV } from '@/lib/worldEntry/runtimeIngress'

// WORLDK-M14-A: PRESENCE_TIMEOUT sweep trigger (Platform authority, keyed).
export async function POST(request: NextRequest) {
  if (!isMachineIngressHost(request.headers.get('host'))) return new Response(null, { status: 404 })
  return handlePresenceSweep(request, { db: getEntryAuthorityDb(), configuredKey: process.env[SWEEPER_KEY_ENV] })
}
