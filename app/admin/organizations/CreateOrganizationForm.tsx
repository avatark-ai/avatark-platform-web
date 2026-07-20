'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CreateOrganizationForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setStatus('loading')
    setError(null)
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? `Failed (${res.status})`)
        setStatus('error')
        return
      }
      setName('')
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
        <label htmlFor="new-org-name" className="mb-1 block text-xs font-medium text-neutral-600">
          New organization name
        </label>
        <input
          id="new-org-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Inc."
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'loading' || !name.trim()}
        className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {status === 'loading' ? 'Creating…' : 'Create organization'}
      </button>
      {error && (
        <p className="w-full text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
