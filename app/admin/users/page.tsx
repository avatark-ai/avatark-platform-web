'use client'
import { useState } from 'react'
import { PRODUCT_REGISTRY } from '@avatark/product-registry'

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
  const [roleInput, setRoleInput] = useState('')
  const [roleActionError, setRoleActionError] = useState<string | null>(null)
  const [roleActionPending, setRoleActionPending] = useState<string | null>(null)
  const [productSelect, setProductSelect] = useState(PRODUCT_REGISTRY[0]?.id ?? '')
  const [accessActionError, setAccessActionError] = useState<string | null>(null)
  const [accessActionPending, setAccessActionPending] = useState<string | null>(null)

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

  async function refreshDetail() {
    if (detail) await handleSelect(detail.id)
  }

  async function handleGrantRole() {
    if (!detail || !roleInput.trim()) return
    setRoleActionPending('grant')
    setRoleActionError(null)
    try {
      const res = await fetch(`/api/admin/users/${detail.id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleInput.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { setRoleActionError(json.error ?? `Grant failed (${res.status})`); return }
      setRoleInput('')
      await refreshDetail()
    } catch (err) {
      setRoleActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setRoleActionPending(null)
    }
  }

  async function handleRevokeRole(role: string) {
    if (!detail) return
    setRoleActionPending(role)
    setRoleActionError(null)
    try {
      const res = await fetch(`/api/admin/users/${detail.id}/roles?role=${encodeURIComponent(role)}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { setRoleActionError(json.error ?? `Revoke failed (${res.status})`); return }
      await refreshDetail()
    } catch (err) {
      setRoleActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setRoleActionPending(null)
    }
  }

  async function handleGrantAccess() {
    if (!detail || !productSelect) return
    setAccessActionPending('grant')
    setAccessActionError(null)
    try {
      const res = await fetch(`/api/admin/users/${detail.id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: productSelect }),
      })
      const json = await res.json()
      if (!res.ok) { setAccessActionError(json.error ?? `Grant failed (${res.status})`); return }
      await refreshDetail()
    } catch (err) {
      setAccessActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setAccessActionPending(null)
    }
  }

  async function handleRevokeAccess(productId: string) {
    if (!detail) return
    setAccessActionPending(productId)
    setAccessActionError(null)
    try {
      const res = await fetch(`/api/admin/users/${detail.id}/access?productId=${encodeURIComponent(productId)}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { setAccessActionError(json.error ?? `Revoke failed (${res.status})`); return }
      await refreshDetail()
    } catch (err) {
      setAccessActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setAccessActionPending(null)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-xs text-neutral-500">
        Most of this page is read-only. Platform roles and product access, below, can be granted or revoked directly.
      </p>

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
              <ul className="space-y-1">
                {detail.platformRoles.map((r) => (
                  <li key={r.role} className="flex items-center justify-between gap-2">
                    <span>{r.role} — granted {r.granted_at}</span>
                    <button
                      onClick={() => handleRevokeRole(r.role)}
                      disabled={roleActionPending !== null}
                      className="text-xs text-red-600 disabled:opacity-50"
                    >
                      {roleActionPending === r.role ? 'Revoking…' : 'Revoke'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-500">No platform roles.</p>
            )}
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGrantRole()}
                placeholder="Role to grant (e.g. admin)"
                className="flex-1 rounded-md border px-2 py-1 text-xs"
              />
              <button
                onClick={handleGrantRole}
                disabled={roleActionPending !== null || !roleInput.trim()}
                className="rounded-md bg-black px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                {roleActionPending === 'grant' ? 'Granting…' : 'Grant'}
              </button>
            </div>
            {roleActionError && <p className="mt-1 text-xs text-red-600" role="alert">{roleActionError}</p>}
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
              <ul className="space-y-1">
                {detail.productAccess.map((a) => (
                  <li key={a.product_id} className="flex items-center justify-between gap-2">
                    <span>{a.product_id} — {a.status}</span>
                    {a.status !== 'revoked' && (
                      <button
                        onClick={() => handleRevokeAccess(a.product_id)}
                        disabled={accessActionPending !== null}
                        className="text-xs text-red-600 disabled:opacity-50"
                      >
                        {accessActionPending === a.product_id ? 'Revoking…' : 'Revoke'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-500">No product access grants.</p>
            )}
            <div className="mt-2 flex gap-2">
              <select
                value={productSelect}
                onChange={(e) => setProductSelect(e.target.value)}
                className="flex-1 rounded-md border px-2 py-1 text-xs"
              >
                {PRODUCT_REGISTRY.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayName}</option>
                ))}
              </select>
              <button
                onClick={handleGrantAccess}
                disabled={accessActionPending !== null || !productSelect}
                className="rounded-md bg-black px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                {accessActionPending === 'grant' ? 'Granting…' : 'Grant'}
              </button>
            </div>
            {accessActionError && <p className="mt-1 text-xs text-red-600" role="alert">{accessActionError}</p>}
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
