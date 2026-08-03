'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { AvatarKAccountProps } from '../contracts/shell.ts'
import type { ActivityEvent, AccountEcho, ExtensionSlotContent, StatEntry } from '../contracts/adapters.ts'
import { AccountHeader } from './AccountHeader.tsx'
import { AccountTabs } from './AccountTabs.tsx'
import { type AccountTabKey, type CoreTabKey, type ExtensionTabKey, extensionTabKey, isExtensionTabKey } from '../contracts/tabs.ts'
import { ProfileTab } from './ProfileTab.tsx'
import { SignInMethodsTab } from './SignInMethodsTab.tsx'
import { ProductsTab } from './ProductsTab.tsx'
import { AccessTab } from './AccessTab.tsx'
import { MembershipTab } from './MembershipTab.tsx'
import { OrganizationsTab } from './OrganizationsTab.tsx'
import { PreferencesTab } from './PreferencesTab.tsx'
import { NotificationsTab } from './NotificationsTab.tsx'
import { PrivacyTab } from './PrivacyTab.tsx'
import { DataExportTab } from './DataExportTab.tsx'
import { SystemInformationTab } from './SystemInformationTab.tsx'
import { ExtensionTab } from './ExtensionTab.tsx'
import { ActivityTab } from '../extensions/ActivityTab.tsx'
import { EchoesTab } from '../extensions/EchoesTab.tsx'

