// RC4: a tasteful placeholder for a future professional founder portrait.
// The initials-in-a-circle placeholder below is exactly what gets replaced
// by a real photo later (e.g. a next/image) -- the surrounding row layout
// (image left, name/role/credentials right) doesn't need to change when
// that happens.
function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export function FounderPortrait({ name, role, credentials }: { name: string; role: string; credentials: string }) {
  return (
    <div className="mt-10 flex items-center gap-5 border-t pt-8" style={{ borderColor: 'var(--paper-line)' }}>
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border text-lg font-semibold sm:h-20 sm:w-20"
        style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)', color: 'var(--ink-dim)' }}
        aria-hidden="true"
      >
        {initialsOf(name)}
      </div>
      <div>
        <p className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
          {name}
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-dim)' }}>
          {role}
        </p>
        <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>
          {credentials}
        </p>
      </div>
    </div>
  )
}
