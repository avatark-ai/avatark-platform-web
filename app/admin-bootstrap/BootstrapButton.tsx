'use client'

import { useState } from 'react'

export function BootstrapButton() {
  const [state, setState] = useState<{ status: 'idle' | 'pending' | 'ok' | 'error'; message?: string }>({
    status: 'idle',
  })

  async function claim() {
    setState({ status: 'pending' })
    try {
      const res = await fetch('/api/admin/bootstrap', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState({ status: 'error', message: body.error ?? `Request failed (${res.status})` })
        return
      }
      setState({ status: 'ok' })
    } catch {
      setState({ status: 'error', message: 'Network error.' })
    }
  }

  if (state.status === 'ok') {
    return (
      <p className="mt-6 text-sm text-green-700" role="status">
        Platform Admin granted. <a href="/admin" className="underline">Go to /admin</a>.
      </p>
    )
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={claim}
        disabled={state.status === 'pending'}
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {state.status === 'pending' ? 'Claiming…' : 'Claim Platform Admin'}
      </button>
      {state.status === 'error' && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </div>
  )
}
