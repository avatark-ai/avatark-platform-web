// Subtle, optional fallback at the bottom of a Canon reader page -- never
// the primary navigation behavior, per the Canon gateway spec. Only rendered
// where a real legacy destination exists (see canonNav.ts/legacyHref).
export function OpenInFullCanon({ href, label = 'Open in the Full Canon' }: { href: string; label?: string }) {
  return (
    <div className="border-t pt-6" style={{ borderColor: 'var(--paper-line)' }}>
      <a
        href={href}
        aria-label={`${label} (opens canon.avatark.ai)`}
        className="link-underline-draw inline-flex items-center gap-1.5 rounded-sm text-sm font-medium transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ color: 'var(--ink-dim)', outlineColor: 'var(--gold)' }}
      >
        {label}
        <span aria-hidden="true">→</span>
      </a>
    </div>
  )
}
