'use client'

import { useRef } from 'react'

// Local departure side of the cross-product transition contract (see
// docs/motion-transition-contract.md) -- for links that leave this app
// entirely, to a sibling AvatarK product on its own domain (PrometheusK,
// ArenaK, StreamK, CinemaK, GameK, SetpointK, Atlas, StudioK). Destination-
// side behavior is out of scope here (those are separate repositories);
// this only implements what a well-behaved departure looks like from the
// AvatarK side of the handoff:
//
//   1. user activates the CTA
//   2. the button/focal mark responds (a localized RIPPLE, same primitive
//      as RippleLink)
//   3. one short, fixed cue plays (DEPARTURE_DELAY_MS)
//   4. navigation proceeds -- promptly, never so delayed it feels broken
//
// Standard browser behavior is preserved for anything that isn't a plain
// left-click: modifier keys, middle-click, and target="_blank" all bypass
// the cue entirely and navigate immediately, exactly like a normal <a>.
// Reduced-motion also bypasses the delay -- there's no reason to hold up
// navigation for a cue that isn't going to play.
const DEPARTURE_DELAY_MS = 180

export function DepartureLink({
  href,
  className = '',
  style,
  children,
  onClick,
  ...rest
}: React.ComponentPropsWithoutRef<'a'>) {
  const ref = useRef<HTMLAnchorElement>(null)

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (!href || rest.target === '_blank') return
    // Middle-click, ctrl/cmd/shift/alt-click (open in new tab/window) --
    // never intercept; a departure cue on the CURRENT tab makes no sense
    // when the destination is opening somewhere else.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return // let the plain <a> navigate immediately

    event.preventDefault()

    const el = ref.current
    if (el) {
      const rect = el.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height) * 2
      const span = document.createElement('span')
      span.className = 'motion-ripple-span'
      span.style.width = `${size}px`
      span.style.height = `${size}px`
      span.style.left = `${event.clientX - rect.left - size / 2}px`
      span.style.top = `${event.clientY - rect.top - size / 2}px`
      el.appendChild(span)
    }

    window.setTimeout(() => {
      window.location.href = href
    }, DEPARTURE_DELAY_MS)
  }

  return (
    <a
      ref={ref}
      href={href}
      className={`relative overflow-hidden ${className}`}
      style={style}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </a>
  )
}
