import type { Metadata } from 'next'
import { InstitutionalLayout } from '@/components/foundation/InstitutionalLayout'
import { Hero } from '@/components/foundation/sections/Hero'
import { WhyAvatarK } from '@/components/foundation/sections/Gap'
import { FeaturedExperiences } from '@/components/foundation/sections/FeaturedExperiences'
import { CanonPreview } from '@/components/foundation/sections/CanonPreview'
import { PillarsBand } from '@/components/foundation/sections/PillarsBand'
import { EcosystemPreview } from '@/components/foundation/sections/EcosystemPreview'
import { Question } from '@/components/foundation/sections/Question'
import { getCanonContent } from '@/lib/content/foundation'
import { resolveSite } from '@/lib/sites/resolveSite'
import { EchoLanding } from '@/components/echo/landing/EchoLanding'

export async function generateMetadata(): Promise<Metadata> {
  const site = await resolveSite()
  if (site === 'echo') {
    return {
      title: 'Echo — Every Life Leaves an Echo',
      description:
        'Learn from what another person discovered. Practice what proves useful. Leave something another life can carry.',
    }
  }
  return {
    title: 'AvatarK — The Architecture of Becoming',
    description:
      'Learn from real lives. Transform wisdom into practice. Leave an Echo worth carrying forward. The institutional home of the AvatarK ecosystem.',
  }
}

export default async function Home() {
  const site = await resolveSite()
  if (site === 'echo') {
    return <EchoLanding />
  }

  const canonContent = getCanonContent()

  return (
    <InstitutionalLayout>
      {/* AVK-UNIFICATION-03B (SITE-ARCHITECTURE-V3 §4): owner-directed order. EchoIntro,
          LivingWorldsBand and FinalCta leave this render only; their files stay one gate (D-U03-12). */}
      <Hero />
      <FeaturedExperiences />
      <WhyAvatarK />
      <CanonPreview content={canonContent} />
      <PillarsBand />
      <EcosystemPreview />
      <Question />
    </InstitutionalLayout>
  )
}
