// Fixed core sections every host gets. Unlike the forked source (which
// hardcoded 'activity'/'echoes' as static core tab keys), product-specific
// sections are dynamic extension-slot tabs (`ext:${slotId}`) added at
// render time by AvatarKAccount from `adapters.extensions` — see
// docs/ACCOUNT_EXTENSION_CONTRACT.md. 'signin' is labelled "Security" to
// match the mission's canonical section name while keeping the original
// key for adapter/URL compatibility.
// Order matches the mission's canonical account rail (RC1.1, Part 2):
// Profile, Products, Access, Membership, Organizations, Preferences,
// Notifications, Privacy, Security, Data & Export. 'access'/
// 'organizations'/'notifications' are new, optional tabs (Parts 5/7/8) --
// see AvatarKAccount.tsx for the adapter-presence gating that keeps them
// out of REQUIRED_TABS. 'livingWorlds' (Platform RC, Phase 2) is the same
// kind of optional, adapter-gated tab -- a platform-level concept, not a
// product-specific one, so it lives alongside organizations/notifications
// rather than as an extension slot. 'systemInformation' is labelled
// "Platform Health" (Platform RC, Phase 6) while keeping its original key
// for adapter/URL compatibility, same precedent as 'signin' → "Security".
export type CoreTabKey =
  | 'profile' | 'products' | 'access' | 'membership' | 'organizations' | 'livingWorlds'
  | 'preferences' | 'notifications' | 'privacy' | 'signin' | 'systemInformation' | 'data'

export type ExtensionTabKey = `ext:${string}`

export type AccountTabKey = CoreTabKey | ExtensionTabKey

export const ACCOUNT_TAB_KEYS: CoreTabKey[] = [
  'profile', 'products', 'access', 'membership', 'organizations', 'livingWorlds',
  'preferences', 'notifications', 'privacy', 'signin', 'systemInformation', 'data',
]

export const ACCOUNT_TAB_LABELS: { key: CoreTabKey; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'products', label: 'Products' },
  { key: 'access', label: 'Access' },
  { key: 'membership', label: 'Membership' },
  { key: 'organizations', label: 'Organizations' },
  { key: 'livingWorlds', label: 'Living Worlds' },
  { key: 'preferences', label: 'Preferences' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'privacy', label: 'Privacy' },
  { key: 'signin', label: 'Security' },
  { key: 'systemInformation', label: 'Platform Health' },
  { key: 'data', label: 'Data & Export' },
]

export function extensionTabKey(slotId: string): ExtensionTabKey {
  return `ext:${slotId}`
}

export function isExtensionTabKey(key: AccountTabKey): key is ExtensionTabKey {
  return key.startsWith('ext:')
}
