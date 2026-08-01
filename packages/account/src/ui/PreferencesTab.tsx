'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { AccountPreferences } from '../contracts/adapters.ts'

const TIMEZONES = ['America/Los_Angeles', 'America/New_York', 'Asia/Kolkata', 'Europe/London']

// Notification enablement itself lives in the Notifications section
// (categorized, RC1.1 Part 8) -- this tab no longer has its own separate
// undifferentiated checkbox for it.
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

  // Falls back to a single safe default when a host hasn't supplied a real
  // registry yet -- never a hardcoded list of options this package can't
  // vouch for.
  const appearanceModes = prefs.availableAppearanceModes ?? [{ value: 'dark', label: 'Dark' }]
  const locales = prefs.availableLocales ?? [{ value: prefs.locale, label: prefs.locale }]
  const landingDestinations = prefs.availableLandingDestinations ?? [{ value: prefs.defaultLandingPage, label: prefs.defaultLandingPage }]

  return (
    <div className="space-y-3 max-w-md">
      <label className="aka-card p-4 flex items-center justify-between">
        <span className="text-sm text-[var(--text-primary,#f5f2ea)]">Appearance</span>
        <select value={prefs.theme} onChange={(e) => update({ theme: e.target.value })} className="bg-transparent text-sm text-[var(--text-dim,#8b8b98)]">
          {appearanceModes.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </label>
      <label className="aka-card p-4 flex items-center justify-between">
        <span className="text-sm text-[var(--text-primary,#f5f2ea)]">Locale</span>
        <select value={prefs.locale} onChange={(e) => update({ locale: e.target.value })} className="bg-transparent text-sm text-[var(--text-dim,#8b8b98)]">
          {locales.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </label>
      <label className="aka-card p-4 flex items-center justify-between">
        <span className="text-sm text-[var(--text-primary,#f5f2ea)]">Timezone</span>
        <select value={prefs.timezone ?? ''} onChange={(e) => update({ timezone: e.target.value })} className="bg-transparent text-sm text-[var(--text-dim,#8b8b98)]">
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </label>
      <label className="aka-card p-4 flex items-center justify-between">
        <span className="text-sm text-[var(--text-primary,#f5f2ea)]">Reduced motion</span>
        <input type="checkbox" checked={prefs.reducedMotion} onChange={(e) => update({ reducedMotion: e.target.checked })} />
      </label>
      <label className="aka-card p-4 flex items-center justify-between">
        <span className="text-sm text-[var(--text-primary,#f5f2ea)]">Default landing page</span>
        <select value={prefs.defaultLandingPage} onChange={(e) => update({ defaultLandingPage: e.target.value })} className="bg-transparent text-sm text-[var(--text-dim,#8b8b98)]">
          {landingDestinations.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </label>
      {saving && <p className="text-xs text-[var(--text-dim,#8b8b98)]">Saving…</p>}
    </div>
  )
}
