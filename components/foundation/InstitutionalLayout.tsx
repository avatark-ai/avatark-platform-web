import { getEcosystemGroups } from '@/lib/content/ecosystemGroups'
import { InstitutionalHeader } from '@/components/foundation/InstitutionalHeader'
import { InstitutionalFooter } from '@/components/foundation/InstitutionalFooter'

// Shared shell for every institutional AvatarK.ai page (/, /founder,
// /roadmap). Reads the ecosystem content once, server-side (the Ecosystem
// dropdown needs real fs-backed content but must render inside a client
// component for its open/close interactivity, so the read happens here
// and gets passed down as a prop). Also owns the <main> wrapper, so pages
// only provide their sections/content, not their own layout scaffolding.
//
// The width primitives (SectionContainer/EditorialContainer) live in
// ./Container.tsx, not here -- this file's getEcosystemGroups() import
// pulls in fs-backed content loaders, and a client component (e.g. Canon)
// importing a container from this file would drag node:fs into its bundle.
export function InstitutionalLayout({ children }: { children: React.ReactNode }) {
  const ecosystemGroups = getEcosystemGroups()

  return (
    <div className="flex flex-1 flex-col" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
      <InstitutionalHeader ecosystemGroups={ecosystemGroups} />
      <main className="flex flex-1 flex-col">{children}</main>
      <InstitutionalFooter />
    </div>
  )
}
