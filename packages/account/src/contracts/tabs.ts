// Fixed core sections every host gets. Unlike the forked source (which
// hardcoded 'activity'/'echoes' as static core tab keys), product-specific
// sections are dynamic extension-slot tabs (`ext:${slotId}`) added at
// render time by AvatarKAccount from `adapters.extensions` — see
// docs/ACCOUNT_EXTENSION_CONTRACT.md. 'signin' is labelled "Security" to
// match the mission's canonical section name while keeping the original
// key for adapter/URL compatibility.
export type CoreTabKey =
  | 'profile' | 'signin' | 'products' | 'membership'
  | 'preferences' | 'privacy' | 'data'

export type ExtensionTabKey = `ext:${string}`

export type AccountTabKey = CoreTabKey | ExtensionTabKey

export const ACCOUNT_TAB_KEYS: CoreTabKey[] = ['profile', 'signin', 'products', 'membership', 'preferences', 'privacy', 'data']

export const ACCOUNT_TAB_LABELS: { key: CoreTabKey; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'signin', label: 'Security' },
  { key: 'products', label: 'Products' },
  { key: 'membership', label: 'Membership' },
  { key: 'preferences', label: 'Preferences' },
  { key: 'privacy', label: 'Privacy' },
  { key: 'data', label: 'Data & Export' },
]

export function extensionTabKey(slotId: string): ExtensionTabKey {
  return `ext:${slotId}`
}

export function isExtensionTabKey(key: AccountTabKey): key is ExtensionTabKey {
  return key.startsWith('ext:')
}
