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
        {/* Never render a bare "0" -- a visible digit only appears once there's
            something to report. A host without a real unread count (or a real
            icon in its own CSS) should not have to guard against this itself. */}
        {unreadCount > 0 && <span data-avatark-part="unread-count" aria-hidden="true">{unreadCount}</span>}
        <span data-avatark-part="unread-count-sr" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
          {unreadCount > 0 ? `${unreadCount} unread notifications` : "No unread notifications"}
        </span>
      </button>
      {open && <div data-avatark-part="notification-panel">{children}</div>}
    </div>
  )
}
