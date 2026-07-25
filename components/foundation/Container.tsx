// Pure presentational width primitives, deliberately isolated from
// InstitutionalLayout.tsx (which pulls in fs-backed content loaders via
// getEcosystemGroups). Client components like Canon.tsx import these
// directly so their bundle doesn't drag node:fs along for the ride.

// Standard width for homepage-style sections (Hero, Canon, Ecosystem, etc.).
// Sections keep their own outer <section> for id anchors/borders/background;
// this only standardizes the inner width + vertical rhythm.
export function SectionContainer({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`mx-auto w-full max-w-[var(--content-width)] px-6 py-16 sm:px-8 sm:py-20 ${className}`}>
      {children}
    </div>
  )
}

// Narrower reading column for editorial/long-form pages (Founder, Roadmap).
export function EditorialContainer({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`mx-auto w-full max-w-[var(--editorial-width)] px-6 py-16 sm:px-8 sm:py-20 ${className}`}>
      {children}
    </div>
  )
}
