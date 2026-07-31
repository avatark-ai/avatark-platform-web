// Typed product identity configuration contract (AvatarK Identity RC1, Part 4).
//
// This is the "safe customization" layer a consuming product's sign-in/return
// experience is built from. It deliberately does NOT let a product supply
// arbitrary callback URLs or arbitrary HTML -- `allowedLocalRoutePrefixes` is
// an allowlist of same-origin path prefixes, and `defaultReturnPath` must
// itself satisfy that allowlist (enforced by `validateProductIdentityConfig`).
//
// This file does not replace `AvatarKProduct` (registry.ts/types.ts) -- it
// reads from it. `deploymentStatus`/`accessState` below are this mission's
// vocabulary; the pre-existing `status`/`integrationStatus`/`visibility`
// fields on `AvatarKProduct` are untouched (see "Status vocabulary
// reconciliation" in docs/IDENTITY_PRODUCT_CONFIG.md for why).

import type { AvatarKProduct, IntegrationStatus } from './types.ts'
import { PRODUCT_REGISTRY } from './registry.ts'

/** Mission vocabulary: "is this product's own production deployment reachable on the public internet today?" Derived from `domain !== null` -- CinemaK.ai and SetpointK.ai are both live on DNS today even though their platform *integration* is not. */
export type DeploymentStatus = 'live' | 'not_deployed'

/** Mission vocabulary, derived from the registry's pre-existing `IntegrationStatus`. Collapsed to two values because the mission's own examples (CinemaK, SetpointK) only ever distinguish "fully wired to shared identity" from "not yet." */
export type MissionIntegrationStatus = 'live' | 'pending_shared_identity'

/**
 * Mission vocabulary: whether an ordinary signed-in user can actually reach
 * this product's experience today. This is a genuinely new axis -- nothing
 * in `AvatarKProduct` models it -- so it is hand-authored per product below,
 * not derived. Never conflate with `deploymentStatus`: a product can be
 * `deploymentStatus: 'live'` (DNS reachable) while still being
 * `accessState: 'entitlement_and_consent_required'` (SetpointK) or
 * `'entitlement_dependent'` (CinemaK) -- deployment existing is not the same
 * as an arbitrary signed-in user being allowed in.
 */
export type ProductAccessState = 'available' | 'entitlement_dependent' | 'entitlement_and_consent_required'

export interface ProductIdentityConfig {
  productId: string
  productName: string
  /** Render slot for the product's wordmark. `assetSlot: true` once a real logo/wordmark asset exists (see `AvatarKProduct.logo`, null for every product today); until then, consumers render `text`. */
  wordmark: { text: string; assetSlot: boolean }
  /** Semantic accent token name, not a raw color -- the actual color is `AvatarKProduct.accentColor`, kept as the single source of truth (see Part 7, appearance/theme workstream, for how this token resolves). */
  accentToken: string
  /** The exact canonical sentence shown as "product return context" on the sign-in screen. */
  signInContext: string
  /** Safe local route the user lands on after sign-in when no more specific `return` was requested. Must satisfy `allowedLocalRoutePrefixes`. */
  defaultReturnPath: string
  /** Allowlist of same-origin path prefixes this product's sign-in flow may ever return a user to. Arbitrary/external/absolute URLs are never valid regardless of this list -- see `validateProductIdentityConfig`. */
  allowedLocalRoutePrefixes: string[]
  /** One short, consumer-facing sentence. Never a deployment/legal guarantee -- see Part 13's "policy-dependent, not invented" rule. */
  privacyNote: string
  /** Shown on the signed-out sign-in screen footer. */
  signedOutSupportLinks: { label: string; href: string }[]
  /** Ids only -- the extension *mechanism* (slot rendering, adapter contract) is owned by the account-shell workstream (Part 5/10), not this file. */
  accountExtensionRegistrations: string[]
  deploymentStatus: DeploymentStatus
  integrationStatus: MissionIntegrationStatus
  accessState: ProductAccessState
}

const MISSION_INTEGRATION_STATUS_ALIAS: Record<IntegrationStatus, MissionIntegrationStatus> = {
  live: 'live',
  preview: 'pending_shared_identity',
  'coming-online': 'pending_shared_identity',
  'in-development': 'pending_shared_identity',
  vision: 'pending_shared_identity',
}

