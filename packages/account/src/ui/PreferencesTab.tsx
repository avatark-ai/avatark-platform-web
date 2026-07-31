'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { AccountPreferences } from '../contracts/adapters.ts'

// en-US/en-IN match the frozen locale registry (docs/LOCALE_ARCHITECTURE.md);
// en-GB kept as a third real, shippable English variant. Non-English
// locales are intentionally absent here until they reach `available`
// status -- see @avatark/locale.
const LOCALES = [['en-US', 'English (US)'], ['en-IN', 'English (India)'], ['en-GB', 'English (UK)']]
const TIMEZONES = ['America/Los_Angeles', 'America/New_York', 'Asia/Kolkata', 'Europe/London']

export function PreferencesTab() {
  const adapters = useAccountAdapters()
  const [prefs, setPrefs] = useState<AccountPreferences | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adapters.preferences.get().then((res) => {
      const data = res.data
      if (data && !data.timezone) {
        data.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      }
      setPrefs(data ?? null)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function update(fields: Partial<AccountPreferences>) {
    if (!prefs) return
    setPrefs({ ...prefs, ...fields })
    setSaving(true)
    await adapters.preferences.update(fields)
    setSaving(false)
  }

  if (!prefs) return <div className="h-24 bg-[var(--surface,#12121a)] rounded-[10px] animate-pulse" />

  return (
    <div className="space-y-3 max-w-md">
      <label className="aka-card p-4 flex items-center justify-between">
        <span className="text-sm text-[var(--text-primary,#f5f2ea)]">Theme</span>
        <span className="text-sm text-[var(--text-dim,#8b8b98)]">Dark <span className="text-[10px]">(Light coming soon)</span></span>
      </label>
      <label className="aka-card p-4 flex items-center justify-between">
        <span className="text-sm text-[var(--text-primary,#f5f2ea)]">Locale</span>
        <select value={prefs.locale} onChange={(e) => update({ locale: e.target.value })} className="bg-transparent text-sm text-[var(--text-dim,#8b8b98)]">
          {LOCALES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="aka-card p-4 flex items-center justify-between">
        <span className="text-sm text-[var(--text-primary,#f5f2ea)]">Timezone</span>
        <select value={prefs.timezone ?? ''} onChange={(e) => update({ timezone: e.target.value })} className="bg-transparent text-sm text-[var(--text-dim,#8b8b98)]">
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </label>
      <label className="aka-card p-4 flex items-center justify-between">
        <span className="text-sm text-[var(--text-primary,#f5f2ea)]">Email notifications</span>
        <input type="checkbox" checked={prefs.notificationsEnabled} onChange={(e) => update({ notificationsEnabled: e.target.checked })} />
      </label>
      <p className="text-xs text-[var(--text-dim,#8b8b98)] px-1">Notification delivery infrastructure isn&apos;t active yet — this sets your preference for when it is.</p>
      <label className="aka-card p-4 flex items-center justify-between">
        <span className="text-sm text-[var(--text-primary,#f5f2ea)]">Reduced motion</span>
        <input type="checkbox" checked={prefs.reducedMotion} onChange={(e) => update({ reducedMotion: e.target.checked })} />
      </label>
      <label className="aka-card p-4 flex items-center justify-between">
        <span className="text-sm text-[var(--text-primary,#f5f2ea)]">Default landing page</span>
        <input value={prefs.defaultLandingPage} onChange={(e) => update({ defaultLandingPage: e.target.value })}
          className="bg-transparent text-sm text-[var(--text-dim,#8b8b98)] text-right" />
      </label>
      {saving && <p className="text-xs text-[var(--text-dim,#8b8b98)]">Saving…</p>}
    </div>
  )
}
