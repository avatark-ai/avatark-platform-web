"use client"

import { useState, type ReactNode } from "react"

export interface AvatarMenuProps {
  displayName: string
  email?: string
  onSignOut: () => void
  /** Extra host-supplied menu items (e.g. an "Account" link), rendered above Sign Out. */
  children?: ReactNode
  className?: string
}

// Headless avatar/identity dropdown shell -- carries only open/closed
// state, per the same pattern as this repo's existing (unmigrated)
// EchoAvatarMenu, generalized so any product could use it. Not wired into
// any application yet.
export function AvatarMenu({ displayName, email, onSignOut, children, className }: AvatarMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={className} data-avatark-component="avatar-menu">
      <button type="button" aria-expanded={open} aria-label={`Account menu for ${displayName}`} onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
      </button>
      {open && (
        <div data-avatark-part="menu-panel">
          <div data-avatark-part="menu-identity">
            <span data-avatark-part="display-name">{displayName}</span>
            {email && <span data-avatark-part="email">{email}</span>}
          </div>
          {children}
          <button type="button" data-avatark-part="sign-out" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
