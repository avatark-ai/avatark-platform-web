'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { AccountLocation, AccountProfile, SelectOption, StatEntry } from '../contracts/adapters.ts'
import { ACCOUNT_ROLE_OPTIONS } from '../contracts/adapters.ts'
import { COUNTRY_OPTIONS, getCitiesForState, getStatesForCountry, guessTimezone } from '../data/geography.ts'
import { SearchableSelect } from './internal/SearchableSelect.tsx'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface LocationForm { countryCode: string; countryName: string; stateCode: string; stateName: string; city: string; timezone: string }
const EMPTY_LOCATION: LocationForm = { countryCode: '', countryName: '', stateCode: '', stateName: '', city: '', timezone: '' }

function locationToForm(loc: AccountLocation | null): LocationForm {
  if (!loc) return EMPTY_LOCATION
  return {
    countryCode: loc.countryCode ?? '', countryName: loc.countryName ?? '',
    stateCode: loc.stateCode ?? '', stateName: loc.stateName ?? '',
    city: loc.city ?? '', timezone: loc.timezone ?? '',
  }
}

function formToLocation(loc: LocationForm): AccountLocation | null {
  if (!loc.countryCode && !loc.countryName && !loc.stateCode && !loc.stateName && !loc.city && !loc.timezone) return null
  return {
    countryCode: loc.countryCode || null, countryName: loc.countryName || null,
    stateCode: loc.stateCode || null, stateName: loc.stateName || null,
    city: loc.city || null, timezone: loc.timezone || null,
  }
}

// Best-effort suggestions only -- the select always shows the form's
// current value even if it falls outside this base list (see
// timezoneOptions below), so a guessed or previously-saved value is never
// silently dropped.
const BASE_TIMEZONES = [
  'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York', 'America/Anchorage',
  'America/Phoenix', 'America/Boise', 'America/Detroit', 'America/Indiana/Indianapolis', 'Pacific/Honolulu',
  'America/Toronto', 'Asia/Kolkata', 'Australia/Sydney', 'Europe/London',
]

const MAX_AVATAR_BYTES = 5 * 1024 * 1024

