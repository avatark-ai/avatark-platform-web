import type { AvatarKProduct } from './types.ts'

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function validateProduct(product: AvatarKProduct): string[] {
  const errors: string[] = []

  if (!isNonEmptyString(product.id)) errors.push('id must be a non-empty string')
  if (!isNonEmptyString(product.slug)) errors.push('slug must be a non-empty string')
  else if (!SLUG_PATTERN.test(product.slug)) errors.push(`slug "${product.slug}" must be lowercase, alphanumeric, hyphen-separated`)
  if (!isNonEmptyString(product.displayName)) errors.push('displayName must be a non-empty string')
  if (!isNonEmptyString(product.description)) errors.push('description must be a non-empty string')
  if (!isNonEmptyString(product.icon)) errors.push('icon must be a non-empty string')
  if (!isNonEmptyString(product.accentColor)) errors.push('accentColor must be a non-empty string')

  if (product.supportEmail !== null && !EMAIL_PATTERN.test(product.supportEmail)) {
    errors.push(`supportEmail "${product.supportEmail}" is not a valid email address`)
  }

  for (const [group, links] of [
    ['navigationLinks', product.navigationLinks],
    ['footerLinks', product.footerLinks],
    ['helpLinks', product.helpLinks],
  ] as const) {
    links.forEach((link, i) => {
      if (!isNonEmptyString(link.label)) errors.push(`${group}[${i}].label must be a non-empty string`)
      if (!isNonEmptyString(link.href)) errors.push(`${group}[${i}].href must be a non-empty string`)
    })
  }

  return errors
}

export interface RegistryValidationResult {
  valid: boolean
  errorsByProductId: Record<string, string[]>
  duplicateIds: string[]
  duplicateSlugs: string[]
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value)
    seen.add(value)
  }
  return [...duplicates]
}

export function validateRegistry(registry: AvatarKProduct[]): RegistryValidationResult {
  const errorsByProductId: Record<string, string[]> = {}
  for (const product of registry) {
    const errors = validateProduct(product)
    if (errors.length > 0) errorsByProductId[product.id || `<missing-id:${product.slug}>`] = errors
  }

  const duplicateIds = findDuplicates(registry.map((p) => p.id))
  const duplicateSlugs = findDuplicates(registry.map((p) => p.slug))

  return {
    valid: Object.keys(errorsByProductId).length === 0 && duplicateIds.length === 0 && duplicateSlugs.length === 0,
    errorsByProductId,
    duplicateIds,
    duplicateSlugs,
  }
}
