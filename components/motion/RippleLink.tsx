'use client'

import Link from 'next/link'
import { useRef } from 'react'

// RIPPLE -- a plain <Link> with one added behavior: on pointerdown, drop
// a span at the pointer position and let the CSS animation (globals.css
// .motion-ripple-span) expand/fade it, then remove the span once the
// animation ends. Requires `relative overflow-hidden` on the trigger
// itself so the ripple is clipped to the button's own bounds, which this
// component supplies -- callers just pass their existing className for
// color/spacing/etc. on top.
export function RippleLink({
  href,
  className = '',
  style,
  children,
  ...rest
}: React.ComponentProps<typeof Link>) {
  const ref = useRef<HTMLAnchorElement>(null)

  function handlePointerDown(event: React.PointerEvent<HTMLAnchorElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2
    const span = document.createElement('span')
    span.className = 'motion-ripple-span'
    span.style.width = `${size}px`
    span.style.height = `${size}px`
    span.style.left = `${event.clientX - rect.left - size / 2}px`
    span.style.top = `${event.clientY - rect.top - size / 2}px`
    el.appendChild(span)
    span.addEventListener('animationend', () => span.remove())
  }

  return (
    <Link
      ref={ref}
      href={href}
      className={`relative overflow-hidden ${className}`}
      style={style}
      onPointerDown={handlePointerDown}
      {...rest}
    >
      {children}
    </Link>
  )
}
