'use client'
import { useState } from 'react'

interface SearchMatch {
  id: string
  email: string | null
  createdAt: string
  lastSignInAt: string | null
}

interface UserDetail {
  found: true
  id: string
  email: string
  createdAt: string
  lastSignInAt: string | null
  banned: boolean
  organizations: { org_id: string; role: string; organizations: { name: string } | null }[]
  productAccess: { product_id: string; status: string; granted_at: string }[]
  platformRoles: { role: string; granted_at: string }[]
  recentActivity: { action: string; target_type: string | null; target_id: string | null; environment: string; result: string; created_at: string }[]
  auditHistory: { actor_id: string | null; action: string; target_type: string | null; environment: string; result: string; created_at: string }[]
}

export default function AdminUsersPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [matches, setMatches] = useState<SearchMatch[] | null>(null)
  const [scanned, setScanned] = useState<number | undefined>(undefined)
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  async function handleSearch() {
    if (!query.trim()) return
    setStatus('loading')
    setError(null)
    setDetail(null)
    try {
      const res = await fetch(`/api/admin/users/lookup?q=${encodeURIComponent(query.trim())}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? `Search failed (${res.status})`)
        setStatus('error')
        return
      }
      setMatches(json.matches)
      setScanned(json.scanned)
      setStatus('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  async function handleSelect(id: string) {
    setDetailLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/lookup?id=${encodeURIComponent(id)}`)
      const json = await res.json()
      if (!res.ok || !json.found) {
        setError(json.error ?? 'User not found.')
        return
      }
      setDetail(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-xs text-neutral-500">Read-only. No account is modified by anything on this page.</p>

      <div>
        <label htmlFor="user-search" className="mb-1 block text-sm font-semibold text-neutral-700">
          Search users by email
        </label>
        <div className="flex gap-2">
          <input
            id="user-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by email or part of an email…"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={status === 'loading'}
            className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {status === 'loading' ? 'Searching…' : 'Search'}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>

      {matches && (
        <div>
          <p className="mb-2 text-xs text-neutral-500">
            {matches.length} match(es) (scanned {scanned} accounts — this environment&apos;s Admin API has no server-side email
            filter, see lib/admin/userDirectory.ts).
          </p>
          {matches.length > 0 && (
            <ul className="divide-y rounded-md border text-sm">
              {matches.map((m) => (
                <li key={m.id}>
                  <button onClick={() => handleSelect(m.id)} className="block w-full px-3 py-2 text-left hover:bg-neutral-50">
                    {m.email} <span className="text-neutral-400">— created {m.createdAt}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {detailLoading && <p className="text-sm text-neutral-500">Loading…</p>}

      {detail && (
        <div className="space-y-4 rounded-md border p-4 text-sm">
          <div>
            <div className="font-semibold">{detail.email}</div>
            <div className="text-neutral-500">id: {detail.id}</div>
            <div className="text-neutral-500">Created: {detail.createdAt}</div>
            <div className="text-neutral-500">Last sign-in: {detail.lastSignInAt ?? 'never'}</div>
            {detail.banned && <div className="font-semibold text-red-600">Account is banned</div>}
          </div>

          <div>
            <div className="mb-1 font-semibold">Platform roles</div>
            {detail.platformRoles.length > 0 ? (
              <ul className="list-inside list-disc">
                {detail.platformRoles.map((r) => (
                  <li key={r.role}>
                    {r.role} — granted {r.granted_at}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-500">No platform roles.</p>
            )}
          </div>

          <div>
            <div className="mb-1 font-semibold">Organizations</div>
            {detail.organizations.length > 0 ? (
              <ul className="list-inside list-disc">
                {detail.organizations.map((o) => (
                  <li key={o.org_id}>
                    {o.organizations?.name ?? o.org_id} — {o.role}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-500">No organization memberships.</p>
            )}
          </div>

          <div>
            <div className="mb-1 font-semibold">Product access</div>
            {detail.productAccess.length > 0 ? (
              <ul className="list-inside list-disc">
                {detail.productAccess.map((a) => (
                  <li key={a.product_id}>
                    {a.product_id} — {a.status}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-500">No product access grants.</p>
            )}
          </div>

          <div>
            <div className="mb-1 font-semibold">Recent activity (actions this user performed)</div>
            {detail.recentActivity.length > 0 ? (
              <ul className="space-y-1">
                {detail.recentActivity.map((a, i) => (
                  <li key={i} className="text-neutral-600">
                    {a.created_at} — {a.action} ({a.environment}, {a.result})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-500">No recorded activity by this user.</p>
            )}
          </div>

          <div>
            <div className="mb-1 font-semibold">Audit history (actions taken on this user)</div>
            {detail.auditHistory.length > 0 ? (
              <ul className="space-y-1">
                {detail.auditHistory.map((a, i) => (
                  <li key={i} className="text-neutral-600">
                    {a.created_at} — {a.action} ({a.environment}, {a.result})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-500">No recorded audit events targeting this user.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
