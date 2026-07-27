// Reusable platform-position trail -- "AvatarK > Echo > {Product}". Built
// as its own component (rather than inlined into GrowthEngineCard) so any
// future product surface in the platform can render the same trail; the
// caller always supplies the full trail array rather than this component
// hardcoding "AvatarK"/"Echo" as fixed leading steps, since a later screen
// one level deeper (e.g. AvatarK > Echo > GameK > FlowK) still just passes
// a longer array, not a different API.
export function PlatformBreadcrumb({ trail }: { trail: string[] }) {
  return (
    <nav aria-label="Platform journey" className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
      {trail.map((step, index) => {
        const isLast = index === trail.length - 1
        return (
          <span key={step} className="flex items-center gap-1.5">
            <span aria-current={isLast ? 'page' : undefined} style={{ color: isLast ? 'var(--ink)' : 'var(--ink-dim)' }}>
              {step}
            </span>
            {!isLast && (
              <span aria-hidden="true" style={{ color: 'var(--paper-line)' }}>
                ›
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