/** `status`/`visibility` are deliberately NOT read here -- deploymentStatus is DNS reachability only, so a product can be `status: 'alpha'` + `visibility: 'internal'` (CinemaK, SetpointK) and still be `deploymentStatus: 'live'`. */
export function deploymentStatusOf(product: Pick<AvatarKProduct, 'domain'>): DeploymentStatus {
  return product.domain !== null ? 'live' : 'not_deployed'
}

export function integrationStatusOf(product: Pick<AvatarKProduct, 'integrationStatus'>): MissionIntegrationStatus {
  return MISSION_INTEGRATION_STATUS_ALIAS[product.integrationStatus ?? 'vision']
}

const SIGN_IN_CONTEXT: Record<string, string> = {
  avatark: 'You are signing in directly to AvatarK, the home of your identity across the ecosystem.',
  prometheusk: 'You will return to PrometheusK, where your practices and Living Echo live.',
  gamek: 'You will return to GameK when sign-in is complete.',
  arenak: 'You will return to ArenaK to continue your invitation, event, or challenge.',
  streamk: 'You will return to StreamK to continue watching.',
  cinemak: 'You will return to CinemaK to continue your cinematic experience.',
  studiok: 'You will return to StudioK to continue creating.',
  atlas: 'You will return to Atlas to continue your project or research.',
  setpointk: 'You will return to SetpointK to continue with your authorized physiological data experience.',
}

const DEFAULT_RETURN_PATH: Record<string, string> = {
  avatark: '/account',
  prometheusk: '/',
  gamek: '/',
  arenak: '/',
  streamk: '/',
  cinemak: '/',
  studiok: '/',
  atlas: '/',
  setpointk: '/',
}

const ALLOWED_ROUTE_PREFIXES: Record<string, string[]> = {
  avatark: ['/account', '/start', '/journey'],
  prometheusk: ['/', '/practices', '/echo'],
  gamek: ['/', '/flowk', '/pathk', '/geometrik', '/chroniclek', '/journey'],
  arenak: ['/', '/invitations', '/challenges', '/events'],
  streamk: ['/', '/watch'],
  cinemak: ['/', '/watch', '/premieres'],
  studiok: ['/', '/workspaces'],
  atlas: ['/', '/projects'],
  setpointk: ['/', '/spi'],
}

const PRIVACY_NOTE: Record<string, string> = {
  avatark: 'Your identity is shared across the AvatarK ecosystem; each product still controls what it shows you within it.',
  prometheusk: 'Your practices and Living Echo are private to you unless you choose to share them.',
  gamek: 'Signing in does not share your game progress with other products beyond confirmed platform integrations.',
  arenak: 'Signing in does not grant access to challenges, cohorts, or recognition you have not been invited to or earned.',
  streamk: 'Signing in does not grant access to content you are not entitled to watch.',
  cinemak: 'Signing in does not grant access to premieres, screenings, or industry-only content you have not been invited to.',
  studiok: 'Signing in does not grant access to another creator’s workspace or unpublished work.',
  atlas: 'Signing in does not grant access to research or projects you have not been given access to.',
  setpointk:
    'Signing in never implies permission to view another person’s physiological or health-adjacent data. Access requires explicit entitlement and consent.',
}

const ACCOUNT_EXTENSION_REGISTRATIONS: Record<string, string[]> = {
  avatark: [],
  prometheusk: ['living-echo', 'practice-activity', 'authoring', 'borrowed-practices'],
  gamek: ['game-profile', 'navigator', 'world-progress'],
  arenak: ['invitations', 'challenges', 'events', 'recognition', 'organizer-access'],
  streamk: ['watch-history', 'saved-stories', 'playback-preferences', 'publisher-access'],
  cinemak: [
    'watch-history',
    'saved-films',
    'premieres',
    'screenings-and-invitations',
    'festival-industry-access',
    'contributor-credits',
    'production-distribution-rights',
  ],
  studiok: ['creator-access', 'workspaces', 'collaborators', 'publishing-rights'],
  atlas: ['projects', 'sources', 'research-access'],
  setpointk: [
    'physiological-profile',
    'spi',
    'connected-data-sources',
    'measurements-and-biomarkers',
    'personal-baseline',
    'consent-and-data-sharing',
    'research-participation',
    'care-team-connections',
  ],
}

