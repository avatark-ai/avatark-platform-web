// Runtime reachability check for a product's public URL. Real signal only
// -- a GET request with a short timeout, classified honestly. This is a
// point-in-time "did it respond just now" check from this admin session,
// not a substitute for real uptime monitoring.
export type ProductHealthState = 'reachable' | 'unreachable' | 'unknown'

export interface ProductHealth {
  state: ProductHealthState
  detail: string
}

export function classifyHealthCheck(outcome: { ok: boolean; status: number } | { error: string }): ProductHealth {
  if ('error' in outcome) {
    return { state: 'unreachable', detail: outcome.error }
  }
  return {
    state: outcome.ok ? 'reachable' : 'unreachable',
    detail: `HTTP ${outcome.status}`,
  }
}

const TIMEOUT_MS = 3000

export async function checkProductHealth(url: string | null): Promise<ProductHealth> {
  if (!url) return { state: 'unknown', detail: 'No confirmed URL to check.' }
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) })
    return classifyHealthCheck({ ok: res.ok, status: res.status })
  } catch (err) {
    return classifyHealthCheck({ error: err instanceof Error ? err.message : String(err) })
  }
}
