import { headers } from 'next/headers'
import { findSiteByHost, type SiteId } from './registry'

// Centralizes the one host-dependent decision this app makes: whether `/`
// renders the Echo landing page or the institutional homepage. Every other
// route is unambiguously one or the other regardless of host (institutional:
// /, /founder, /roadmap; everything else: Echo) -- see
// docs/ECHO_DOMAIN_MIGRATION.md -- so this is the only call site that needs
// to exist. Reading `headers()` opts this call path out of static
// rendering, same tradeoff any host-aware page makes.
export async function resolveSite(): Promise<SiteId> {
  const headerList = await headers()
  const host = headerList.get('host')
  if (host) {
    const site = findSiteByHost(host)
    if (site) return site.id
  }

  // No real DNS locally or on a generic preview URL -- this override lets
  // `/` render Echo during development without needing a matching host.
  if (process.env.NEXT_PUBLIC_FORCE_SITE === 'echo') return 'echo'
  if (process.env.NEXT_PUBLIC_FORCE_SITE === 'institutional') return 'institutional'

  return 'institutional'
}
