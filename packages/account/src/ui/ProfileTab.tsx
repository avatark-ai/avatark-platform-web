'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { AccountProfile, StatEntry } from '../contracts/adapters.ts'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// `stats` is a host-supplied, generic labeled-value list (no hardcoded
// product-specific metric names -- see PROVENANCE.md).
export function ProfileTab({ stats }: { stats: StatEntry[] }) {
  const adapters = useAccountAdapters()
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [form, setForm] = useState({ displayName: '', bio: '', role: '', avatarUrl: '', organization: '', location: '' })
  const [saveState, setSaveState] = useState<SaveState>('idle')

  useEffect(() => {
    adapters.profile.get().then((res) => {
      if (res.data) {
        setProfile(res.data)
        setForm({
          displayName: res.data.displayName ?? '', bio: res.data.bio ?? '', role: res.data.role ?? '',
          avatarUrl: res.data.avatarUrl ?? '', organization: res.data.organization ?? '', location: res.data.location ?? '',
        })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSave() {
    if (form.avatarUrl) {
      try { new URL(form.avatarUrl) } catch { setSaveState('error'); return }
    }
    setSaveState('saving')
    const res = await adapters.profile.update(form)
    setSaveState(res.error ? 'error' : 'saved')
    if (res.data) setProfile(res.data)
    setTimeout(() => setSaveState('idle'), 2000)
  }

  if (!profile) return <div className="h-32 bg-[var(--surface,#12121a)] rounded-[10px] animate-pulse" />

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="lg:col-span-1">
      <div className="aka-card p-4 space-y-3">
        <div className="w-16 h-16 rounded-full bg-[var(--surface,#12121a)] flex items-center justify-center text-xl text-[var(--text-dim,#8b8b98)] overflow-hidden">
          {form.avatarUrl ? <img src={form.avatarUrl} alt="" className="w-full h-full object-cover" /> : (profile.displayName?.charAt(0) ?? '?')}
        </div>
        <label className="block text-xs text-[var(--text-dim,#8b8b98)]">Display Name
          <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            className="w-full mt-1 rounded-md bg-transparent border border-[#1c1c26] px-3 py-2 text-sm text-[var(--text-primary,#f5f2ea)]" />
        </label>
        <label className="block text-xs text-[var(--text-dim,#8b8b98)]">Avatar image URL
          <input value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} placeholder="https://…"
            className="w-full mt-1 rounded-md bg-transparent border border-[#1c1c26] px-3 py-2 text-sm text-[var(--text-primary,#f5f2ea)]" />
          <span className="text-[10px] text-[var(--text-dim,#8b8b98)]">Direct file upload is a future capability — paste an image URL for now.</span>
        </label>
        <label className="block text-xs text-[var(--text-dim,#8b8b98)]">Bio
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={500} rows={3}
            className="w-full mt-1 rounded-md bg-transparent border border-[#1c1c26] px-3 py-2 text-sm text-[var(--text-primary,#f5f2ea)]" />
        </label>
        <label className="block text-xs text-[var(--text-dim,#8b8b98)]">Role
          <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full mt-1 rounded-md bg-transparent border border-[#1c1c26] px-3 py-2 text-sm text-[var(--text-primary,#f5f2ea)]" />
        </label>
        <label className="block text-xs text-[var(--text-dim,#8b8b98)]">Organization
          <input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })}
            className="w-full mt-1 rounded-md bg-transparent border border-[#1c1c26] px-3 py-2 text-sm text-[var(--text-primary,#f5f2ea)]" />
        </label>
        <label className="block text-xs text-[var(--text-dim,#8b8b98)]">Location (optional)
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full mt-1 rounded-md bg-transparent border border-[#1c1c26] px-3 py-2 text-sm text-[var(--text-primary,#f5f2ea)]" />
        </label>
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
