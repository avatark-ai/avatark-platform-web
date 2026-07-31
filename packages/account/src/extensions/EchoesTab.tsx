import { useAccountAdapters } from '../contracts/context.tsx'
import type { AccountEcho } from '../contracts/adapters.ts'

// COMPAT ONLY (see PROVENANCE.md). Preserved unchanged from the forked
// source for API compatibility with hosts still supplying
// `adapters.echoes`. This is PrometheusK/Living-Echo-specific vocabulary
// ("Echoes", "journeys borrowed") and must not be presented as a
// universal Account concept -- new hosts use the generic ExtensionAdapter
// mechanism instead (docs/ACCOUNT_EXTENSION_CONTRACT.md).
export function EchoesTab({ echoes, borrowedCount }: { echoes: AccountEcho[]; borrowedCount: number }) {
  const adapters = useAccountAdapters()
  const drafts = echoes.filter((e) => e.status === 'draft')
  const published = echoes.filter((e) => e.status === 'published')

  if (echoes.length === 0) {
    return (
      <div className="aka-text-center aka-py-10">
        <p className="aka-text-sm aka-text-dim">No authored Echoes yet.</p>
        {adapters.links?.createEchoHref && (
          <a href={adapters.links.createEchoHref} className="aka-cta-button">Create Your Echo →</a>
        )}
      </div>
    )
  }

  return (
    <div className="aka-space-y-2">
      <p className="aka-text-sm aka-text-dim">{drafts.length} draft{drafts.length === 1 ? '' : 's'} · {published.length} published</p>
      {echoes.map((e) => (
        <div key={e.id} className="aka-card aka-flex-between">
          <span style={{ color: 'var(--aka-text-primary,#f5f2ea)' }}>{e.name}</span>
          <span className="aka-text-xs aka-text-dim" style={{ textTransform: 'capitalize' }}>{e.status}</span>
        </div>
      ))}
      {adapters.links?.createEchoHref && (
        <a href={adapters.links.createEchoHref} className="aka-text-center aka-block aka-text-xs" style={{ color: 'var(--aka-accent,#d4af5f)', paddingTop: 8 }}>Continue Authoring →</a>
      )}
      <p className="aka-text-xs aka-text-dim aka-text-center" style={{ paddingTop: 4 }}>{borrowedCount} journey{borrowedCount === 1 ? '' : 's'} borrowed</p>
      {adapters.links?.viewLivingEchoHref && (
        <a href={adapters.links.viewLivingEchoHref} className="aka-text-center aka-block aka-text-xs aka-text-dim">View your Living Echo →</a>
      )}
    </div>
  )
}
