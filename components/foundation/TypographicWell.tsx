// AVK-UNIFICATION-03B/03C: neutral image well used wherever cleared media does not exist yet
// (MEDIA-CLEARANCE-MATRIX M-01, M-05..07 NOT CLEARED). A hairline horizon plus an optional approved
// label in small caps; decorative, so aria-hidden. Never a photo, never VANAM, never generated art.
export function TypographicWell({
  label,
  className,
  background = 'var(--paper)',
  testId,
}: {
  label?: string
  className: string
  background?: string
  testId?: string
}) {
  return (
    <div
      aria-hidden="true"
      data-testid={testId}
      className={`relative flex w-full items-end justify-center border-b pb-6 ${className}`}
      style={{ borderColor: 'var(--paper-line)', background }}
    >
      <div className="absolute inset-x-8 top-1/2 h-px" style={{ background: 'var(--paper-line)' }} />
      {label && (
        <span className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--ink-dim)' }}>
          {label}
        </span>
      )}
    </div>
  )
}
