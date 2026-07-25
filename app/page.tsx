import type { Metadata } from 'next'
import { InstitutionalShell } from '@/components/foundation/InstitutionalShell'
import { Hero } from '@/components/foundation/sections/Hero'
import { Gap } from '@/components/foundation/sections/Gap'
import { EchoIntro } from '@/components/foundation/sections/EchoIntro'
import { Canon } from '@/components/foundation/sections/Canon'
import { LivingSpiral } from '@/components/foundation/sections/LivingSpiral'
import { Ecosystem } from '@/components/foundation/sections/Ecosystem'
import { StatusGrid } from '@/components/foundation/sections/StatusGrid'
import { Question } from '@/components/foundation/sections/Question'
import { FinalCta } from '@/components/foundation/sections/FinalCta'
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
    <InstitutionalShell>
      <main className="flex flex-1 flex-col">
        <Hero />
        <Gap />
        <EchoIntro />
        <Canon content={canonContent} />
        <LivingSpiral />
        <Ecosystem />
        <StatusGrid />
        <Question />
        <FinalCta />
      </main>
    </InstitutionalShell>
  )
}
