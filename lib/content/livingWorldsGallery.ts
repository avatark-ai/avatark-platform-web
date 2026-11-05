// AVK-UNIFICATION-03C (WORLD-GALLERY-CONTRACT §6): future Living World concepts on /living-worlds.
// Titles and the "Future concept" label only (D-U03-08 / U-03C brief): no descriptions, dates or links.
// There is deliberately NO href field -- the type itself guarantees no active entry. `key` is a
// display key only, NOT a WorldK id; nothing here touches the WorldK registry or canon.
import type { UnificationCopyId } from './unificationCopy.ts'

export interface FutureWorldConcept {
  key: 'living-vrindavan' | 'living-sea' | 'living-forge'
  titleId: UnificationCopyId
  // Omitted until the owner approves AVK-U03-LW-34/36/38 (PENDING in the U-03C register).
  descriptionId?: UnificationCopyId
  // Only from a cleared media register row (MEDIA-CLEARANCE-MATRIX M-05..07: NOT CLEARED).
  media?: { assetId: string; sha256: string }
}

export const FUTURE_WORLD_LABEL_ID: UnificationCopyId = 'AVK-U03-LW-32'

// Owner order is fixed: Vrindavan, Sea, Forge.
export const FUTURE_WORLD_CONCEPTS: readonly FutureWorldConcept[] = [
  { key: 'living-vrindavan', titleId: 'AVK-U03-LW-33' },
  { key: 'living-sea', titleId: 'AVK-U03-LW-35' },
  { key: 'living-forge', titleId: 'AVK-U03-LW-37' },
] as const
