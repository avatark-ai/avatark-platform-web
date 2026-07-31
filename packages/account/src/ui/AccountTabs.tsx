import { Tabs } from './internal/Tabs.tsx'
import { ACCOUNT_TAB_LABELS, type AccountTabKey, type CoreTabKey, type ExtensionTabKey } from '../contracts/tabs.ts'

export function AccountTabs({
  active, onChange, visibleTabs, extensionLabels,
}: {
  active: AccountTabKey
  onChange: (k: AccountTabKey) => void
  visibleTabs?: CoreTabKey[]
  /** Extra, host-supplied tabs for registered extension slots, appended after core tabs. */
  extensionLabels?: { key: ExtensionTabKey; label: string }[]
}) {
  const coreLabels = visibleTabs
    ? ACCOUNT_TAB_LABELS.filter(t => visibleTabs.includes(t.key))
    : ACCOUNT_TAB_LABELS
  const labels: { key: AccountTabKey; label: string }[] = [...coreLabels, ...(extensionLabels ?? [])]
  return <Tabs tabs={labels} active={active} onChange={onChange} />
}
