// Three-tier diagnostics visibility contract (AvatarK Identity RC1, Part 14).
//
// Layers on top of the existing single admin/non-admin check in authz.ts
// without replacing it -- getAdminContext() still answers "is this user an
// admin" for existing app/admin/** callers unchanged. This module answers
// the narrower question "which diagnostics tier may this user see", and
// defaults to the lowest tier (consumer) whenever that can't be determined,
// per the mission's default-deny requirement for privileged surfaces.
import type { AdminContext } from './authz'

export type DiagnosticsTier = 'consumer' | 'developer' | 'platform_operations'

// Consumer-safe fields only: never anything from the developer/platform-ops
// payload below. No product/env/version/region/flag data belongs here.
export interface ConsumerDiagnostics {
  signedIn: boolean
  connectedMethod: 'google' | 'magic_link' | 'none'
  currentProduct: string
  systemStatus: 'operational' | 'degraded' | 'unavailable'
}

// Safe metadata only -- every field here is presence/label/summary data,
// never a secret value. Composed from the existing environment.ts /
// authDiagnostics.ts / emailDiagnostics.ts outputs, not reimplemented.
export interface DeveloperDiagnostics {
  product: string
  environment: 'local' | 'test' | 'preview' | 'production'
  releaseVersion: string
  commitSha: string | null
  buildTime: string | null
  databaseLabel: string
  region: string | null
  providerEnablement: Record<string, boolean>
  packageVersions: Record<string, string>
  registryVersion: string
  statusSummary: string
  safeReturnRoute: string
  currentOrganization: string | null
  membershipRoleCapabilitySummary: string
  featureFlags: string[]
}

/**
 * Resolves which diagnostics tier a session may see.
 * - null/no admin context => consumer (default deny for the rest)
 * - admin context with role 'admin' => platform_operations (today's only
 *   privileged role; a future finer-grained 'developer' role can be added
 *   to platform_roles without changing this function's shape)
 */
export function resolveDiagnosticsTier(admin: AdminContext | null): DiagnosticsTier {
  if (!admin) return 'consumer'
  if (admin.role === 'admin') return 'platform_operations'
  if (admin.role === 'developer') return 'developer'
  return 'consumer'
}

export function tierIncludes(tier: DiagnosticsTier, required: DiagnosticsTier): boolean {
  const order: DiagnosticsTier[] = ['consumer', 'developer', 'platform_operations']
  return order.indexOf(tier) >= order.indexOf(required)
}

// Secret-shaped-value guard used by the redaction test and by
// buildSafeDiagnosticsCopy below. Matches by key name and by value shape
// (JWT-looking strings, postgres/service-role URLs) so a value doesn't leak
// even if it ends up under an unexpected key.
const SECRET_KEY_PATTERN = /token|secret|refresh|cookie|jwt|service.?role|password|key$/i
const SECRET_VALUE_PATTERN = /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+|postgres(?:ql)?:\/\/[^\s]+|sk_[a-zA-Z0-9]+|service_role/i

export function isSecretShaped(key: string, value: unknown): boolean {
  if (SECRET_KEY_PATTERN.test(key)) return true
  return typeof value === 'string' && SECRET_VALUE_PATTERN.test(value)
}

/**
 * "Copy safe diagnostics" -- takes developer/platform-ops data (plus any
 * extra fields a caller merges in) and returns a JSON string with every
 * secret-shaped key/value stripped, regardless of what the caller passed.
 * This is a defense-in-depth allowlist filter, not a trust-the-input pass-through.
 */
export function buildSafeDiagnosticsCopy(data: Record<string, unknown>): string {
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (isSecretShaped(key, value)) continue
    safe[key] = value
  }
  return JSON.stringify(safe, null, 2)
}
