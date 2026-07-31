"use client"

import type { ReactNode } from "react"

export interface AccountDrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

// Generic drawer shell -- no animation/positioning opinion (unlike
// @avatark/motion's real transition components, this is layout-agnostic;
// a host wires its own open/close transition on top). Not wired into any
// application yet.
export function AccountDrawer({ open, onClose, title, children, className }: AccountDrawerProps) {
  if (!open) return null

  return (
    <div className={className} data-avatark-component="account-drawer" role="dialog" aria-modal="true">
      <div data-avatark-part="drawer-header">
        {title && <span data-avatark-part="drawer-title">{title}</span>}
        <button type="button" data-avatark-part="drawer-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <div data-avatark-part="drawer-body">{children}</div>
    </div>
  )
}