// Canonical account shell. Unlike the forked source, product-specific
// sections are never hardcoded core tabs -- they arrive entirely through
// `adapters.extensions` (generic, rendered by ExtensionTab) or, for
// backward compatibility, the deprecated `adapters.activity`/
// `adapters.echoes` single-purpose adapters (rendered by the legacy
// ActivityTab/EchoesTab in ../extensions/). See
// docs/ACCOUNT_EXTENSION_CONTRACT.md. Feedback/Support sections are
// intentionally NOT part of this shell -- the host composes them
// alongside the tab strip, matching this repo's own existing
// app/account/page.tsx pattern (docs/CANONICAL_ACCOUNT_SHELL.md).
export function AvatarKAccount({ principal, currentProduct, productName, onSignedOut, activeTab, defaultTab, onActiveTabChange }: AvatarKAccountProps) {
  const adapters = useAccountAdapters()
  // Accepted for API compatibility with the forked shell props but not
  // yet rendered -- AccountHeader renders `currentProduct` (the id), not
  // this display name. Kept rather than removed, per "preserve the
  // existing public API initially."
  void productName

  // Canonical rail order (RC1.1, Part 2). access/organizations/notifications
  // are optional, same graceful-omission pattern as the pre-existing
  // privacy — a host that hasn't supplied the adapter simply doesn't get
  // the tab, never a broken/empty one.
  const CORE_TAB_ORDER: CoreTabKey[] = ['profile', 'products', 'access', 'membership', 'organizations', 'preferences', 'notifications', 'privacy', 'signin', 'systemInformation', 'data']
  const CORE_TAB_AVAILABLE: Record<CoreTabKey, boolean> = {
    profile: true, products: true, membership: true, preferences: true, signin: true, data: true,
    access: !!adapters.access, organizations: !!adapters.organizations, notifications: !!adapters.notifications, privacy: !!adapters.privacy,
    systemInformation: !!adapters.systemInformation,
  }
  const visibleCoreTabs: CoreTabKey[] = CORE_TAB_ORDER.filter((k) => CORE_TAB_AVAILABLE[k])

  const extensionTabs = useMemo(() => {
    const tabs: { key: ExtensionTabKey; label: string }[] = []
    for (const ext of adapters.extensions ?? []) {
      tabs.push({ key: extensionTabKey(ext.slotId), label: ext.label })
    }
    if (adapters.activity && !tabs.some(t => t.key === extensionTabKey('activity'))) {
      tabs.push({ key: extensionTabKey('activity'), label: 'Activity' })
    }
    if (adapters.echoes && !tabs.some(t => t.key === extensionTabKey('echoes'))) {
      tabs.push({ key: extensionTabKey('echoes'), label: 'Echoes' })
    }
    return tabs
  }, [adapters.extensions, adapters.activity, adapters.echoes])

  const visibleTabs: AccountTabKey[] = [...visibleCoreTabs, ...extensionTabs.map(t => t.key)]

  function fallbackTab(): AccountTabKey {
    return visibleTabs[0] ?? 'profile'
  }

  function resolveTab(requested: AccountTabKey | undefined): AccountTabKey {
    if (requested && visibleTabs.includes(requested)) return requested
    return fallbackTab()
  }

  const isControlled = activeTab !== undefined
  const [internalTab, setInternalTab] = useState<AccountTabKey>(() => resolveTab(defaultTab))

  // `tab` is resolved fresh every render (falls back to a visible tab if
  // `internalTab`/`activeTab` no longer names one -- e.g. an extension
  // disappeared), so nothing needs to write that correction back into
  // state: every render already renders the valid, resolved tab. Writing
  // it back via an effect would only cause an avoidable extra render pass
  // (react-hooks/set-state-in-effect).
  const rawTab = isControlled ? activeTab! : internalTab
  const tab = resolveTab(rawTab)

  function setTab(next: AccountTabKey) {
    const resolved = resolveTab(next)
    if (!isControlled) setInternalTab(resolved)
    onActiveTabChange?.(resolved)
  }

  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [echoes, setEchoes] = useState<AccountEcho[]>([])
  const [extensionContent, setExtensionContent] = useState<Record<string, ExtensionSlotContent>>({})
  const [memberSince, setMemberSince] = useState<string | null>(null)

  useEffect(() => {
    if (principal.status !== 'signed_in') return
    adapters.activity?.getRecent().then((res) => setEvents(res.data?.events ?? []))
    adapters.echoes?.listOwn().then((res) => setEchoes(res.data ?? []))
    adapters.profile.get().then((res) => setMemberSince(res.data?.createdAt ?? null))
    for (const ext of adapters.extensions ?? []) {
      ext.get().then((res) => {
        if (res.data) setExtensionContent((prev) => ({ ...prev, [ext.slotId]: res.data! }))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principal.status])

  async function handleSignOut() {
    await adapters.auth.signOut()
    onSignedOut?.()
  }

  if (principal.status === 'loading') {
    return <div className="aka-px-4 aka-py-8 aka-text-sm aka-text-dim">Loading…</div>
  }
  if (principal.status === 'signed_out') {
    return <div className="aka-px-4 aka-py-8 aka-text-sm aka-text-dim">Not signed in.</div>
  }

  // Generic, honest usage stats -- no hardcoded product metric names.
  // Every entry traces to a real adapter response, never fabricated.
  const stats: StatEntry[] = []
  if (adapters.activity) {
    stats.push({ key: 'activity_events', label: 'Activity', value: events.length })
    const borrowed = events.filter((e) => e.source === 'borrowed').length
    if (borrowed > 0) stats.push({ key: 'borrowed', label: 'Borrowed', value: borrowed })
  }
  if (adapters.echoes) {
    stats.push({ key: 'echoes_published', label: 'Published', value: echoes.filter((e) => e.status === 'published').length })
    stats.push({ key: 'echoes_draft', label: 'Draft', value: echoes.filter((e) => e.status === 'draft').length })
  }
  for (const ext of adapters.extensions ?? []) {
    const content = extensionContent[ext.slotId]
    if (content) stats.push({ key: ext.slotId, label: ext.label, value: content.items.length })
  }

  return (
    <div className="aka-max-w-account aka-mx-auto aka-px-4 aka-py-8">
      <AccountHeader displayName={principal.displayName} email={principal.email} memberSince={null} currentProduct={currentProduct} />
      <AccountTabs active={tab} onChange={setTab} visibleTabs={visibleCoreTabs} extensionLabels={extensionTabs} />

      {tab === 'profile' && <ProfileTab stats={stats} />}
      {tab === 'signin' && <SignInMethodsTab email={principal.email} onSignOut={handleSignOut} />}
      {tab === 'products' && <ProductsTab currentProduct={currentProduct} />}
      {tab === 'access' && <AccessTab currentProduct={currentProduct} />}
      {tab === 'membership' && <MembershipTab stats={stats} currentProduct={currentProduct} memberSince={memberSince} />}
      {tab === 'organizations' && <OrganizationsTab />}
      {tab === 'preferences' && <PreferencesTab />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'privacy' && <PrivacyTab />}
      {tab === 'systemInformation' && <SystemInformationTab />}
      {tab === 'data' && <DataExportTab />}
      {isExtensionTabKey(tab) && tab === extensionTabKey('activity') && adapters.activity && <ActivityTab events={events} />}
      {isExtensionTabKey(tab) && tab === extensionTabKey('echoes') && adapters.echoes && (
        <EchoesTab echoes={echoes} borrowedCount={events.filter((e) => e.source === 'borrowed').length} />
      )}
      {isExtensionTabKey(tab) && (adapters.extensions ?? []).map((ext) => (
        tab === extensionTabKey(ext.slotId) && extensionContent[ext.slotId] && (
          <ExtensionTab key={ext.slotId} content={extensionContent[ext.slotId]} />
        )
      ))}
    </div>
  )
}
