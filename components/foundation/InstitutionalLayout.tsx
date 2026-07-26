import { InstitutionalHeader } from '@/components/foundation/InstitutionalHeader'
import { InstitutionalFooter } from '@/components/foundation/InstitutionalFooter'

// Shared shell for every institutional AvatarK.ai page (/, /foundation,
// /canon, /founder, /ecosystem, /roadmap). Owns the <main> wrapper, so
// pages only provide their sections/content, not their own layout
// scaffolding.
//
// The width primitives (SectionContainer/EditorialContainer) live in
// ./Container.tsx, not here, so a client component (e.g. Canon) can import
// just the width primitive without pulling in whatever server-only data
// loaders a given page's content needs.
export function InstitutionalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
      <InstitutionalHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <InstitutionalFooter />
    </div>
  )
}
