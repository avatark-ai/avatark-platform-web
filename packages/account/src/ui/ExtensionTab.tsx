import type { ExtensionSlotContent } from '../contracts/adapters.ts'

// Generic, product-neutral renderer for a single registered extension
// slot (docs/ACCOUNT_EXTENSION_CONTRACT.md). Has zero built-in knowledge
// of what any slot represents -- a host's Living Echo, Game
// Profile, CinemaK's Screenings, etc. all render through this same
// component, differing only in the ExtensionSlotContent their adapter
// returns.
export function ExtensionTab({ content }: { content: ExtensionSlotContent }) {
  if (content.items.length === 0) {
    return (
      <div className="aka-text-center aka-py-10">
        <p className="aka-text-sm aka-text-dim">{content.emptyMessage ?? 'Nothing here yet.'}</p>
        {content.emptyActionHref && (
          <a href={content.emptyActionHref} className="aka-cta-button">{content.emptyActionLabel ?? 'Get started →'}</a>
        )}
      </div>
    )
  }
  return (
    <div className="aka-space-y-2">
      {content.items.map((item) => (
        <div key={item.id} className="aka-card">
          {item.href ? (
            <a href={item.href} className="aka-flex-between" style={{ textDecoration: 'none' }}>
              <span style={{ color: 'var(--aka-text-primary,#f5f2ea)' }}>{item.title}</span>
              {item.status && <span className="aka-text-xs aka-text-dim" style={{ textTransform: 'capitalize' }}>{item.status}</span>}
            </a>
          ) : (
            <div className="aka-flex-between">
              <span style={{ color: 'var(--aka-text-primary,#f5f2ea)' }}>{item.title}</span>
              {item.status && <span className="aka-text-xs aka-text-dim" style={{ textTransform: 'capitalize' }}>{item.status}</span>}
            </div>
          )}
          {item.subtitle && (
            <p className="aka-text-xs aka-text-dim" style={{ fontStyle: 'italic', marginTop: 4 }}>{item.subtitle}</p>
          )}
        </div>
      ))}
      {content.footerHref && (
        <a href={content.footerHref} className="aka-text-center aka-block aka-text-xs" style={{ color: 'var(--aka-accent,#d4af5f)', paddingTop: 8 }}>
          {content.footerLabel ?? 'See more →'}
        </a>
      )}
    </div>
  )
}
