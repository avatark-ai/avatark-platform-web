import { useAccountAdapters } from '../contracts/context.tsx'
import type { ActivityEvent } from '../contracts/adapters.ts'

// COMPAT ONLY (see PROVENANCE.md). Preserved unchanged from the forked
// source for API compatibility with hosts still supplying
// `adapters.activity`. New hosts should register a generic
// ExtensionAdapter (slotId 'activity' or any other id) via
// `adapters.extensions` and let ExtensionTab render it instead.
export function ActivityTab({ events }: { events: ActivityEvent[] }) {
  const adapters = useAccountAdapters()

  if (events.length === 0) {
    return (
      <div className="aka-text-center aka-py-10">
        <p className="aka-text-sm aka-text-dim">No activity yet.</p>
        {adapters.links?.startPracticeHref && (
          <a href={adapters.links.startPracticeHref} className="aka-cta-button">Start a practice →</a>
        )}
      </div>
    )
  }
  return (
    <div className="aka-space-y-2">
      {events.slice(0, 3).map((e) => (
        <div key={e.id} className="aka-card">
          <div className="aka-flex-between">
            <p style={{ color: 'var(--aka-text-primary,#f5f2ea)' }}>{e.summary}</p>
            <p className="aka-text-xs aka-text-dim">{new Date(e.timestamp).toLocaleDateString()}</p>
          </div>
          {e.reflectionPreview && (
            <p className="aka-text-xs aka-text-dim" style={{ fontStyle: 'italic', marginTop: 4 }}>{e.reflectionPreview}</p>
          )}
        </div>
      ))}
      {adapters.links?.activityFullViewHref && (
        <a href={adapters.links.activityFullViewHref} className="aka-text-center aka-block aka-text-xs" style={{ color: 'var(--aka-accent,#d4af5f)', paddingTop: 8 }}>See full Timeline →</a>
      )}
    </div>
  )
}
