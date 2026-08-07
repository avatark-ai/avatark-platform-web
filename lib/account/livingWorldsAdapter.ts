// Wires @avatark/account's LivingWorldsTab to @avatark/living-world-runtime
// via /api/account/living-worlds, same fetch-based pattern as
// lib/account/contextAdapter.ts. The runtime's summary shape
// (AccountLivingWorldSummary) already matches @avatark/account's LivingWorld
// contract field-for-field (both were extended together this sprint), so
// no further mapping is needed beyond the HTTP round-trip.
import type { LivingWorld, LivingWorldsAdapter } from '@avatark/account'

interface LivingWorldsListResponse {
  worlds?: LivingWorld[]
  error?: string
}

// fetchImpl is injectable so the adapter is testable without a real
// network call or a signed-in session.
export function createLivingWorldsAdapter(fetchImpl: typeof fetch = fetch): LivingWorldsAdapter {
  return {
    async list() {
      const res = await fetchImpl('/api/account/living-worlds')
      const json: LivingWorldsListResponse = await res.json().catch(() => ({}))
      if (!res.ok) return { error: json.error ?? `Request failed (${res.status})` }
      return { data: json.worlds ?? [] }
    },
    async enter(worldId: string) {
      const res = await fetchImpl('/api/account/living-worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enter', worldId }),
      })
      const json: LivingWorldsListResponse = await res.json().catch(() => ({}))
      if (!res.ok) return { error: json.error ?? `Request failed (${res.status})` }
      const world = json.worlds?.find((w) => w.id === worldId)
      if (!world) return { error: `Living World "${worldId}" not found in response` }
      return { data: world }
    },
  }
}

export const livingWorldsAdapter: LivingWorldsAdapter = createLivingWorldsAdapter()
