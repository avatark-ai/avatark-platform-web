// AVK-UNIFICATION-03C-1: the six Living Worlds principles on /living-worlds ("What makes a world
// living?"). Design intent, not features: every rendering is preceded by AVK-U03-LW-11-R, which says so.
// Names are owner-directed (U-03A); bodies are the owner-approved U-03C-1 replacements (*-R).
import type { UnificationCopyId } from './unificationCopy.ts'

export interface LivingWorldPrinciple {
  key: 'place' | 'memory' | 'change' | 'return' | 'discovery' | 'participation'
  nameId: UnificationCopyId
  bodyId: UnificationCopyId
}

export const PRINCIPLES_HEADING_ID: UnificationCopyId = 'AVK-U03-LW-10'
export const PRINCIPLES_INTRO_ID: UnificationCopyId = 'AVK-U03-LW-11-R'

export const LIVING_WORLD_PRINCIPLES: readonly LivingWorldPrinciple[] = [
  { key: 'place', nameId: 'AVK-U03-LW-12', bodyId: 'AVK-U03-LW-13-R' },
  { key: 'memory', nameId: 'AVK-U03-LW-14', bodyId: 'AVK-U03-LW-15-R' },
  { key: 'change', nameId: 'AVK-U03-LW-16', bodyId: 'AVK-U03-LW-17-R' },
  { key: 'return', nameId: 'AVK-U03-LW-18', bodyId: 'AVK-U03-LW-19-R' },
  { key: 'discovery', nameId: 'AVK-U03-LW-20', bodyId: 'AVK-U03-LW-21-R' },
  { key: 'participation', nameId: 'AVK-U03-LW-22', bodyId: 'AVK-U03-LW-23-R' },
] as const
