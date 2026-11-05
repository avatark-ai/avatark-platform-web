// AVK-UNIFICATION-03D (ECOSYSTEM-V3 §3): the visitor-facing Level 1 grouping on /ecosystem. EXPLANATORY ONLY:
// it does not change product ownership, @avatark/product-registry classifications, journeyRole, maturity or
// deployment. Product names come from the registry (resolveEcosystemProduct); WorldK has no registry entry
// (OD-12) and stays the static, unlinked AVK-FR-055 chip with its approved status. Group descriptions
// (AVK-U03-EV-11/21/31) are PENDING owner approval and are not rendered.
import type { UnificationCopyId } from './unificationCopy.ts'

export interface EcosystemOverviewGroup {
  key: 'experiences' | 'making' | 'knowledge-and-intelligence'
  labelId: UnificationCopyId
  productIds: readonly string[]
  includesWorldK?: boolean
}

export const ECOSYSTEM_OVERVIEW_GROUPS: readonly EcosystemOverviewGroup[] = [
  { key: 'experiences', labelId: 'AVK-U03-EV-10', productIds: ['echo', 'prometheusk', 'gamek', 'arenak', 'streamk', 'cinemak'], includesWorldK: true },
  // D-U03-06: "Making", not "Creation" -- the Canon axis "Creation" (AVK-FS-CI-40) is untouched.
  { key: 'making', labelId: 'AVK-U03-EV-20-R', productIds: ['studiok'] },
  { key: 'knowledge-and-intelligence', labelId: 'AVK-U03-EV-30', productIds: ['atlas', 'setpointk'] },
] as const
