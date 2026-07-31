import { PRODUCT_REGISTRY } from './registry.ts'
import { getProductById } from './helpers.ts'
import type { AvatarKProduct } from './types.ts'

// Machine-readable companion to docs/PLATFORM_INTEGRATION_MATRIX.md's hand-
// written table -- same underlying facts, typed and queryable instead of
// living only as markdown cells. This module never invents a fact the doc
// corpus doesn't already establish; every non-obvious cell below cites the
// doc/section it's drawn from.
export type EcosystemCapability =
  | 'auth'
  | 'account'
  | 'invitation'
  | 'journey'
  | 'echo'
  | 'recommendation'
  | 'notifications'
  | 'organizations'
  | 'publisher'
  | 'admin'
  | 'creator'

export const ECOSYSTEM_CAPABILITIES: readonly EcosystemCapability[] = [
  'auth',
  'account',
  'invitation',
  'journey',
  'echo',
  'recommendation',
  'notifications',
  'organizations',
  'publisher',
  'admin',
  'creator',
]

export type CapabilityConfirmation = 'confirmed' | 'target' | 'not_supported' | 'unconfirmed'

export interface ProductCapabilityStatus {
  productId: string
  capability: EcosystemCapability
  status: CapabilityConfirmation
  /** Citation/rationale, mirroring PLATFORM_INTEGRATION_MATRIX.md's per-cell annotations. Null only when the field this cell derives from is entirely self-explanatory (e.g. a plain boolean flag already documented in types.ts). */
  note: string | null
}

// Capabilities with a direct, single boolean field on AvatarKProduct --
// derived, never hand-duplicated, so the registry stays the one source of
// truth (docs/CROSS_PRODUCT_INTEGRATION.md). `true` maps to "confirmed",
// `false` to "not_supported" -- every registry supportsX flag already
// represents a real, cited fact (see registry.ts's own per-product
// comments), never a guess, so there is no "unconfirmed" state to add here.
const DERIVED_CAPABILITY_FIELD: Partial<Record<EcosystemCapability, keyof AvatarKProduct>> = {
  auth: 'supportsAuth',
  account: 'supportsAccount',
  invitation: 'supportsInvitations',
  // "echo" here means Living Echo -- the PLATFORM_CONTRACTS.md domain this
  // capability list is built around -- never this repo's own, separately-
  // named "Echo" content product. See docs/DEEP_LINKS.md and
  // docs/PLATFORM_PRODUCT_ADOPTION_MATRIX.md (collision #3/#5) for why the
  // two must not be conflated.
  echo: 'supportsLivingEcho',
  recommendation: 'supportsRecommendations',
  notifications: 'supportsNotifications',
  organizations: 'supportsOrganizations',
}

interface HandAuthoredCell {
  status: CapabilityConfirmation
  note: string
}

// Capabilities with no direct registry field -- hand-authored, one cell at
// a time, each cited against a real doc section. A product not named below
// for a given capability is "unconfirmed" (the honest default this repo's
// discipline requires), never silently "not_supported" -- this repo cannot
// confirm the *absence* of a capability in a repo it has no visibility
// into (see docs/PLATFORM_PRODUCT_ADOPTION_MATRIX.md's per-package notes
// for the same "unconfirmed vs. not_supported" distinction).
const HAND_AUTHORED: Partial<Record<EcosystemCapability, Partial<Record<string, HandAuthoredCell>>>> = {
  journey: {
    avatark: {
      status: 'confirmed',
      note: 'Owns the journey/orchestration layer natively -- @avatark/journey, lib/journey/*.',
    },
    gamek: {
      status: 'confirmed',
      note: 'My Journey deep-link, Phase 1 complete (docs/PLATFORM_INTEGRATION_MATRIX.md, Game row).',
    },
    prometheusk: {
      status: 'target',
      note: 'StreamKToPrometheusHandoff models this edge; no real implementation (packages/journey/src/handoffContracts.ts).',
    },
    streamk: {
      status: 'target',
      note: 'EchoToStreamKHandoff models this edge; no real implementation.',
    },
    arenak: {
      status: 'target',
      note: 'LivingEchoToArenaHandoff models this edge; no real implementation.',
    },
  },
  publisher: {
    studiok: {
      status: 'target',
      note: "Creation tools is StudioK's stated purpose (this registry's own description), but \"scope not yet integrated with Platform\" (docs/PLATFORM_INTEGRATION_MATRIX.md).",
    },
  },
  admin: {
    avatark: {
      status: 'confirmed',
      note: "Real /admin surface (app/admin/**) -- this repo's only known admin surface anywhere in the ecosystem (lib/products/registry.ts's own comment: \"almost always null\").",
    },
  },
  creator: {
    // No product has a confirmed or target Creator-role concept anywhere in
    // this repo's docs today -- docs/PLATFORM_INTEGRATION_MATRIX.md's Creator
    // column is "--" for every single row. Left empty deliberately: every
    // product resolves to "unconfirmed" via the fallback below.
  },
}

export function getCapabilityStatus(
  productId: string,
  capability: EcosystemCapability,
  registry: AvatarKProduct[] = PRODUCT_REGISTRY
): ProductCapabilityStatus {
  const derivedField = DERIVED_CAPABILITY_FIELD[capability]
  if (derivedField) {
    const product = getProductById(productId, registry)
    if (!product) return { productId, capability, status: 'unconfirmed', note: 'Product id not found in registry.' }
    const value = product[derivedField]
    return {
      productId,
      capability,
      status: value === true ? 'confirmed' : 'not_supported',
      note: `Derived from AvatarKProduct.${String(derivedField)}.`,
    }
  }

  const cell = HAND_AUTHORED[capability]?.[productId]
  if (cell) return { productId, capability, status: cell.status, note: cell.note }
  return { productId, capability, status: 'unconfirmed', note: null }
}

/** Every (product, capability) cell -- 9 products x 11 capabilities today. */
export function buildCapabilityMatrix(registry: AvatarKProduct[] = PRODUCT_REGISTRY): ProductCapabilityStatus[] {
  const cells: ProductCapabilityStatus[] = []
  for (const product of registry) {
    for (const capability of ECOSYSTEM_CAPABILITIES) {
      cells.push(getCapabilityStatus(product.id, capability, registry))
    }
  }
  return cells
}

export function getProductsWithCapabilityStatus(
  capability: EcosystemCapability,
  status: CapabilityConfirmation,
  registry: AvatarKProduct[] = PRODUCT_REGISTRY
): string[] {
  return registry.map((p) => p.id).filter((id) => getCapabilityStatus(id, capability, registry).status === status)
}
