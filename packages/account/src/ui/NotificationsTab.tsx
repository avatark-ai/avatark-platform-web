'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { NotificationPreferencesState } from '../contracts/adapters.ts'

// Categorized notification preferences (Part 8) -- explicitly two
// different facts, never conflated: whether the user *wants* a category
// (preference, stored and real) vs. whether delivery infrastructure can
// actually send it yet (deliveryActive, honestly false until a real
// provider exists). Security/account stays mandatory and its toggle is
// always disabled+checked, matching Part 10's security requirement.
export function NotificationsTab() {
  const adapters = useAccountAdapters()
  const [state, setState] = useState<NotificationPreferencesState | null | undefined>(undefined)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    // Deferred to a microtask so nothing runs synchronously within the
    // effect body itself (react-hooks/set-state-in-effect) -- same fix
    // shape as PrivacyTab.tsx.
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      if (!adapters.notifications) { setState(null); return }
      adapters.notifications.get().then((res) => {
        if (!cancelled) setState(res.data ?? null)
      })
    })
    return () => { cancelled = true }
  }, [adapters])

  async function toggle(category: string, enabled: boolean) {
    if (!adapters.notifications || !state) return
    const previous = state
    setState({ ...state, categories: state.categories.map((c) => c.category === category ? { ...c, enabled } : c) })
    setSaving(category)
    const res = await adapters.notifications.updateCategory(category, enabled)
    if (res.error) setState(previous)
    setSaving(null)
  }

  if (state === undefined) return <div className="h-32 bg-[var(--surface,#12121a)] rounded-[10px] animate-pulse" />

  if (!state) {
    return (
      <div className="aka-card p-4">
        <p className="text-sm text-[var(--text-dim,#8b8b98)]">Notification preferences aren&apos;t available for this product.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-md">
      {!state.deliveryActive && (
        <p className="text-xs text-[var(--text-dim,#8b8b98)] px-1">
          Notification delivery infrastructure isn&apos;t active yet — these set your preference for when it is.
        </p>
      )}
      {state.categories.map((c) => (
        <label key={c.category} className="aka-card p-4 flex items-center justify-between">
          <span className="text-sm text-[var(--text-primary,#f5f2ea)]">
            {c.label}
            {c.mandatory && <span className="ml-2 text-[10px] uppercase tracking-widest text-[var(--text-dim,#8b8b98)]">Mandatory</span>}
          </span>
          <input
            type="checkbox"
            checked={c.enabled}
            disabled={c.mandatory || saving === c.category}
            onChange={(e) => toggle(c.category, e.target.checked)}
          />
        </label>
      ))}
    </div>
  )
}
