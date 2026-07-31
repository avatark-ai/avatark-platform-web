export type {
  AvatarKProduct,
  ProductStatus,
  ProductCategory,
  ProductVisibility,
  ProductLink,
  ProductCapabilityKey,
  JourneyRole,
  IntegrationStatus,
  ProductExperience,
} from './types.ts'
export { CAPABILITY_KEYS } from './types.ts'

export { PRODUCT_REGISTRY, PRODUCT_IDS, NO_BILLING_SYSTEM_NOTE } from './registry.ts'

export {
  getProductById,
  getProductBySlug,
  isValidProductId,
  listProducts,
  filterProducts,
  getProductsByCategory,
  getProductsByStatus,
  getProductsByVisibility,
  getProductsWithCapability,
  sortProducts,
} from './helpers.ts'
export type { ProductSortField, SortDirection } from './helpers.ts'

export { validateProduct, validateRegistry } from './validation.ts'
export type { RegistryValidationResult } from './validation.ts'

export {
  ECOSYSTEM_CAPABILITIES,
  getCapabilityStatus,
  buildCapabilityMatrix,
  getProductsWithCapabilityStatus,
} from './capabilityMatrix.ts'
export type { EcosystemCapability, CapabilityConfirmation, ProductCapabilityStatus } from './capabilityMatrix.ts'

export {
  useProductRegistry,
  useProduct,
  useProductsByCategory,
  useVisibleProducts,
  useProductCapability,
} from './hooks.ts'
