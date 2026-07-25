// Canonical site/domain registry -- the one place this app records which
// hostnames render which experience. Mirrors the shape of
// @avatark/product-registry (id + canonical + legacy hosts) so the pattern
// stays consistent across "registries" in this codebase. See
// docs/ECHO_DOMAIN_MIGRATION.md for the exact later DNS/Vercel steps this
// registry is designed to make configuration-only.
export type SiteId = 'institutional' | 'echo'

export interface SiteDefinition {
  id: SiteId
  displayName: string
  /** Best-known final production hostname for this site. */
  canonicalHost: string
  /** Hostnames that should keep resolving to this site during migration. */
  legacyHosts: string[]
}

export const SITE_REGISTRY: Record<SiteId, SiteDefinition> = {
  institutional: {
    id: 'institutional',
    displayName: 'AvatarK',
    canonicalHost: 'avatark.ai',
    legacyHosts: [],
  },
  echo: {
    id: 'echo',
    displayName: 'Echo',
    canonicalHost: 'echo.avatark.ai',
    // next.avatark.ai is the interim/preview deployment this app already
    // answers on -- it keeps serving Echo until the DNS/redirect steps in
    // docs/ECHO_DOMAIN_MIGRATION.md are explicitly authorized and run.
    legacyHosts: ['next.avatark.ai'],
  },
}

// Host headers can arrive as "example.com:3000" (local dev) or with mixed
// case -- normalize before matching so the registry entries above only ever
// need to list bare hostnames.
export function findSiteByHost(host: string): SiteDefinition | null {
  const bareHost = host.split(':')[0].toLowerCase()
  return (
    Object.values(SITE_REGISTRY).find(
      (site) => site.canonicalHost === bareHost || site.legacyHosts.includes(bareHost)
    ) ?? null
  )
}
