'use client'
import { useAccountAdapters } from '../contracts/context.tsx'

// Fixed real leak found during import: the forked source hardcoded
// "Contact prometheus@avatark.ai" in the delete-account copy below,
// bypassing the AccountSupportConfig adapter that already exists for
// exactly this purpose (the same class of bug SignInMethodsTab's support
// link had already been fixed for upstream). Now uses
// adapters.support.supportEmail like every other tab.
export function DataExportTab() {
  const adapters = useAccountAdapters()

  return (
    <div className="space-y-2">
      <button onClick={() => adapters.export.exportFullAccount()} className="aka-card w-full p-4 text-left hover:border-[var(--gold,#d4af5f)]/50 transition-colors">
        <span className="text-sm text-[var(--text-primary,#f5f2ea)]">Export full account (JSON)</span>
        <p className="text-xs text-[var(--text-dim,#8b8b98)] mt-0.5">Profile, preferences, and product activity</p>
      </button>
      <button onClick={() => adapters.export.exportActivityCsv()} className="aka-card w-full p-4 text-left hover:border-[var(--gold,#d4af5f)]/50 transition-colors">
        <span className="text-sm text-[var(--text-primary,#f5f2ea)]">Export activity (CSV)</span>
      </button>
      {adapters.export.exportSecondaryCsv && (
        <button onClick={() => adapters.export.exportSecondaryCsv!.run()} className="aka-card w-full p-4 text-left hover:border-[var(--gold,#d4af5f)]/50 transition-colors">
          <span className="text-sm text-[var(--text-primary,#f5f2ea)]">{adapters.export.exportSecondaryCsv.label}</span>
        </button>
      )}
      <div className="aka-card p-4 flex items-center justify-between opacity-60">
        <div>
          <p className="text-sm text-[var(--text-primary,#f5f2ea)]">Delete Account</p>
          <p className="text-xs text-[var(--text-dim,#8b8b98)] mt-0.5">
            Account deletion requires a verified support workflow. Contact{' '}
            <a href={`mailto:${adapters.support.supportEmail}?subject=Account deletion request`} className="underline">
              {adapters.support.supportEmail}
            </a>{' '}to request deletion.
          </p>
        </div>
      </div>
    </div>
  )
}
