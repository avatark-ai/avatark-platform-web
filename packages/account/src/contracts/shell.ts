import type { AccountPrincipal } from './principal.ts'
import type { AccountTabKey } from './tabs.ts'

// AvatarKAccountProps has no URL or Next.js dependency. If activeTab is
// supplied, the component is CONTROLLED -- the host owns the current tab
// entirely and must handle onActiveTabChange to move it forward. If
// activeTab is omitted, the component manages its own internal React
// state, seeded from defaultTab. Neither mode reads or writes a URL.
export interface AvatarKAccountProps {
  principal: AccountPrincipal
  currentProduct: string
  productName: string
  onSignedOut?: () => void
  activeTab?: AccountTabKey
  defaultTab?: AccountTabKey
  onActiveTabChange?: (tab: AccountTabKey) => void
}