/**
 * Hand-authored, not derived: this mission's `accessState` axis does not
 * exist anywhere else in the registry (see module doc comment). CinemaK and
 * SetpointK are deliberately NOT `'available'` even though both are DNS-live
 * (`deploymentStatus: 'live'`) -- deployment existing is not the same as an
 * arbitrary signed-in user being let in.
 */
const ACCESS_STATE: Record<string, ProductAccessState> = {
  avatark: 'available',
  prometheusk: 'available',
  gamek: 'available',
  arenak: 'entitlement_dependent',
  streamk: 'entitlement_dependent',
  cinemak: 'entitlement_dependent',
  studiok: 'entitlement_dependent',
  atlas: 'entitlement_dependent',
  setpointk: 'entitlement_and_consent_required',
}

function buildIdentityConfig(product: AvatarKProduct): ProductIdentityConfig {
  const id = product.id
  return {
    productId: id,
    productName: product.displayName,
    wordmark: { text: product.displayName, assetSlot: product.logo !== null },
    accentToken: `product-accent-${id}`,
    signInContext: SIGN_IN_CONTEXT[id] ?? `You will return to ${product.displayName} when sign-in is complete.`,
    defaultReturnPath: DEFAULT_RETURN_PATH[id] ?? '/',
    allowedLocalRoutePrefixes: ALLOWED_ROUTE_PREFIXES[id] ?? ['/'],
    privacyNote: PRIVACY_NOTE[id] ?? 'Signing in does not grant access to another user’s data.',
    signedOutSupportLinks: product.supportEmail
      ? [{ label: 'Support', href: `mailto:${product.supportEmail}` }]
      : [{ label: 'Support', href: 'mailto:support@avatark.ai' }],
    accountExtensionRegistrations: ACCOUNT_EXTENSION_REGISTRATIONS[id] ?? [],
    deploymentStatus: deploymentStatusOf(product),
    integrationStatus: integrationStatusOf(product),
    accessState: ACCESS_STATE[id] ?? 'entitlement_dependent',
  }
}

/** Every product in `PRODUCT_REGISTRY`, keyed by id, with its frozen identity config. */
export const PRODUCT_IDENTITY_CONFIGS: Record<string, ProductIdentityConfig> = Object.fromEntries(
  PRODUCT_REGISTRY.map((product) => [product.id, buildIdentityConfig(product)]),
)

export function getProductIdentityConfig(productId: string): ProductIdentityConfig | undefined {
  return PRODUCT_IDENTITY_CONFIGS[productId]
}

/** True same-origin-path-prefix check -- rejects absolute URLs, protocol-relative (`//host`), and backslash tricks, same defensive shape as `packages/auth/src/safeReturnPath.ts`. */
export function isAllowedLocalRoute(config: ProductIdentityConfig, path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return false
  let resolvedPathname: string
  try {
    resolvedPathname = new URL(path, 'http://localhost').pathname
  } catch {
    return false
  }
  if (new URL(path, 'http://localhost').origin !== 'http://localhost') return false
  return config.allowedLocalRoutePrefixes.some(
    (prefix) => resolvedPathname === prefix || resolvedPathname.startsWith(prefix === '/' ? '/' : `${prefix}/`) || resolvedPathname === prefix,
  )
}

export interface ProductIdentityConfigValidation {
  valid: boolean
  errors: string[]
}

export function validateProductIdentityConfig(config: ProductIdentityConfig): ProductIdentityConfigValidation {
  const errors: string[] = []
  if (!config.productId) errors.push('productId is required')
  if (!config.productName) errors.push('productName is required')
  if (!config.signInContext) errors.push('signInContext is required')
  if (!isAllowedLocalRoute(config, config.defaultReturnPath)) {
    errors.push(`defaultReturnPath "${config.defaultReturnPath}" is not covered by allowedLocalRoutePrefixes`)
  }
  for (const link of config.signedOutSupportLinks) {
    const isMailto = link.href.startsWith('mailto:')
    const isSafeLocal = isAllowedLocalRoute({ ...config, allowedLocalRoutePrefixes: ['/'] }, link.href)
    if (!isMailto && !isSafeLocal) {
      errors.push(`signedOutSupportLinks entry "${link.href}" is neither mailto: nor a safe local route`)
    }
  }
  return { valid: errors.length === 0, errors }
}
