import type { Metadata } from 'next'
import { InstitutionalLayout } from '@/components/foundation/InstitutionalLayout'
import { LivingWorldsIntro } from '@/components/foundation/livingWorlds/LivingWorldsIntro'
import { LivingForestFeature } from '@/components/foundation/livingWorlds/LivingForestFeature'
import { WhatMakesAWorldLiving } from '@/components/foundation/livingWorlds/WhatMakesAWorldLiving'
import { StoriesOfTheForest } from '@/components/foundation/livingWorlds/StoriesOfTheForest'
import { WorldGallery } from '@/components/foundation/livingWorlds/WorldGallery'
import { WhyLivingWorlds } from '@/components/foundation/livingWorlds/WhyLivingWorlds'
import { UNIFICATION_COPY as U } from '@/lib/content/unificationCopy'

// AVK-UNIFICATION-03C: the institutional introduction to Persistent Living Worlds. Neither WorldK
// Stage A nor Stage B: no WorldK link, no /enter, no runtime, atlas, memory player or embed. WorldK owns
// world discovery, geography, story collections, journeys and executable entry.
//
// Section 3 "What makes a world living?" (six principles) was withheld in U-03C and is completed in
// U-03C-1 with the owner-approved intro and bodies (AVK-U03-LW-11-R, LW-13-R..LW-23-R).
//
// Metadata: AVK-U03-LW-M1 / LW-M2, owner-approved in AVK-UNIFICATION-03D. No OG image (M-01 not cleared).
export const metadata: Metadata = {
  title: U['AVK-U03-LW-M1'],
  description: U['AVK-U03-LW-M2'],
}

export default function LivingWorldsPage() {
  return (
    <InstitutionalLayout>
      <LivingWorldsIntro />
      <LivingForestFeature />
      <WhatMakesAWorldLiving />
      <StoriesOfTheForest />
      <WorldGallery />
      <WhyLivingWorlds />
    </InstitutionalLayout>
  )
}
