import { getEcosystemGroups } from '@/lib/content/ecosystemGroups'
import { InstitutionalHeader } from '@/components/foundation/InstitutionalHeader'
import { InstitutionalFooter } from '@/components/foundation/InstitutionalFooter'

// Shared shell for every institutional AvatarK.ai page (/, /founder,
// /roadmap). Reads the ecosystem content once, server-side (the Ecosystem
// dropdown needs real fs-backed content but must render inside a client
// component for its open/close interactivity, so the read happens here
// and gets passed down as a prop).
export function InstitutionalShell({ children }: { children: React.ReactNode }) {
  const ecosystemGroups = getEcosystemGroups()

  return (
    <div className="flex flex-1 flex-col" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
      <InstitutionalHeader ecosystemGroups={ecosystemGroups} />
      {children}
      <InstitutionalFooter />
    </div>
  )
}
