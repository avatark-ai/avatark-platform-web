// AVK-PROD-03A (C3, L2): secondary guards. Each excluded segment and API handler fails closed by
// itself, so a proxy matcher regression (Next.js 16 proxy docs: matcher changes can silently drop
// coverage) still cannot reach an excluded route or its backend.
import { notFound } from 'next/navigation'
import { excludedInScope } from './denial.ts'
import { isInstitutionalScope } from './scope.ts'

/** Call first in every excluded segment's server layout. */
export function guardExcludedSegment(): void {
  if (isInstitutionalScope()) notFound()
}

/** First statement of every excluded Route Handler: `const blocked = blockExcludedRoute(); if (blocked) return blocked`. */
export function blockExcludedRoute(): Response | null {
  return excludedInScope(isInstitutionalScope())
}
