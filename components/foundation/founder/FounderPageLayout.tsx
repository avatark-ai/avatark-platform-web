import { InstitutionalLayout } from '@/components/foundation/InstitutionalLayout'
import { SectionContainer } from '@/components/foundation/Container'
import { FounderPageNav } from '@/components/foundation/founder/FounderPageNav'

const NAV_ITEMS = [
  { id: 'introduction', label: 'Introduction', href: '/founder' },
  { id: 'question', label: 'The Question', href: '/founder/question' },
  { id: 'synthesis', label: 'The Synthesis', href: '/founder/synthesis' },
  { id: 'future', label: 'The Future', href: '/founder/future' },
]

// Shared shell for all four Founder routes -- the nav rail + editorial
// reading column grid used to live inline in the single all-in-one
// /founder page; now it's genuinely reused four times identically.
export function FounderPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <InstitutionalLayout>
      <article>
        <SectionContainer>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[180px_1fr] lg:gap-12">
            <FounderPageNav items={NAV_ITEMS} />
            <div className="max-w-[var(--editorial-width)]">{children}</div>
          </div>
        </SectionContainer>
      </article>
    </InstitutionalLayout>
  )
}
