import { InstitutionalLayout } from '@/components/foundation/InstitutionalLayout'
import { SectionContainer } from '@/components/foundation/Container'
import { CanonRail } from '@/components/foundation/canon/CanonRail'

// Shared shell for every /canon/* route: institutional header (via
// InstitutionalLayout), persistent left Canon rail, selected content on the
// right. One shell, reused by /canon, /canon/sacred-geometry (+ plate
// details), /canon/operators, /canon/dynamics, and /canon/alignment, so the
// rail is never re-implemented per page and never drops a page into a
// second, nested navigation shell.
export function CanonPageLayout({
  children,
  afterContent,
}: {
  children: React.ReactNode
  // Full-bleed section rendered after the rail/content grid, still inside
  // the institutional shell (before the footer) -- e.g. /canon's closing
  // "Continue to the Ecosystem" band, which intentionally breaks out of the
  // grid's max-width rather than sitting in the right-hand content column.
  afterContent?: React.ReactNode
}) {
  return (
    <InstitutionalLayout>
      <article>
        <SectionContainer>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr] lg:gap-16">
            <CanonRail />
            <div className="flex flex-col gap-14">{children}</div>
          </div>
        </SectionContainer>
      </article>
      {afterContent}
    </InstitutionalLayout>
  )
}
