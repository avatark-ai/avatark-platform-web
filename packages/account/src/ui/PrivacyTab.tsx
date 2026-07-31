'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { PrivacySettings, PlatformPrivacySettings, PrivacyControlDefinition } from '../contracts/adapters.ts'

const PROFILE_VISIBILITY_OPTIONS: PlatformPrivacySettings['profileVisibility'][] = ['private', 'unlisted', 'public']

// Universal PlatformPrivacySettings render unconditionally; anything
// product-specific (e.g. a host's own domain-specific visibility settings) flows
// through the fully generic productControls[] list -- rendered
// mechanically (a labeled toggle or select) with zero built-in knowledge
// of what any control means. The forked source additionally hardcoded a
// product-specific "published item visibility" section directly in
// this tab (taking an `echoes` prop); that has been removed here --
// a product's own migration guide (docs/migrations/)
// exposes equivalent per-item visibility through its own productControls
// or extension slot instead.
export function PrivacyTab() {
  const adapters = useAccountAdapters()
  const [settings, setSettings] = useState<PrivacySettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    if (!adapters.privacy) { setLoading(false); return }
    setLoading(true)
    setError(null)
    adapters.privacy.get().then((res) => {
      if (res.error) { setError(res.error); setLoading(false); return }
      setSettings(res.data ?? null)
      setLoading(false)
    })
  }

  useEffect(() => {
    // Deferred to a microtask so nothing runs synchronously within the
    // effect body itself (react-hooks/set-state-in-effect) -- same fix
    // shape as app/account/page.tsx's AccountClientGate: every setState
    // call happens from within a callback, never directly in the effect's
    // own call stack, which is what actually avoids a cascading
    // synchronous render, not just the lint rule.
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) load()
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function updatePlatform(fields: Partial<PlatformPrivacySettings>) {
    if (!settings) return
    const previous = settings
    setSettings({ ...settings, platform: { ...settings.platform, ...fields } })
    const res = await adapters.privacy?.updatePlatform(fields)
    if (res?.error) {
      setSettings(previous)
      setError(res.error)
    }
  }

  async function updateProductControl(id: string, value: boolean | string) {
    if (!settings?.productControls) return
    const previous = settings
    setSettings({
      ...settings,
      productControls: settings.productControls.map(c => c.id === id ? { ...c, value } : c),
    })
    const res = await adapters.privacy?.updateProductControl(id, value)
    if (res?.error) {
      setSettings(previous)
      setError(res.error)
    }
  }

  return (
    <div className="aka-space-y-3">
      {error && (
        <div className="aka-card" role="alert" style={{ borderColor: 'var(--aka-error,#e5484d)' }}>
          <p className="aka-text-sm" style={{ color: 'var(--aka-error,#e5484d)' }}>
            Couldn&apos;t load your privacy settings: {error}
          </p>
          <button onClick={load} className="aka-text-sm" style={{ color: 'var(--aka-accent,#d4af5f)', marginTop: 8 }}>
            Try again
          </button>
        </div>
      )}

      {loading && !error && (
        <div className="aka-card" aria-busy="true">
          <p className="aka-text-sm" style={{ color: 'var(--aka-text-dim,#8b8b98)' }}>Loading…</p>
        </div>
      )}

      {settings && (
        <>
          <label className="aka-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--aka-text-primary,#f5f2ea)' }}>Profile visibility</span>
            <select
              value={settings.platform.profileVisibility}
              onChange={(e) => updatePlatform({ profileVisibility: e.target.value as PlatformPrivacySettings['profileVisibility'] })}
              style={{ background: 'transparent', color: 'var(--aka-text-dim,#8b8b98)', textTransform: 'capitalize' }}
            >
              {PROFILE_VISIBILITY_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="aka-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--aka-text-primary,#f5f2ea)' }}>Discoverable by others</span>
            <input type="checkbox" checked={settings.platform.discoverable} onChange={(e) => updatePlatform({ discoverable: e.target.checked })} />
          </label>
          <label className="aka-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--aka-text-primary,#f5f2ea)' }}>Product communications</span>
            <input type="checkbox" checked={settings.platform.productCommunicationsEnabled} onChange={(e) => updatePlatform({ productCommunicationsEnabled: e.target.checked })} />
          </label>
          <label className="aka-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--aka-text-primary,#f5f2ea)' }}>Personalization</span>
            <input type="checkbox" checked={settings.platform.personalizationEnabled} onChange={(e) => updatePlatform({ personalizationEnabled: e.target.checked })} />
          </label>
          <label className="aka-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--aka-text-primary,#f5f2ea)' }}>Analytics</span>
            <input type="checkbox" checked={settings.platform.analyticsEnabled} onChange={(e) => updatePlatform({ analyticsEnabled: e.target.checked })} />
          </label>

          {settings.productControls && settings.productControls.length > 0 && (
            <div className="aka-card">
              <p className="aka-section-title" style={{ marginBottom: 8 }}>Product-specific privacy</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {settings.productControls.map((control: PrivacyControlDefinition) => (
                  <div key={control.id}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--aka-text-primary,#f5f2ea)' }}>{control.label}</span>
                      {control.type === 'boolean' ? (
                        <input
                          type="checkbox"
                          checked={control.value as boolean}
                          onChange={(e) => updateProductControl(control.id, e.target.checked)}
                        />
                      ) : (
                        <select
                          value={control.value as string}
                          onChange={(e) => updateProductControl(control.id, e.target.value)}
                          style={{ background: 'transparent', color: 'var(--aka-text-dim,#8b8b98)' }}
                        >
                          {(control.options ?? []).map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                    </label>
                    {control.description && (
                      <p className="aka-text-xs aka-text-dim" style={{ marginTop: 2 }}>{control.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!adapters.privacy && !loading && (
        <div className="aka-card">
          <p className="aka-text-sm" style={{ color: 'var(--aka-text-dim,#8b8b98)' }}>Privacy settings aren&apos;t available for this product.</p>
        </div>
      )}
    </div>
  )
}
