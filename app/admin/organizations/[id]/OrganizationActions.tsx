'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

async function postJson(url: string, method: string, body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`)
  return json
}

export function InviteMemberForm({ orgId }: { orgId: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setError(null)
    try {
      await postJson(`/api/admin/organizations/${orgId}/invitations`, 'POST', { email: email.trim(), role })
      setEmail('')
      setStatus('idle')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="invite-email" className="mb-1 block text-xs font-medium text-neutral-600">
          Invite by email
        </label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="invite-role" className="mb-1 block text-xs font-medium text-neutral-600">
          Role
        </label>
        <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
          <option value="member">member</option>
          <option value="admin">admin</option>
          <option value="owner">owner</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={status === 'loading' || !email.trim()}
        className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {status === 'loading' ? 'Inviting…' : 'Send invitation'}
      </button>
      {error && (
        <p className="w-full text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

export function RevokeInvitationButton({ orgId, invitationId }: { orgId: string; invitationId: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')

  async function handleClick() {
    if (!confirm('Revoke this invitation? This cannot be undone.')) return
    setStatus('loading')
    try {
      await postJson(`/api/admin/organizations/${orgId}/invitations/${invitationId}`, 'PATCH', { action: 'revoke' })
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    } finally {
      setStatus('idle')
    }
  }

  return (
    <button onClick={handleClick} disabled={status === 'loading'} className="text-xs font-medium text-red-600 underline disabled:opacity-50">
      Revoke
    </button>
  )
}

export function ChangeMemberRoleSelect({ orgId, userId, currentRole }: { orgId: string; userId: string; currentRole: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const role = e.target.value
    if (role === currentRole) return
    if (!confirm(`Change this member's role to "${role}"?`)) {
      e.target.value = currentRole
      return
    }
    setStatus('loading')
    try {
      await postJson(`/api/admin/organizations/${orgId}/members/${userId}`, 'PATCH', { role })
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
      e.target.value = currentRole
    } finally {
      setStatus('idle')
    }
  }

  return (
    <select
      aria-label="Member role"
      defaultValue={currentRole}
      onChange={handleChange}
      disabled={status === 'loading'}
      className="rounded-md border px-2 py-1 text-xs"
    >
      <option value="member">member</option>
      <option value="admin">admin</option>
      <option value="owner">owner</option>
    </select>
  )
}
