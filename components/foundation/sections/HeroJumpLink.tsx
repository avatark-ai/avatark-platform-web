'use client'

// AVK-UNIFICATION-03B: the hero's in-page "Explore AvatarK" action. A plain fragment link (works
// without JavaScript); with JavaScript it also moves focus to the target section so keyboard and
// screen-reader users land in #experiences, not just the viewport. Scrolling is the browser's
// default jump -- no smooth scroll is added (reduced-motion safe by construction).
export function HeroJumpLink({
  targetId,
  className,
  style,
  children,
}: {
  targetId: string
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <a
      href={`#${targetId}`}
      className={className}
      style={style}
      onClick={() => {
        // Let the default fragment navigation run, then move focus without re-scrolling.
        requestAnimationFrame(() => document.getElementById(targetId)?.focus({ preventScroll: true }))
      }}
    >
      {children}
    </a>
  )
}
