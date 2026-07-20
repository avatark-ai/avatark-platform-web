'use client'
import { useState } from 'react'

interface LookupResult {
  found: boolean
  scanned?: number
  id?: string
  email?: string
  createdAt?: string
  lastSignInAt?: string | null
  banned?: boolean
  organizations?: { org_id: string; role: string; organizations: { name: string } | null }[]
  productAccess?: { product_id: string; status: string; granted_at: string }[]
  auditTrail?: { action: string; target_type: string | null; target_id: string | null; environment: string; result: string; created_at: string }[]
}

export default function AdminUsersPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LookupResult | null>(null)

  async function handleLookup() {
    if (!email.trim()) return
    setStatus('loading')
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/admin/users/lookup?email=${encodeURIComponent(email.trim())}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? `Lookup failed (${res.status})`)
        setStatus('error')
        return
      }
      setResult(json)
      setStatus('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Look up a user by email</h2>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button
            onClick={handleLookup}
            disabled={status === 'loading'}
            className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {status === 'loading' ? 'Looking up…' : 'Look up'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
      </div>

      {result && !result.found && (
        <p className="text-sm text-neutral-600">No account found for that email (scanned {result.scanned} accounts).</p>
      )}

      {result?.found && (
        <div className="space-y-4 rounded-md border p-4 text-sm">
          <div>
            <div className="font-semibold">{result.email}</div>
            <div className="text-neutral-500">id: {result.id}</div>
            <div className="text-neutral-500">Created: {result.createdAt}</div>
            <div className="text-neutral-500">Last sign-in: {result.lastSignInAt ?? 'never'}</div>
            {result.banned && <div className="font-semibold text-red-600">Account is banned</div>}
          </div>

          <div>
            <div className="mb-1 font-semibold">Organizations</div>
            {result.organizations && result.organizations.length > 0 ? (
              <ul className="list-inside list-disc">
                {result.organizations.map((o) => (
                  <li key={o.org_id}>{o.organizations?.name ?? o.org_id} — {o.role}</li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-500">No organization memberships.</p>
            )}
          </div>

          <div>
            <div className="mb-1 font-semibold">Product access</div>
            {result.productAccess && result.productAccess.length > 0 ? (
              <ul className="list-inside list-disc">
                {result.productAccess.map((a) => (
                  <li key={a.product_id}>{a.product_id} — {a.status}</li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-500">No product access grants.</p>
            )}
          </div>

          <div>
            <div className="mb-1 font-semibold">Recent audit trail</div>
            {result.auditTrail && result.auditTrail.length > 0 ? (
              <ul className="space-y-1">
                {result.auditTrail.map((a, i) => (
                  <li key={i} className="text-neutral-600">
                    {a.created_at} — {a.action} ({a.environment}, {a.result})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-500">No recorded audit events for this user.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
