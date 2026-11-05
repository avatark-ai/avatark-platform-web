import type { Metadata } from 'next'
import { InstitutionalLayout } from '@/components/foundation/InstitutionalLayout'
import { LivingWorldsIntro } from '@/components/foundation/livingWorlds/LivingWorldsIntro'
import { LivingForestFeature } from '@/components/foundation/livingWorlds/LivingForestFeature'
import { StoriesOfTheForest } from '@/components/foundation/livingWorlds/StoriesOfTheForest'
import { WorldGallery } from '@/components/foundation/livingWorlds/WorldGallery'
import { WhyLivingWorlds } from '@/components/foundation/livingWorlds/WhyLivingWorlds'
import { UNIFICATION_COPY as U } from '@/lib/content/unificationCopy'

// AVK-UNIFICATION-03C: the institutional introduction to Persistent Living Worlds. Neither WorldK
// Stage A nor Stage B: no WorldK link, no /enter, no runtime, atlas, memory player or embed. WorldK owns
// world discovery, geography, story collections, journeys and executable entry.
//
// Section 3 "What makes a world living?" (six principles) is WITHHELD: its mandatory intro
// AVK-U03-LW-11 and the six principle bodies are PENDING owner approval, and R-U4 forbids rendering
// the principles without the intro that marks them as design intent, not features. See the U-03C
// register (_claude_reports/AVK_UNIFICATION_03C/tools/u03c-living-worlds-register.json).
//
// Title: the approved owner-directed h1 (AVK-U03-LW-01). The proposed title/description
// (AVK-U03-LW-M1/M2) are PENDING; the site default description applies. No OG image (M-01 not cleared).
export const metadata: Metadata = {
  title: U['AVK-U03-LW-01'],
}

export default function LivingWorldsPage() {
  return (
    <InstitutionalLayout>
      <LivingWorldsIntro />
      <LivingForestFeature />
      <StoriesOfTheForest />
      <WorldGallery />
      <WhyLivingWorlds />
    </InstitutionalLayout>
  )
}
