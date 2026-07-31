"use client"

import { useState, type ReactNode } from "react"

export interface NotificationBellProps {
  unreadCount: number
  children?: ReactNode
  className?: string
}

// Headless bell + dropdown shell -- carries only open/closed state.
// `children` is the dropdown's content, entirely host-supplied (no
// @avatark/notifications data fetching happens here). Not wired into any
// application yet.
export function NotificationBell({ unreadCount, children, className }: NotificationBellProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={className} data-avatark-component="notification-bell">
      <button
        type="button"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        onClick={() => setOpen((value) => !value)}
      >
        <span data-avatark-part="unread-count">{unreadCount}</span>
      </button>
      {open && <div data-avatark-part="notification-panel">{children}</div>}
    </div>
  )
}