// `stats` is a host-supplied, generic labeled-value list (no hardcoded
// product-specific metric names -- see PROVENANCE.md).
export function ProfileTab({ stats }: { stats: StatEntry[] }) {
  const adapters = useAccountAdapters()
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [form, setForm] = useState({ displayName: '', bio: '', role: '', avatarUrl: '', organization: '', location: EMPTY_LOCATION })
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    adapters.profile.get().then((res) => {
      if (res.data) {
        setProfile(res.data)
        setForm({
          displayName: res.data.displayName ?? '', bio: res.data.bio ?? '', role: res.data.role ?? '',
          avatarUrl: res.data.avatarUrl ?? '', organization: res.data.organization ?? '',
          location: locationToForm(res.data.location),
        })
      }
    })
    // Organization autocomplete is scoped to the signed-in user's own
    // memberships (already RLS-safe, already loaded elsewhere) -- not a new
    // "list every platform organization" query, which would need new authz
    // design this pass explicitly avoids. Typing a name not listed here is
    // still accepted (SearchableSelect's allowFreeText mode below).
    adapters.organizations?.get().then((res) => {
      const names = Array.from(new Set((res.data?.memberships ?? []).map((m) => m.organizationName)))
      setOrgOptions(names.map((n) => ({ value: n, label: n })))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSave() {
    if (form.avatarUrl) {
      try { new URL(form.avatarUrl) } catch { setSaveState('error'); return }
    }
    setSaveState('saving')
    const res = await adapters.profile.update({
      displayName: form.displayName, bio: form.bio, role: form.role || null,
      avatarUrl: form.avatarUrl || null, organization: form.organization || null,
      location: formToLocation(form.location),
    })
    setSaveState(res.error ? 'error' : 'saved')
    if (res.data) setProfile(res.data)
    setTimeout(() => setSaveState('idle'), 2000)
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !adapters.profile.uploadAvatar) return
    if (!file.type.startsWith('image/')) { setUploadError('Please choose an image file'); return }
    if (file.size > MAX_AVATAR_BYTES) { setUploadError('Image must be 5MB or smaller'); return }
    setUploadError(null)
    setUploading(true)
    const uploadRes = await adapters.profile.uploadAvatar(file)
    if (uploadRes.error || !uploadRes.data) {
      setUploadError(uploadRes.error ?? 'Upload failed')
      setUploading(false)
      return
    }
    setForm((f) => ({ ...f, avatarUrl: uploadRes.data!.avatarUrl }))
    const saveRes = await adapters.profile.update({ avatarUrl: uploadRes.data.avatarUrl })
    if (saveRes.data) setProfile(saveRes.data)
    setUploading(false)
  }

  async function handleRemoveAvatar() {
    setUploading(true)
    setUploadError(null)
    await adapters.profile.removeAvatar?.()
    const saveRes = await adapters.profile.update({ avatarUrl: null })
    if (saveRes.data) setProfile(saveRes.data)
    setForm((f) => ({ ...f, avatarUrl: '' }))
    setUploading(false)
  }

  function handleCountryChange(code: string) {
    const country = COUNTRY_OPTIONS.find((c) => c.value === code)
    setForm((f) => ({
      ...f,
      location: {
        countryCode: code, countryName: country?.label ?? '',
        stateCode: '', stateName: '', city: '',
        timezone: f.location.timezone || guessTimezone(code, null) || '',
      },
    }))
  }

  function handleStateSelect(code: string) {
    const states = getStatesForCountry(form.location.countryCode) ?? []
    const state = states.find((s) => s.value === code)
    setForm((f) => ({
      ...f,
      location: {
        ...f.location, stateCode: code, stateName: state?.label ?? '', city: '',
        timezone: guessTimezone(f.location.countryCode, code) || f.location.timezone,
      },
    }))
  }

  function handleStateFreeText(name: string) {
    setForm((f) => ({ ...f, location: { ...f.location, stateCode: '', stateName: name, city: '' } }))
  }

  function handleCityChange(name: string) {
    setForm((f) => ({ ...f, location: { ...f.location, city: name } }))
  }

  if (!profile) return <div className="h-32 bg-[var(--surface,#12121a)] rounded-[10px] animate-pulse" />

  // Preserve (never silently drop) a legacy free-text role value that
  // predates this dropdown -- shown as an extra option, not re-savable as
  // free text going forward.
  const roleOptions: SelectOption[] = !profile.role || ACCOUNT_ROLE_OPTIONS.some((o) => o.value === profile.role)
    ? ACCOUNT_ROLE_OPTIONS
    : [...ACCOUNT_ROLE_OPTIONS, { value: profile.role, label: profile.role }]

  const stateOptions = getStatesForCountry(form.location.countryCode)
  const cityOptions = getCitiesForState(form.location.countryCode, form.location.stateCode)
  const timezoneOptions = form.location.timezone && !BASE_TIMEZONES.includes(form.location.timezone)
    ? [...BASE_TIMEZONES, form.location.timezone]
    : BASE_TIMEZONES

  const canUpload = Boolean(adapters.profile.uploadAvatar)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="lg:col-span-1">
      <div className="aka-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-[var(--surface,#12121a)] flex items-center justify-center text-xl text-[var(--text-dim,#8b8b98)] overflow-hidden flex-shrink-0">
            {form.avatarUrl ? <img src={form.avatarUrl} alt="" className="w-full h-full object-cover" /> : (profile.displayName?.charAt(0) ?? '?')}
          </div>
          {canUpload && (
            <div className="flex flex-col gap-1">
              <div className="flex gap-3 items-center">
                <label className="text-sm text-[var(--gold,#d4af5f)] cursor-pointer">
                  {form.avatarUrl ? 'Replace' : 'Upload'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileSelected} disabled={uploading} />
                </label>
                {form.avatarUrl && (
                  <button type="button" onClick={handleRemoveAvatar} disabled={uploading} className="text-sm text-red-400 disabled:opacity-50">
                    Remove
                  </button>
                )}
              </div>
              {uploading && <span className="text-xs text-[var(--text-dim,#8b8b98)]">Uploading…</span>}
              {uploadError && <span className="text-xs text-red-400" role="alert">{uploadError}</span>}
            </div>
          )}
        </div>
        {canUpload ? (
          <details className="text-xs text-[var(--text-dim,#8b8b98)]">
            <summary className="cursor-pointer text-[var(--gold,#d4af5f)]">Paste an image URL instead (advanced)</summary>
            <input value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} placeholder="https://…"
              className="w-full mt-2 rounded-md bg-transparent border border-[#1c1c26] px-3 py-2 text-sm text-[var(--text-primary,#f5f2ea)]" />
          </details>
        ) : (
          <label className="block text-xs text-[var(--text-dim,#8b8b98)]">Avatar image URL
            <input value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} placeholder="https://…"
              className="w-full mt-1 rounded-md bg-transparent border border-[#1c1c26] px-3 py-2 text-sm text-[var(--text-primary,#f5f2ea)]" />
          </label>
        )}
        <label className="block text-xs text-[var(--text-dim,#8b8b98)]">Display Name
          <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            className="w-full mt-1 rounded-md bg-transparent border border-[#1c1c26] px-3 py-2 text-sm text-[var(--text-primary,#f5f2ea)]" />
        </label>
        <label className="block text-xs text-[var(--text-dim,#8b8b98)]">Bio
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={500} rows={3}
            className="w-full mt-1 rounded-md bg-transparent border border-[#1c1c26] px-3 py-2 text-sm text-[var(--text-primary,#f5f2ea)]" />
        </label>
        <label className="block text-xs text-[var(--text-dim,#8b8b98)]">Role
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full mt-1 rounded-md bg-transparent border border-[#1c1c26] px-3 py-2 text-sm text-[var(--text-primary,#f5f2ea)]">
            <option value="">Select a role</option>
            {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="block text-xs text-[var(--text-dim,#8b8b98)]">Organization
          <SearchableSelect value={form.organization} onChange={(v) => setForm({ ...form, organization: v })} options={orgOptions} allowFreeText placeholder="Organization" />
        </label>

        <div className="space-y-2 pt-1">
          <p className="text-xs text-[var(--text-dim,#8b8b98)]">Location (optional)</p>
          <label className="block text-[11px] text-[var(--text-dim,#8b8b98)]">Country
            <SearchableSelect value={form.location.countryCode} onChange={handleCountryChange} options={COUNTRY_OPTIONS} placeholder="Search countries…" />
          </label>
          <label className="block text-[11px] text-[var(--text-dim,#8b8b98)]">State / Province
            {stateOptions ? (
              <SearchableSelect value={form.location.stateCode} onChange={handleStateSelect} options={stateOptions} placeholder="Search states…" disabled={!form.location.countryCode} />
            ) : (
              <input value={form.location.stateName} onChange={(e) => handleStateFreeText(e.target.value)} disabled={!form.location.countryCode}
                className="w-full mt-1 rounded-md bg-transparent border border-[#1c1c26] px-3 py-2 text-sm text-[var(--text-primary,#f5f2ea)] disabled:opacity-50" />
            )}
          </label>
          <label className="block text-[11px] text-[var(--text-dim,#8b8b98)]">City
            {cityOptions ? (
              <SearchableSelect value={form.location.city} onChange={handleCityChange} options={cityOptions} placeholder="Search cities…" />
            ) : (
              <input value={form.location.city} onChange={(e) => handleCityChange(e.target.value)}
                className="w-full mt-1 rounded-md bg-transparent border border-[#1c1c26] px-3 py-2 text-sm text-[var(--text-primary,#f5f2ea)]" />
            )}
          </label>
          <label className="block text-[11px] text-[var(--text-dim,#8b8b98)]">Timezone
            <select value={form.location.timezone} onChange={(e) => setForm((f) => ({ ...f, location: { ...f.location, timezone: e.target.value } }))}
              className="w-full mt-1 bg-transparent border border-[#1c1c26] rounded-md px-3 py-2 text-sm text-[var(--text-dim,#8b8b98)]">
              <option value="">Not set</option>
              {timezoneOptions.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </label>
        </div>

        <button onClick={handleSave} disabled={saveState === 'saving'}
          className="rounded-md bg-[var(--gold,#d4af5f)] px-5 py-2 text-sm font-semibold text-[#0a0a0f] disabled:opacity-50">
          {saveState === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {saveState === 'saved' && <span className="ml-3 text-xs text-green-400">Saved</span>}
        {saveState === 'error' && <span className="ml-3 text-xs text-red-400">Save failed — try again</span>}
      </div>
      </div>

      <div className="lg:col-span-1 space-y-4">
      <div className="aka-card p-4 space-y-1 text-xs text-[var(--text-dim,#8b8b98)]">
        <p>Primary email: <span className="text-[var(--text-primary,#f5f2ea)]">{profile.email}</span></p>
        <p>Member since: <span className="text-[var(--text-primary,#f5f2ea)]">{new Date(profile.createdAt).toLocaleDateString()}</span></p>
        <details>
          <summary className="cursor-pointer">Account ID (technical)</summary>
          <p className="mt-1 font-mono text-[10px]">{profile.id}</p>
        </details>
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.key} className="aka-card p-4">
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-dim,#8b8b98)]">{s.label}</p>
              <p className="text-lg font-semibold text-[var(--text-primary,#f5f2ea)] mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
