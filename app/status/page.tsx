// Consumer-tier platform status indicator (AvatarK Identity RC1, Part 15).
// Public, unauthenticated -- shows only the worst-of-all-statuses rollup and
// a generic label, never the per-item detail that lib/admin/platformStatus.ts
// computes (that detailed view is protected, see app/admin/page.tsx).
import { computeEnvironmentHealth } from '@/lib/admin/environment'
import { computeAuthDiagnostics } from '@/lib/admin/authDiagnostics'
import { computeEmailDiagnostics } from '@/lib/admin/emailDiagnostics'
import { computePlatformStatus, worstPlatformStatus, type PlatformStatusValue } from '@/lib/admin/platformStatus'
import { PRODUCT_REGISTRY } from '@avatark/product-registry'

const STATUS_LABEL: Record<PlatformStatusValue, string> = {
  operational: 'All systems operational',
  degraded: 'Degraded — some functionality may be limited',
  unavailable: 'Currently unavailable',
  not_configured: 'Some features are not configured in this environment',
  unknown: 'Status unknown',
}

export default function PlatformStatusPage() {
  const environment = computeEnvironmentHealth(process.env)[0]
  const auth = computeAuthDiagnostics(process.env)
  const email = computeEmailDiagnostics(process.env)
  const entries = computePlatformStatus({
    environment,
    auth,
    email,
    accountMountEnabled: process.env.NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED === 'true',
    productRegistryProductCount: PRODUCT_REGISTRY.length,
    invitationsConfigured: true,
  })
  const worst = worstPlatformStatus(entries)

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-wide text-neutral-500">AvatarK Platform Status</p>
      <p className="mt-2 text-lg font-semibold">{STATUS_LABEL[worst]}</p>
      <p className="mt-4 text-xs text-neutral-500">
        This is a static configuration check, not a live uptime monitor. Detailed per-system status is available to
        platform operators only.
      </p>
    </div>
  )
}
