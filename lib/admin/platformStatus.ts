// Platform status contract (AvatarK Identity RC1, Part 15).
//
// Every status here is derived from the same static configuration-presence
// checks environment.ts/authDiagnostics.ts/emailDiagnostics.ts already
// perform -- there is no network probe, no live health check, and no
// database round-trip in this file. That is a deliberate, mission-required
// constraint: "Do not fabricate health checks. Static configuration checks
// must not be labeled live operational checks." Callers must not present
// this as uptime monitoring.
import type { AuthDiagnostics } from './authDiagnostics'
import type { EmailDiagnostics } from './emailDiagnostics'
import type { EnvironmentStatus } from './environment'

export type PlatformStatusValue = 'operational' | 'degraded' | 'unavailable' | 'not_configured' | 'unknown'

export type PlatformStatusItem =
  | 'identity'
  | 'google_oauth'
  | 'magic_link'
  | 'account'
  | 'product_registry'
  | 'invitations'
  | 'notifications'

export interface PlatformStatusEntry {
  item: PlatformStatusItem
  status: PlatformStatusValue
  // Always true here -- this contract never reports a live check. Kept
  // explicit on the entry itself so consumers can't accidentally strip the
  // caveat when they serialize/display it.
  basis: 'static_configuration_check'
  detail: string
}

export interface PlatformStatusInputs {
  environment: EnvironmentStatus
  auth: AuthDiagnostics
  email: EmailDiagnostics
  accountMountEnabled: boolean
  productRegistryProductCount: number
  invitationsConfigured: boolean
}

export function computePlatformStatus(inputs: PlatformStatusInputs): PlatformStatusEntry[] {
  const entries: PlatformStatusEntry[] = []

  entries.push({
    item: 'identity',
    basis: 'static_configuration_check',
    status: inputs.environment.state === 'healthy' ? 'operational' : inputs.environment.state === 'misconfigured' ? 'unavailable' : 'unknown',
    detail: inputs.environment.detail,
  })

  entries.push({
    item: 'google_oauth',
    basis: 'static_configuration_check',
    status: !inputs.auth.googleOAuthEnabled
      ? 'not_configured'
      : inputs.auth.googleOAuthCredentialsConfigured === 'configured'
        ? 'operational'
        : 'unknown',
    detail: !inputs.auth.googleOAuthEnabled
      ? 'Google OAuth provider is disabled for this environment.'
      : 'Google OAuth flag is enabled; provider credentials cannot be verified from this environment (Supabase dashboard is authoritative).',
  })

  entries.push({
    item: 'magic_link',
    basis: 'static_configuration_check',
    status:
      inputs.auth.supabaseUrl === 'configured' && inputs.auth.supabaseAnonKey === 'configured'
        ? 'operational'
        : 'unavailable',
    detail: 'Magic-link sign-in is unconditional code, gated only by Supabase URL/anon-key presence.',
  })

  entries.push({
    item: 'account',
    basis: 'static_configuration_check',
    status: inputs.accountMountEnabled
      ? inputs.environment.state === 'healthy'
        ? 'operational'
        : 'degraded'
      : 'not_configured',
    detail: inputs.accountMountEnabled
      ? 'NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED is true.'
      : 'NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED is not true -- the account surface is not mounted in this environment.',
  })

  entries.push({
    item: 'product_registry',
    basis: 'static_configuration_check',
    status: inputs.productRegistryProductCount > 0 ? 'operational' : 'unavailable',
    detail: `${inputs.productRegistryProductCount} product(s) present in the registry.`,
  })

  entries.push({
    item: 'invitations',
    basis: 'static_configuration_check',
    status: inputs.invitationsConfigured ? 'operational' : 'unknown',
    detail: inputs.invitationsConfigured
      ? 'Invitation contract dependencies are present.'
      : 'Invitation dependency presence could not be determined from this environment.',
  })

  entries.push({
    item: 'notifications',
    basis: 'static_configuration_check',
    status: 'not_configured',
    detail: 'Notifications remain a contract-only package -- no delivery engine exists yet in this ecosystem (per packages/notifications).',
  })

  return entries
}

const STATUS_SEVERITY: Record<PlatformStatusValue, number> = {
  operational: 0,
  not_configured: 1,
  unknown: 2,
  degraded: 3,
  unavailable: 4,
}

// Worst-of-all-statuses rollup for a single consumer-facing indicator.
// 'not_configured' is intentionally not worse than 'unknown' -- an item
// that is honestly turned off is a better signal than one that can't be
// verified at all.
export function worstPlatformStatus(entries: PlatformStatusEntry[]): PlatformStatusValue {
  if (entries.length === 0) return 'unknown'
  return entries.reduce<PlatformStatusValue>((worst, entry) => (
    STATUS_SEVERITY[entry.status] > STATUS_SEVERITY[worst] ? entry.status : worst
  ), 'operational')
}
