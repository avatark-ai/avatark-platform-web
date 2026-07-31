'use client'
import { useState } from 'react'
import type { PlatformStatusRow, PlatformStatusValue } from '@/lib/integrations/platformStatus'

const STATUS_COLOR: Record<PlatformStatusValue, string> = {
  READY: '#4ade80',
  CONFIGURED_UNVERIFIED: '#facc15',
  ADAPTER_MISSING: '#94a3b8',
  BACKEND_UNAVAILABLE: '#f87171',
  NOT_SUPPORTED: '#94a3b8',
  NOT_APPLICABLE: '#64748b',
  ERROR: '#f87171',
}

function StatusPill({ status }: { status: PlatformStatusValue }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: `color-mix(in srgb, ${STATUS_COLOR[status]} 20%, transparent)`, color: STATUS_COLOR[status] }}
    >
      {status}
    </span>
  )
}

function Row({ row }: { row: PlatformStatusRow }) {
  const [showDetail, setShowDetail] = useState(false)
  return (
    <div className="border-t py-3 first:border-t-0" style={{ borderColor: 'var(--surface-line, #333)' }}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <span className="text-sm font-medium">{row.label}</span>
        <div className="flex items-center gap-2">
          <StatusPill status={row.status} />
        </div>
      </div>
      <p className="mt-1 text-xs opacity-70">{row.summary}</p>
      {row.detail && (
        <>
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            className="mt-1 text-xs underline opacity-60 hover:opacity-100"
          >
            {showDetail ? 'Hide technical detail' : 'Show technical detail'}
          </button>
          {showDetail && (
            <pre className="mt-1 overflow-x-auto rounded bg-black/30 p-2 text-xs">{row.detail}</pre>
          )}
        </>
      )}
    </div>
  )
}

export function PlatformStatusClient({ rows }: { rows: PlatformStatusRow[] }) {
  return (
    <div className="mx-auto min-h-full max-w-3xl px-4 py-10">
      <h1 className="text-xl font-semibold">Platform Integration Lab</h1>
      <p className="mt-1 text-sm opacity-70">
        Live runtime status, computed on this request -- never a fabricated READY from an unused type or an empty
        adapter. See <code>docs/ADAPTER_CONFORMANCE_CONTRACTS.md</code> for what each row means.
      </p>
      <div className="mt-6">
        {rows.map((row) => (
          <Row key={row.id} row={row} />
        ))}
      </div>
    </div>
  )
}
