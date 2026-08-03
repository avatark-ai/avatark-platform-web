// Pure, unit-testable assembly of a SystemInformationSnapshot (mission
// Part 9). Takes already-computed inputs (env, health, package versions,
// org context) rather than performing any I/O itself -- the route handler
// (app/api/account/system-info/route.ts) does every live/service-role call
// and getAdminContext() tier decision, this module only shapes the result.
// Every admin-only field is genuinely `null` at the 'safe' tier here, not
// merely unrendered by the UI -- the server decides visibility, not the
// client (mission's own rule, "client input must not elevate visibility").
import type {
  SystemInformationSnapshot,
  SystemInformationVisibilityTier,
  SystemServiceStatus,
} from '@avatark/account'
import { currentEnvName } from './environment.ts'
import type { SystemHealthSnapshot } from './systemHealth.ts'
import { HIGHEST_BUNDLED_MIGRATION } from './migrationLevel.ts'

const SEVERITY: Record<SystemServiceStatus, number> = { operational: 0, unknown: 1, degraded: 2, unavailable: 3 }
const STATUS_SUMMARY_LABEL: Record<SystemServiceStatus, string> = {
  operational: 'All platform services operational.',
  degraded: 'Some platform services are degraded.',
  unavailable: 'Some platform services are unavailable.',
  unknown: 'Platform service status could not be fully determined.',
}

function worstServiceStatus(health: SystemHealthSnapshot): SystemServiceStatus {
  const values: SystemServiceStatus[] = [
    health.identity, health.account, health.storage, health.capabilities,
    health.invitations, health.organizations, health.audit,
  ]
  return values.reduce((worst, v) => (SEVERITY[v] > SEVERITY[worst] ? v : worst), 'operational' as SystemServiceStatus)
}

export interface BuildSystemInformationInput {
  tier: SystemInformationVisibilityTier
  env: Record<string, string | undefined>
  productId: string
  productName: string
  authProviders: string[]
  currentOrganizationId: string | null
  currentOrganizationName: string | null
  accountPackageVersion: string | null
  authUiPackageVersion: string | null
  health: SystemHealthSnapshot
  packageVersions: Record<string, string>
  registryProductCount: number
  statusUrl: string
  supportUrl: string
  adminUrl: string
}

export function buildSystemInformationSnapshot(input: BuildSystemInformationInput): SystemInformationSnapshot {
  const isAdmin = input.tier === 'admin'
  const commitSha = input.env.VERCEL_GIT_COMMIT_SHA ?? null
  const deploymentId = input.env.VERCEL_DEPLOYMENT_ID ?? input.env.VERCEL_URL ?? null
  const platformOrigin = input.env.NEXT_PUBLIC_PLATFORM_ORIGIN || (input.env.VERCEL_URL ? `https://${input.env.VERCEL_URL}` : null)
  const environmentName = currentEnvName(input.env)
  const worst = worstServiceStatus(input.health)
  // Same imperfect-but-consistent convention as app/admin/page.tsx's own
  // databaseLabel -- a real Supabase project id isn't safely derivable
  // from any env var this app has, so this names the environment tier the
  // database serves, not the project itself.
  const supabaseProjectLabel = environmentName === 'production' ? 'avatark-prod' : environmentName === 'local' ? 'avatark-local' : 'avatark-test'
  const registryDescription = `${input.registryProductCount} product${input.registryProductCount === 1 ? '' : 's'} loaded`

  return {
    visibilityTier: input.tier,
    environment: environmentName,
    productId: input.productId,
    productName: input.productName,

    appVersion: input.env.NEXT_PUBLIC_RELEASE_VERSION ?? null,
    buildDate: input.env.NEXT_PUBLIC_BUILD_TIME ?? null,
    deploymentIdShort: deploymentId ? deploymentId.slice(0, 12) : null,
    authProviders: input.authProviders,
    currentOrganizationId: isAdmin ? input.currentOrganizationId : null,
    currentOrganizationName: input.currentOrganizationName,
    accountPackageVersion: input.accountPackageVersion,
    authUiPackageVersion: input.authUiPackageVersion,
    registryVersion: registryDescription,
    platformStatusSummary: STATUS_SUMMARY_LABEL[worst],
    storageAvailability: input.health.storage,
    capabilityServiceAvailability: input.health.capabilities,
    invitationServiceAvailability: input.health.invitations,
    statusUrl: input.statusUrl,
    supportUrl: input.supportUrl,

    vercelEnvironment: isAdmin ? (input.env.VERCEL_ENV ?? null) : null,
    commitShaShort: isAdmin && commitSha ? commitSha.slice(0, 7) : null,
    buildTimestamp: isAdmin ? (input.env.NEXT_PUBLIC_BUILD_TIME ?? null) : null,
    supabaseProjectLabel: isAdmin ? supabaseProjectLabel : null,
    migrationLevel: isAdmin ? HIGHEST_BUNDLED_MIGRATION : null,
    services: isAdmin
      ? {
          identity: input.health.identity, account: input.health.account, storage: input.health.storage,
          capabilities: input.health.capabilities, invitations: input.health.invitations,
          organizations: input.health.organizations, audit: input.health.audit,
        }
      : null,
    callbackOrigin: isAdmin ? (platformOrigin ? `${platformOrigin}/auth/callback` : null) : null,
    currentSiteOrigin: isAdmin ? platformOrigin : null,
    packageVersions: isAdmin ? input.packageVersions : null,
    registryRevision: isAdmin ? `${registryDescription} (no semantic registry version exists yet)` : null,
    lastHealthCheckAt: isAdmin ? input.health.checkedAt : null,
    adminUrl: isAdmin ? input.adminUrl : null,
  }
}
