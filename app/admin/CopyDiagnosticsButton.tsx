'use client'

import { useState } from 'react'

// Renders the already-computed, already-secret-stripped payload a server
// component passes in (lib/admin/diagnosticsTiers.ts's buildSafeDiagnosticsCopy)
// -- this component never sees raw diagnostics data, only the safe string.
export function CopyDiagnosticsButton({ payload }: { payload: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      className="rounded-md border px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
      onClick={async () => {
        await navigator.clipboard.writeText(payload)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? 'Copied' : 'Copy safe diagnostics'}
    </button>
  )
}
